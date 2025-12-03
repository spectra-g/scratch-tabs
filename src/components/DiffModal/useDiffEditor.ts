import { useState, useEffect, useRef, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useThemeStore } from "../../stores/themeStore";

// Define the structure for a history entry
export interface ChangeHistoryEntry {
  leftContent: string;
  rightContent: string;
  timestamp: number;
}

const DEBOUNCE_DELAY = 400;
const DIFF_CONTEXT_LINES = 3;

export interface DiffEditorEngine {
  editorContainerRef: React.RefObject<HTMLDivElement>;
  changeHistory: ChangeHistoryEntry[];
  currentHistoryIndex: number;
  areContentsIdentical: boolean;
  hideMatchingLines: boolean;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  toggleHideMatching: () => void;
  getCurrentLeftContent: () => string | undefined;
  getCurrentRightContent: () => string | undefined;
  forceRecordChange: () => void;
}

export const useDiffEditor = (
  leftContent: string,
  rightContent: string,
  language: string,
  leftTabId: string,
  rightTabId: string,
): DiffEditorEngine => {
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(
    null,
  );
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const originalEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const modifiedEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );

  const [changeHistory, setChangeHistory] = useState<ChangeHistoryEntry[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const isRestoringHistory = useRef(false);
  const historyIndexRef = useRef(currentHistoryIndex);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [areContentsIdentical, setAreContentsIdentical] = useState(false);
  const [hideMatchingLines, setHideMatchingLines] = useState(false);

  // Get theme from store
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  useEffect(() => {
    historyIndexRef.current = currentHistoryIndex;
  }, [currentHistoryIndex]);

  const recordChangeActual = useCallback(() => {
    if (
      !originalEditorRef.current ||
      !modifiedEditorRef.current ||
      isRestoringHistory.current
    ) {
      return;
    }
    const currentLeft = originalEditorRef.current.getValue();
    const currentRight = modifiedEditorRef.current.getValue();
    const latestIndex = historyIndexRef.current;

    // Check identical status after recording change
    setAreContentsIdentical(currentLeft === currentRight);

    setChangeHistory((prevHistory) => {
      const lastEntry = prevHistory[latestIndex];
      // Prevent recording identical consecutive states if content hasn't changed
      if (
        lastEntry &&
        lastEntry.leftContent === currentLeft &&
        lastEntry.rightContent === currentRight
      ) {
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
  }, []);

  // Initial State Effect
  useEffect(() => {
    const initialState: ChangeHistoryEntry = {
      leftContent,
      rightContent,
      timestamp: Date.now(),
    };
    // Always reset history and index when tabs change
    setChangeHistory([initialState]);
    setCurrentHistoryIndex(0);
    // Initial identical check
    setAreContentsIdentical(leftContent === rightContent);
    // Reset view option
    setHideMatchingLines(false);

    // Cleanup debounce timer on unmount or tab change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [leftContent, rightContent, leftTabId, rightTabId]);

  // Monaco Editor Setup Effect
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
    };

    cleanup();

    if (!editorContainerRef.current) {
      return;
    }

    const originalModel = monaco.editor.createModel(leftContent, language);
    const modifiedModel = monaco.editor.createModel(rightContent, language);

    editor = monaco.editor.createDiffEditor(editorContainerRef.current, {
      originalEditable: true,
      renderSideBySide: true,
      theme: isDarkMode ? "vs-dark" : "vs",
      automaticLayout: true,
      enableSplitViewResizing: true,
      readOnly: false,
      hideUnchangedRegions: {
        enabled: hideMatchingLines,
        contextLineCount: DIFF_CONTEXT_LINES,
      },
      scrollBeyondLastLine: false,
      renderIndicators: true,
      diffCodeLens: false,
    });
    editor.setModel({ original: originalModel, modified: modifiedModel });

    diffEditorRef.current = editor;
    originalEditorRef.current = editor.getOriginalEditor();
    modifiedEditorRef.current = editor.getModifiedEditor();

    // Debounced handler for recording changes
    const debouncedRecordChangeHandler = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        recordChangeActual();
      }, DEBOUNCE_DELAY);
    };

    // Attach listeners
    if (originalEditorRef.current) {
      listeners.push(
        originalEditorRef.current.onDidChangeModelContent(
          debouncedRecordChangeHandler,
        ),
      );
    }
    if (modifiedEditorRef.current) {
      listeners.push(
        modifiedEditorRef.current.onDidChangeModelContent(
          debouncedRecordChangeHandler,
        ),
      );
    }

    // Cleanup function
    return () => {
      listeners.forEach((listener) => listener.dispose());
      listeners = [];
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      cleanup();
    };
  }, [
    leftTabId,
    rightTabId,
    leftContent,
    rightContent,
    language,
    recordChangeActual,
    isDarkMode,
  ]);

  // Effect to Update Editor Options (like hiding lines)
  useEffect(() => {
    if (diffEditorRef.current) {
      diffEditorRef.current.updateOptions({
        hideUnchangedRegions: {
          enabled: hideMatchingLines,
          contextLineCount: DIFF_CONTEXT_LINES,
        },
      });
    }
  }, [hideMatchingLines]);

  // Undo/Redo Effect
  useEffect(() => {
    // Ensure we only run this when actively restoring history
    if (!isRestoringHistory.current || currentHistoryIndex < 0) {
      return;
    }

    const historyEntry = changeHistory[currentHistoryIndex];
    if (!historyEntry) {
      console.warn("History entry not found for index:", currentHistoryIndex);
      isRestoringHistory.current = false;
      return;
    }

    const originalEditor = originalEditorRef.current;
    const modifiedEditor = modifiedEditorRef.current;

    if (!originalEditor || !modifiedEditor) {
      console.warn("Editor refs not available during history restore.");
      isRestoringHistory.current = false;
      return;
    }

    let changed = false;
    // Only set value if it's actually different to avoid unnecessary editor updates
    if (originalEditor.getValue() !== historyEntry.leftContent) {
      originalEditor.setValue(historyEntry.leftContent);
      changed = true;
    }
    if (modifiedEditor.getValue() !== historyEntry.rightContent) {
      modifiedEditor.setValue(historyEntry.rightContent);
      changed = true;
    }

    // Check identical status after restoring history
    if (changed) {
      setAreContentsIdentical(
        historyEntry.leftContent === historyEntry.rightContent,
      );
    }

    // Use setTimeout to allow Monaco to process the setValue operations
    // before resetting the flag. This helps prevent the change listener
    // from firing immediately with the restored content.
    setTimeout(() => {
      isRestoringHistory.current = false;
    }, 0);
  }, [currentHistoryIndex, changeHistory]);

  // Computed values
  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < changeHistory.length - 1;

  // Action handlers
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    // Clear any pending debounced change before undoing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      recordChangeActual();
    }
    // Set flag *before* changing state to prevent immediate recording
    isRestoringHistory.current = true;
    setCurrentHistoryIndex((prevIndex) => prevIndex - 1);
  }, [canUndo, recordChangeActual]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    // Set flag *before* changing state
    isRestoringHistory.current = true;
    setCurrentHistoryIndex((prevIndex) => prevIndex + 1);
  }, [canRedo]);

  const toggleHideMatching = useCallback(() => {
    setHideMatchingLines((prev) => !prev);
  }, []);

  const getCurrentLeftContent = useCallback(() => {
    return originalEditorRef.current?.getValue();
  }, []);

  const getCurrentRightContent = useCallback(() => {
    return modifiedEditorRef.current?.getValue();
  }, []);

  // Force record any pending changes (useful for saving)
  const forceRecordChange = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      if (!isRestoringHistory.current) {
        recordChangeActual();
      }
    }
  }, [recordChangeActual]);

  return {
    editorContainerRef,
    changeHistory,
    currentHistoryIndex,
    areContentsIdentical,
    hideMatchingLines,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    toggleHideMatching,
    getCurrentLeftContent,
    getCurrentRightContent,
    forceRecordChange,
  };
};
