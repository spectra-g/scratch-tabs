import type { WheelEntry, WheelSnapshot } from "../types";
import { createEntryId } from "../contentModel";

/** Defensive copy of the current entries into a named snapshot. */
export function createSnapshot(
  name: string,
  entries: WheelEntry[],
  createdAt: number = Date.now(),
): WheelSnapshot {
  return {
    id: createEntryId(),
    name,
    createdAt,
    entries: entries.map((entry) => ({ ...entry })),
  };
}
