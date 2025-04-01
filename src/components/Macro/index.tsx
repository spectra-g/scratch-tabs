import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { Disc, Square, Play, PlayCircle } from 'lucide-react';

// --- Constants ---
const MAX_PLAY_TO_END_ITERATIONS = 500;
const PLAY_TO_END_DELAY_MS = 20; // Keep a small delay
const PASTE_CHECK_TIMEOUT_MS = 100;
const MAX_DISPLAY_LENGTH = 50;

// Status Enum for Clarity
type MacroStatus = 'idle' | 'recording' | 'playingOnce' | 'playingToEnd';

// Action Types Enum/Constants
const ACTION_TYPE = {
  CHAR: 'char', DELETE_LEFT: 'deleteLeft', DELETE_RIGHT: 'deleteRight',
  PASTE: 'paste', NEW_LINE: 'newLine', MOVE_LEFT: 'moveLeft',
  MOVE_RIGHT: 'moveRight', MOVE_UP: 'moveUp', MOVE_DOWN: 'moveDown',
  SELECT_LEFT: 'selectLeft', SELECT_RIGHT: 'selectRight', SELECT_UP: 'selectUp',
  SELECT_DOWN: 'selectDown', COPY: 'copy',
  MOVE_HOME: 'moveHome', MOVE_END: 'moveEnd',
  SELECT_HOME: 'selectHome', SELECT_END: 'selectEnd',
} as const;

// Action Type Definition
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
    | { type: typeof ACTION_TYPE.COPY; value: string }
    | { type: typeof ACTION_TYPE.MOVE_HOME } | { type: typeof ACTION_TYPE.MOVE_END }
    | { type: typeof ACTION_TYPE.SELECT_HOME } | { type: typeof ACTION_TYPE.SELECT_END };

// UI Symbols Map
const ACTION_SYMBOLS: Record<Action['type'], string | ((action: Action) => string)> = {
  [ACTION_TYPE.CHAR]: (a) => (a as { value: string }).value === ' ' ? '␣' : (a as { value: string }).value, // Show space explicitly
  [ACTION_TYPE.DELETE_LEFT]: '⌫',
  [ACTION_TYPE.DELETE_RIGHT]: '⌦',
  [ACTION_TYPE.PASTE]: (a) => `[P:${(a as { value: string }).value.length}]`,
  [ACTION_TYPE.NEW_LINE]: '⏎',
  [ACTION_TYPE.MOVE_LEFT]: '←', [ACTION_TYPE.MOVE_RIGHT]: '→',
  [ACTION_TYPE.MOVE_UP]: '↑', [ACTION_TYPE.MOVE_DOWN]: '↓',
  [ACTION_TYPE.SELECT_LEFT]: '[←S]', [ACTION_TYPE.SELECT_RIGHT]: '[→S]',
  [ACTION_TYPE.SELECT_UP]: '[↑S]', [ACTION_TYPE.SELECT_DOWN]: '[↓S]',
  [ACTION_TYPE.COPY]: (a) => `[C:${(a as { value: string }).value.length}]`,
  [ACTION_TYPE.MOVE_HOME]: '⇤',
  [ACTION_TYPE.MOVE_END]: '⇥',
  [ACTION_TYPE.SELECT_HOME]: '[⇤S]',
  [ACTION_TYPE.SELECT_END]: '[⇥S]',
};

// Monaco Command IDs
const MONACO_CMD = {
  DELETE_LEFT: 'deleteLeft', DELETE_RIGHT: 'deleteRight',
  CURSOR_LEFT: 'cursorLeft', CURSOR_RIGHT: 'cursorRight',
  CURSOR_UP: 'cursorUp', CURSOR_DOWN: 'cursorDown',
  CURSOR_LEFT_SELECT: 'cursorLeftSelect', CURSOR_RIGHT_SELECT: 'cursorRightSelect',
  CURSOR_UP_SELECT: 'cursorUpSelect', CURSOR_DOWN_SELECT: 'cursorDownSelect',
  CURSOR_HOME: 'cursorHome', CURSOR_END: 'cursorEnd',
  CURSOR_HOME_SELECT: 'cursorHomeSelect', CURSOR_END_SELECT: 'cursorEndSelect',
  // Added TYPE for standard character insertion during playback (optional, but safer)
  TYPE: 'type',
} as const;

// Props Interface
interface MacroProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
}

export const Macro: React.FC<MacroProps> = ({ editor }) => {
  const [status, setStatus] = useState<MacroStatus>('idle');
  const [recordedActions, setRecordedActions] = useState<Action[]>([]);
  const listenersRef = useRef<monaco.IDisposable[]>([]);
  const isPastingRef = useRef<boolean>(false);
  // Ref to manage stopping playToEnd cleanly
  const stopPlayToEndRef = useRef<boolean>(false);

  // --- Listener Setup Effect ---
  useEffect(() => {
    listenersRef.current.forEach(listener => listener.dispose());
    listenersRef.current = [];
    isPastingRef.current = false;

    if (status !== 'recording' || !editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const disposables: monaco.IDisposable[] = [];

    // --- Listener 1: Character Input (Correct Place) ---
    disposables.push(editor.onDidType((text) => {
      // Only record single characters typed directly (not during paste)
      // This correctly handles standard keys, symbols, spaces, etc.
      if (!isPastingRef.current && text && text.length === 1 && text !== '\n') {
        setRecordedActions(prev => [...prev, { type: ACTION_TYPE.CHAR, value: text }]);
      }
      // We don't record '\n' here because 'Enter' keydown handles it more reliably
    }));

    // --- Listener 2: Key Down Events (Special Keys Only) ---
    disposables.push(editor.onKeyDown((e) => {
      const { key } = e.browserEvent;
      const ctrlCmd = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      let actionToAdd: Action | null = null;
      let preventDefault = false; // Only prevent if we explicitly handle the action *instead* of Monaco
      let isPasteIntent = false;

      // --- Handle only non-character keys or modified keys ---
      if (shift) {
        if (key === 'ArrowLeft') actionToAdd = { type: ACTION_TYPE.SELECT_LEFT };
        else if (key === 'ArrowRight') actionToAdd = { type: ACTION_TYPE.SELECT_RIGHT };
        else if (key === 'ArrowUp') actionToAdd = { type: ACTION_TYPE.SELECT_UP };
        else if (key === 'ArrowDown') actionToAdd = { type: ACTION_TYPE.SELECT_DOWN };
        else if (key === 'Home') actionToAdd = { type: ACTION_TYPE.SELECT_HOME };
        else if (key === 'End') actionToAdd = { type: ACTION_TYPE.SELECT_END };
        // Let Shift+Other keys fall through (e.g., Shift+Enter, Shift+Tab)
      } else if (ctrlCmd) {
        if (key.toLowerCase() === 'v') {
          isPasteIntent = true;
          // Let the browser/Monaco handle the paste event itself
        } else if (key.toLowerCase() === 'c') {
          const selection = editor.getSelection();
          const value = selection && !selection.isEmpty() ? model.getValueInRange(selection) : "";
          actionToAdd = { type: ACTION_TYPE.COPY, value };
          // Let Monaco handle the actual copy
        }
        // Let other Ctrl/Cmd combinations fall through
      } else { // No Shift or Ctrl/Cmd
        // Keys that *replace* default behavior or aren't caught by onDidType
        if (key === 'Backspace') { actionToAdd = { type: ACTION_TYPE.DELETE_LEFT }; preventDefault = true; } // Prevent default as we record it
        else if (key === 'Delete') { actionToAdd = { type: ACTION_TYPE.DELETE_RIGHT }; preventDefault = true; } // Prevent default
        else if (key === 'Enter') { actionToAdd = { type: ACTION_TYPE.NEW_LINE }; } // Don't prevent default, let Monaco insert newline
        else if (key === 'Tab') { actionToAdd = { type: ACTION_TYPE.CHAR, value: '\t' }; } // Record Tab as a character
        // Navigation keys (don't prevent default)
        else if (key === 'ArrowLeft') actionToAdd = { type: ACTION_TYPE.MOVE_LEFT };
        else if (key === 'ArrowRight') actionToAdd = { type: ACTION_TYPE.MOVE_RIGHT };
        else if (key === 'ArrowUp') actionToAdd = { type: ACTION_TYPE.MOVE_UP };
        else if (key === 'ArrowDown') actionToAdd = { type: ACTION_TYPE.MOVE_DOWN };
        else if (key === 'Home') actionToAdd = { type: ACTION_TYPE.MOVE_HOME };
        else if (key === 'End') actionToAdd = { type: ACTION_TYPE.MOVE_END };

        // --- DO NOT ADD fallback character logic here ---
        // onDidType handles standard character input correctly.
      }

      if (isPasteIntent) {
        isPastingRef.current = true;
        setTimeout(() => { isPastingRef.current = false; }, PASTE_CHECK_TIMEOUT_MS);
        // Don't add paste action here, wait for onDidPaste
      }

      if (actionToAdd) {
        setRecordedActions(prev => [...prev, actionToAdd!]);
        if (preventDefault) {
          console.log("Preventing default for:", key);
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }));

    // --- Listener 3: Paste Completion ---
    disposables.push(editor.onDidPaste((e) => {
      if (isPastingRef.current) {
        const pastedText = model.getValueInRange(e.range);
        // Check if pastedText is not empty before recording
        if (pastedText) {
          setRecordedActions(prev => [...prev, { type: ACTION_TYPE.PASTE, value: pastedText }]);
        }
        isPastingRef.current = false;
      }
    }));

    listenersRef.current = disposables;

    return () => {
      listenersRef.current.forEach(listener => listener.dispose());
      listenersRef.current = [];
      isPastingRef.current = false;
    };
  }, [editor, status]); // Rerun effect when status or editor changes


  // --- Action Handlers ---
  const handleStartRecording = useCallback(() => {
    if (!editor || status !== 'idle') return;
    console.log("Starting recording...");
    setRecordedActions([]);
    setStatus('recording');
    editor.focus();
  }, [editor, status]);

  const handleStopRecording = useCallback(() => {
    const hasRecorded = recordedActions.length > 0;
    // If currently playing to end, signal it to stop
    if (status === 'playingToEnd') {
      console.log("Signalling playToEnd to stop.");
      stopPlayToEndRef.current = true; // Signal the loop to stop
      // The loop's finally block will set status to idle
    } else if (status === 'recording' || hasRecorded) {
      console.log("Stopping recording or clearing macro.");
      setStatus('idle');
      // Clear actions only if stopping from idle with actions already present
      if (status === 'idle' && hasRecorded) {
        setRecordedActions([]);
      }
      stopPlayToEndRef.current = false; // Reset flag
    }
    // No need to focus editor here, user might want to click elsewhere
  }, [status, recordedActions.length]);


  // --- Playback Core Logic (Single Iteration) ---
  const playSingleMacroIteration = useCallback(async (): Promise<{ success: boolean, startPos: monaco.Position | null, endPos: monaco.Position | null }> => {
    if (!editor || recordedActions.length === 0) {
      return { success: false, startPos: null, endPos: null };
    }

    let startPos: monaco.Position | null = editor.getPosition(); // Get start position before loop
    let currentPos = startPos; // Track position through actions

    try {
      editor.focus(); // Ensure focus before starting playback iteration

      for (const action of recordedActions) {
        // Get selection just before operations that need it (like type/paste)
        // Trigger-based commands manage their own cursor/selection state
        let selectionForEdit: monaco.Selection | null = null;
        const needsSelection = [ACTION_TYPE.CHAR, ACTION_TYPE.PASTE, ACTION_TYPE.NEW_LINE].includes(action.type);
        if (needsSelection) {
          selectionForEdit = editor.getSelection();
          if (!selectionForEdit) {
            console.error(`Could not get selection before action: ${action.type}`);
            throw new Error(`Could not get selection before action: ${action.type}`);
          }
        }

        console.log("Playing action:", action.type, (action as any).value ?? ''); // Debug log

        // --- Playback Action Execution ---
        switch (action.type) {
            // Use executeEdits for text insertion/replacement
          case ACTION_TYPE.CHAR:
            // Use 'type' command for chars - often more reliable than executeEdits for single chars
            // editor.trigger('macro', MONACO_CMD.TYPE, { text: action.value });
            // Or stick to executeEdits if 'type' command causes issues
            editor.executeEdits('macro', [{ range: selectionForEdit!, text: action.value, forceMoveMarkers: true }]);
            break;
          case ACTION_TYPE.PASTE:
            editor.executeEdits('macro', [{ range: selectionForEdit!, text: action.value, forceMoveMarkers: true }]);
            break;
          case ACTION_TYPE.NEW_LINE:
            // Prefer executeEdits for newline consistency
            editor.executeEdits('macro', [{ range: selectionForEdit!, text: '\n', forceMoveMarkers: true }]);
            // editor.trigger('macro', MONACO_CMD.TYPE, { text: '\n' }); // Alternative
            break;

            // Use trigger for commands
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
            // --- Home/End Playback ---
          case ACTION_TYPE.MOVE_HOME: editor.trigger('macro', MONACO_CMD.CURSOR_HOME, null); break;
          case ACTION_TYPE.MOVE_END: editor.trigger('macro', MONACO_CMD.CURSOR_END, null); break;
          case ACTION_TYPE.SELECT_HOME: editor.trigger('macro', MONACO_CMD.CURSOR_HOME_SELECT, null); break;
          case ACTION_TYPE.SELECT_END: editor.trigger('macro', MONACO_CMD.CURSOR_END_SELECT, null); break;

          case ACTION_TYPE.COPY: /* Playback ignores copy */ break;

          default: console.warn("Unhandled action type during playback:", action);
        }

        // Optional small delay between actions if needed for stability, but usually not required
        // await new Promise(r => setTimeout(r, 5));

      } // End for loop

      currentPos = editor.getPosition(); // Get final position after all actions
      // console.log("Single Iteration Success. Start:", startPos?.toString(), "End:", currentPos?.toString());
      return { success: true, startPos, endPos: currentPos };

    } catch (error) {
      console.error("Error during single macro iteration:", error);
      currentPos = editor.getPosition(); // Attempt to get end position even on error
      return { success: false, startPos, endPos: currentPos };
    }
  }, [editor, recordedActions]); // Dependencies

  // --- Playback Handlers ---
  const handlePlayRecording = useCallback(async () => {
    if (!editor || status !== 'idle' || recordedActions.length === 0) return;
    console.log("Playing macro once...");
    setStatus('playingOnce');
    stopPlayToEndRef.current = false; // Ensure flag is reset
    try {
      await playSingleMacroIteration();
    } catch(err) {
      console.error("Error during single play:", err)
    }
    finally {
      setStatus('idle');
      editor?.focus();
      console.log("Single play finished.");
    }
  }, [editor, status, recordedActions.length, playSingleMacroIteration]);

  const handlePlayToEnd = useCallback(async () => {
    if (!editor || status !== 'idle' || recordedActions.length === 0) return;
    console.log("Playing macro to end...");
    setStatus('playingToEnd');
    stopPlayToEndRef.current = false; // Reset stop flag

    // Store the end position of the *previous* full iteration
    let endPosOfPreviousIteration: monaco.Position | null = editor.getPosition(); // Start with initial position
    let iterations = 0;
    const model = editor.getModel();

    if (!model || !endPosOfPreviousIteration) { // Ensure we have model and start position
      console.error("PlayToEnd: Cannot get editor model or initial position.");
      setStatus('idle');
      return;
    }

    try {
      editor.focus(); // Ensure focus before loop

      while (
          iterations < MAX_PLAY_TO_END_ITERATIONS &&
          !stopPlayToEndRef.current &&
          editor
          )
      {
        iterations++;
        console.log(`PlayToEnd Iteration: ${iterations}`);
        // Store the line number *before* this iteration runs
        const lineNumBeforeIteration = endPosOfPreviousIteration.lineNumber;


        // --- Execute one full macro iteration ---
        const { success, startPos, endPos } = await playSingleMacroIteration();

        // --- Termination Checks ---

        // 1. Manual Stop or Error
        if (stopPlayToEndRef.current) {
          console.log("PlayToEnd: Stop flag detected, breaking loop.");
          break;
        }
        if (!success || !endPos) {
          console.warn("PlayToEnd: Iteration failed or ended without position, stopping.");
          break;
        }

        // 2. *** NEW: Line Number Progression Check ***
        // Stop if the line number after execution is not greater than
        // the line number before this iteration started.
        // This correctly handles cases where DOWN fails on the last line.
        if (endPos.lineNumber <= lineNumBeforeIteration) {
          console.log(`PlayToEnd: Line number did not increase (Before: ${lineNumBeforeIteration}, After: ${endPos.lineNumber}), stopping.`);
          break;
        }

        // 3. Position Equality Check (as a fallback for non-line-advancing macros)
        // This helps if the macro *doesn't* have a DOWN but should still stop if stuck.
        if (endPosOfPreviousIteration && endPosOfPreviousIteration.equals(endPos)) {
          console.log("PlayToEnd: End position same as previous iteration (fallback check), stopping.", endPos.toString());
          break; // Stop if no progress between iterations
        }


        // --- Update state for next iteration ---
        endPosOfPreviousIteration = endPos; // Store the end position for the next check

        // Small delay
        await new Promise(resolve => setTimeout(resolve, PLAY_TO_END_DELAY_MS));

      } // End while loop

      // 4. Max Iterations Check
      if (iterations >= MAX_PLAY_TO_END_ITERATIONS) {
        console.warn(`PlayToEnd: Stopped after reaching max ${MAX_PLAY_TO_END_ITERATIONS} iterations.`);
      }

    } catch (loopError) {
      console.error("Error during PlayToEnd loop:", loopError);
    } finally {
      console.log("PlayToEnd: Finishing.");
      setStatus('idle');
      stopPlayToEndRef.current = false; // Reset flag
      editor?.focus();
    }
  }, [editor, status, recordedActions.length, playSingleMacroIteration]);

  // --- Render ---
  const renderActionSymbol = (action: Action): string => {
    const symbolOrFn = ACTION_SYMBOLS[action.type];
    if (!symbolOrFn) return '?';
    return typeof symbolOrFn === 'function' ? symbolOrFn(action) : symbolOrFn;
  };

  const formatActionsForDisplay = (actions: Action[], recording: boolean): string => {
    if (!recording && actions.length === 0) return "Idle.";

    const displayString = actions.map(renderActionSymbol).join('');
    const prefix = recording ? "RECORDING: '" : "Ready: '";
    const suffix = recording ? "'" : `' (${actions.length} actions)`;
    const ellipsis = displayString.length > MAX_DISPLAY_LENGTH ? '...' : '';
    const truncatedString = displayString.substring(0, MAX_DISPLAY_LENGTH);

    return `${prefix}${truncatedString}${displayString.length > MAX_DISPLAY_LENGTH ? ellipsis : ''}${suffix}`;
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

  const commonButtonClass = "rounded hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent p-0.5 flex items-center justify-center"; // Ensure centering
  const activeRecordClass = "text-red-500";
  const inactiveClass = "text-gray-600";
  const activeClass = "text-gray-400";
  const canInteract = status === 'idle';
  const canPlay = canInteract && recordedActions.length > 0;
  // Can stop if recording OR playing OR if idle with something recorded (to clear)
  const canStop = status === 'recording' || status === 'playingToEnd' || (status === 'idle' && recordedActions.length > 0);


  return (
      <div className="flex items-center space-x-2 px-2 h-6 bg-gray-800 text-xs">
        {/* Record Button */}
        <button
            className={`${commonButtonClass} ${status === 'recording' ? activeRecordClass : (editor ? activeClass : inactiveClass)}`}
            onClick={handleStartRecording}
            disabled={!editor || status !== 'idle'}
            title={!editor ? "Editor unavailable" : "Record macro (Ctrl+Alt+R)"} // Example shortcut hint
        >
          <Disc size={14} />
        </button>

        {/* Stop Button */}
        <button
            className={`${commonButtonClass} ${canStop ? activeClass : inactiveClass}`}
            onClick={handleStopRecording}
            disabled={!editor || !canStop}
            title={
              !editor ? "Editor unavailable" :
                  !canStop ? "Nothing to stop or clear" :
                      status === 'recording' ? "Stop recording (Ctrl+Alt+R)" :
                          status === 'playingToEnd' ? "Stop playback" :
                              "Clear recorded macro"
            }
        >
          <Square size={14} />
        </button>

        {/* Play Button */}
        <button
            className={`${commonButtonClass} ${canPlay ? activeClass : inactiveClass}`}
            onClick={handlePlayRecording}
            disabled={!editor || !canPlay}
            title={!editor ? "Editor unavailable" : !recordedActions.length ? "Nothing recorded" : "Play macro once (Ctrl+Alt+P)"}
        >
          <Play size={14} />
        </button>

        {/* Play To End Button */}
        <button
            className={`${commonButtonClass} ${canPlay ? activeClass : inactiveClass}`}
            onClick={handlePlayToEnd}
            disabled={!editor || !canPlay}
            title={!editor ? "Editor unavailable" : !recordedActions.length ? "Nothing recorded" : "Play macro until end (Ctrl+Alt+L)"}
        >
          <PlayCircle size={14} />
        </button>

        {/* Status Display */}
        <span className="text-gray-500 truncate flex-1 overflow-hidden whitespace-nowrap pl-1">
          {getStatusText()}
        </span>
      </div>
  );
};