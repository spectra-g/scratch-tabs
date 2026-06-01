import React, { useState, useCallback } from "react";
import { Search, X, Download, ChevronDown, AlertTriangle, Trash2, GitCompare, ClipboardPaste } from "lucide-react";
import { HarFilter, HarPage, HarSummary, MainTab, StatusCategory } from "../types";
import { useRootStore } from "../../../../stores/rootStore";
import { createTab } from "../../../../utils/tabUtils";

interface HarToolbarProps {
  filter: HarFilter;
  summary: HarSummary;
  onFilterChange: (patch: Partial<HarFilter>) => void;
  onResetFilter: () => void;
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  exportFilteredHar: () => string;
  exportAsCsv: () => string;
  pages?: HarPage[];
  selectedCount: number;
  canCompareSelected: boolean;
  onDeleteSelected: () => void;
  onCompareSelected: () => void;
  onOpenMerge: () => void;
}

const ALL_STATUS_CATS: StatusCategory[] = ["2xx", "3xx", "4xx", "5xx", "1xx"];

const STATUS_STYLES: Record<StatusCategory, string> = {
  "1xx": "text-blue-600 dark:text-blue-400 bg-blue-500/15 border-blue-500/30",
  "2xx": "text-green-600 dark:text-green-400 bg-green-500/15 border-green-500/30",
  "3xx": "text-yellow-600 dark:text-yellow-300 bg-yellow-500/15 border-yellow-500/30",
  "4xx": "text-orange-600 dark:text-orange-400 bg-orange-500/15 border-orange-500/30",
  "5xx": "text-red-600 dark:text-red-400 bg-red-500/15 border-red-500/30",
  unknown: "text-secondary bg-element/50 border-base",
};

export const HarToolbar: React.FC<HarToolbarProps> = ({
  filter,
  summary,
  onFilterChange,
  onResetFilter,
  activeTab,
  onTabChange,
  exportFilteredHar,
  exportAsCsv,
  pages,
  selectedCount,
  canCompareSelected,
  onDeleteSelected,
  onCompareSelected,
  onOpenMerge,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const { addBackgroundTab } = useRootStore();

  const isFiltered =
    filter.search ||
    filter.methods.size > 0 ||
    filter.statusCategories.size > 0 ||
    filter.resourceTypes.size > 0 ||
    filter.showErrorsOnly ||
    filter.pageref !== undefined;

  const toggleStatusCategory = useCallback(
    (cat: StatusCategory) => {
      const next = new Set(filter.statusCategories);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      onFilterChange({ statusCategories: next });
    },
    [filter.statusCategories, onFilterChange],
  );

  const toggleMethod = useCallback(
    (method: string) => {
      const next = new Set(filter.methods);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      onFilterChange({ methods: next });
    },
    [filter.methods, onFilterChange],
  );

  const handleExport = useCallback(
    (format: "har" | "csv") => {
      const content = format === "har" ? exportFilteredHar() : exportAsCsv();
      const ext = format === "har" ? "har" : "csv";
      const tab = createTab({
        title: `export.${ext}`,
        content,
        language: format === "har" ? "har" : "csv",
        languageLocked: true,
      });
      addBackgroundTab(tab);
      setShowExportMenu(false);
    },
    [exportFilteredHar, exportAsCsv, addBackgroundTab],
  );

  const availableMethods = Object.keys(summary.methodCounts).sort();

  return (
    <div className="flex-none border-b border-base bg-surface-secondary">
      {/* View tabs row */}
      <div className="flex items-center border-b border-base px-3 pt-1 gap-1">
        {(["waterfall", "table"] as MainTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t transition-colors capitalize ${
              activeTab === tab
                ? "bg-surface text-main border border-b-surface border-base -mb-px"
                : "text-secondary hover:text-main"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            placeholder="Filter by URL, method, status…"
            className="pl-8 pr-8 py-1.5 bg-element border border-base rounded text-sm text-main placeholder-secondary focus:outline-none focus:border-focus w-64"
          />
          {filter.search && (
            <button
              onClick={() => onFilterChange({ search: "" })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-main"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Status category filters */}
        <div className="flex items-center gap-1">
          {ALL_STATUS_CATS.filter((c) => summary.statusCounts[c] > 0).map((cat) => (
            <button
              key={cat}
              onClick={() => toggleStatusCategory(cat)}
              className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                filter.statusCategories.has(cat)
                  ? STATUS_STYLES[cat]
                  : "text-secondary bg-transparent border-transparent hover:bg-element"
              }`}
            >
              {cat} ({summary.statusCounts[cat]})
            </button>
          ))}
        </div>

        {/* Method filter */}
        {availableMethods.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowMethodMenu((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-element hover:bg-element-hover border border-base rounded text-xs transition-colors"
            >
              <span>
                Methods
                {filter.methods.size > 0 && ` (${filter.methods.size})`}
              </span>
              <ChevronDown size={12} />
            </button>
            {showMethodMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMethodMenu(false)} />
                <div className="absolute top-full left-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[140px]">
                  {availableMethods.map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-element-hover cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={filter.methods.has(m)}
                        onChange={() => toggleMethod(m)}
                        className="rounded border-base bg-element"
                      />
                      <span className="font-mono text-main">{m}</span>
                      <span className="ml-auto text-secondary text-xs">{summary.methodCounts[m]}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Errors only toggle */}
        <button
          onClick={() => onFilterChange({ showErrorsOnly: !filter.showErrorsOnly })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded text-xs transition-colors ${
            filter.showErrorsOnly
              ? "bg-red-500/15 border-red-500/40 text-red-600 dark:text-red-400"
              : "bg-element border-base text-secondary hover:bg-element-hover"
          }`}
        >
          <AlertTriangle size={12} />
          Errors only
        </button>

        {/* Page filter (only when HAR has multiple pages) */}
        {pages && pages.length > 1 && (
          <select
            value={filter.pageref ?? ""}
            onChange={(e) => onFilterChange({ pageref: e.target.value || undefined })}
            className="px-2 py-1.5 bg-element border border-base rounded text-xs text-main focus:outline-none focus:border-focus"
            aria-label="Filter by page"
          >
            <option value="">All pages</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || p.id}
              </option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {isFiltered && (
          <button
            onClick={onResetFilter}
            className="text-xs text-secondary hover:text-main underline"
          >
            Clear all
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {selectedCount > 0 && (
            <span className="text-xs text-secondary">{selectedCount} selected</span>
          )}
          <button
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 rounded border border-base bg-element px-2.5 py-1.5 text-xs text-secondary transition-colors hover:bg-element-hover hover:text-main disabled:cursor-not-allowed disabled:opacity-50"
            title="Delete selected requests"
          >
            <Trash2 size={12} />
            Delete
          </button>
          <button
            onClick={onCompareSelected}
            disabled={!canCompareSelected}
            className="flex items-center gap-1.5 rounded border border-base bg-element px-2.5 py-1.5 text-xs text-secondary transition-colors hover:bg-element-hover hover:text-main disabled:cursor-not-allowed disabled:opacity-50"
            title="Compare two selected requests"
          >
            <GitCompare size={12} />
            Compare
          </button>
          <button
            onClick={onOpenMerge}
            className="flex items-center gap-1.5 rounded border border-base bg-element px-2.5 py-1.5 text-xs text-secondary transition-colors hover:bg-element-hover hover:text-main"
            title="Paste HAR content to merge"
          >
            <ClipboardPaste size={12} />
            Merge
          </button>

          {/* Export */}
          <div className="relative">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-element hover:bg-element-hover border border-base rounded text-xs transition-colors"
          >
            <Download size={12} />
            Export
            <ChevronDown size={12} />
          </button>
          {showExportMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
              <div className="absolute top-full right-0 mt-1 bg-surface border border-base rounded-lg shadow-xl z-40 min-w-[180px]">
                <button
                  onClick={() => handleExport("har")}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                >
                  HAR (filtered)
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-main hover:bg-element-hover transition-colors"
                >
                  CSV summary
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
