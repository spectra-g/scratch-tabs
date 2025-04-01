import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useRootStore } from '../stores';
import { X, Undo2, Redo2 } from 'lucide-react';

// Define the structure for a history entry
interface ChangeHistoryEntry {
  leftContent: string;
  rightContent: string;
  timestamp: number;
}

const DEBOUNCE_DELAY = 400;

interface DiffModalProps {
  leftTabId: string;
  rightTabId: string;
  onClose: () => void; // The function passed from parent to close the modal
}

export const DiffModal: React.FC<DiffModalProps> = ({ leftTabId, rightTabId, onClose }) => {
  const { tabs, updateTabContent } = useRootStore();
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const originalEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modifiedEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const leftTab = tabs.find(tab => tab.id === leftTabId);
  const rightTab = tabs.find(tab => tab.id === rightTabId);

  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const isRestoringHistory = useRef(false);
  const historyIndexRef = useRef(currentHistoryIndex);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    historyIndexRef.current = currentHistoryIndex;
  }, [currentHistoryIndex]);

  const recordChangeActual = useCallback(() => {
    // ... (recordChangeActual logic remains the same)
    if (!originalEditorRef.current || !modifiedEditorRef.current) {
      return;
    }
    const currentLeft = originalEditorRef.current.getValue();
    const currentRight = modifiedEditorRef.current.getValue();
    const latestIndex = historyIndexRef.current;

    setChangeHistory(prevHistory => {
      const lastEntry = prevHistory[latestIndex];
      if (lastEntry && lastEntry.leftContent === currentLeft && lastEntry.rightContent === currentRight) {
        return prevHistory;
      }
      const newEntry: ChangeHistoryEntry = {
        leftContent: currentLeft,
        rightContent: currentRight,
        timestamp: Date.now(),
      };
      const newHistoryBase = prevHistory.slice(0, latestIndex + 1);
      const updatedHistory = [...newHistoryBase, newEntry];
      const newIndex = newHistoryBase.length;
      setCurrentHistoryIndex(newIndex); // Update state directly
      return updatedHistory;
    });
  }, []);

  // --- Initial State Effect ---
  useEffect(() => {
    // ... (Initial state effect remains the same)
    if (leftTab && rightTab) {
      const initialState: ChangeHistoryEntry = {
        leftContent: leftTab.content,
        rightContent: rightTab.content,
        timestamp: Date.now(),
      };
      if (changeHistory.length === 0 || currentHistoryIndex === -1) {
        setChangeHistory([initialState]);
        setCurrentHistoryIndex(0);
      } else {
        setChangeHistory([initialState]);
        setCurrentHistoryIndex(0);
      }
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    }
  }, [leftTabId, rightTabId]);

  // --- Monaco Editor Setup Effect ---
  useEffect(() => {
    // ... (Monaco setup effect remains the same)
    let editor: monaco.editor.IStandaloneDiffEditor | null = null;
    let listeners: monaco.IDisposable[] = [];
    if (!editorContainerRef.current || !leftTab || !rightTab) {
      return;
    }

    const language = leftTab.language || 'plaintext';
    const originalModel = monaco.editor.createModel(leftTab.content, language);
    const modifiedModel = monaco.editor.createModel(rightTab.content, language);

    editor = monaco.editor.createDiffEditor(editorContainerRef.current, { /* options */
      originalEditable: true,
      modifiedEditable: true,
      diffCodeLens: false,
      renderIndicators: true,
      renderSideBySide: true,
      theme: 'vs-dark',
      automaticLayout: true,
      enableSplitViewResizing: true,
      diffAlgorithm: 'advanced',
    });
    editor.setModel({ original: originalModel, modified: modifiedModel });

    diffEditorRef.current = editor;
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();

    const debouncedRecordChangeHandler = () => {
      if (isRestoringHistory.current) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        recordChangeActual();
      }, DEBOUNCE_DELAY);
    };

    if (originalEditorRef.current) {
      listeners.push(originalEditorRef.current.onDidChangeModelContent(debouncedRecordChangeHandler));
    }
    if (modifiedEditorRef.current) {
      listeners.push(modifiedEditorRef.current.onDidChangeModelContent(debouncedRecordChangeHandler));
      modifiedEditorRef.current.focus();
    }

    return () => { /* cleanup */
      listeners.forEach(listener => listener.dispose());
      listeners = [];
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (diffEditorRef.current) {
        const currentEditor = diffEditorRef.current;
        const model = currentEditor.getModel();
        currentEditor.dispose();
        diffEditorRef.current = null;
        originalEditorRef.current = null;
        modifiedEditorRef.current = null;
        model?.original?.dispose();
        model?.modified?.dispose();
      } else {
        console.log("Monaco Cleanup: No editor ref found.");
      }
    };
  }, [leftTabId, rightTabId, recordChangeActual]);

  // --- Undo/Redo Effect ---
  useEffect(() => {
    // ... (Undo/Redo effect remains the same)
    if (!isRestoringHistory.current || !diffEditorRef.current || currentHistoryIndex < 0) {
      return;
    }
    const historyEntry = changeHistory[currentHistoryIndex];
    if (!historyEntry) {
      isRestoringHistory.current = false;
      return;
    }
    const originalEditor = originalEditorRef.current;
    const modifiedEditor = modifiedEditorRef.current;
    if (!originalEditor || !modifiedEditor) {
      isRestoringHistory.current = false;
      return;
    }

    if (originalEditor.getValue() !== historyEntry.leftContent) {
      originalEditor.setValue(historyEntry.leftContent);
    }
    if (modifiedEditor.getValue() !== historyEntry.rightContent) {
      modifiedEditor.setValue(historyEntry.rightContent);
    }

    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 0);
  }, [currentHistoryIndex, changeHistory]);

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < changeHistory.length - 1;

  const handleUndo = useCallback(() => { /* handleUndo logic remains same */
    if (!canUndo) return;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      recordChangeActual();
    }
    isRestoringHistory.current = true;
    setCurrentHistoryIndex(prevIndex => prevIndex - 1);
  }, [canUndo, recordChangeActual]);

  const handleRedo = useCallback(() => { /* handleRedo logic remains same */
    if (!canRedo) return;
    isRestoringHistory.current = true;
    setCurrentHistoryIndex(prevIndex => prevIndex + 1);
  }, [canRedo]);

  // --- Close and Save Handler ---
  const handleCloseAndSave = useCallback(() => {
    // 1. Force record any pending debounced changes
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      recordChangeActual(); // Record final state
    }

    // 2. Get final content from editor panes (use refs)
    const finalLeftContent = originalEditorRef.current?.getValue();
    const finalRightContent = modifiedEditorRef.current?.getValue();

    // 3. Check if tabs and content exist before updating
    if (leftTab && finalLeftContent !== undefined && leftTab.content !== finalLeftContent) {
      updateTabContent(leftTabId, finalLeftContent);
    }

    if (rightTab && finalRightContent !== undefined && rightTab.content !== finalRightContent) {
      updateTabContent(rightTabId, finalRightContent);
    }

    // 4. Call the original onClose handler passed from the parent
    onClose();

  }, [leftTab, rightTab, leftTabId, rightTabId, updateTabContent, onClose, recordChangeActual]); // Dependencies


  if (!leftTab || !rightTab) {
    return null;
  }

  return ( /* JSX */
      <div className="fixed inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-gray-700 px-4 py-2">
          <h2 className="text-gray-200 font-medium">
            Compare: {leftTab.title} ↔ {rightTab.title}
          </h2>
          <div>
            <button onClick={handleUndo} title="Undo" disabled={!canUndo} className="mr-2 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white disabled:opacity-50">
              <Undo2 size={14} />
            </button>
            <button onClick={handleRedo} title="Redo" disabled={!canRedo} className="mr-4 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white disabled:opacity-50">
              <Redo2 size={14} />
            </button>
            <button className="text-gray-400 hover:text-gray-200" onClick={handleCloseAndSave}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div ref={editorContainerRef} className="flex-1 overflow-hidden">
          {/* Monaco Editor renders here */}
        </div>
      </div>
  );
};