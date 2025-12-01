import React, { useRef, useEffect, useState, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { parse as parseWithSourceMap } from "json-source-map";
import { SmartViewProps } from "../../../views/registry";
import { Toolbar } from "./components/Toolbar";
import { Navigator } from "./components/Navigator";
import { Toolbox } from "./components/Toolbox";
import { Insights } from "./components/Insights";
import { QueryPanel } from "./components/QueryPanel";
import { validateJson } from "../validation";
import { useJsonModals } from "../hooks/useJsonModals";
import { useRootStore } from "../../../stores";
import { Tab } from "../../../types";
import { useActiveEditorStore } from "../../../stores/activeEditorStore";
import { useDiffModalStore } from "../../../stores/diffModalStore";
import { ContentDiffModal } from "../../../components/ContentDiffModal";
import { useQueryPanelStore } from "../stores/useQueryPanelStore";
import { useThemeStore } from "../../../stores/themeStore";

/**
 * Converts a dot-notation path (e.g., "users[1].name") to a JSON Pointer (e.g., "/users/1/name")
 * JSON Pointers use "/" as separator and are used by json-source-map
 */
const pathToJsonPointer = (path: string): string => {
  if (!path || !path.trim()) return '';

  // Replace array brackets with dots, then split on dots
  // "users[1].name" -> "users.1.name" -> ["users", "1", "name"]
  const normalized = path.trim().replace(/\[/g, '.').replace(/\]/g, '');
  const parts = normalized.split('.').filter(Boolean).map(part => part.trim());

  // Convert to JSON Pointer format: "/users/1/name"
  return '/' + parts.join('/');
};

export const JsonSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive,
  side,
}) => {
  const { setActiveEditor } = useActiveEditorStore();
  const { isDarkMode } = useThemeStore();
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'toolbox' | 'insights'>('toolbox');

  // Initialize JSON modals
  const { renderModal } = useJsonModals();

  // Get diff modal state
  const diffModalState = useDiffModalStore();

  // Get query panel state for this specific tab
  const { getStateForTab, setPanelSizes } = useQueryPanelStore();
  const { isOpen: isQueryPanelOpen, panelSizes } = getStateForTab(tabId);

  // Get addBackgroundTab function from root store for background tab creation
  const { addBackgroundTab: rootAddBackgroundTab } = useRootStore();

  // Create wrapper to match expected signature for modals (creates background tabs)
  const addTab = useCallback((tab: Tab) => {
    rootAddBackgroundTab(tab, false); // Add to left side by default, in background
  }, [rootAddBackgroundTab]);

  // Validate JSON whenever content changes
  useEffect(() => {
    const validation = validateJson(content);
    setIsValid(validation.isValid);
    setValidationError(validation.error || null);
  }, [content]);

  // Update undo/redo state when editor changes
  const updateUndoRedoState = useCallback(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      try {
        // Check if undo/redo actions are enabled by attempting to get their status
        const canUndo = editor.getAction('undo')?.isSupported() ?? false;
        const canRedo = editor.getAction('redo')?.isSupported() ?? false;

        setCanUndo(canUndo);
        setCanRedo(canRedo);
      } catch {
        // Fallback - assume undo is available after content changes, redo is not
        setCanUndo(true);
        setCanRedo(false);
      }
    }
  }, []);

  const handleEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof import("monaco-editor/esm/vs/editor/editor.api")) => {
      editorRef.current = editor;
      setEditor(editor);

      if (isActive) {
        setActiveEditor(side, editor);
      }

      editor.onDidFocusEditorWidget(() => {
        setActiveEditor(side, editor);
      });

      // Set initial content WITHOUT triggering change events
      const model = editor.getModel();
      if (model && model.getValue() !== content) {
        model.setValue(content);
      }

      // Listen for content changes
      editor.onDidChangeModelContent(() => {
        const newContent = editor.getValue();
        onContentChange(newContent);
        updateUndoRedoState();
      });

      // Listen for undo/redo state changes
      if (model) {
        model.onDidChangeContent(() => {
          updateUndoRedoState();
        });
      }

      // Initial undo/redo state
      updateUndoRedoState();
    },
    [content, onContentChange, updateUndoRedoState, side, setActiveEditor, isActive],
  );

  // Update editor content when prop changes (but avoid infinite loops)
  useEffect(() => {
    if (editor) {
      const currentValue = editor.getValue();
      if (currentValue !== content) {
        // Use model.setValue to avoid triggering change events
        const model = editor.getModel();
        if (model) {
          model.setValue(content);
        }
      }
    }
  }, [content, editor]);

  // Handle tab activation/deactivation
  useEffect(() => {
    if (editor && isActive) {
      setActiveEditor(side, editor);
    }
  }, [isActive, editor, side, setActiveEditor]);

  const handleUndo = useCallback(() => {
    if (editor && canUndo) {
      editor.trigger("keyboard", "undo", null);
    }
  }, [editor, canUndo]);

  const handleRedo = useCallback(() => {
    if (editor && canRedo) {
      editor.trigger("keyboard", "redo", null);
    }
  }, [editor, canRedo]);

  /**
   * Navigates to a specific JSON path using structure-aware parsing with json-source-map
   * @param path - JSON path in dot notation (e.g., "data.items[1].name")
   */
  const navigateToPath = useCallback((path: string) => {
    if (!editor || !path.trim()) return;

    const model = editor.getModel();
    if (!model) return;

    try {
      const content = model.getValue();

      // Parse JSON with source map to get exact line/column positions
      const { pointers } = parseWithSourceMap(content);

      // Convert dot notation path to JSON Pointer format
      const jsonPointer = pathToJsonPointer(path);

      // Look up the exact position in the source map
      const location = pointers[jsonPointer];

      if (location && location.key) {
        // Navigate to the key position (property name)
        const targetLine = location.key.line + 1; // Convert 0-indexed to 1-indexed
        const targetColumn = location.key.column + 1;

        // Create selection range from key start to value end
        const range = new monaco.Range(
          targetLine,
          targetColumn,
          location.valueEnd.line + 1,
          location.valueEnd.column + 1
        );

        editor.setPosition({ lineNumber: targetLine, column: targetColumn });
        editor.revealLineInCenter(targetLine);
        editor.setSelection(range);
        editor.focus();
      } else {
        // If no key (e.g., root or array item), use value position
        if (location && location.value) {
          const targetLine = location.value.line + 1;
          const targetColumn = location.value.column + 1;

          const range = new monaco.Range(
            targetLine,
            targetColumn,
            location.valueEnd.line + 1,
            location.valueEnd.column + 1
          );

          editor.setPosition({ lineNumber: targetLine, column: targetColumn });
          editor.revealLineInCenter(targetLine);
          editor.setSelection(range);
          editor.focus();
        } else {
          console.warn(`Path not found in JSON structure: ${path} (pointer: ${jsonPointer})`);
        }
      }
    } catch (error) {
      console.error("Failed to navigate to path:", error);
      // Silently fail - invalid JSON or parsing error
    }
  }, [editor]);

  const handlePathChange = useCallback((path: string) => {
    setCurrentPath(path);
    navigateToPath(path);
  }, [navigateToPath]);

  const handleNodeSelect = useCallback((path: string) => {
    setCurrentPath(path);
    navigateToPath(path);
  }, [navigateToPath]);

  return (
    <div className="flex flex-col h-full bg-surface text-main" data-testid="json-smart-view-container">
      {/* Toolbar */}
      <Toolbar
        isValid={isValid}
        validationError={validationError}
        currentPath={currentPath}
        onPathChange={handlePathChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        editor={editor}
        onContentChange={onContentChange}
        tabId={tabId}
      />

      {/* Main Content Area with Query Panel */}
      <PanelGroup
        direction="vertical"
        className="flex-1"
        onLayout={(sizes: number[]) => setPanelSizes(tabId, sizes)}
      >
        {/* Main Content Panel */}
        <Panel minSize={30}>
          <div className="flex h-full">
            {/* Navigator Panel */}
            <div className="hidden lg:flex w-96 border-r border-base flex-col bg-surface-secondary">
              <div className="p-3 border-b border-base">
                <h3 className="text-sm font-medium text-main">Navigator</h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <Navigator
                  content={content}
                  onNodeSelect={handleNodeSelect}
                />
              </div>
            </div>

            {/* Editor Panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-surface">
              <div className="p-3 border-b border-base bg-surface-secondary">
                <h3 className="text-sm font-medium text-main">Editor</h3>
              </div>
              <div className="flex-1">
                <Editor
                  key={`json-editor-${tabId}-${side}`}
                  height="100%"
                  language="json"
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
                    find: {
                      addExtraSpaceOnTop: false,
                    },
                  }}
                />
              </div>
            </div>

            {/* Right Panel - Toolbox & Insights */}
            <div className="hidden lg:flex w-52 border-l border-base flex-col bg-surface-secondary">
              {/* Tab Headers */}
              <div className="flex border-b border-base">
                <button
                  onClick={() => setActiveRightTab('toolbox')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${activeRightTab === 'toolbox'
                      ? 'text-info bg-info-subtle border-b-2 border-info'
                      : 'text-muted hover:text-main hover:bg-element-hover'
                    }`}
                >
                  Toolbox
                </button>
                <button
                  onClick={() => setActiveRightTab('insights')}
                  className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${activeRightTab === 'insights'
                      ? 'text-info bg-info-subtle border-b-2 border-info'
                      : 'text-muted hover:text-main hover:bg-element-hover'
                    }`}
                >
                  Insights
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeRightTab === 'toolbox' ? (
                  <div className="h-full overflow-y-auto custom-scrollbar">
                    <Toolbox
                      editor={editor}
                      onContentChange={onContentChange}
                      addTab={addTab}
                    />
                  </div>
                ) : (
                  <Insights content={content} addTab={addTab} />
                )}
              </div>
            </div>
          </div>
        </Panel>

        {/* Query Panel (Conditionally Rendered) */}
        {isQueryPanelOpen && (
          <>
            <PanelResizeHandle className="h-1 bg-element hover:bg-info transition-colors cursor-row-resize" />
            <Panel defaultSize={50} minSize={45} maxSize={70}>
              <QueryPanel content={content} addTab={addTab} tabId={tabId} />
            </Panel>
          </>
        )}
      </PanelGroup>

      {/* Render modals */}
      {renderModal()}

      {/* Render diff modal if open and content-based */}
      {diffModalState.isOpen && diffModalState.leftContent && diffModalState.rightContent && (
        <ContentDiffModal
          leftContent={diffModalState.leftContent}
          rightContent={diffModalState.rightContent}
          leftTitle={diffModalState.leftLabel || "Left"}
          rightTitle={diffModalState.rightLabel || "Right"}
          language="json"
          onClose={(updatedContent) => {
            if (diffModalState.onClose) {
              diffModalState.onClose(updatedContent);
            }
            diffModalState.closeDiffModal();
          }}
        />
      )}
    </div>
  );
};