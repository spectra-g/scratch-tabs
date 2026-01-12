import React from "react";
import { X } from "lucide-react";
import { Action, ACTION_TYPE } from "./useMacroEngine";

// UI Symbols Map
const ACTION_SYMBOLS: Record<
  Action["type"],
  string | ((action: Action) => string)
> = {
  [ACTION_TYPE.CHAR]: (a) =>
    (a as { value: string }).value === " "
      ? "␣"
      : (a as { value: string }).value,
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
  // Word-level operations
  [ACTION_TYPE.MOVE_WORD_LEFT]: "⇠",
  [ACTION_TYPE.MOVE_WORD_RIGHT]: "⇢",
  [ACTION_TYPE.SELECT_WORD_LEFT]: "[⇠S]",
  [ACTION_TYPE.SELECT_WORD_RIGHT]: "[⇢S]",
  [ACTION_TYPE.DELETE_WORD_LEFT]: "⌫W",
  [ACTION_TYPE.DELETE_WORD_RIGHT]: "⌦W",
};

interface MacroActionsListProps {
  actions: Action[];
  onRemoveAction: (index: number) => void;
  executingActionIndex: number;
  isPlaying: boolean;
}

export const MacroActionsList: React.FC<MacroActionsListProps> = ({
  actions,
  onRemoveAction,
  executingActionIndex,
  isPlaying,
}) => {
  const renderActionSymbol = (action: Action): string => {
    const symbolOrFn = ACTION_SYMBOLS[action.type];
    if (!symbolOrFn) return "?";
    return typeof symbolOrFn === "function" ? symbolOrFn(action) : symbolOrFn;
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-sidebar border border-border rounded shadow-lg max-h-48 overflow-y-auto">
      <div className="p-2">
        <div className="text-xs text-muted mb-1 px-2">
          Recorded Actions ({actions.length})
        </div>
        <div className="space-y-0.5">
          {actions.map((action, index) => (
            <div
              key={index}
              className={`group flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-element-hover ${
                isPlaying && index === executingActionIndex
                  ? "bg-accent/20"
                  : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-muted w-6 text-right">{index + 1}</span>
                <span className="font-mono text-foreground">
                  {renderActionSymbol(action)}
                </span>
              </div>
              <button
                onClick={() => onRemoveAction(index)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-danger/20 rounded text-danger"
                title="Remove action"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
