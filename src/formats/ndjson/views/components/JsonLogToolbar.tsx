import React, { useState, useCallback } from "react";
import {
  Search,
  Eye,
  BarChart3,
  Download,
  ChevronDown,
  X,
  FileText,
  Code,
} from "lucide-react";
import { LogFilter, LogColumn, LogStats } from "../types";
import { useRootStore } from "../../../../stores/rootStore";
import { createTab } from "../../../../utils/tabUtils";

interface JsonLogToolbarProps {
  filter: LogFilter;
  onFilterChange: (filter: Partial<LogFilter>) => void;
  columns: LogColumn[];
  onToggleColumnVisibility: (columnId: string) => void;
  stats: LogStats;
  onShowStats: () => void;
  onExport: (format: "json" | "csv" | "ndjson") => string;
  filteredCount: number;
  totalCount: number;
}

const LOG_LEVELS = [
  { key: "error", label: "Error", color: "text-red-600 dark:text-red-400 bg-red-600/20" },
  { key: "warn", label: "Warn", color: "text-yellow-600 dark:text-yellow-400 bg-yellow-600/20" },
  { key: "info", label: "Info", color: "text-blue-600 dark:text-blue-400 bg-blue-600/20" },
  { key: "debug", label: "Debug", color: "text-green-600 dark:text-green-400 bg-green-600/20" },
  { key: "trace", label: "Trace", color: "text-blue-600 dark:text-blue-400 bg-blue-600/20" },
];

export const JsonLogToolbar: React.FC<JsonLogToolbarProps> = ({
  filter,
  onFilterChange,
  columns,
  onToggleColumnVisibility,
  stats,
  onShowStats,
  onExport,
  filteredCount,
  totalCount,
}) => {
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const { addBackgroundTab } = useRootStore();

  const handleTextSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({ textSearch: e.target.value });
    },
    [onFilterChange],
  );

  const handleLogLevelToggle = useCallback(
    (level: string) => {
      const newLevels = new Set(filter.logLevels);
      if (newLevels.has(level)) {
        newLevels.delete(level);
      } else {
        newLevels.add(level);
      }
      onFilterChange({ logLevels: newLevels });
    },
    [filter.logLevels, onFilterChange],
  );

  const handleClearFilters = useCallback(() => {
    onFilterChange({
      textSearch: "",
      logLevels: new Set(["error", "warn", "info", "debug", "trace"]),
      customFilters: [],
    });
  }, [onFilterChange]);

  const handleExport = useCallback(
    (format: "json" | "csv" | "ndjson") => {
      const content = onExport(format);
      const tab = createTab({
        title: `Log Export.${format}`,
        content,
        language: format === "json" ? "json" : format === "csv" ? "csv" : "ndjson",
      });
      addBackgroundTab(tab);
      setShowExportMenu(false);
    },
    [onExport, addBackgroundTab],
  );

  const visibleColumns = columns.filter(col => col.isVisible);
  const hiddenColumns = columns.filter(col => !col.isVisible);

  return (
    <div className="flex-none border-b border-base p-3 bg-surface-secondary">
      {/* Top Row: Search and Log Levels */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          {/* Text Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              value={filter.textSearch}
              onChange={handleTextSearchChange}
              placeholder="Search logs..."
              className="pl-10 pr-4 py-2 bg-element border border-base rounded text-sm text-main placeholder-secondary focus:outline-none focus:border-focus w-64"
            />
            {filter.textSearch && (
              <button
                onClick={() => onFilterChange({ textSearch: "" })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-secondary hover:text-main"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Log Level Filters */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary">Levels:</span>
            {LOG_LEVELS.map((level) => (
              <button
                key={level.key}
                onClick={() => handleLogLevelToggle(level.key)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors focus:outline-none border border-transparent ${filter.logLevels.has(level.key)
                  ? level.color
                  : "text-secondary bg-element/50 hover:bg-element"
                  }`}
              >
                {level.label}
                {stats.logLevelCounts[level.key] && (
                  <span className="ml-1 opacity-75">
                    ({stats.logLevelCounts[level.key]})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Clear Filters */}
        {(filter.textSearch || filter.logLevels.size < 5) && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-secondary hover:text-main underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Bottom Row: Controls and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Column Visibility Manager */}
          <div className="relative">
            <button
              onClick={() => setShowColumnManager(!showColumnManager)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-element hover:bg-element-hover rounded text-sm transition-colors"
            >
              <Eye size={14} />
              <span>Columns ({visibleColumns.length}/{columns.length})</span>
              <ChevronDown size={12} />
            </button>

            {showColumnManager && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowColumnManager(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[250px] max-h-64 overflow-y-auto custom-scrollbar">
                  <div className="p-2">
                    <div className="text-xs text-secondary mb-2 font-medium">Visible Columns</div>
                    {visibleColumns.map((column) => (
                      <label
                        key={column.id}
                        className="flex items-center space-x-2 p-1 hover:bg-element-hover rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => onToggleColumnVisibility(column.id)}
                          className="rounded border-base bg-element text-primary"
                        />
                        <span className="text-sm text-main">{column.name}</span>
                      </label>
                    ))}

                    {hiddenColumns.length > 0 && (
                      <>
                        <div className="text-xs text-secondary mt-3 mb-2 font-medium">Hidden Columns</div>
                        {hiddenColumns.map((column) => (
                          <label
                            key={column.id}
                            className="flex items-center space-x-2 p-1 hover:bg-element-hover rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => onToggleColumnVisibility(column.id)}
                              className="rounded border-base bg-element text-primary"
                            />
                            <span className="text-sm text-secondary">{column.name}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats Button */}
          <button
            onClick={onShowStats}
            className="flex items-center space-x-2 px-3 py-1.5 bg-element hover:bg-element-hover rounded text-sm transition-colors"
          >
            <BarChart3 size={14} />
            <span>Column Stats</span>
          </button>

          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-element hover:bg-element-hover rounded text-sm transition-colors"
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={12} />
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[220px]">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport("ndjson")}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Code size={16} className="text-warning" />
                        <span>NDJSON</span>
                      </div>
                      <span className="text-xs text-muted">log-export.ndjson</span>
                    </button>
                    <button
                      onClick={() => handleExport("json")}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Code size={16} className="text-info" />
                        <span>JSON Array</span>
                      </div>
                      <span className="text-xs text-muted">log-export.json</span>
                    </button>
                    <button
                      onClick={() => handleExport("csv")}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className="text-success" />
                        <span>CSV</span>
                      </div>
                      <span className="text-xs text-muted">log-export.csv</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats Display */}
        <div className="flex items-center space-x-4 text-sm text-secondary">
          <span>
            Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} entries
          </span>
          {stats.invalidEntries > 0 && (
            <span className="text-warning">
              {stats.invalidEntries} invalid
            </span>
          )}
          {stats.dateRange && (
            <span>
              {stats.dateRange.earliest.toLocaleDateString()} - {stats.dateRange.latest.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};