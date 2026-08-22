import * as React from "react";
import { Bookmark, Filter, X } from "lucide-react";
import { CsvColumn } from "../types";
import { ColumnFilter, FilterMatchMode } from "../utils/filtering";
import { describeFilter } from "../utils/filterWidgetModel";

interface CsvFilterBarProps {
  columns: CsvColumn[];
  filters: ColumnFilter[];
  matchMode: FilterMatchMode;
  showFilterRow: boolean;
  /** Rows remaining after filtering; shown against the unfiltered total. */
  visibleRowCount?: number;
  totalRowCount?: number;
  showPresetsPanel: boolean;
  onToggleFilterRow: (show: boolean) => void;
  onRemoveFilter: (columnId: string) => void;
  onClearFilters: () => void;
  onMatchModeChange: (mode: FilterMatchMode) => void;
  onTogglePresetsPanel: (show: boolean) => void;
}

export const CsvFilterBar: React.FC<CsvFilterBarProps> = ({
  columns,
  filters,
  matchMode,
  showFilterRow,
  visibleRowCount,
  totalRowCount,
  showPresetsPanel,
  onToggleFilterRow,
  onRemoveFilter,
  onClearFilters,
  onMatchModeChange,
  onTogglePresetsPanel,
}) => {
  const columnsById = React.useMemo(
    () => new Map(columns.map((column) => [column.id, column])),
    [columns],
  );

  return (
    <div
      className="flex-none flex items-center gap-2 border-b border-base px-3 py-1.5 bg-canvas text-sm"
      data-testid="csv-filter-bar"
    >
      <button
        onClick={() => onToggleFilterRow(!showFilterRow)}
        aria-pressed={showFilterRow}
        title="Toggle column filter row"
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
          showFilterRow
            ? "bg-primary/20 text-primary"
            : "bg-element text-main hover:bg-element-hover"
        }`}
        data-testid="toggle-filters-button"
      >
        <Filter size={14} />
        <span>Filters</span>
      </button>

      <button
        onClick={() => onTogglePresetsPanel(!showPresetsPanel)}
        aria-pressed={showPresetsPanel}
        title="Save or apply filter sets"
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
          showPresetsPanel
            ? "bg-primary/20 text-primary"
            : "bg-element text-main hover:bg-element-hover"
        }`}
        data-testid="toggle-presets-button"
      >
        <Bookmark size={14} />
        <span>Presets</span>
      </button>

      {filters.length > 0 && (
        <>
          {typeof visibleRowCount === "number" &&
            typeof totalRowCount === "number" && (
              <span
                className="text-xs text-secondary whitespace-nowrap"
                data-testid="filter-summary"
              >
                Showing {visibleRowCount} of {totalRowCount} rows
              </span>
            )}

          <div className="flex items-center gap-1 flex-wrap min-w-0">
            {filters.map((filter) => {
              const column = columnsById.get(filter.columnId);
              return (
                <span
                  key={filter.columnId}
                  className="inline-flex items-center gap-1 bg-element border border-base rounded-full pl-2 pr-1 py-0.5 text-xs text-main"
                  data-testid={`filter-chip-${filter.columnId}`}
                >
                  <span className="whitespace-nowrap">
                    {describeFilter(filter, column?.name)}
                  </span>
                  <button
                    onClick={() => onRemoveFilter(filter.columnId)}
                    aria-label={`Remove filter for ${column?.name ?? filter.columnId}`}
                    title="Remove filter"
                    className="rounded hover:bg-element-hover p-0.5"
                    data-testid={`remove-filter-${filter.columnId}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>

          {filters.length > 1 && (
            <div
              className="flex items-center rounded overflow-hidden border border-base"
              role="group"
              aria-label="Filter match mode"
            >
              {(["and", "or"] as FilterMatchMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onMatchModeChange(mode)}
                  aria-pressed={matchMode === mode}
                  title={`Match ${mode.toUpperCase()} of the filters`}
                  className={`px-2 py-0.5 text-xs uppercase ${
                    matchMode === mode
                      ? "bg-primary/20 text-primary"
                      : "bg-element text-secondary hover:bg-element-hover"
                  }`}
                  data-testid={`match-mode-${mode}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onClearFilters}
            title="Clear all filters"
            className="ml-auto px-2 py-1 rounded text-xs bg-element text-secondary hover:bg-element-hover"
            data-testid="clear-filters-button"
          >
            Clear all filters
          </button>
        </>
      )}
    </div>
  );
};
