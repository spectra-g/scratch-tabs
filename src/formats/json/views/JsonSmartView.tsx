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

    // Early exit if no path parts or ends with pure array index
    if (pathParts.length === 0) return;
    const finalKey = pathParts[pathParts.length - 1];
    if (finalKey.match(/^\d+$/)) return;

    // Helper function to find the scope of a specific element within an array
    const findArrayElementScope = (arrayStartLine: number, arrayEndLine: number, elementIndex: number): { startLine: number; endLine: number } | null => {
      let currentElementIndex = 0;
      let braceCount = 0;
      let bracketCount = 0;
      let inElementScope = false;
      let elementStartLine = arrayStartLine;
      let isInArray = false;

      for (let lineNum = arrayStartLine; lineNum <= arrayEndLine; lineNum++) {
        const lineContent = model.getLineContent(lineNum);

        for (const char of lineContent) {
          if (char === '[') {
            bracketCount++;
            if (bracketCount === 1) {
              isInArray = true;
            }
          } else if (char === ']') {
            bracketCount--;
          } else if (char === '{' && isInArray && bracketCount === 1) {
            // Start of an object element within the array
            if (currentElementIndex === elementIndex) {
              inElementScope = true;
              elementStartLine = lineNum;
            }
            braceCount++;
          } else if (char === '}' && isInArray) {
            braceCount--;
            if (inElementScope && braceCount === 0) {
              // Found the end of our target element
              return { startLine: elementStartLine, endLine: lineNum };
            } else if (braceCount === 0) {
              // End of current element, move to next
              currentElementIndex++;
            }
          } else if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
          }
        }
      }

      return null; // Element not found or scope detection failed
    };

    // Helper function to find JSON container scope boundaries (objects or arrays)
    const findObjectScope = (startLine: number): { startLine: number; endLine: number } | null => {
      let braceCount = 0;
      let bracketCount = 0;
      let foundStart = false;
      let startLineActual = startLine;
      let isObjectScope = false;
      let isArrayScope = false;

      for (let lineNum = startLine; lineNum <= model.getLineCount(); lineNum++) {
        const lineContent = model.getLineContent(lineNum);

        for (const char of lineContent) {
          if (char === '{') {
            if (!foundStart) {
              foundStart = true;
              startLineActual = lineNum;
              isObjectScope = true;
            }
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (foundStart && isObjectScope && braceCount === 0) {
              return { startLine: startLineActual, endLine: lineNum };
            }
          } else if (char === '[') {
            if (!foundStart) {
              foundStart = true;
              startLineActual = lineNum;
              isArrayScope = true;
            }
            bracketCount++;
          } else if (char === ']') {
            bracketCount--;
            if (foundStart && isArrayScope && bracketCount === 0) {
              return { startLine: startLineActual, endLine: lineNum };
            }
          }
        }
      }

      return null; // Scope not found
    };

    // Step 2: Initialize Search Scope
    let currentSearchScope = new monaco.Range(
      1,
      1,
      model.getLineCount(),
      model.getLineMaxColumn(model.getLineCount())
    );

    let lastSuccessfulMatch: monaco.editor.FindMatch | null = null;

    // Step 3: Iterative Search Loop
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      // Skip numeric parts (array indices) - they are processed in the next iteration
      if (part.match(/^\d+$/)) {
        continue;
      }

      // Search for the current key within the current scope
      const quotedKey = `"${part}"`;
      const matches = model.findMatches(
        quotedKey,
        currentSearchScope,
        false, // isRegex
        false, // matchCase
        null,  // wordSeparators
        false  // captureMatches
      );

      if (!matches || matches.length === 0) {
        // No matches found, break the search
        break;
      }

      // Check if there's an array index from a previous iteration that should apply to this search
      let targetMatch: monaco.editor.FindMatch;
      const prevPartIndex = i - 1;
      let arrayIndexForThisSearch: number | null = null;

      if (prevPartIndex >= 0 && pathParts[prevPartIndex].match(/^\d+$/)) {
        // Previous part was an index, use it to select the Nth match for this search
        arrayIndexForThisSearch = parseInt(pathParts[prevPartIndex], 10);
      }

      if (arrayIndexForThisSearch !== null && arrayIndexForThisSearch < matches.length) {
        // Use the array index to select the specific match
        targetMatch = matches[arrayIndexForThisSearch];
      } else if (arrayIndexForThisSearch !== null && arrayIndexForThisSearch >= matches.length) {
        // Index out of bounds, search fails
        break;
      } else {
        // No index specified, take the first match
        targetMatch = matches[0];
      }

      // Update the last successful match
      lastSuccessfulMatch = targetMatch;

      // Check if there are more non-numeric parts to process after this one
      let hasMoreKeys = false;
      for (let j = i + 1; j < pathParts.length; j++) {
        if (!pathParts[j].match(/^\d+$/)) {
          hasMoreKeys = true;
          break;
        }
      }

      // If no more keys to process, this is our final target
      if (!hasMoreKeys) {
        break;
      }

      // Update the search scope to the boundaries of the target match's containing object/array
      const objectScope = findObjectScope(targetMatch.range.startLineNumber);
      if (objectScope) {
        currentSearchScope = new monaco.Range(
          objectScope.startLine,
          1,
          objectScope.endLine,
          model.getLineMaxColumn(objectScope.endLine)
        );
      } else {
        // If scope detection fails, use a fallback range around the match
        const fallbackStartLine = Math.max(1, targetMatch.range.startLineNumber - 10);
        const fallbackEndLine = Math.min(model.getLineCount(), targetMatch.range.startLineNumber + 50);
        currentSearchScope = new monaco.Range(
          fallbackStartLine,
          1,
          fallbackEndLine,
          model.getLineMaxColumn(fallbackEndLine)
        );
      }
    }

    // Step 4: Final Navigation
    if (lastSuccessfulMatch) {
      editor.setPosition({
        lineNumber: lastSuccessfulMatch.range.startLineNumber,
        column: lastSuccessfulMatch.range.startColumn
      });

      editor.revealLineInCenter(lastSuccessfulMatch.range.startLineNumber);
      editor.setSelection(lastSuccessfulMatch.range);
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