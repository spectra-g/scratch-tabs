import React, { useState, useCallback, useRef, useEffect } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import * as jsYaml from "js-yaml";
import { parse } from "smol-toml";
import { SmartViewProps } from "../../../views/registry";
import { TomlTreeView } from "./components/TomlTreeView";
import { TomlToolbar } from "./components/TomlToolbar";
import { NodeDetails } from "./components/NodeDetails";
import { useTomlData } from "./hooks/useTomlData";
import { TomlNode } from "./types";
import { useActiveEditorStore } from "../../../stores/activeEditorStore";
import { useThemeStore } from "../../../stores/themeStore";
import { useRootStore } from "../../../stores/rootStore";
import { createTab } from "../../../utils/tabUtils";

interface TomlSmartViewState {
  selectedNodePath: string | null;
  searchQuery: string;
  canUndo: boolean;
  canRedo: boolean;
}

export const TomlSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId: _tabId,
  isActive: _isActive,
  side,
}) => {
  const { setActiveEditor } = useActiveEditorStore();
  const { isDarkMode } = useThemeStore();
  const { addBackgroundTab } = useRootStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const [state, setState] = useState<TomlSmartViewState>({
    selectedNodePath: null,
    searchQuery: "",
    canUndo: false,
    canRedo: false,
  });

  const { nodes, error } = useTomlData(content);

  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor) {
        const current = useActiveEditorStore.getState();
        const active = side === "left" ? current.activeLeftEditor : current.activeRightEditor;
        if (active === editor) setActiveEditor(side, null);
      }
      editorRef.current = null;
    };
  }, [side, setActiveEditor]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (typeof editor.getValue !== "function") return;
    if (editor.getValue() === content) return;
    const model = editor.getModel?.();
    if (model && typeof model.setValue === "function") {
      model.setValue(content);
    }
  }, [content]);

  const updateUndoRedoState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || typeof editor.getAction !== "function") return;
    try {
      const canUndo = editor.getAction("undo")?.isSupported() ?? false;
      const canRedo = editor.getAction("redo")?.isSupported() ?? false;
      setState((prev) => ({ ...prev, canUndo, canRedo }));
    } catch {
      setState((prev) => ({ ...prev, canUndo: false, canRedo: false }));
    }
  }, []);

  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      setActiveEditor(side, editor);

      editor.onDidFocusEditorWidget?.(() => setActiveEditor(side, editor));

      const model = editor.getModel?.();
      if (model && model.getValue() !== content) model.setValue(content);

      editor.onDidChangeModelContent?.(() => {
        if (typeof editor.getValue === "function") {
          onContentChange(editor.getValue());
          updateUndoRedoState();
        }
      });

      editor.updateOptions({
        wordWrap: "on",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        renderWhitespace: "boundary",
      });

      updateUndoRedoState();
    },
    [content, onContentChange, updateUndoRedoState, side, setActiveEditor],
  );

  const handleNodeSelect = useCallback((path: string) => {
    setState((prev) => ({ ...prev, selectedNodePath: path }));
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handleUndo = useCallback(() => {
    if (editorRef.current && state.canUndo) {
      editorRef.current.trigger?.("keyboard", "undo", null);
    }
  }, [state.canUndo]);

  const handleRedo = useCallback(() => {
    if (editorRef.current && state.canRedo) {
      editorRef.current.trigger?.("keyboard", "redo", null);
    }
  }, [state.canRedo]);

  const handleConvertToJson = useCallback(() => {
    try {
      const parsed = parse(content);
      const json = JSON.stringify(parsed, null, 2);
      addBackgroundTab(createTab({ title: "TOML as JSON", content: json, language: "json" }));
    } catch {
      // error already shown in toolbar
    }
  }, [content, addBackgroundTab]);

  const handleConvertToYaml = useCallback(() => {
    try {
      const parsed = parse(content);
      const yaml = jsYaml.dump(parsed, { indent: 2 });
      addBackgroundTab(createTab({ title: "TOML as YAML", content: yaml, language: "yaml" }));
    } catch {
      // error already shown in toolbar
    }
  }, [content, addBackgroundTab]);

  const selectedNode = findNodeByPath(nodes, state.selectedNodePath);
  const nodeCount = countNodes(nodes);
  const hasError = error !== null;

  return (
    <div className="flex flex-col h-full bg-surface text-main" data-testid="toml-smart-view">
      {hasError && (
        <div className="flex items-center px-4 py-2 bg-danger-subtle border-b border-danger text-danger">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">TOML Parse Error:</span>
          <span className="ml-2 text-sm">{error}</span>
        </div>
      )}

      <TomlToolbar
        searchQuery={state.searchQuery}
        onSearchChange={handleSearchChange}
        nodeCount={nodeCount}
        canUndo={state.canUndo}
        canRedo={state.canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onConvertToJson={handleConvertToJson}
        onConvertToYaml={handleConvertToYaml}
        hasError={hasError}
      />

      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={25} minSize={15} maxSize={50}>
          <PanelGroup direction="vertical">
            <Panel defaultSize={70} minSize={30}>
              <div className="border-r border-base flex flex-col h-full">
                {hasError ? (
                  <div className="flex items-center justify-center h-full text-secondary p-4">
                    <div className="text-center">
                      <p className="text-sm">Tree view unavailable</p>
                      <p className="text-xs text-muted mt-1">Fix TOML syntax to see structure</p>
                    </div>
                  </div>
                ) : (
                  <TomlTreeView
                    nodes={nodes}
                    selectedPath={state.selectedNodePath}
                    searchQuery={state.searchQuery}
                    onNodeSelect={handleNodeSelect}
                  />
                )}
              </div>
            </Panel>

            <PanelResizeHandle className="h-1 bg-element hover:bg-info transition-colors cursor-row-resize" />

            <Panel defaultSize={30} minSize={20}>
              <div className="border-r border-base border-t border-base h-full overflow-auto custom-scrollbar bg-surface-secondary">
                <NodeDetails selectedNode={selectedNode} />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-1 bg-element hover:bg-info transition-colors cursor-col-resize" />

        <Panel minSize={30}>
          <div className="flex-1 flex flex-col h-full">
            <Editor
              height="100%"
              language="toml"
              value={content}
              theme={isDarkMode ? "vs-dark" : "vs"}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                wordWrap: "on",
                scrollBeyondLastLine: false,
                renderWhitespace: "boundary",
                folding: true,
                lineNumbers: "on",
                fontSize: 14,
                automaticLayout: true,
                copyWithSyntaxHighlighting: false,
                find: { addExtraSpaceOnTop: false },
              }}
            />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

function findNodeByPath(nodes: TomlNode[], targetPath: string | null): TomlNode | null {
  if (!targetPath) return null;
  for (const node of nodes) {
    if (node.path === targetPath) return node;
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath);
      if (found) return found;
    }
  }
  return null;
}

function countNodes(nodes: TomlNode[]): number {
  let count = nodes.length;
  for (const node of nodes) {
    if (node.children) count += countNodes(node.children);
  }
  return count;
}
