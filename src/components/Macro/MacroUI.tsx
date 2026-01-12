import React from "react";
import * as monaco from "monaco-editor";
import { Disc, Square, Play, PlayCircle } from "lucide-react";
import { MacroEngine, Action, ACTION_TYPE } from "./useMacroEngine";
import { MacroActionsList } from "./MacroActionsList";

// --- Constants ---
const MAX_DISPLAY_LENGTH = 50;

// UI Symbols Map
const ACTION_SYMBOLS: Record<
  Action["type"],
  string | ((action: Action) => string)
> = {
  [ACTION_TYPE.CHAR]: (a) =>
    (a as { value: string }).value === " "
      ? "␣"
      : (a as { value: string }).value, // Show space explicitly
  [ACTION_TYPE.DELETE_LEFT]: "⌫",
  [ACTION_TYPE.DELETE_RIGHT]: "⌦",
  [ACTION_TYPE.PASTE]: (a) => `[P:${(a as { value: string }).value.length}]`,
  [ACTION_TYPE.NEW_LINE]: "⏎",
  [ACTION_TYPE.MOVE_LEFT]: "←",
  [ACTION_TYPE.MOVE_RIGHT]: "→",
  [ACTION_TYPE.MOVE_UP]: "↑",
  [ACTION_TYPE.MOVE_DOWN]: "↓",
  [ACTION_TYPE.SELECT_LEFT]: "[←S]",
  [ACTION_TYPE.SELECT_RIGHT]: "[→S]",
  [ACTION_TYPE.SELECT_UP]: "[↑S]",
  [ACTION_TYPE.SELECT_DOWN]: "[↓S]",
  [ACTION_TYPE.COPY]: (a) => `[C:${(a as { value: string }).value.length}]`,
  [ACTION_TYPE.MOVE_HOME]: "⇤",
  [ACTION_TYPE.MOVE_END]: "⇥",
  [ACTION_TYPE.SELECT_HOME]: "[⇤S]",
  [ACTION_TYPE.SELECT_END]: "[⇥S]",
};

interface MacroUIProps {
  editor: monaco.editor.IStandaloneCodeEditor | null;
  engine: MacroEngine;
}

export const MacroUI: React.FC<MacroUIProps> = ({ editor, engine }) => {
  const {
    status,
    recordedActions,
    handleStartRecording,
    handleStopRecording,
    handlePlayRecording,
    handlePlayToEnd,
    handleRemoveAction,
    canPlay,
    canStop,
    executingActionIndex,
  } = engine;

  // --- UI Helper Functions ---
  const renderActionSymbol = (action: Action): string => {
    const symbolOrFn = ACTION_SYMBOLS[action.type];
    if (!symbolOrFn) return "?";
    return typeof symbolOrFn === "function" ? symbolOrFn(action) : symbolOrFn;
  };

  const formatActionsForDisplay = (
    actions: Action[],
    recording: boolean,
  ): string => {
    if (!recording && actions.length === 0) return "Idle.";

    const displayString = actions.map(renderActionSymbol).join("");
    const prefix = recording ? "RECORDING: '" : "Ready: '";
    const suffix = recording ? "'" : `' (${actions.length} actions)`;
    const ellipsis = displayString.length > MAX_DISPLAY_LENGTH ? "..." : "";
    const truncatedString = displayString.substring(0, MAX_DISPLAY_LENGTH);

    return `${prefix}${truncatedString}${displayString.length > MAX_DISPLAY_LENGTH ? ellipsis : ""}${suffix}`;
  };

  const getStatusText = (): string => {
    switch (status) {
      case "recording":
        return formatActionsForDisplay(recordedActions, true);
      case "playingOnce":
        return "Playing...";
      case "playingToEnd":
        return "Playing to end...";
      case "idle":
      default:
        return formatActionsForDisplay(recordedActions, false);
    }
  };

  // --- Style Classes ---
  const commonButtonClass =
    "rounded hover:bg-element-hover disabled:opacity-50 disabled:hover:bg-transparent p-0.5 flex items-center justify-center"; // Ensure centering
  const activeRecordClass = "text-danger";
  const inactiveClass = "text-muted";
  const activeClass = "text-secondary";

  const isPlaying = status === "playingOnce" || status === "playingToEnd";

  return (
    <div className="relative">
      {/* Actions List (shown above toolbar) */}
      <MacroActionsList
        actions={recordedActions}
        onRemoveAction={handleRemoveAction}
        executingActionIndex={executingActionIndex}
        isPlaying={isPlaying}
      />

      {/* Toolbar */}
      <div className="flex items-center space-x-2 px-2 h-6 bg-transparent text-xs">
        {/* Record Button */}
      <button
        className={`${commonButtonClass} ${status === "recording" ? activeRecordClass : editor ? activeClass : inactiveClass}`}
        onClick={handleStartRecording}
        disabled={!editor || status !== "idle"}
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
          !editor
            ? "Editor unavailable"
            : !canStop
              ? "Nothing to stop or clear"
              : status === "recording"
                ? "Stop recording (Ctrl+Alt+R)"
                : status === "playingToEnd"
                  ? "Stop playback"
                  : "Clear recorded macro"
        }
      >
        <Square size={14} />
      </button>

      {/* Play Button */}
      <button
        className={`${commonButtonClass} ${canPlay ? activeClass : inactiveClass}`}
        onClick={handlePlayRecording}
        disabled={!editor || !canPlay}
        title={
          !editor
            ? "Editor unavailable"
            : !recordedActions.length
              ? "Nothing recorded"
              : "Play macro once (Ctrl+Alt+P)"
        }
      >
        <Play size={14} />
      </button>

      {/* Play To End Button */}
      <button
        className={`${commonButtonClass} ${canPlay ? activeClass : inactiveClass}`}
        onClick={handlePlayToEnd}
        disabled={!editor || !canPlay}
        title={
          !editor
            ? "Editor unavailable"
            : !recordedActions.length
              ? "Nothing recorded"
              : "Play macro until end (Ctrl+Alt+L)"
        }
      >
        <PlayCircle size={14} />
      </button>

        {/* Status Display */}
        <span className="text-muted truncate flex-1 overflow-hidden whitespace-nowrap pl-1">
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};
