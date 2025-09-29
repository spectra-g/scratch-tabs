import React, { useRef, useEffect, useState, useCallback } from "react";
import { Editor } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { SmartViewProps } from "../../../views/registry";
import { Toolbar } from "./components/Toolbar";
import { Navigator } from "./components/Navigator";
import { Toolbox } from "./components/Toolbox";
import { Insights } from "./components/Insights";
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

  const navigateToPath = useCallback((path: string) => {
    if (!editor || !path.trim()) return;

    const model = editor.getModel();
    if (!model) return;

    // Step 1: Path Parsing
    const pathParts = path.split(/[.\[\]]+/).filter(Boolean);
    const finalKey = pathParts[pathParts.length - 1];

    // Early exit if finalKey is a number (array index) - nothing to search for
    if (!finalKey || finalKey.match(/^\d+$/)) {
      return;
    }

    const searchTarget = `"${finalKey}"`;

    // Step 2: Context Key Extraction (The Core Fix)
    const contextKeys: string[] = [];

    // Iterate backwards from the second-to-last part of pathParts
    for (let i = pathParts.length - 2; i >= 0; i--) {
      const candidate = pathParts[i];
      // Skip any parts that are purely numeric (array indices)
      if (!candidate.match(/^\d+$/)) {
        contextKeys.push(candidate);
      }
    }

    // Step 3: Multi-Pass Monaco Editor Search
    let targetMatch: monaco.editor.FindMatch | null = null;

    // Pass 1: Contextual Search
    if (contextKeys.length > 0) {
      const finalKeyMatches = model.findMatches(
        searchTarget,
        false, // searchOnlyEditableRange
        false, // isRegex
        false, // matchCase
        null,  // wordSeparators
        false  // captureMatches
      );

      if (finalKeyMatches && finalKeyMatches.length > 0) {
        // Try each context key, from most specific (closest parent) to least specific
        for (const parentKey of contextKeys) {
          const quotedParentKey = `"${parentKey}"`;

          const parentMatches = model.findMatches(
            quotedParentKey,
            false, false, false, null, false
          );

          if (parentMatches && parentMatches.length > 0) {
            // Find finalKey match that appears after a parentKey match within reasonable range
            const contextualMatch = finalKeyMatches.find(finalMatch => {
              return parentMatches.some(parentMatch => {
                const lineDistance = finalMatch.range.startLineNumber - parentMatch.range.startLineNumber;

                // Dynamic Range Calculation
                const pathDepth = pathParts.length;
                const baseLookAhead = Math.min(50, Math.max(20, pathDepth * 10));
                const totalLines = model.getLineCount();
                const adaptiveRange = totalLines > 100 ? Math.min(totalLines / 4, baseLookAhead * 2) : baseLookAhead;

                return lineDistance >= 0 && lineDistance <= adaptiveRange;
              });
            });

            if (contextualMatch) {
              targetMatch = contextualMatch;
              break; // Found specific match, stop searching other context levels
            }
          }
        }
      }
    }

    // Pass 2: Non-Contextual Fallback
    if (!targetMatch) {
      const fallbackMatches = model.findMatches(
        searchTarget,
        false, false, false, null, false
      );

      if (fallbackMatches && fallbackMatches.length > 0) {
        targetMatch = fallbackMatches[0]; // Take first result as fallback
      }
    }

    // Additional fallback: try exact text search if still no match
    if (!targetMatch) {
      const exactMatches = model.findMatches(
        path,
        false, false, false, null, false
      );

      if (exactMatches && exactMatches.length > 0) {
        targetMatch = exactMatches[0];
      }
    }

    // Step 4: Editor Navigation
    if (targetMatch) {
      editor.setPosition({
        lineNumber: targetMatch.range.startLineNumber,
        column: targetMatch.range.startColumn
      });

      editor.revealLineInCenter(targetMatch.range.startLineNumber);
      editor.setSelection(targetMatch.range);
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
              key={`json-editor-${tabId}-${side}`}
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

        {/* Right Panel - Toolbox & Insights */}
        <div className="hidden lg:flex w-52 border-l border-gray-700 flex-col">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveRightTab('toolbox')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeRightTab === 'toolbox'
                  ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              }`}
            >
              Toolbox
            </button>
            <button
              onClick={() => setActiveRightTab('insights')}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeRightTab === 'insights'
                  ? 'text-blue-400 bg-blue-500/10 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
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
      
      {/* Render modals */}
      {renderModal()}
    </div>
  );
};