import * as React from "react";
import { X } from "lucide-react";
import { CsvColumn } from "../types";
import { ReplaceScope } from "../utils/findReplace";

interface CsvFindReplaceBarProps {
  columns: CsvColumn[];
  replaceValue: string;
  onReplaceChange: (value: string) => void;
  scope: ReplaceScope;
  onScopeChange: (scope: ReplaceScope) => void;
  columnId: string;
  onColumnChange: (columnId: string) => void;
  matchCase: boolean;
  onMatchCaseChange: (value: boolean) => void;
  exactCell: boolean;
  onExactCellChange: (value: boolean) => void;
  previewText: string;
  matchCount: number;
  selectionCount: number;
  onReplaceAll: () => void;
  onClose: () => void;
}

export const CsvFindReplaceBar: React.FC<CsvFindReplaceBarProps> = ({
  columns,
  replaceValue,
  onReplaceChange,
  scope,
  onScopeChange,
  columnId,
  onColumnChange,
  matchCase,
  onMatchCaseChange,
  exactCell,
  onExactCellChange,
  previewText,
  matchCount,
  selectionCount,
  onReplaceAll,
  onClose,
}) => {
  const canReplace = matchCount > 0;

  return (
    <div
      className="flex-none border-b border-base px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2 bg-canvas"
      data-testid="find-replace-bar"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-secondary">Replace with:</span>
        <input
          type="text"
          placeholder="Replacement..."
          value={replaceValue}
          onChange={(e) => onReplaceChange(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter" && canReplace) {
              e.preventDefault();
              onReplaceAll();
            }
          }}
          className="py-1.5 px-2 bg-element text-main border border-base rounded-lg text-sm placeholder-secondary focus:outline-none focus:border-focus w-48"
          data-testid="replace-input"
        />
      </div>

      <label className="flex items-center gap-1.5 text-sm text-main">
        <span className="text-secondary">Scope:</span>
        <select
          value={scope}
          onChange={(e) => onScopeChange(e.target.value as ReplaceScope)}
          className="bg-element text-main border border-base rounded px-2 py-1 text-sm focus:outline-none focus:border-focus cursor-pointer"
          data-testid="replace-scope-select"
        >
          <option value="all">All columns</option>
          <option value="column">Column…</option>
          <option value="selection" disabled={selectionCount === 0}>
            Selection ({selectionCount})
          </option>
        </select>
      </label>

      {scope === "column" && (
        <select
          value={columnId}
          onChange={(e) => onColumnChange(e.target.value)}
          className="bg-element text-main border border-base rounded px-2 py-1 text-sm focus:outline-none focus:border-focus cursor-pointer max-w-[200px]"
          title="Column to replace in"
          data-testid="replace-column-select"
        >
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </select>
      )}

      <label
        className="flex items-center gap-1.5 text-sm text-main cursor-pointer"
        title="Match upper/lower case exactly"
      >
        <input
          type="checkbox"
          checked={matchCase}
          onChange={(e) => onMatchCaseChange(e.target.checked)}
          data-testid="match-case-toggle"
        />
        Match case
      </label>

      <label
        className="flex items-center gap-1.5 text-sm text-main cursor-pointer"
        title="Only replace cells whose entire value equals the search text"
      >
        <input
          type="checkbox"
          checked={exactCell}
          onChange={(e) => onExactCellChange(e.target.checked)}
          data-testid="exact-cell-toggle"
        />
        Entire cell
      </label>

      <span
        className="text-sm text-secondary"
        data-testid="replace-preview"
      >
        {previewText}
      </span>

      <button
        onClick={onReplaceAll}
        disabled={!canReplace}
        title={
          canReplace
            ? `Replace ${previewText} in a single undo step`
            : "No matching cells to replace"
        }
        className={`px-3 py-1.5 rounded text-sm ${
          canReplace
            ? "bg-primary text-white hover:opacity-90"
            : "bg-element text-muted cursor-not-allowed"
        }`}
        data-testid="replace-all-button"
      >
        Replace all
      </button>

      <button
        onClick={onClose}
        title="Close Find & Replace"
        className="p-1 rounded hover:bg-element-hover text-secondary"
        data-testid="replace-close"
      >
        <X size={14} />
      </button>
    </div>
  );
};
