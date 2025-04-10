import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useRootStore } from '../stores';
// Import necessary icons
import { X, Undo2, Redo2, Eye, EyeOff } from 'lucide-react';

// Define the structure for a history entry
interface ChangeHistoryEntry {
  leftContent: string;
  rightContent: string;
  timestamp: number;
}

const DEBOUNCE_DELAY = 400;
// --- NEW: Define context lines for hidden regions ---
const DIFF_CONTEXT_LINES = 3;

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

  // --- NEW STATE ---
  const [areContentsIdentical, setAreContentsIdentical] = useState(false);
  const [hideMatchingLines, setHideMatchingLines] = useState(false); // State for toggling matching lines visibility

  useEffect(() => {
    historyIndexRef.current = currentHistoryIndex;
  }, [currentHistoryIndex]);

  const recordChangeActual = useCallback(() => {
    if (!originalEditorRef.current || !modifiedEditorRef.current || isRestoringHistory.current) {
      return;
    }
    const currentLeft = originalEditorRef.current.getValue();
    const currentRight = modifiedEditorRef.current.getValue();
    const latestIndex = historyIndexRef.current;

    // --- UPDATE: Check identical status after recording change ---
    setAreContentsIdentical(currentLeft === currentRight);

    setChangeHistory(prevHistory => {
      const lastEntry = prevHistory[latestIndex];
      // Prevent recording identical consecutive states if content hasn't changed
      if (lastEntry && lastEntry.leftContent === currentLeft && lastEntry.rightContent === currentRight) {
        return prevHistory;
      }
      const newEntry: ChangeHistoryEntry = {
        leftContent: currentLeft,
        rightContent: currentRight,
        timestamp: Date.now(),
      };
      // Truncate history if we are undoing and then make a new change
      const newHistoryBase = prevHistory.slice(0, latestIndex + 1);
      const updatedHistory = [...newHistoryBase, newEntry];
      const newIndex = newHistoryBase.length; // Index of the new entry
      setCurrentHistoryIndex(newIndex); // Update state directly
      return updatedHistory;
    });
  }, []); // Removed checkIdentical from deps, it's called directly

  // --- Initial State Effect ---
  useEffect(() => {
    if (leftTab && rightTab) {
      const initialState: ChangeHistoryEntry = {
        leftContent: leftTab.content,
        rightContent: rightTab.content,
        timestamp: Date.now(),
      };
      // Always reset history and index when tabs change
      setChangeHistory([initialState]);
      setCurrentHistoryIndex(0);
      // --- UPDATE: Initial identical check ---
      setAreContentsIdentical(leftTab.content === rightTab.content);
      // Reset view option
      setHideMatchingLines(false);
    }
    // Cleanup debounce timer on unmount or tab change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
    // Only run when tabs change
  }, [leftTab, rightTab]); // Keep dependencies minimal

  // --- Monaco Editor Setup Effect ---
  useEffect(() => {
    let editor: monaco.editor.IStandaloneDiffEditor | null = null;
    let listeners: monaco.IDisposable[] = [];

    const cleanup = () => {
      // Ensure cleanup runs before setup if tabs change
      if (diffEditorRef.current) {
        const currentEditor = diffEditorRef.current;
        const model = currentEditor.getModel();
        currentEditor.dispose();
        diffEditorRef.current = null;
        originalEditorRef.current = null;
        modifiedEditorRef.current = null;
        model?.original?.dispose();
        model?.modified?.dispose();
      }
    }

    cleanup();

    if (!editorContainerRef.current || !leftTab || !rightTab) {
      return;
    }

    const language = leftTab.language || 'plaintext';
    // Use the definitive initial content from the tabs for setup
    const originalModel = monaco.editor.createModel(leftTab.content, language);
    const modifiedModel = monaco.editor.createModel(rightTab.content, language);

    editor = monaco.editor.createDiffEditor(editorContainerRef.current, {
      originalEditable: true,
      modifiedEditable: true,
      renderSideBySide: true, // Keep side-by-side
      theme: 'vs-dark',
      automaticLayout: true,
      enableSplitViewResizing: true,
      diffAlgorithm: 'advanced',
      readOnly: false,
      // --- NEW: Initial setting for hiding unchanged regions ---
      hideUnchangedRegions: {
        enabled: hideMatchingLines, // Use state here
        contextLineCount: DIFF_CONTEXT_LINES,
      },
      // Consider adding scrollBeyondLastLine: false if preferred
      scrollBeyondLastLine: false,
      renderIndicators: true, // Show +/- indicators in the margin
      diffCodeLens: false, // Usually off for cleaner diff
    });
    editor.setModel({ original: originalModel, modified: modifiedModel });

    diffEditorRef.current = editor;
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();

    // Debounced handler for recording changes
    const debouncedRecordChangeHandler = () => {
      // No need to check isRestoringHistory here, recordChangeActual does it
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        recordChangeActual(); // This now also updates identical status
      }, DEBOUNCE_DELAY);
    };

    // Attach listeners
    if (originalEditorRef.current) {
      listeners.push(originalEditorRef.current.onDidChangeModelContent(debouncedRecordChangeHandler));
    }
    if (modifiedEditorRef.current) {
      listeners.push(modifiedEditorRef.current.onDidChangeModelContent(debouncedRecordChangeHandler));
      // Only focus if it makes sense (e.g., not read-only, maybe based on which tab was active)
      // modifiedEditorRef.current.focus(); // Let's comment this out for now, might interfere
    }

    // Cleanup function
    return () => {
      listeners.forEach(listener => listener.dispose());
      listeners = [];
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Check ref before disposing - ensure it hasn't been disposed already by effect re-run
      cleanup();
    };
    // This effect should ONLY run when the tabs change.
    // `hideMatchingLines` changes will be handled by a separate effect.
  }, [leftTabId, rightTabId, leftTab, rightTab]); // Added leftTab/rightTab to ensure content is updated if tab object changes but ID doesn't (less likely)


  // --- Effect to Update Editor Options (like hiding lines) ---
  useEffect(() => {
    if (diffEditorRef.current) {
      diffEditorRef.current.updateOptions({
        hideUnchangedRegions: {
          enabled: hideMatchingLines,
          contextLineCount: DIFF_CONTEXT_LINES,
        }
      });
    }
    // This effect runs only when the toggle state changes
  }, [hideMatchingLines]);


  // --- Undo/Redo Effect ---
  useEffect(() => {
    // Ensure we only run this when actively restoring history
    if (!isRestoringHistory.current || currentHistoryIndex < 0) {
      return;
    }

    const historyEntry = changeHistory[currentHistoryIndex];
    if (!historyEntry) {
      console.warn("History entry not found for index:", currentHistoryIndex);
      isRestoringHistory.current = false; // Reset flag if entry is missing
      return;
    }

    const originalEditor = originalEditorRef.current;
    const modifiedEditor = modifiedEditorRef.current;

    if (!originalEditor || !modifiedEditor) {
      console.warn("Editor refs not available during history restore.");
      isRestoringHistory.current = false; // Reset flag if editors are missing
      return;
    }

    let changed = false;
    // Only set value if it's actually different to avoid unnecessary editor updates
    if (originalEditor.getValue() !== historyEntry.leftContent) {
      // Preserve cursor/selection if possible (Monaco might handle this, but explicit can help)
      // const selection = originalEditor.getSelection();
      originalEditor.setValue(historyEntry.leftContent);
      // if (selection) originalEditor.setSelection(selection);
      changed = true;
    }
    if (modifiedEditor.getValue() !== historyEntry.rightContent) {
      // const selection = modifiedEditor.getSelection();
      modifiedEditor.setValue(historyEntry.rightContent);
      // if (selection) modifiedEditor.setSelection(selection);
      changed = true;
    }

    // --- UPDATE: Check identical status after restoring history ---
    if (changed) {
        setAreContentsIdentical(historyEntry.leftContent === historyEntry.rightContent);
    }

    // Use setTimeout to allow Monaco to process the setValue operations
    // before resetting the flag. This helps prevent the change listener
    // from firing immediately with the restored content.
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 0);

  // Depend only on the index and history array itself
  }, [currentHistoryIndex, changeHistory]);

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < changeHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    // Clear any pending debounced change before undoing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      // It might be necessary to record the *absolute latest* state if the user typed
      // something within the debounce delay before hitting undo.
      recordChangeActual();
    }
    // Set flag *before* changing state to prevent immediate recording
    isRestoringHistory.current = true;
    setCurrentHistoryIndex(prevIndex => prevIndex - 1);
  }, [canUndo, recordChangeActual]); // recordChangeActual needed here

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    // No need to record change before redo
    // Set flag *before* changing state
    isRestoringHistory.current = true;
    setCurrentHistoryIndex(prevIndex => prevIndex + 1);
  }, [canRedo]);

  // --- Close and Save Handler ---
  const handleCloseAndSave = useCallback(() => {
    // 1. Force record any pending debounced changes if not restoring history
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      // Make sure we don't record if we just undid/redid
      if (!isRestoringHistory.current) {
          recordChangeActual(); // Record final state before closing
      }
    }

    // 2. Get final content reliably from the *current* history state
    // Use refs as fallback only if history is somehow invalid
    const finalState = changeHistory[currentHistoryIndex];
    const finalLeftContent = finalState?.leftContent ?? originalEditorRef.current?.getValue();
    const finalRightContent = finalState?.rightContent ?? modifiedEditorRef.current?.getValue();

    // 3. Check if tabs and content exist and if content *actually changed* from original tab state
    if (leftTab && finalLeftContent !== undefined && leftTab.content !== finalLeftContent) {
      updateTabContent(leftTabId, finalLeftContent);
    }

    if (rightTab && finalRightContent !== undefined && rightTab.content !== finalRightContent) {
      updateTabContent(rightTabId, finalRightContent);
    }

    // 4. Call the original onClose handler passed from the parent
    onClose();

  }, [leftTab, rightTab, leftTabId, rightTabId, updateTabContent, onClose, recordChangeActual, changeHistory, currentHistoryIndex]); // Added history deps


  // --- NEW FUNCTION: Toggle Matching Lines Visibility ---
  const toggleHideMatching = useCallback(() => {
    setHideMatchingLines(prev => !prev);
    // The separate useEffect hook handles updating the editor option
  }, []);

  if (!leftTab || !rightTab) {
    return null;
  }

  return (
      <div className="fixed inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gray-700 px-4 py-2 border-b border-gray-600 flex-wrap"> {/* Added flex-wrap */}
          <h2 className="text-gray-200 font-medium mr-4 mb-1 sm:mb-0" title={`${leftTab.title} ↔ ${rightTab.title}`}> {/* Added margin */}
            Compare: {leftTab.title} <span className="text-gray-400 mx-1">↔</span> {rightTab.title}
          </h2>
          <div className="flex items-center flex-shrink-0">
             {/* Toggle Hide Matching Lines Button */}
             <button
                onClick={toggleHideMatching}
                title={hideMatchingLines ? "Show Matching Lines" : "Hide Matching Lines (Contextual Diff)"}
                className="mr-4 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white flex items-center"
             >
                {hideMatchingLines
                    ? <Eye size={14} className="mr-1" />
                    : <EyeOff size={14} className="mr-1" />
                }
                {hideMatchingLines ? 'Show All' : 'Hide Matching'}
             </button>
            {/* Undo/Redo Buttons */}
            <button onClick={handleUndo} title="Undo" disabled={!canUndo} className="mr-2 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed">
              <Undo2 size={14} />
            </button>
            <button onClick={handleRedo} title="Redo" disabled={!canRedo} className="mr-4 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed">
              <Redo2 size={14} />
            </button>
            {/* Close Button */}
            <button className="text-gray-400 hover:text-gray-200" onClick={handleCloseAndSave} title="Close and Save Changes">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Identical Content Message */}
        {areContentsIdentical && (
          <div className="bg-green-900 bg-opacity-50 text-green-200 text-sm px-4 py-1 text-center border-b border-gray-600 flex-shrink-0"> {/* Added flex-shrink-0 */}
            Contents are identical.
          </div>
        )}

        {/* Editor Area */}
        <div ref={editorContainerRef} className="flex-1 overflow-hidden">
          {/* Monaco Editor renders here */}
        </div>
      </div>
  );
};