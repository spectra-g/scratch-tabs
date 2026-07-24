import { CANVAS_HISTORY_LIMIT } from "../constants";
import type { CanvasItem } from "../types";

export interface CanvasHistorySnapshot {
  items: CanvasItem[];
  selectedItemIds: string[];
  focusedItemId: string | null;
}

export interface CanvasHistoryState {
  past: CanvasHistorySnapshot[];
  future: CanvasHistorySnapshot[];
}

export interface CanvasHistoryStep {
  state: CanvasHistoryState;
  snapshot: CanvasHistorySnapshot | null;
}

const cloneSnapshot = (
  snapshot: CanvasHistorySnapshot,
): CanvasHistorySnapshot => ({
  items: snapshot.items.map((item) => ({ ...item })),
  selectedItemIds: [...snapshot.selectedItemIds],
  focusedItemId: snapshot.focusedItemId,
});

export const createCanvasHistory = (): CanvasHistoryState => ({
  past: [],
  future: [],
});

export const recordCanvasHistory = (
  state: CanvasHistoryState,
  previous: CanvasHistorySnapshot,
  limit = CANVAS_HISTORY_LIMIT,
): CanvasHistoryState => ({
  past: [...state.past, cloneSnapshot(previous)].slice(-limit),
  future: [],
});

export const undoCanvasHistory = (
  state: CanvasHistoryState,
  current: CanvasHistorySnapshot,
): CanvasHistoryStep => {
  const previous = state.past.at(-1);
  if (!previous) return { state, snapshot: null };

  return {
    state: {
      past: state.past.slice(0, -1),
      future: [cloneSnapshot(current), ...state.future],
    },
    snapshot: cloneSnapshot(previous),
  };
};

export const redoCanvasHistory = (
  state: CanvasHistoryState,
  current: CanvasHistorySnapshot,
): CanvasHistoryStep => {
  const next = state.future[0];
  if (!next) return { state, snapshot: null };

  return {
    state: {
      past: [...state.past, cloneSnapshot(current)],
      future: state.future.slice(1),
    },
    snapshot: cloneSnapshot(next),
  };
};
