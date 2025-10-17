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
import { useDiffModalStore } from "../../../stores/diffModalStore";
import { ContentDiffModal } from "../../../components/ContentDiffModal";

/**
 * Represents the boundaries of a JSON container (object or array)
 */
interface ScopeBoundary {
  startLine: number;
  endLine: number;
}

// Constants for navigation configuration
const NAVIGATION_CONFIG = {
  FALLBACK_RANGE_BEFORE: 10,
  FALLBACK_RANGE_AFTER: 50,
} as const;

const JSON_DELIMITERS = {
  OBJECT_START: '{',
  OBJECT_END: '}',
  ARRAY_START: '[',
  ARRAY_END: ']',
} as const;

/**
 * Finds the scope boundaries of a JSON container starting from the given line
 * Supports both objects {} and arrays []
 */
const findJsonContainerScope = (
  model: monaco.editor.ITextModel,
  startLine: number
): ScopeBoundary | null => {
  let braceCount = 0;
  let bracketCount = 0;
  let foundStart = false;
  let startLineActual = startLine;
  let isObjectScope = false;
  let isArrayScope = false;

  for (let lineNum = startLine; lineNum <= model.getLineCount(); lineNum++) {
    const lineContent = model.getLineContent(lineNum);

    for (const char of lineContent) {
      switch (char) {
        case JSON_DELIMITERS.OBJECT_START:
          if (!foundStart) {
            foundStart = true;
            startLineActual = lineNum;
            isObjectScope = true;
          }
          braceCount++;
          break;

        case JSON_DELIMITERS.OBJECT_END:
          braceCount--;
          if (foundStart && isObjectScope && braceCount === 0) {
            return { startLine: startLineActual, endLine: lineNum };
          }
          break;

        case JSON_DELIMITERS.ARRAY_START:
          if (!foundStart) {
            foundStart = true;
            startLineActual = lineNum;
            isArrayScope = true;
          }
          bracketCount++;
          break;

        case JSON_DELIMITERS.ARRAY_END:
          bracketCount--;
          if (foundStart && isArrayScope && bracketCount === 0) {
            return { startLine: startLineActual, endLine: lineNum };
          }
          break;
      }
    }
  }

  return null;
};

/**
 * Determines if a path part is a numeric array index
 */
const isArrayIndex = (part: string): boolean => /^\d+$/.test(part);

/**
 * Parses a JSON path into individual parts
 */
const parseJsonPath = (path: string): string[] => {
  return path.split(/[.\[\]]+/).filter(Boolean);
};

/**
 * Creates a fallback search scope around a given line
 */
const createFallbackScope = (
  model: monaco.editor.ITextModel,
  targetLine: number
): monaco.Range => {
  const fallbackStart = Math.max(1, targetLine - NAVIGATION_CONFIG.FALLBACK_RANGE_BEFORE);
  const fallbackEnd = Math.min(model.getLineCount(), targetLine + NAVIGATION_CONFIG.FALLBACK_RANGE_AFTER);

  return new monaco.Range(
    fallbackStart, 1,
    fallbackEnd,
    model.getLineMaxColumn(fallbackEnd)
  );
};

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

  // Get diff modal state
  const diffModalState = useDiffModalStore();
  
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
   * Navigates to a specific JSON path using iterative descent with array index awareness
   * @param path - JSON path (e.g., "data.items[1].name")
   */
  const navigateToPath = useCallback((path: string) => {
    if (!editor || !path.trim()) return;

    const model = editor.getModel();
    if (!model) return;

    const pathParts = parseJsonPath(path);

    // Early exit conditions
    if (pathParts.length === 0) return;
    const finalKey = pathParts[pathParts.length - 1];
    if (isArrayIndex(finalKey)) return; // Don't navigate to pure numeric indices

    // Initialize search scope to entire document
    let currentSearchScope = new monaco.Range(
      1, 1,
      model.getLineCount(),
      model.getLineMaxColumn(model.getLineCount())
    );

    let lastSuccessfulMatch: monaco.editor.FindMatch | null = null;

    // Iteratively search for each key in the path
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];

      // Skip numeric parts (array indices) - they're applied to the next search
      if (isArrayIndex(part)) {
        continue;
      }

      // Search for the current key within the current scope
      const quotedKey = `"${part}"`;
      const matches = model.findMatches(
        quotedKey,
        currentSearchScope,
        false, false, null, false
      ) || [];

      if (matches.length === 0) break;

      // Determine target match (considering array indices from previous part)
      const prevPartIndex = i - 1;
      const arrayIndex = prevPartIndex >= 0 && isArrayIndex(pathParts[prevPartIndex])
        ? parseInt(pathParts[prevPartIndex], 10)
        : null;

      let targetMatch: monaco.editor.FindMatch;
      if (arrayIndex !== null && arrayIndex < matches.length) {
        targetMatch = matches[arrayIndex];
      } else if (arrayIndex !== null) {
        break; // Array index out of bounds
      } else {
        targetMatch = matches[0];
      }

      lastSuccessfulMatch = targetMatch;

      // Check if there are more non-numeric parts to process
      const hasMoreKeys = pathParts.slice(i + 1).some(p => !isArrayIndex(p));
      if (!hasMoreKeys) break;

      // Narrow search scope for next iteration
      const containerScope = findJsonContainerScope(model, targetMatch.range.startLineNumber);
      if (containerScope) {
        currentSearchScope = new monaco.Range(
          containerScope.startLine, 1,
          containerScope.endLine,
          model.getLineMaxColumn(containerScope.endLine)
        );
      } else {
        currentSearchScope = createFallbackScope(model, targetMatch.range.startLineNumber);
      }
    }

    // Navigate to the final match if found
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
        tabId={tabId}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0">
        {/* Navigator Panel */}
        <div className="hidden lg:flex w-80 border-r border-gray-700 flex-col">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-300">Navigator</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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