import { ArchiveEntry } from "../types";

const REPLACEMENT_CHAR = "�";
const GARBLED_THRESHOLD = 0.1;

export function hasGarbledFilenames(entries: Pick<ArchiveEntry, "path">[]): boolean {
  if (entries.length === 0) return false;
  const garbledCount = entries.filter((e) => e.path.includes(REPLACEMENT_CHAR)).length;
  return garbledCount / entries.length > GARBLED_THRESHOLD;
}
