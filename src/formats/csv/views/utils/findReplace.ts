import { CsvColumn, CsvRow } from "../types";

export type ReplaceScope = "all" | "column" | "selection";

export interface FindMatchOptions {
  matchCase?: boolean;
  exactCell?: boolean;
}

export interface FindReplaceScopeOptions extends FindMatchOptions {
  find: string;
  replace: string;
  scope: ReplaceScope;
  /** Required when scope === "column". */
  columnId?: string;
  /** Cell keys ("rowId-columnId" via createCellKey) — required when scope === "selection". */
  selectionKeys?: Set<string> | string[];
}

export interface ReplaceMatch {
  rowId: string;
  columnId: string;
  oldValue: string;
  newValue: string;
}

export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalize = (value: string, matchCase: boolean): string =>
  matchCase ? value : value.toLowerCase();

/**
 * Whether a single cell value matches the find text.
 * - Empty find matches only empty cells when exactCell is on (so users can
 *   fill blanks); otherwise empty find never matches (avoids replacing everywhere).
 * - exactCell: whole-cell comparison; otherwise substring containment.
 */
export const cellMatchesFind = (
  value: string,
  find: string,
  options: FindMatchOptions = {},
): boolean => {
  const { matchCase = false, exactCell = false } = options;
  const actual = value ?? "";
  if (find === "") {
    return exactCell ? actual === "" : false;
  }
  if (exactCell) {
    return normalize(actual, matchCase) === normalize(find, matchCase);
  }
  return normalize(actual, matchCase).includes(normalize(find, matchCase));
};

/**
 * Compute the replacement for a single cell value. Callers should check
 * cellMatchesFind first; this returns the value unchanged when there is no match.
 * - exactCell: whole cell becomes `replace` (covers value->empty and empty->value).
 * - substring: every occurrence of `find` is swapped for `replace`, preserving
 *   the rest of the cell.
 */
export const replaceCellValue = (
  value: string,
  find: string,
  replace: string,
  options: FindMatchOptions = {},
): string => {
  const { matchCase = false, exactCell = false } = options;
  const actual = value ?? "";
  if (!cellMatchesFind(actual, find, options)) return actual;
  if (find === "") return replace;
  if (exactCell) return replace;
  if (matchCase) return actual.split(find).join(replace);
  const pattern = new RegExp(escapeRegExp(find), "gi");
  return actual.replace(pattern, replace);
};

const toSelectionSet = (
  selectionKeys?: Set<string> | string[],
): Set<string> => {
  if (!selectionKeys) return new Set();
  return selectionKeys instanceof Set
    ? selectionKeys
    : new Set(selectionKeys);
};

const inScope = (
  rowId: string,
  columnId: string,
  scope: ReplaceScope,
  columnIdFilter: string | undefined,
  selection: Set<string>,
): boolean => {
  if (scope === "column") {
    if (!columnIdFilter) return false;
    return columnId === columnIdFilter;
  }
  if (scope === "selection") {
    // Cell keys are built as `${rowId}-${columnId}` (see cellUtils).
    // Column ids themselves contain dashes, so compare with suffix match
    // instead of splitting on "-".
    return selection.has(`${rowId}-${columnId}`);
  }
  return true;
};

/**
 * Find every cell matching `find` within `rows`, honoring scope.
 * `rows` should be the visible (filtered) rows so preview counts match the grid.
 */
export const findReplaceMatches = (
  rows: CsvRow[],
  columns: CsvColumn[],
  options: FindReplaceScopeOptions,
): ReplaceMatch[] => {
  const {
    find,
    replace,
    scope,
    columnId,
    selectionKeys,
    matchCase = false,
    exactCell = false,
  } = options;

  if (scope === "column" && !columnId) return [];
  if (scope === "selection" && toSelectionSet(selectionKeys).size === 0)
    return [];

  const selection = toSelectionSet(selectionKeys);
  const matches: ReplaceMatch[] = [];

  rows.forEach((row) => {
    row.cells.forEach((cell, cellIndex) => {
      const column = columns[cellIndex];
      if (!column) return;
      if (!inScope(row.id, column.id, scope, columnId, selection)) return;
      const oldValue = cell.value ?? "";
      const newValue = replaceCellValue(oldValue, find, replace, {
        matchCase,
        exactCell,
      });
      // Skip no-ops so preview counts and updateCells() only touch real changes
      // (keeps undo history clean - same pattern as fillDown).
      if (!cellMatchesFind(oldValue, find, { matchCase, exactCell })) return;
      if (newValue === oldValue) return;
      matches.push({ rowId: row.id, columnId: column.id, oldValue, newValue });
    });
  });

  return matches;
};

/**
 * Build the batch payload for useCsvData.updateCells() - one call = one undo step.
 */
export const buildReplaceUpdates = (
  matches: ReplaceMatch[],
): Array<{ rowId: string; columnId: string; value: string }> =>
  matches.map((match) => ({
    rowId: match.rowId,
    columnId: match.columnId,
    value: match.newValue,
  }));

export interface ReplaceSummary {
  cellCount: number;
  columnCount: number;
  text: string;
}

/**
 * Human preview: "12 cells in 3 columns" (also handles 0/1 singulars).
 */
export const summarizeReplaceMatches = (
  matches: ReplaceMatch[],
): ReplaceSummary => {
  const cellCount = matches.length;
  const columnCount = new Set(matches.map((match) => match.columnId)).size;
  const cellWord = cellCount === 1 ? "cell" : "cells";
  const columnWord = columnCount === 1 ? "column" : "columns";
  return {
    cellCount,
    columnCount,
    text: `${cellCount} ${cellWord} in ${columnCount} ${columnWord}`,
  };
};
