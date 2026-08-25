import type { WinnerHistoryItem } from "../types";
import { createEntryId } from "../contentModel";

/** Hard cap so long sessions can't grow tablet state without bound. */
export const HISTORY_LIMIT = 200;

export interface WinnerRecord {
  entryId: string | null;
  label: string;
}

/**
 * Prepends a win to the history (newest first) and trims to HISTORY_LIMIT.
 * Returns a new array; the input is never mutated.
 */
export function recordWinner(
  history: WinnerHistoryItem[],
  winner: WinnerRecord,
  timestamp: number = Date.now(),
): WinnerHistoryItem[] {
  const item: WinnerHistoryItem = {
    id: createEntryId(),
    entryId: winner.entryId,
    label: winner.label,
    timestamp,
  };
  return [item, ...history].slice(0, HISTORY_LIMIT);
}

export interface HistorySummaryRow {
  label: string;
  count: number;
}

/**
 * Count summary for the history header. Ordered by count (desc); ties break
 * by most recent win so the summary mirrors "who's been winning lately".
 */
export function summarizeHistory(history: WinnerHistoryItem[]): HistorySummaryRow[] {
  const counts = new Map<string, { count: number; latest: number }>();
  for (const item of history) {
    const existing = counts.get(item.label);
    if (existing) {
      existing.count += 1;
      existing.latest = Math.max(existing.latest, item.timestamp);
    } else {
      counts.set(item.label, { count: 1, latest: item.timestamp });
    }
  }
  return [...counts.entries()]
    .map(([label, { count, latest }]) => ({ label, count, latest }))
    .sort((a, b) => b.count - a.count || b.latest - a.latest)
    .map(({ label, count }) => ({ label, count }));
}

/** One line per win, chronological (oldest first) — friendly for pasting. */
export function historyToText(history: WinnerHistoryItem[]): string {
  return [...history].reverse().map((item) => item.label).join("\n");
}
