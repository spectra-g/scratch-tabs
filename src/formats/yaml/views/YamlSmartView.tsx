import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import * as YAML from 'yaml';
import { SmartViewProps } from '../../../views/registry';
import { YamlTreeView } from './components/YamlTreeView';
import { YamlToolbar } from './components/YamlToolbar';
import { AnchorNavigator } from './components/AnchorNavigator';
import { DocumentTabs } from './components/DocumentTabs';
import { detectYamlSchema, configureMonacoSchema } from '../utils/schemaStore';
import { parseYamlWithPositions, YamlDocument, YamlNode, AnchorInfo } from '../utils/yamlParser';

interface YamlSmartViewState {
  documents: YamlDocument[];
  activeDocumentIndex: number;
  selectedNodePath: string | null;
  anchors: Map<string, AnchorInfo>;
  showComments: boolean;
  showPaths: boolean;
  searchQuery: string;
  error: string | null;
}

export const YamlSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [state, setState] = useState<YamlSmartViewState>({
    documents: [],
    activeDocumentIndex: 0,
    selectedNodePath: null,
    anchors: new Map(),
    showComments: true,
    showPaths: false,
    searchQuery: '',
    error: null,
  });

  // Parse YAML content with position information
  const parsedData = useMemo(() => {
    try {
      const result = parseYamlWithPositions(content);
      setState(prev => ({
        ...prev,
        documents: result.documents,
        anchors: result.anchors,
        error: null,
      }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse YAML';
      setState(prev => ({
        ...prev,
        documents: [],
        anchors: new Map(),
        error: errorMessage,
      }));
      return { documents: [], anchors: new Map() };
    }
  }, [content]);

  // Get active document
  const activeDocument = useMemo(() => {
    return state.documents[state.activeDocumentIndex] || null;
  }, [state.documents, state.activeDocumentIndex]);

  // Configure Monaco schema when document changes
  useEffect(() => {
    if (activeDocument && editorRef.current) {
      const detectedSchema = detectYamlSchema(activeDocument.data);
      if (detectedSchema) {
        configureMonacoSchema(editorRef.current, detectedSchema);
      }
    }
  }, [activeDocument]);

  // Handle editor ready
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Set up cursor position listener for tree sync
    editor.onDidChangeCursorPosition((e) => {
      if (!activeDocument) return;

      const lineNumber = e.position.lineNumber;
      const nodePath = findNodePathByLine(activeDocument.nodes, lineNumber);
      
      if (nodePath !== state.selectedNodePath) {
        setState(prev => ({ ...prev, selectedNodePath: nodePath }));
      }
    });

    // Configure YAML language features
    editor.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderWhitespace: 'boundary',
    });
  }, [activeDocument, state.selectedNodePath]);

  // Handle tree node selection
  const handleNodeSelect = useCallback((nodePath: string) => {
    if (!activeDocument || !editorRef.current) return;

    const node = findNodeByPath(activeDocument.nodes, nodePath);
    if (node && node.line !== undefined) {
      // Scroll to and highlight the line in the editor
      editorRef.current.revealLineInCenter(node.line);
      editorRef.current.setPosition({ lineNumber: node.line, column: 1 });
      
      // Highlight the range if available
      if (node.endLine !== undefined) {
        const range = new monaco.Range(node.line, 1, node.endLine, 1);
        editorRef.current.setSelection(range);
      }
    }

    setState(prev => ({ ...prev, selectedNodePath: nodePath }));
  }, [activeDocument]);

  // Handle anchor/alias navigation
  const handleAnchorNavigation = useCallback((anchorName: string, isAlias: boolean) => {
    if (!editorRef.current) return;

    const anchorInfo = state.anchors.get(anchorName);
    if (!anchorInfo) return;

    if (isAlias) {
      // Navigate to anchor definition
      editorRef.current.revealLineInCenter(anchorInfo.definitionLine);
      editorRef.current.setPosition({ 
        lineNumber: anchorInfo.definitionLine, 
        column: anchorInfo.definitionColumn || 1 
      });
    } else {
      // Navigate to first alias usage
      if (anchorInfo.usages.length > 0) {
        const firstUsage = anchorInfo.usages[0];
        editorRef.current.revealLineInCenter(firstUsage.line);
        editorRef.current.setPosition({ 
          lineNumber: firstUsage.line, 
          column: firstUsage.column || 1 
        });
      }
    }
  }, [state.anchors]);

  // Handle document switching
  const handleDocumentChange = useCallback((index: number) => {
    setState(prev => ({ 
      ...prev, 
      activeDocumentIndex: index,
      selectedNodePath: null,
    }));
  }, []);

  // Handle view toggles
  const handleToggleComments = useCallback(() => {
    setState(prev => ({ ...prev, showComments: !prev.showComments }));
  }, []);

  const handleTogglePaths = useCallback(() => {
    setState(prev => ({ ...prev, showPaths: !prev.showPaths }));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  if (state.error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-red-400">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">YAML Parse Error</h3>
          <p className="text-sm">{state.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200" data-testid="yaml-smart-view">
      {/* Toolbar */}
      <YamlToolbar
        showComments={state.showComments}
        showPaths={state.showPaths}
        searchQuery={state.searchQuery}
        onToggleComments={handleToggleComments}
        onTogglePaths={handleTogglePaths}
        onSearchChange={handleSearchChange}
        documentCount={state.documents.length}
        activeDocument={activeDocument}
      />

      {/* Document tabs (if multiple documents) */}
      {state.documents.length > 1 && (
        <DocumentTabs
          documents={state.documents}
          activeIndex={state.activeDocumentIndex}
          onDocumentChange={handleDocumentChange}
        />
      )}

      {/* Main content area */}
      <div className="flex flex-1 min-h-0">
        {/* Left pane: Tree view */}
        <div className="w-2/5 border-r border-gray-700 flex flex-col">
          {activeDocument && (
            <YamlTreeView
              nodes={activeDocument.nodes}
              selectedPath={state.selectedNodePath}
              showPaths={state.showPaths}
              searchQuery={state.searchQuery}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </div>

        {/* Right pane: Monaco editor */}
        <div className="flex-1 flex flex-col">
          <Editor
            height="100%"
            language="yaml"
            value={content}
            theme="vs-dark"
            onMount={handleEditorDidMount}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              renderWhitespace: 'boundary',
              folding: true,
              lineNumbers: 'on',
              glyphMargin: true,
            }}
          />
        </div>
      </div>

      {/* Anchor Navigator (bottom panel) */}
      {state.anchors.size > 0 && (
        <AnchorNavigator
          anchors={state.anchors}
          onAnchorNavigation={handleAnchorNavigation}
        />
      )}
    </div>
  );
};

// Helper functions
function findNodePathByLine(nodes: YamlNode[], lineNumber: number): string | null {
  for (const node of nodes) {
    if (node.line === lineNumber || (node.endLine && lineNumber >= node.line && lineNumber <= node.endLine)) {
      return node.path;
    }
    
    if (node.children) {
      const childPath = findNodePathByLine(node.children, lineNumber);
      if (childPath) return childPath;
    }
  }
  return null;
}

function findNodeByPath(nodes: YamlNode[], targetPath: string): YamlNode | null {
  for (const node of nodes) {
    if (node.path === targetPath) {
      return node;
    }
    
    if (node.children) {
      const childNode = findNodeByPath(node.children, targetPath);
      if (childNode) return childNode;
    }
  }
  return null;
}