import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { SmartViewProps } from "../../../views/registry";
import { useActiveEditorStore } from "../../../stores/activeEditorStore";
import { useRootStore } from "../../../stores";
import { useThemeStore } from "../../../stores/themeStore";
import { Tab } from "../../../types";
import { formatXml, minifyXml } from "../utils/xmlFormatter";
import { convertXmlToJson } from "../utils/xmlToJson";
import { XmlNodeInfo } from "./types";
import { useXmlData } from "./hooks/useXmlData";
import { findNodeAtPosition } from "../utils/xmlPath";
import { useXmlSmartViewStore } from "../stores/useXmlSmartViewStore";
import { XmlToolbar } from "./components/XmlToolbar";
import { XmlTreeView } from "./components/XmlTreeView";
import { XmlNodeDetails } from "./components/XmlNodeDetails";
import { XmlDiagnosticsPanel } from "./components/XmlDiagnosticsPanel";
import { XPathWorkbench } from "./components/XPathWorkbench";

// Persists Monaco view state (scroll, cursor, folds) across unmounts; not suitable for Zustand
const editorViewStates = new Map<string, monaco.editor.ICodeEditorViewState | null>();

export const XmlSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive,
  side,
}) => {
  const parsed = useXmlData(content);
  const parsedRef = useRef(parsed);
  parsedRef.current = parsed;
  const { isDarkMode } = useThemeStore();
  const { setActiveEditor } = useActiveEditorStore();
  const { addBackgroundTab } = useRootStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);

  const xmlStore = useXmlSmartViewStore();
  const tabState = xmlStore.getStateForTab(tabId);
  const search = tabState.search;
  const selectedNodeId = tabState.selectedNodeId;
  const bottomTab = tabState.bottomTab;
  const xpathExpression = tabState.xpathExpression;
  const expandedNodeIds = useMemo(() => new Set(tabState.expandedNodeIds), [tabState.expandedNodeIds]);
  const treeScrollTop = tabState.treeScrollTop;

  const setSearch = useCallback((v: string) => xmlStore.setSearch(tabId, v), [tabId, xmlStore]);
  const setSelectedNodeId = useCallback((v: string) => xmlStore.setSelectedNodeId(tabId, v), [tabId, xmlStore]);
  const setBottomTab = useCallback((v: "diagnostics" | "xpath") => xmlStore.setBottomTab(tabId, v), [tabId, xmlStore]);
  const setXpathExpression = useCallback((v: string) => xmlStore.setXpathExpression(tabId, v), [tabId, xmlStore]);

  const handleToggleExpand = useCallback(
    (nodeId: string, expanded: boolean) => {
      const next = new Set(xmlStore.getStateForTab(tabId).expandedNodeIds);
      if (expanded) {
        next.add(nodeId);
      } else {
        next.delete(nodeId);
      }
      xmlStore.setExpandedNodeIds(tabId, Array.from(next));
    },
    [tabId, xmlStore],
  );

  const handleTreeScroll = useCallback(
    (scrollTop: number) => xmlStore.setTreeScrollTop(tabId, scrollTop),
    [tabId, xmlStore],
  );

  const selectedNode = useMemo(
    () => parsed.nodesById.get(selectedNodeId) ?? parsed.root.children[0] ?? parsed.root,
    [parsed.nodesById, parsed.root, selectedNodeId],
  );

  useEffect(() => {
    if (!parsed.nodesById.has(selectedNodeId)) {
      setSelectedNodeId(parsed.root.children[0]?.id ?? parsed.root.id);
    }
  }, [parsed.nodesById, parsed.root, selectedNodeId]);

  // Save editor view state on unmount so it can be restored when switching back
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorViewStates.set(tabId, editorRef.current.saveViewState());
      }
    };
  }, [tabId]);

  const createBackgroundTab = useCallback(
    (title: string, tabContent: string, language: string) => {
      const tab: Tab = {
        id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `xml-${Date.now()}`,
        title,
        content: tabContent,
        language,
      } as Tab;
      addBackgroundTab(tab, side === "right");
    },
    [addBackgroundTab, side],
  );

  const handleEditorMount = useCallback(
    (mountedEditor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = mountedEditor;
      setEditor(mountedEditor);

      if (isActive) {
        setActiveEditor(side, mountedEditor);
      }

      mountedEditor.onDidFocusEditorWidget(() => {
        setActiveEditor(side, mountedEditor);
      });

      const model = mountedEditor.getModel();
      if (model && model.getValue() !== content) {
        model.setValue(content);
      }

      // Restore view state (scroll, cursor, folds) from before the tab switch
      const savedViewState = editorViewStates.get(tabId);
      if (savedViewState) {
        mountedEditor.restoreViewState(savedViewState);
      }

      mountedEditor.onDidChangeModelContent(() => {
        onContentChange(mountedEditor.getValue());
      });

      mountedEditor.onDidChangeCursorPosition((e) => {
        const node = findNodeAtPosition(
          parsedRef.current.root,
          e.position.lineNumber,
          e.position.column,
        );
        if (node) {
          setSelectedNodeId(node.id);
        }
      });
    },
    [content, isActive, onContentChange, setActiveEditor, side, tabId],
  );

  useEffect(() => {
    if (!editor) return;
    const model = editor.getModel();
    if (model && model.getValue() !== content) {
      editor.executeEdits("xml-smart-view-sync", [{ range: model.getFullModelRange(), text: content }]);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor && isActive) {
      setActiveEditor(side, editor);
    }
  }, [editor, isActive, setActiveEditor, side]);

  const applyEditorContent = useCallback(
    (nextContent: string) => {
      if (editor) {
        editor.executeEdits("xml-smart-view", [
          {
            range: editor.getModel()?.getFullModelRange() ?? new monaco.Range(1, 1, 1, 1),
            text: nextContent,
          },
        ]);
      } else {
        onContentChange(nextContent);
      }
    },
    [editor, onContentChange],
  );

  const handleFormat = useCallback(() => {
    applyEditorContent(formatXml(content, { indentSize: 2, preserveComments: true }));
  }, [applyEditorContent, content]);

  const handleMinify = useCallback(() => {
    applyEditorContent(minifyXml(content));
  }, [applyEditorContent, content]);

  const handleOpenJson = useCallback(() => {
    const converted = convertXmlToJson(content, {
      attributeKey: "@attributes",
      textKey: "#text",
      cdataKey: "#cdata",
      arrayMode: "repeated-only",
      namespaceMode: "prefix",
    });
    createBackgroundTab("Converted XML.json", JSON.stringify(converted, null, 2), "json");
  }, [content, createBackgroundTab]);

  const handleSelectNode = useCallback(
    (node: XmlNodeInfo) => {
      setSelectedNodeId(node.id);
      if (editor && node.range) {
        const range = new monaco.Range(
          node.range.startLine,
          node.range.startColumn,
          node.range.endLine,
          node.range.endColumn,
        );
        editor.setSelection(range);
        editor.revealLineInCenter(node.range.startLine);
      }
    },
    [editor],
  );

  const handleJumpToLine = useCallback(
    (line: number, column = 1) => {
      if (!editor) return;
      editor.setPosition({ lineNumber: line, column });
      editor.revealLineInCenter(line);
      editor.focus();
    },
    [editor],
  );

  return (
    <div className="flex h-full flex-col bg-canvas text-main" data-testid="xml-smart-view-container">
      <XmlToolbar
        parsed={parsed}
        search={search}
        onSearchChange={setSearch}
        onFormat={handleFormat}
        onMinify={handleMinify}
        onOpenJson={handleOpenJson}
      />

      <PanelGroup direction="vertical" className="min-h-0 flex-1">
        <Panel minSize={35}>
          <PanelGroup direction="horizontal">
            <Panel defaultSize={26} minSize={16} maxSize={42} className="hidden lg:block">
              <div className="flex h-full flex-col border-r border-base bg-surface-secondary">
                <div className="border-b border-base p-3">
                  <h2 className="text-sm font-medium text-main">XML Structure</h2>
                </div>
                <XmlTreeView
                  root={parsed.root}
                  search={search}
                  selectedNodeId={selectedNode.id}
                  onSelectNode={handleSelectNode}
                  expandedNodeIds={expandedNodeIds}
                  onToggleExpand={handleToggleExpand}
                  treeScrollTop={treeScrollTop}
                  onTreeScroll={handleTreeScroll}
                />
              </div>
            </Panel>

            <PanelResizeHandle className="hidden w-1 cursor-col-resize bg-element transition-colors hover:bg-info lg:block" />

            <Panel defaultSize={50} minSize={35}>
              <div className="flex h-full min-w-0 flex-col bg-surface">
                <div className="border-b border-base bg-surface-secondary p-3">
                  <h2 className="text-sm font-medium text-main">Editor</h2>
                </div>
                <div className="min-h-0 flex-1">
                  <Editor
                    key={`xml-editor-${tabId}-${side}`}
                    height="100%"
                    language="xml"
                    theme={isDarkMode ? "vs-dark" : "vs"}
                    onMount={handleEditorMount}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      wordWrap: "on",
                      automaticLayout: true,
                      copyWithSyntaxHighlighting: false,
                      scrollBeyondLastLine: true,
                      formatOnPaste: true,
                      formatOnType: true,
                      find: { addExtraSpaceOnTop: false },
                    }}
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="hidden w-1 cursor-col-resize bg-element transition-colors hover:bg-info lg:block" />

            <Panel defaultSize={24} minSize={18} maxSize={34} className="hidden lg:block">
              <div className="h-full border-l border-base bg-surface-secondary">
                <XmlNodeDetails node={selectedNode} content={parsed.debouncedContent} />
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="h-1 cursor-row-resize bg-element transition-colors hover:bg-info" />

        <Panel defaultSize={32} minSize={18} maxSize={55}>
          <div className="flex h-full flex-col bg-surface">
            <div className="flex border-t border-base bg-surface-secondary">
              <button
                type="button"
                data-testid="xml-bottom-tab-diagnostics"
                onClick={() => setBottomTab("diagnostics")}
                className={`px-4 py-2 text-xs font-medium ${
                  bottomTab === "diagnostics"
                    ? "border-b-2 border-info bg-info-subtle text-info"
                    : "text-muted hover:bg-element-hover hover:text-main"
                }`}
              >
                Diagnostics
              </button>
              <button
                type="button"
                data-testid="xml-bottom-tab-xpath"
                onClick={() => setBottomTab("xpath")}
                className={`px-4 py-2 text-xs font-medium ${
                  bottomTab === "xpath"
                    ? "border-b-2 border-info bg-info-subtle text-info"
                    : "text-muted hover:bg-element-hover hover:text-main"
                }`}
              >
                XPath
              </button>
            </div>
            <div className="min-h-0 flex-1">
              {bottomTab === "diagnostics" ? (
                <XmlDiagnosticsPanel parsed={parsed} onJumpToLine={handleJumpToLine} />
              ) : (
                <XPathWorkbench
                  parsed={parsed}
                  onOpenBackgroundTab={createBackgroundTab}
                  expression={xpathExpression}
                  onExpressionChange={setXpathExpression}
                />
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};
