import { useState, useEffect, useCallback, useRef } from "react";
import * as monaco from "monaco-editor";

// --- Constants ---
const MAX_PLAY_TO_END_ITERATIONS = 500;
const PLAY_TO_END_DELAY_MS = 20; // Keep a small delay
const PASTE_CHECK_TIMEOUT_MS = 100;

// Status Enum for Clarity
export type MacroStatus = "idle" | "recording" | "playingOnce" | "playingToEnd";

// Action Types Enum/Constants
export const ACTION_TYPE = {
  CHAR: "char",
  DELETE_LEFT: "deleteLeft",
  DELETE_RIGHT: "deleteRight",
  PASTE: "paste",
  NEW_LINE: "newLine",
  MOVE_LEFT: "moveLeft",
  MOVE_RIGHT: "moveRight",
  MOVE_UP: "moveUp",
  MOVE_DOWN: "moveDown",
  SELECT_LEFT: "selectLeft",
  SELECT_RIGHT: "selectRight",
  SELECT_UP: "selectUp",
  SELECT_DOWN: "selectDown",
  COPY: "copy",
  MOVE_HOME: "moveHome",
  MOVE_END: "moveEnd",
  SELECT_HOME: "selectHome",
  SELECT_END: "selectEnd",
} as const;

// Action Type Definition
export type Action =
  | { type: typeof ACTION_TYPE.CHAR; value: string }
  | { type: typeof ACTION_TYPE.DELETE_LEFT }
  | { type: typeof ACTION_TYPE.DELETE_RIGHT }
  | { type: typeof ACTION_TYPE.PASTE; value: string }
  | { type: typeof ACTION_TYPE.NEW_LINE }
  | { type: typeof ACTION_TYPE.MOVE_LEFT }
  | { type: typeof ACTION_TYPE.MOVE_RIGHT }
  | { type: typeof ACTION_TYPE.MOVE_UP }
  | { type: typeof ACTION_TYPE.MOVE_DOWN }
  | { type: typeof ACTION_TYPE.SELECT_LEFT }
  | { type: typeof ACTION_TYPE.SELECT_RIGHT }
  | { type: typeof ACTION_TYPE.SELECT_UP }
  | { type: typeof ACTION_TYPE.SELECT_DOWN }
  | { type: typeof ACTION_TYPE.COPY; value: string }
  | { type: typeof ACTION_TYPE.MOVE_HOME }
  | { type: typeof ACTION_TYPE.MOVE_END }
  | { type: typeof ACTION_TYPE.SELECT_HOME }
  | { type: typeof ACTION_TYPE.SELECT_END };

// Monaco Command IDs
const MONACO_CMD = {
  DELETE_LEFT: "deleteLeft",
  DELETE_RIGHT: "deleteRight",
  CURSOR_LEFT: "cursorLeft",
  CURSOR_RIGHT: "cursorRight",
  CURSOR_UP: "cursorUp",
  CURSOR_DOWN: "cursorDown",
  CURSOR_LEFT_SELECT: "cursorLeftSelect",
  CURSOR_RIGHT_SELECT: "cursorRightSelect",
  CURSOR_UP_SELECT: "cursorUpSelect",
  CURSOR_DOWN_SELECT: "cursorDownSelect",
  CURSOR_HOME: "cursorHome",
  CURSOR_END: "cursorEnd",
  CURSOR_HOME_SELECT: "cursorHomeSelect",
  CURSOR_END_SELECT: "cursorEndSelect",
  // Added TYPE for standard character insertion during playback (optional, but safer)
  TYPE: "type",
} as const;

export interface MacroEngine {
  status: MacroStatus;
  recordedActions: Action[];
  handleStartRecording: () => void;
  handleStopRecording: () => void;
  handlePlayRecording: () => void;
  handlePlayToEnd: () => void;
  canInteract: boolean;
  canPlay: boolean;
  canStop: boolean;
}

// Utility function to safely check if a model is disposed
const isModelDisposed = (model: monaco.editor.ITextModel | null): boolean => {
  if (!model) return true;
  try {
    return typeof model.isDisposed === "function" && model.isDisposed();
  } catch {
    return true;
  }
};

// Utility function to safely get model value in range
const getModelValueInRange = (
  model: monaco.editor.ITextModel | null,
  range: monaco.Range,
): string => {
  if (isModelDisposed(model)) return "";
  try {
    return model!.getValueInRange(range);
  } catch {
    return "";
  }
};

export const useMacroEngine = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
): MacroEngine => {
  const [status, setStatus] = useState<MacroStatus>("idle");
  const [recordedActions, setRecordedActions] = useState<Action[]>([]);
  const listenersRef = useRef<monaco.IDisposable[]>([]);
  const isPastingRef = useRef<boolean>(false);
  // Ref to manage stopping playToEnd cleanly
  const stopPlayToEndRef = useRef<boolean>(false);

  // --- Recording Setup Effect ---
  useEffect(() => {
    listenersRef.current.forEach((listener) => listener.dispose());
    listenersRef.current = [];
    isPastingRef.current = false;

    if (status !== "recording" || !editor) {
      return;
    }

    try {
      const model = editor.getModel();
      if (!model || isModelDisposed(model)) return;

      const disposables: monaco.IDisposable[] = [];

      // --- Listener 1: Key Down Events (Special Keys Only) ---
      disposables.push(
        editor.onKeyDown((e) => {
          try {
            const { key } = e.browserEvent;
            const ctrlCmd = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            let actionToAdd: Action | null = null;
            let isPasteIntent = false;

            // --- Handle only non-character keys or modified keys ---
            if (shift) {
              if (key === "ArrowLeft")
                actionToAdd = { type: ACTION_TYPE.SELECT_LEFT };
              else if (key === "ArrowRight")
                actionToAdd = { type: ACTION_TYPE.SELECT_RIGHT };
              else if (key === "ArrowUp")
                actionToAdd = { type: ACTION_TYPE.SELECT_UP };
              else if (key === "ArrowDown")
                actionToAdd = { type: ACTION_TYPE.SELECT_DOWN };
              else if (key === "Home")
                actionToAdd = { type: ACTION_TYPE.SELECT_HOME };
              else if (key === "End")
                actionToAdd = { type: ACTION_TYPE.SELECT_END };
              // Let Shift+Other keys fall through (e.g., Shift+Enter, Shift+Tab)
            } else if (ctrlCmd) {
              if (key.toLowerCase() === "v") {
                isPasteIntent = true;
                // Let the browser/Monaco handle the paste event itself
              } else if (key.toLowerCase() === "c") {
                const selection = editor.getSelection();
                const value =
                  selection && !selection.isEmpty()
                    ? getModelValueInRange(model, selection)
                    : "";
                actionToAdd = { type: ACTION_TYPE.COPY, value };
                // Let Monaco handle the actual copy
              }
              // Let other Ctrl/Cmd combinations fall through
            } else {
              // No Shift or Ctrl/Cmd
              // Keys that *replace* default behavior or aren't caught by onDidType
              if (key === "Backspace") {
                actionToAdd = { type: ACTION_TYPE.DELETE_LEFT };
              } else if (key === "Delete") {
                actionToAdd = { type: ACTION_TYPE.DELETE_RIGHT };
              } else if (key === "Enter") {
                actionToAdd = { type: ACTION_TYPE.NEW_LINE };
              } // Don't prevent default, let Monaco insert newline
              else if (key === "Tab") {
                actionToAdd = { type: ACTION_TYPE.CHAR, value: "\t" };
              } // Record Tab as a character
              // Navigation keys (don't prevent default)
              else if (key === "ArrowLeft")
                actionToAdd = { type: ACTION_TYPE.MOVE_LEFT };
              else if (key === "ArrowRight")
                actionToAdd = { type: ACTION_TYPE.MOVE_RIGHT };
              else if (key === "ArrowUp")
                actionToAdd = { type: ACTION_TYPE.MOVE_UP };
              else if (key === "ArrowDown")
                actionToAdd = { type: ACTION_TYPE.MOVE_DOWN };
              else if (key === "Home")
                actionToAdd = { type: ACTION_TYPE.MOVE_HOME };
              else if (key === "End")
                actionToAdd = { type: ACTION_TYPE.MOVE_END };
              // --- Handle single character input ---
              else if (key.length === 1 && key !== "\n") {
                actionToAdd = { type: ACTION_TYPE.CHAR, value: key };
              }
            }

            if (isPasteIntent) {
              isPastingRef.current = true;
              setTimeout(() => {
                isPastingRef.current = false;
              }, PASTE_CHECK_TIMEOUT_MS);
              // Don't add paste action here, wait for onDidPaste
            }

            if (actionToAdd) {
              setRecordedActions((prev) => [...prev, actionToAdd!]);
            }
          } catch (error) {
            console.warn(
              "[MacroEngine] Failed to handle key down event:",
              error,
            );
          }
        }),
      );

      // --- Listener 2: Paste Completion ---
      disposables.push(
        editor.onDidPaste((e) => {
          try {
            if (isPastingRef.current) {
              const pastedText = getModelValueInRange(model, e.range);
              // Check if pastedText is not empty before recording
              if (pastedText) {
                setRecordedActions((prev) => [
                  ...prev,
                  { type: ACTION_TYPE.PASTE, value: pastedText },
                ]);
              }
              isPastingRef.current = false;
            }
          } catch (error) {
            console.warn("[MacroEngine] Failed to handle paste event:", error);
          }
        }),
      );

      listenersRef.current = disposables;
    } catch (error) {
      console.error(
        "[MacroEngine] Failed to setup recording listeners:",
        error,
      );
    }

    return () => {
      listenersRef.current.forEach((listener) => listener.dispose());
      listenersRef.current = [];
      isPastingRef.current = false;
    };
  }, [editor, status]); // Rerun effect when status or editor changes

  // --- Playback Core Logic (Single Iteration) ---
  const playSingleMacroIteration = useCallback(async (): Promise<{
    success: boolean;
    startPos: monaco.Position | null;
    endPos: monaco.Position | null;
  }> => {
    if (!editor || recordedActions.length === 0) {
      return { success: false, startPos: null, endPos: null };
    }

    try {
      const startPos: monaco.Position | null = editor.getPosition(); // Get start position before loop
      let currentPos = startPos; // Track position through actions

      try {
        editor.focus(); // Ensure focus before starting playback iteration

        for (const action of recordedActions) {
          // Get selection just before operations that need it (like type/paste)
          // Trigger-based commands manage their own cursor/selection state
          let selectionForEdit: monaco.Selection | null = null;
          const needsSelection =
            action.type === ACTION_TYPE.CHAR ||
            action.type === ACTION_TYPE.PASTE ||
            action.type === ACTION_TYPE.NEW_LINE;
          if (needsSelection) {
            selectionForEdit = editor.getSelection();
            if (!selectionForEdit) {
              console.error(
                `Could not get selection before action: ${action.type}`,
              );
              throw new Error(
                `Could not get selection before action: ${action.type}`,
              );
            }
          }

          // --- Playback Action Execution ---
          switch (action.type) {
            // Use executeEdits for text insertion/replacement
            case ACTION_TYPE.CHAR:
              // Use 'type' command for chars - often more reliable than executeEdits for single chars
              // editor.trigger('macro', MONACO_CMD.TYPE, { text: action.value });
              // Or stick to executeEdits if 'type' command causes issues
              editor.executeEdits("macro", [
                {
                  range: selectionForEdit!,
                  text: action.value,
                  forceMoveMarkers: true,
                },
              ]);
              break;
            case ACTION_TYPE.PASTE:
              editor.executeEdits("macro", [
                {
                  range: selectionForEdit!,
                  text: action.value,
                  forceMoveMarkers: true,
                },
              ]);
              break;
            case ACTION_TYPE.NEW_LINE:
              // Prefer executeEdits for newline consistency
              editor.executeEdits("macro", [
                {
                  range: selectionForEdit!,
                  text: "\n",
                  forceMoveMarkers: true,
                },
              ]);
              // editor.trigger('macro', MONACO_CMD.TYPE, { text: '\n' }); // Alternative
              break;

            // Use trigger for commands
            case ACTION_TYPE.DELETE_LEFT:
              editor.trigger("macro", MONACO_CMD.DELETE_LEFT, null);
              break;
            case ACTION_TYPE.DELETE_RIGHT:
              editor.trigger("macro", MONACO_CMD.DELETE_RIGHT, null);
              break;
            case ACTION_TYPE.MOVE_LEFT:
              editor.trigger("macro", MONACO_CMD.CURSOR_LEFT, null);
              break;
            case ACTION_TYPE.MOVE_RIGHT:
              editor.trigger("macro", MONACO_CMD.CURSOR_RIGHT, null);
              break;
            case ACTION_TYPE.MOVE_UP:
              editor.trigger("macro", MONACO_CMD.CURSOR_UP, null);
              break;
            case ACTION_TYPE.MOVE_DOWN:
              editor.trigger("macro", MONACO_CMD.CURSOR_DOWN, null);
              break;
            case ACTION_TYPE.SELECT_LEFT:
              editor.trigger("macro", MONACO_CMD.CURSOR_LEFT_SELECT, null);
              break;
            case ACTION_TYPE.SELECT_RIGHT:
              editor.trigger("macro", MONACO_CMD.CURSOR_RIGHT_SELECT, null);
              break;
            case ACTION_TYPE.SELECT_UP:
              editor.trigger("macro", MONACO_CMD.CURSOR_UP_SELECT, null);
              break;
            case ACTION_TYPE.SELECT_DOWN:
              editor.trigger("macro", MONACO_CMD.CURSOR_DOWN_SELECT, null);
              break;
            // --- Home/End Playback ---
            case ACTION_TYPE.MOVE_HOME:
              editor.trigger("macro", MONACO_CMD.CURSOR_HOME, null);
              break;
            case ACTION_TYPE.MOVE_END:
              editor.trigger("macro", MONACO_CMD.CURSOR_END, null);
              break;
            case ACTION_TYPE.SELECT_HOME:
              editor.trigger("macro", MONACO_CMD.CURSOR_HOME_SELECT, null);
              break;
            case ACTION_TYPE.SELECT_END:
              editor.trigger("macro", MONACO_CMD.CURSOR_END_SELECT, null);
              break;

            case ACTION_TYPE.COPY:
              /* Playback ignores copy */ break;

            default:
              console.warn("Unhandled action type during playback:", action);
          }

          // Optional small delay between actions if needed for stability, but usually not required
          // await new Promise(r => setTimeout(r, 5));
        } // End for loop

        currentPos = editor.getPosition(); // Get final position after all actions
        return { success: true, startPos, endPos: currentPos };
      } catch (error) {
        console.error("Error during single macro iteration:", error);
        currentPos = editor.getPosition(); // Attempt to get end position even on error
        return { success: false, startPos, endPos: currentPos };
      }
    } catch (error) {
      console.error("[MacroEngine] Failed to get editor position:", error);
      return { success: false, startPos: null, endPos: null };
    }
  }, [editor, recordedActions]); // Dependencies

  // --- Action Handlers ---
  const handleStartRecording = useCallback(() => {
    if (!editor || status !== "idle") return;
    setRecordedActions([]);
    setStatus("recording");
    editor.focus();
  }, [editor, status]);

  const handleStopRecording = useCallback(() => {
    const hasRecorded = recordedActions.length > 0;
    // If currently playing to end, signal it to stop
    if (status === "playingToEnd") {
      stopPlayToEndRef.current = true; // Signal the loop to stop
      // The loop's finally block will set status to idle
    } else if (status === "recording" || hasRecorded) {
      setStatus("idle");
      // Clear actions only if stopping from idle with actions already present
      if (status === "idle" && hasRecorded) {
        setRecordedActions([]);
      }
      stopPlayToEndRef.current = false; // Reset flag
    }
    // No need to focus editor here, user might want to click elsewhere
  }, [status, recordedActions.length]);

  // --- Playback Handlers ---
  const handlePlayRecording = useCallback(async () => {
    if (!editor || status !== "idle" || recordedActions.length === 0) return;
    setStatus("playingOnce");
    stopPlayToEndRef.current = false; // Ensure flag is reset
    try {
      await playSingleMacroIteration();
    } catch (err) {
      console.error("Error during single play:", err);
    } finally {
      setStatus("idle");
      editor?.focus();
    }
  }, [editor, status, recordedActions.length, playSingleMacroIteration]);

  const handlePlayToEnd = useCallback(async () => {
    if (!editor || status !== "idle" || recordedActions.length === 0) return;
    setStatus("playingToEnd");
    stopPlayToEndRef.current = false; // Reset stop flag

    try {
      // Store the end position of the *previous* full iteration
      let endPosOfPreviousIteration: monaco.Position | null =
        editor.getPosition(); // Start with initial position
      let iterations = 0;
      const model = editor.getModel();

      if (!model || isModelDisposed(model) || !endPosOfPreviousIteration) {
        // Ensure we have model and start position
        console.error(
          "PlayToEnd: Cannot get editor model or initial position.",
        );
        setStatus("idle");
        return;
      }

      try {
        editor.focus(); // Ensure focus before loop

        while (
          iterations < MAX_PLAY_TO_END_ITERATIONS &&
          !stopPlayToEndRef.current &&
          editor
        ) {
          iterations++;
          // Store the line number *before* this iteration runs
          const lineNumBeforeIteration = endPosOfPreviousIteration.lineNumber;

          // --- Execute one full macro iteration ---
          const { success, endPos } = await playSingleMacroIteration();

          // --- Termination Checks ---

          // 1. Manual Stop or Error
          if (stopPlayToEndRef.current) {
            break;
          }
          if (!success || !endPos) {
            break;
          }

          // 2. *** NEW: Line Number Progression Check ***
          // Stop if the line number after execution is not greater than
          // the line number before this iteration started.
          // This correctly handles cases where DOWN fails on the last line.
          if (endPos.lineNumber <= lineNumBeforeIteration) {
            break;
          }

          // 3. Position Equality Check (as a fallback for non-line-advancing macros)
          // This helps if the macro *doesn't* have a DOWN but should still stop if stuck.
          if (
            endPosOfPreviousIteration &&
            endPosOfPreviousIteration.equals(endPos)
          ) {
            break; // Stop if no progress between iterations
          }

          // --- Update state for next iteration ---
          endPosOfPreviousIteration = endPos; // Store the end position for the next check

          // Small delay
          await new Promise((resolve) =>
            setTimeout(resolve, PLAY_TO_END_DELAY_MS),
          );
        } // End while loop

        // 4. Max Iterations Check
        if (iterations >= MAX_PLAY_TO_END_ITERATIONS) {
          console.warn(
            `PlayToEnd: Stopped after reaching max ${MAX_PLAY_TO_END_ITERATIONS} iterations.`,
          );
        }
      } catch (loopError) {
        console.error("Error during PlayToEnd loop:", loopError);
      } finally {
        setStatus("idle");
        stopPlayToEndRef.current = false; // Reset flag
        editor?.focus();
      }
    } catch (error) {
      console.error("[MacroEngine] Failed to setup play to end:", error);
      setStatus("idle");
    }
  }, [editor, status, recordedActions.length, playSingleMacroIteration]);

  // Computed values
  const canInteract = status === "idle";
  const canPlay = canInteract && recordedActions.length > 0;
  // Can stop if recording OR playing OR if idle with something recorded (to clear)
  const canStop =
    status === "recording" ||
    status === "playingToEnd" ||
    (status === "idle" && recordedActions.length > 0);

  return {
    status,
    recordedActions,
    handleStartRecording,
    handleStopRecording,
    handlePlayRecording,
    handlePlayToEnd,
    canInteract,
    canPlay,
    canStop,
  };
};
