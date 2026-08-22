import { CsvColumn, CsvRow } from "../types";
import {
  applyFilters,
  ColumnFilter,
  FilterMatchMode,
} from "./filtering";

export interface FacetValue {
  value: string;
  count: number;
}

/**
 * Excel-style facet counts for one column. Rows are first narrowed by every
 * active filter *except* those targeting the facet column itself, so counts
 * always reflect cross-filtering (live counts as other filters apply).
 * Blank values are excluded. Sorted by count desc, then value asc.
 */
export function computeFacetCounts(
  rows: CsvRow[],
  columns: CsvColumn[],
  columnId: string,
  filters: ColumnFilter[] = [],
  matchMode: FilterMatchMode = "and",
): FacetValue[] {
  const column = columns.find((candidate) => candidate.id === columnId);
  if (!column) return [];

  const otherFilters = filters.filter(
    (filter) => filter.columnId !== columnId,
  );
  const scopedRows =
    otherFilters.length > 0
      ? applyFilters(rows, otherFilters, columns, { matchMode })
      : rows;

  const counts = new Map<string, number>();
  for (const row of scopedRows) {
    const cell = row.cells[column.index];
    const value = cell ? cell.value.trim() : "";
    if (value === "") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts, ([value, count]) => ({ value, count })).sort(
    (a, b) => b.count - a.count || compareValues(a.value, b.value),
  );
}

function compareValues(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
