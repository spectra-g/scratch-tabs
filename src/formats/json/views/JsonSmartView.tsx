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

  const handlePathChange = useCallback((path: string) => {
    setCurrentPath(path);
    
    // Implement smart search functionality in Monaco editor
    if (editor && path.trim()) {
      const model = editor.getModel();
      if (!model) return;
      
      let matches: monaco.editor.FindMatch[] | null = null;
      
      // First, try to find as JSON path - convert path like "pageTitle.display" to search for the key
      if (path.includes('.') || path.includes('[')) {
        // Extract the final key from the path (e.g., "display" from "pageTitle.display")
        const pathParts = path.split(/[.\[\]]+/).filter(Boolean);
        const finalKey = pathParts[pathParts.length - 1];
        
        if (finalKey && !finalKey.match(/^\d+$/)) { // Don't search for array indices
          // Try to find the key with quotes (as it appears in JSON)
          const quotedKey = `"${finalKey}"`;
          matches = model.findMatches(
            quotedKey,
            false, // searchOnlyEditableRange
            false, // isRegex
            false, // matchCase
            null,  // wordSeparators
            false  // captureMatches
          );
          
          // If we have multiple matches, try to find the one in the right context
          if (matches && matches.length > 1 && pathParts.length > 1) {
            // Find the nearest non-numeric parent (skip array indices for better context)
            let parentKey = null;
            for (let i = pathParts.length - 2; i >= 0; i--) {
              const candidate = pathParts[i];
              if (!candidate.match(/^\d+$/)) { // Skip pure numbers (array indices)
                parentKey = candidate;
                break;
              }
            }
            
            if (parentKey) {
              const quotedParentKey = `"${parentKey}"`;
              
              // Find matches of the parent key
              const parentMatches = model.findMatches(
                quotedParentKey,
                false, false, false, null, false
              );
              
              if (parentMatches && parentMatches.length > 0) {
                // Find the child key that comes after a parent key
                const bestMatch = matches.find(match => {
                  return parentMatches.some(parentMatch => {
                    return match.range.startLineNumber >= parentMatch.range.startLineNumber &&
                           match.range.startLineNumber <= parentMatch.range.startLineNumber + 20; // Increased range for nested structures
                  });
                });
                
                if (bestMatch) {
                  matches = [bestMatch];
                }
              }
            }
          }
        }
      }
      
      // Fallback: try exact text search
      if (!matches || matches.length === 0) {
        matches = model.findMatches(
          path,
          false, // searchOnlyEditableRange
          false, // isRegex
          false, // matchCase
          null,  // wordSeparators
          false  // captureMatches
        );
      }
      
      // Navigate to the first match
      if (matches && matches.length > 0) {
        editor.setPosition({
          lineNumber: matches[0].range.startLineNumber,
          column: matches[0].range.startColumn
        });
        
        // Reveal the line in the center
        editor.revealLineInCenter(matches[0].range.startLineNumber);
        
        // Set selection to highlight the found text
        editor.setSelection(matches[0].range);
      }
    }
  }, [editor]);

  const handleNodeSelect = useCallback((path: string) => {
    setCurrentPath(path);
    
    // Use the same smart search functionality as handlePathChange
    if (editor && path.trim()) {
      const model = editor.getModel();
      if (!model) return;
      
      let matches: monaco.editor.FindMatch[] | null = null;
      
      // First, try to find as JSON path - convert path like "pageTitle.display" to search for the key
      if (path.includes('.') || path.includes('[')) {
        // Extract the final key from the path (e.g., "display" from "pageTitle.display")
        const pathParts = path.split(/[.\[\]]+/).filter(Boolean);
        const finalKey = pathParts[pathParts.length - 1];
        
        if (finalKey && !finalKey.match(/^\d+$/)) { // Don't search for array indices
          // Try to find the key with quotes (as it appears in JSON)
          const quotedKey = `"${finalKey}"`;
          matches = model.findMatches(
            quotedKey,
            false, // searchOnlyEditableRange
            false, // isRegex
            false, // matchCase
            null,  // wordSeparators
            false  // captureMatches
          );
          
          // If we have multiple matches, try to find the one in the right context
          if (matches && matches.length > 1 && pathParts.length > 1) {
            // Find the nearest non-numeric parent (skip array indices for better context)
            let parentKey = null;
            for (let i = pathParts.length - 2; i >= 0; i--) {
              const candidate = pathParts[i];
              if (!candidate.match(/^\d+$/)) { // Skip pure numbers (array indices)
                parentKey = candidate;
                break;
              }
            }
            
            if (parentKey) {
              const quotedParentKey = `"${parentKey}"`;
              
              // Find matches of the parent key
              const parentMatches = model.findMatches(
                quotedParentKey,
                false, false, false, null, false
              );
              
              if (parentMatches && parentMatches.length > 0) {
                // Find the child key that comes after a parent key
                const bestMatch = matches.find(match => {
                  return parentMatches.some(parentMatch => {
                    return match.range.startLineNumber >= parentMatch.range.startLineNumber &&
                           match.range.startLineNumber <= parentMatch.range.startLineNumber + 20; // Increased range for nested structures
                  });
                });
                
                if (bestMatch) {
                  matches = [bestMatch];
                }
              }
            }
          }
        }
      }
      
      // Fallback: try exact text search
      if (!matches || matches.length === 0) {
        matches = model.findMatches(
          path,
          false, // searchOnlyEditableRange
          false, // isRegex
          false, // matchCase
          null,  // wordSeparators
          false  // captureMatches
        );
      }
      
      // Navigate to the first match
      if (matches && matches.length > 0) {
        editor.setPosition({
          lineNumber: matches[0].range.startLineNumber,
          column: matches[0].range.startColumn
        });
        
        // Reveal the line in the center
        editor.revealLineInCenter(matches[0].range.startLineNumber);
        
        // Set selection to highlight the found text
        editor.setSelection(matches[0].range);
      }
    }
  }, [editor]);

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