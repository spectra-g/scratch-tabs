import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { SmartViewProps } from '../../../views/registry';
import { YamlTreeView } from './components/YamlTreeView';
import { YamlToolbar } from './components/YamlToolbar';
import { AnchorNavigator } from './components/AnchorNavigator';
import { DocumentTabs } from './components/DocumentTabs';
import { NodeDetails } from './components/NodeDetails';
import { detectYamlSchema, configureMonacoSchema } from '../utils/schemaStore';
import { parseYamlWithPositions, YamlDocument, YamlNode, AnchorInfo } from '../utils/yamlParser';
import { useActiveEditorStore } from '../../../stores/activeEditorStore';

interface YamlSmartViewState {
  documents: YamlDocument[];
  activeDocumentIndex: number;
  selectedNodePath: string | null;
  anchors: Map<string, AnchorInfo>;
  searchQuery: string;
  error: string | null;
  canUndo: boolean;
  canRedo: boolean;
}

export const YamlSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive,
  side,
}) => {
  const { setActiveEditor } = useActiveEditorStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  // Add cleanup effect to track unmounting
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor) {
        const currentActive = useActiveEditorStore.getState();
        const activeEditorForSide = side === 'left' ? currentActive.activeLeftEditor : currentActive.activeRightEditor;
        if (activeEditorForSide === editor) {
          setActiveEditor(side, null);
        }
      }
      editorRef.current = null;
    };
  }, [tabId, side, setActiveEditor]);
  const [state, setState] = useState<YamlSmartViewState>({
    documents: [],
    activeDocumentIndex: 0,
    selectedNodePath: null,
    anchors: new Map(),
    searchQuery: '',
    error: null,
    canUndo: false,
    canRedo: false,
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

  // Update editor content when prop changes (but avoid infinite loops)
  useEffect(() => {
    if (editorRef.current) {
      // Add safety checks for test environment
      if (editorRef.current.getValue && typeof editorRef.current.getValue === 'function') {
        const currentValue = editorRef.current.getValue();
        if (currentValue !== content) {
          // Use model.setValue to avoid triggering change events
          if (editorRef.current.getModel && typeof editorRef.current.getModel === 'function') {
            const model = editorRef.current.getModel();
            if (model && model.setValue && typeof model.setValue === 'function') {
              model.setValue(content);
            }
          }
        }
      }
    }
  }, [content]);

  // Update undo/redo state when editor changes
  const updateUndoRedoState = useCallback(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      try {
        // Check if undo/redo actions are enabled by attempting to get their status (with safety checks for tests)
        if (editor.getAction && typeof editor.getAction === 'function') {
          const canUndo = editor.getAction('undo')?.isSupported() ?? false;
          const canRedo = editor.getAction('redo')?.isSupported() ?? false;

          setState(prev => ({ ...prev, canUndo, canRedo }));
        } else {
          // Fallback for test environment
          setState(prev => ({ ...prev, canUndo: false, canRedo: false }));
        }
      } catch {
        // Fallback - assume no undo/redo available in tests
        setState(prev => ({ ...prev, canUndo: false, canRedo: false }));
      }
    }
  }, []);

  // Handle editor ready
  const handleEditorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    setActiveEditor(side, editor);

    // Set up focus listener to track active editor (with safety checks for tests)
    if (editor.onDidFocusEditorWidget && typeof editor.onDidFocusEditorWidget === 'function') {
      editor.onDidFocusEditorWidget(() => {
        setActiveEditor(side, editor);
      });
    }

    // Set initial content WITHOUT triggering change events (with safety check for tests)
    if (editor.getModel && typeof editor.getModel === 'function') {
      const model = editor.getModel();
      if (model && model.getValue() !== content) {
        model.setValue(content);
      }
    }

    // Listen for content changes to sync with parent (with safety checks for tests)
    if (editor.onDidChangeModelContent && typeof editor.onDidChangeModelContent === 'function') {
      editor.onDidChangeModelContent(() => {
        if (editor.getValue && typeof editor.getValue === 'function') {
          const newContent = editor.getValue();
          onContentChange(newContent);
          updateUndoRedoState();
        }
      });
    }

    // Listen for undo/redo state changes (with safety checks for tests)
    if (editor.getModel && typeof editor.getModel === 'function') {
      const model = editor.getModel();
      if (model && model.onDidChangeContent && typeof model.onDidChangeContent === 'function') {
        model.onDidChangeContent(() => {
          updateUndoRedoState();
        });
      }
    }

    // Initial undo/redo state
    updateUndoRedoState();

    // Set up cursor position listener for tree sync (with safety checks for tests)
    if (editor.onDidChangeCursorPosition && typeof editor.onDidChangeCursorPosition === 'function') {
      editor.onDidChangeCursorPosition((e) => {
        if (!activeDocument) return;

        const lineNumber = e.position.lineNumber;
        const nodePath = findNodePathByLine(activeDocument.nodes, lineNumber);

        if (nodePath !== state.selectedNodePath) {
          setState(prev => ({ ...prev, selectedNodePath: nodePath }));
        }
      });
    }

    // Configure YAML language features
    editor.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderWhitespace: 'boundary',
    });
  }, [activeDocument, state.selectedNodePath, content, onContentChange, updateUndoRedoState, side, setActiveEditor]);

  // Handle tree node selection
  const handleNodeSelect = useCallback((nodePath: string) => {
    if (!activeDocument || !editorRef.current) return;

    const node = findNodeByPath(activeDocument.nodes, nodePath);
    if (node && node.line !== undefined) {
      // Scroll to and highlight the line in the editor (with safety checks for tests)
      if (editorRef.current.revealLineInCenter && typeof editorRef.current.revealLineInCenter === 'function') {
        editorRef.current.revealLineInCenter(node.line);
      }
      if (editorRef.current.setPosition && typeof editorRef.current.setPosition === 'function') {
        editorRef.current.setPosition({ lineNumber: node.line, column: 1 });
      }

      // Highlight the range if available (with safety checks for tests)
      if (node.endLine !== undefined && editorRef.current.setSelection && typeof editorRef.current.setSelection === 'function') {
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
      // Navigate to anchor definition (with safety checks for tests)
      if (editorRef.current.revealLineInCenter && typeof editorRef.current.revealLineInCenter === 'function') {
        editorRef.current.revealLineInCenter(anchorInfo.definitionLine);
      }
      if (editorRef.current.setPosition && typeof editorRef.current.setPosition === 'function') {
        editorRef.current.setPosition({
          lineNumber: anchorInfo.definitionLine,
          column: anchorInfo.definitionColumn || 1
        });
      }
    } else {
      // Navigate to first alias usage (with safety checks for tests)
      if (anchorInfo.usages.length > 0) {
        const firstUsage = anchorInfo.usages[0];
        if (editorRef.current.revealLineInCenter && typeof editorRef.current.revealLineInCenter === 'function') {
          editorRef.current.revealLineInCenter(firstUsage.line);
        }
        if (editorRef.current.setPosition && typeof editorRef.current.setPosition === 'function') {
          editorRef.current.setPosition({
            lineNumber: firstUsage.line,
            column: firstUsage.column || 1
          });
        }
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

  const handleSearchChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  }, []);

  // Handle undo/redo
  const handleUndo = useCallback(() => {
    if (editorRef.current && state.canUndo) {
      // Add safety check for test environment
      if (editorRef.current.trigger && typeof editorRef.current.trigger === 'function') {
        editorRef.current.trigger('keyboard', 'undo', null);
      }
    }
  }, [state.canUndo]);

  const handleRedo = useCallback(() => {
    if (editorRef.current && state.canRedo) {
      // Add safety check for test environment
      if (editorRef.current.trigger && typeof editorRef.current.trigger === 'function') {
        editorRef.current.trigger('keyboard', 'redo', null);
      }
    }
  }, [state.canRedo]);

  // Show failsafe UI with error notification when parsing fails
  const showFailsafeUI = state.error !== null;

  return (
    <div className="flex flex-col h-full bg-surface text-main" data-testid="yaml-smart-view">
      {/* Error notification bar */}
      {showFailsafeUI && (
        <div className="flex items-center justify-between px-4 py-2 bg-danger-subtle border-b border-danger text-danger">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <span className="font-medium">YAML Parse Error:</span>
              <span className="ml-2 text-sm">{state.error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <YamlToolbar
        searchQuery={state.searchQuery}
        onSearchChange={handleSearchChange}
        documentCount={state.documents.length}
        activeDocument={activeDocument}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        hasError={showFailsafeUI}
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
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        {/* Left pane: Tree view */}
        <Panel defaultSize={25} minSize={15} maxSize={50}>
          <PanelGroup direction="vertical">
            {/* Tree view */}
            <Panel defaultSize={70} minSize={30}>
              <div className="border-r border-base flex flex-col h-full">
                {showFailsafeUI ? (
                  <div className="flex items-center justify-center h-full text-secondary p-4">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Tree view unavailable</p>
                      <p className="text-xs text-muted mt-1">Fix YAML syntax to see structure</p>
                    </div>
                  </div>
                ) : activeDocument ? (
                  <YamlTreeView
                    nodes={activeDocument.nodes}
                    selectedPath={state.selectedNodePath}
                    searchQuery={state.searchQuery}
                    onNodeSelect={handleNodeSelect}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-secondary">
                    <p className="text-sm">No YAML content</p>
                  </div>
                )}
              </div>
            </Panel>

            {/* Resize handle */}
            <PanelResizeHandle className="h-1 bg-element hover:bg-info transition-colors cursor-row-resize" />

            {/* Node details panel */}
            <Panel defaultSize={30} minSize={20}>
              <div className="border-r border-base border-t border-base h-full overflow-auto custom-scrollbar bg-surface-secondary">
                <NodeDetails selectedNode={findNodeByPath(activeDocument?.nodes || [], state.selectedNodePath)} />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        {/* Resize handle */}
        <PanelResizeHandle className="w-1 bg-element hover:bg-info transition-colors cursor-col-resize" />

        {/* Right pane: Monaco editor */}
        <Panel minSize={30}>
          <div className="flex-1 flex flex-col h-full">
            <Editor
              height="100%"
              language="yaml"
              value={content}
              theme="vs-dark"
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                renderWhitespace: 'boundary',
                folding: true,
                lineNumbers: 'on',
                glyphMargin: true,
                fontSize: 14,
                automaticLayout: true,
                copyWithSyntaxHighlighting: false,
                formatOnPaste: true,
                formatOnType: true,
                find: {
                  addExtraSpaceOnTop: false,
                },
              }}
            />
          </div>
        </Panel>
      </PanelGroup>

      {/* Anchor Navigator (bottom panel) */}
      {!showFailsafeUI && state.anchors.size > 0 && (
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

function findNodeByPath(nodes: YamlNode[], targetPath: string | null): YamlNode | null {
  if (!targetPath) return null;

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