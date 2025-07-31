import React, { useRef, useEffect, useState, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { SmartViewProps } from "../../../views/registry";
import { Toolbar } from "./components/Toolbar";
import { Navigator } from "./components/Navigator";
import { Toolbox } from "./components/Toolbox";
import { validateJson } from "../validation";
import { useJsonModals } from "../hooks/useJsonModals";
import { useRootStore } from "../../../stores";
import { Tab } from "../../../types";
import { useActiveEditorStore } from "../../../stores/activeEditorStore";

export const JsonSmartView: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive,
  side,
}) => {
  const { setActiveEditor } = useActiveEditorStore();
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
      setEditor(null);
      editorRef.current = null;
    };
  }, [tabId, side, setActiveEditor]);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Initialize JSON modals
  const { renderModal } = useJsonModals();
  
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
      setActiveEditor(side, editor);

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
    [content, onContentChange, updateUndoRedoState, side, setActiveEditor],
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

  const handlePathChange = useCallback((path: string) => {
    setCurrentPath(path);
    // TODO: Implement scrolling to path in editor
  }, []);

  const handleNodeSelect = useCallback((path: string) => {
    setCurrentPath(path);
    // TODO: Implement highlighting and scrolling to the selected node in the editor
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200">
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
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Navigator Panel */}
        <div className="hidden lg:flex w-80 border-r border-gray-700 flex-col">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">Navigator</h3>
          </div>
          <div className="flex-1 overflow-hidden">
            <Navigator
              content={content}
              onNodeSelect={handleNodeSelect}
            />
          </div>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">Editor</h3>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language="json"
              theme="vs-dark"
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

        {/* Toolbox Panel */}
        <div className="hidden lg:flex w-80 border-l border-gray-700 flex-col">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">Toolbox</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Toolbox
              editor={editor}
              onContentChange={onContentChange}
              addTab={addTab}
            />
          </div>
        </div>
      </div>
      
      {/* Render modals */}
      {renderModal()}
    </div>
  );
};