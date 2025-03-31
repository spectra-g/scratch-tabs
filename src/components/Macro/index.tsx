import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { Disc, Square, Play, PlayCircle } from 'lucide-react';

// --- Constants ---
const MAX_PLAY_TO_END_ITERATIONS = 500;
const PLAY_TO_END_DELAY_MS = 20;
const PASTE_CHECK_TIMEOUT_MS = 100;
const MAX_DISPLAY_LENGTH = 50;

// Status Enum for Clarity
type MacroStatus = 'idle' | 'recording' | 'playingOnce' | 'playingToEnd';

// Action Types Enum/Constants (using const for simplicity here)
const ACTION_TYPE = {
  CHAR: 'char', DELETE_LEFT: 'deleteLeft', DELETE_RIGHT: 'deleteRight',
  PASTE: 'paste', NEW_LINE: 'newLine', MOVE_LEFT: 'moveLeft',
  MOVE_RIGHT: 'moveRight', MOVE_UP: 'moveUp', MOVE_DOWN: 'moveDown',
  SELECT_LEFT: 'selectLeft', SELECT_RIGHT: 'selectRight', SELECT_UP: 'selectUp',
  SELECT_DOWN: 'selectDown', COPY: 'copy',
} as const; // Use 'as const' for stricter typing

// Action Type Definition using constants
type Action =
    | { type: typeof ACTION_TYPE.CHAR; value: string }
    | { type: typeof ACTION_TYPE.DELETE_LEFT }
    | { type: typeof ACTION_TYPE.DELETE_RIGHT }
    | { type: typeof ACTION_TYPE.PASTE; value: string }
    | { type: typeof ACTION_TYPE.NEW_LINE }
    | { type: typeof ACTION_TYPE.MOVE_LEFT } | { type: typeof ACTION_TYPE.MOVE_RIGHT }
    | { type: typeof ACTION_TYPE.MOVE_UP } | { type: typeof ACTION_TYPE.MOVE_DOWN }
    | { type: typeof ACTION_TYPE.SELECT_LEFT } | { type: typeof ACTION_TYPE.SELECT_RIGHT }
    | { type: typeof ACTION_TYPE.SELECT_UP } | { type: typeof ACTION_TYPE.SELECT_DOWN }
    | { type: typeof ACTION_TYPE.COPY; value: string };

// UI Symbols Map
const ACTION_SYMBOLS: Record<Action['type'], string | ((action: Action) => string)> = {
  [ACTION_TYPE.CHAR]: (a) => (a as { value: string }).value,
  [ACTION_TYPE.DELETE_LEFT]: '⌫',
  [ACTION_TYPE.DELETE_RIGHT]: '⌦',
  [ACTION_TYPE.PASTE]: (a) => `[P:${(a as { value: string }).value.length}]`,
  [ACTION_TYPE.NEW_LINE]: '⏎',
  [ACTION_TYPE.MOVE_LEFT]: '←', [ACTION_TYPE.MOVE_RIGHT]: '→',
  [ACTION_TYPE.MOVE_UP]: '↑', [ACTION_TYPE.MOVE_DOWN]: '↓',
  [ACTION_TYPE.SELECT_LEFT]: '[←S]', [ACTION_TYPE.SELECT_RIGHT]: '[→S]',
  [ACTION_TYPE.SELECT_UP]: '[↑S]', [ACTION_TYPE.SELECT_DOWN]: '[↓S]',
  [ACTION_TYPE.COPY]: (a) => `[C:${(a as { value: string }).value.length}]`,
};

// Monaco Command IDs
const MONACO_CMD = {
  DELETE_LEFT: 'deleteLeft', DELETE_RIGHT: 'deleteRight',
  CURSOR_LEFT: 'cursorLeft', CURSOR_RIGHT: 'cursorRight',
  CURSOR_UP: 'cursorUp', CURSOR_DOWN: 'cursorDown',
  CURSOR_LEFT_SELECT: 'cursorLeftSelect', CURSOR_RIGHT_SELECT: 'cursorRightSelect',
  CURSOR_UP_SELECT: 'cursorUpSelect', CURSOR_DOWN_SELECT: 'cursorDownSelect',
} as const;

// Props Interface
interface MacroProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
}

export const Macro: React.FC<MacroProps> = ({ editor }) => {
  // --- State ---
  const [status, setStatus] = useState<MacroStatus>('idle'); // Consolidated status
  const [recordedActions, setRecordedActions] = useState<Action[]>([]);
  const listenersRef = useRef<monaco.IDisposable[]>([]);
  const isPastingRef = useRef<boolean>(false); // Still needed for paste event coordination

  // --- Listener Setup Effect ---
  useEffect(() => {
    // Cleanup previous listeners
    listenersRef.current.forEach(listener => listener.dispose());
    listenersRef.current = [];
    isPastingRef.current = false;

    // Only attach listeners if recording and editor exists
    if (status !== 'recording' || !editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      console.error("Macro Effect: Editor model not available.");
      return;
    }

    const disposables: monaco.IDisposable[] = [];

    // --- Listener 1: Character Input ---
    disposables.push(editor.onDidType((text) => {
      if (isPastingRef.current) return; // Skip during paste
      // Simple alphanumeric check (could be expanded)
      if (text && text.length === 1 && /^[a-zA-Z0-9]$/.test(text)) {
        setRecordedActions(prev => [...prev, { type: ACTION_TYPE.CHAR, value: text }]);
      }
    }));

    // --- Listener 2: Key Down Events ---
    disposables.push(editor.onKeyDown((e) => {
      const { key } = e.browserEvent;
      const ctrlCmd = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      let actionToAdd: Action | null = null;
      let preventDefault = false;
      let isPasteIntent = false;

      // Order matters: Modifiers first
      if (shift) {
        if (key === 'ArrowLeft') actionToAdd = { type: ACTION_TYPE.SELECT_LEFT };
        else if (key === 'ArrowRight') actionToAdd = { type: ACTION_TYPE.SELECT_RIGHT };
        else if (key === 'ArrowUp') actionToAdd = { type: ACTION_TYPE.SELECT_UP };
        else if (key === 'ArrowDown') actionToAdd = { type: ACTION_TYPE.SELECT_DOWN };
      } else if (ctrlCmd) {
        if (key.toLowerCase() === 'v') { // Paste
          isPasteIntent = true;
        } else if (key.toLowerCase() === 'c') { // Copy
          const selection = editor.getSelection();
          const value = selection && !selection.isEmpty() ? model.getValueInRange(selection) : "";
          actionToAdd = { type: ACTION_TYPE.COPY, value };
        }
      } else { // No Shift or Ctrl/Cmd
        if (key === 'Backspace') { actionToAdd = { type: ACTION_TYPE.DELETE_LEFT }; preventDefault = true; }
        else if (key === 'Delete') { actionToAdd = { type: ACTION_TYPE.DELETE_RIGHT }; preventDefault = true; }
        else if (key === 'Enter') { actionToAdd = { type: ACTION_TYPE.NEW_LINE }; }
        else if (key === 'ArrowLeft') actionToAdd = { type: ACTION_TYPE.MOVE_LEFT };
        else if (key === 'ArrowRight') actionToAdd = { type: ACTION_TYPE.MOVE_RIGHT };
        else if (key === 'ArrowUp') actionToAdd = { type: ACTION_TYPE.MOVE_UP };
        else if (key === 'ArrowDown') actionToAdd = { type: ACTION_TYPE.MOVE_DOWN };
      }

      // Handle Paste Intent
      if (isPasteIntent) {
        isPastingRef.current = true;
        setTimeout(() => {
          if (isPastingRef.current) {
            console.warn("Macro Effect: Resetting paste flag via timeout.");
            isPastingRef.current = false;
          }
        }, PASTE_CHECK_TIMEOUT_MS);
        // Don't preventDefault for paste, let onDidPaste handle it
      }

      // Add the recorded action if one was determined
      if (actionToAdd) {
        setRecordedActions(prev => [...prev, actionToAdd!]);
        // Prevent default only for specific actions (Backspace, Delete)
        if (preventDefault) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }));

    // --- Listener 3: Paste Completion ---
    disposables.push(editor.onDidPaste((e) => {
      if (isPastingRef.current) {
        const pastedText = model.getValueInRange(e.range);
        setRecordedActions(prev => [...prev, { type: ACTION_TYPE.PASTE, value: pastedText }]);
        isPastingRef.current = false; // Reset flag after handling
      }
    }));

    listenersRef.current = disposables;

    // --- Effect Cleanup Function ---
    return () => {
      listenersRef.current.forEach(listener => listener.dispose());
      listenersRef.current = [];
      isPastingRef.current = false;
    };
  }, [editor, status]); // Dependency is now status


  // --- Action Handlers ---
  const handleStartRecording = useCallback(() => {
    if (!editor || status !== 'idle') return;
    setRecordedActions([]);
    setStatus('recording');
    editor.focus();
  }, [editor, status]);

  const handleStopRecording = useCallback(() => {
    if (status !== 'recording' && !hasRecorded) return; // Can only stop if recording
    if (hasRecorded) setRecordedActions([]);
    setStatus('idle');
  }, [status]);


  // --- Playback Core Logic (Single Iteration) ---
  const playSingleMacroIteration = useCallback(async (): Promise<{ success: boolean, startPos: monaco.Position | null, endPos: monaco.Position | null }> => {
    if (!editor || recordedActions.length === 0) {
      return { success: false, startPos: null, endPos: null };
    }

    let startPos: monaco.Position | null = null;
    let endPos: monaco.Position | null = null;

    try {
      editor.focus();
      startPos = editor.getPosition();
      if (!startPos) throw new Error("Could not get start position.");

      for (const action of recordedActions) { // Use for...of for readability
        let selectionForEdit: monaco.Selection | null = null;

        // Get selection only if needed for executeEdits
        const needsSelection = [ACTION_TYPE.CHAR, ACTION_TYPE.PASTE, ACTION_TYPE.NEW_LINE].includes(action.type);
        if (needsSelection) {
          editor.focus(); // Re-focus defensively
          selectionForEdit = editor.getSelection();
          if (!selectionForEdit) throw new Error(`Could not get selection before action: ${action.type}`);
        }

        // --- Playback Action Execution ---
        switch (action.type) {
            // Edits requiring selection
          case ACTION_TYPE.CHAR: editor.executeEdits('macro', [{ range: selectionForEdit!, text: action.value, forceMoveMarkers: true }]); break;
          case ACTION_TYPE.PASTE: editor.executeEdits('macro', [{ range: selectionForEdit!, text: action.value, forceMoveMarkers: true }]); break;
          case ACTION_TYPE.NEW_LINE: editor.executeEdits('macro', [{ range: selectionForEdit!, text: '\n', forceMoveMarkers: true }]); break;

            // Trigger-based actions
          case ACTION_TYPE.DELETE_LEFT: editor.trigger('macro', MONACO_CMD.DELETE_LEFT, null); break;
          case ACTION_TYPE.DELETE_RIGHT: editor.trigger('macro', MONACO_CMD.DELETE_RIGHT, null); break;
          case ACTION_TYPE.MOVE_LEFT: editor.trigger('macro', MONACO_CMD.CURSOR_LEFT, null); break;
          case ACTION_TYPE.MOVE_RIGHT: editor.trigger('macro', MONACO_CMD.CURSOR_RIGHT, null); break;
          case ACTION_TYPE.MOVE_UP: editor.trigger('macro', MONACO_CMD.CURSOR_UP, null); break;
          case ACTION_TYPE.MOVE_DOWN: editor.trigger('macro', MONACO_CMD.CURSOR_DOWN, null); break;
          case ACTION_TYPE.SELECT_LEFT: editor.trigger('macro', MONACO_CMD.CURSOR_LEFT_SELECT, null); break;
          case ACTION_TYPE.SELECT_RIGHT: editor.trigger('macro', MONACO_CMD.CURSOR_RIGHT_SELECT, null); break;
          case ACTION_TYPE.SELECT_UP: editor.trigger('macro', MONACO_CMD.CURSOR_UP_SELECT, null); break;
          case ACTION_TYPE.SELECT_DOWN: editor.trigger('macro', MONACO_CMD.CURSOR_DOWN_SELECT, null); break;

            // No-op actions
          case ACTION_TYPE.COPY: /* Playback ignores copy */ break;

          default: console.warn("Unhandled action type during playback:", action);
        }
      } // End for loop

      endPos = editor.getPosition();
      return { success: true, startPos, endPos };

    } catch (error) {
      console.error("Error during single macro iteration:", error);
      endPos = editor.getPosition(); // Attempt to get end position even on error
      return { success: false, startPos, endPos };
    }
  }, [editor, recordedActions]);


  // --- Playback Handlers ---
  const handlePlayRecording = useCallback(async () => {
    if (!editor || status !== 'idle' || recordedActions.length === 0) return;
    setStatus('playingOnce');
    try {
      await playSingleMacroIteration();
    } finally {
      setStatus('idle');
      editor?.focus();
    }
  }, [editor, status, recordedActions.length, playSingleMacroIteration]);

  const handlePlayToEnd = useCallback(async () => {
    if (!editor || status !== 'idle' || recordedActions.length === 0) return;
    setStatus('playingToEnd');

    let previousPosition: monaco.Position | null = null;
    let iterations = 0;
    const model = editor.getModel();

    if (!model) {
      console.error("PlayToEnd: Cannot get editor model.");
      setStatus('idle');
      return;
    }

    try {
      while (iterations < MAX_PLAY_TO_END_ITERATIONS) {
        iterations++;
        const { success, startPos, endPos } = await playSingleMacroIteration();

        // --- Termination Checks ---
        if (!success || !startPos || !endPos) break; // Stop on error or bad position
        if (previousPosition && previousPosition.equals(endPos)) break; // Stop if no progress

        // Stop if at end of document
        const lineCount = model.getLineCount();
        const lastLineLength = model.getLineLength(lineCount);
        if (endPos.lineNumber === lineCount && endPos.column === lastLineLength + 1) break;

        previousPosition = endPos;
        await new Promise(resolve => setTimeout(resolve, PLAY_TO_END_DELAY_MS));
      }

      if (iterations >= MAX_PLAY_TO_END_ITERATIONS) {
        console.warn(`PlayToEnd: Stopped after reaching max ${MAX_PLAY_TO_END_ITERATIONS} iterations.`);
      }
    } catch (loopError) {
      console.error("Error during PlayToEnd loop:", loopError);
    } finally {
      setStatus('idle');
      editor?.focus();
    }
  }, [editor, status, recordedActions.length, playSingleMacroIteration]);


  // --- Render ---
  const renderActionSymbol = (action: Action): string => {
    const symbolOrFn = ACTION_SYMBOLS[action.type];
    return typeof symbolOrFn === 'function' ? symbolOrFn(action) : symbolOrFn ?? '?';
  };

  const formatActionsForDisplay = (actions: Action[], recording: boolean): string => {
    if (!recording && actions.length === 0) return "Idle.";

    const displayString = actions.map(renderActionSymbol).join('');
    const prefix = recording ? "RECORDING: '" : "Ready: '";
    const suffix = recording ? "'" : `' (${actions.length} actions)`;
    const ellipsis = displayString.length > MAX_DISPLAY_LENGTH ? '...' : '';
    const truncatedString = displayString.substring(0, MAX_DISPLAY_LENGTH);

    return `${prefix}${truncatedString}${ellipsis}${suffix}`;
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'recording': return formatActionsForDisplay(recordedActions, true);
      case 'playingOnce': return 'Playing...';
      case 'playingToEnd': return 'Playing to end...';
      case 'idle':
      default: return formatActionsForDisplay(recordedActions, false);
    }
  }

  // Button Rendering Logic
  const commonButtonClass = "rounded hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent";
  const activeRecordClass = "text-red-500";
  const inactiveClass = "text-gray-600";
  const activeClass = "text-gray-400";
  const canInteract = status === 'idle';
  const hasRecorded = recordedActions.length > 0;

  return (
      <div className="flex items-center space-x-2 px-2 h-6 bg-gray-800">
        {/* Record Button */}
        <button
            className={`${commonButtonClass} ${status === 'recording' ? activeRecordClass : activeClass}`}
            onClick={handleStartRecording}
            disabled={!editor || status !== 'idle'}
            title={!editor ? "Editor unavailable" : "Record macro"}
        >
          <Disc size={14} />
        </button>

        {/* Stop Button */}
        <button
            className={`${commonButtonClass} ${status !== 'recording' && !hasRecorded ? inactiveClass : activeClass}`}
            onClick={handleStopRecording}
            disabled={!editor || (status !== 'recording' && !hasRecorded)}
            title={!editor ? "Editor unavailable" : "Stop recording"}
        >
          <Square size={14} />
        </button>

        {/* Play Button */}
        <button
            className={`${commonButtonClass} ${!hasRecorded || status !== 'idle' ? inactiveClass : activeClass}`}
            onClick={handlePlayRecording}
            disabled={!editor || !canInteract || !hasRecorded}
            title={!editor ? "Editor unavailable" : !hasRecorded ? "Nothing recorded" : "Play macro once"}
        >
          <Play size={14} />
        </button>

        {/* Play To End Button */}
        <button
            className={`${commonButtonClass} ${!hasRecorded || status !== 'idle' ? inactiveClass : activeClass}`}
            onClick={handlePlayToEnd}
            disabled={!editor || !canInteract || !hasRecorded}
            title={!editor ? "Editor unavailable" : !hasRecorded ? "Nothing recorded" : "Play macro until end"}
        >
          <PlayCircle size={14} />
        </button>

        {/* Status Display */}
        <span className="text-xs text-gray-500 truncate flex-1">
        {getStatusText()}
      </span>
      </div>
  );
};
