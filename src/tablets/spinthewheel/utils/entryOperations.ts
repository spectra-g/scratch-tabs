import type { WheelEntry } from "../types";

export type Rng = () => number;

/** Fisher–Yates shuffle; returns a new array, input untouched. */
export function shuffleEntries(entries: WheelEntry[], rng: Rng = Math.random): WheelEntry[] {
  const result = [...entries];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Sort A→Z, case-insensitive; stable for equal labels. */
export function sortEntries(entries: WheelEntry[]): WheelEntry[] {
  return [...entries].sort(
    (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

/**
 * Removes duplicate labels (trimmed, case-insensitive comparison), keeping
 * the first occurrence of each label.
 */
export function dedupeEntries(entries: WheelEntry[]): WheelEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.label.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
