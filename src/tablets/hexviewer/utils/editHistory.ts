export interface EditEntry {
  offset: number;
  oldValue: number;
  newValue: number;
}

export interface EditHistory {
  entries: EditEntry[];
  index: number; // index of the last applied entry; -1 means nothing applied yet
}

export const MAX_HISTORY_SIZE = 100;

export function createHistory(): EditHistory {
  return { entries: [], index: -1 };
}

export function pushEdit(history: EditHistory, entry: EditEntry): EditHistory {
  // Drop any undone (future) entries before appending
  const kept = history.entries.slice(0, history.index + 1);
  kept.push(entry);
  if (kept.length > MAX_HISTORY_SIZE) {
    kept.shift();
    return { entries: kept, index: kept.length - 1 };
  }
  return { entries: kept, index: kept.length - 1 };
}

export function canUndo(history: EditHistory): boolean {
  return history.index >= 0;
}

export function canRedo(history: EditHistory): boolean {
  return history.index < history.entries.length - 1;
}

export function applyUndo(history: EditHistory): { history: EditHistory; entry: EditEntry } | null {
  if (!canUndo(history)) return null;
  const entry = history.entries[history.index];
  return { history: { ...history, index: history.index - 1 }, entry };
}

export function applyRedo(history: EditHistory): { history: EditHistory; entry: EditEntry } | null {
  if (!canRedo(history)) return null;
  const newIndex = history.index + 1;
  return { history: { ...history, index: newIndex }, entry: history.entries[newIndex] };
}
