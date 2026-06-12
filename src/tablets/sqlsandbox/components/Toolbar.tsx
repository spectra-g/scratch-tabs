import { Download, History, Play, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

interface ToolbarProps {
  canExport: boolean;
  isRunning: boolean;
  lastExecutionMs?: number;
  rowCount?: number;
  onRun: () => void;
  onRunSelected: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onLoadSample: () => void;
  onReset: () => void;
  onSnapshot: () => void;
  onToggleHistory: () => void;
}

export function Toolbar({
  canExport,
  isRunning,
  lastExecutionMs,
  rowCount,
  onRun,
  onRunSelected,
  onExportCsv,
  onExportJson,
  onLoadSample,
  onReset,
  onSnapshot,
  onToggleHistory,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-base bg-surface-secondary px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-content hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          title="Run query"
        >
          <Play size={15} />
          Run
        </button>
        <button
          type="button"
          onClick={onRunSelected}
          disabled={isRunning}
          className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-1.5 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-60"
          title="Run selected SQL"
        >
          <Sparkles size={15} />
          Selected
        </button>
        <button
          type="button"
          onClick={onSnapshot}
          className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-1.5 text-sm text-main hover:bg-element-hover"
          title="Save current query"
        >
          Save Query
        </button>
        <button
          type="button"
          onClick={onToggleHistory}
          className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-1.5 text-sm text-main hover:bg-element-hover"
          title="Show query history"
        >
          <History size={15} />
          History
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onExportCsv}
            disabled={!canExport}
            className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-1.5 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-50"
            title="Export result as CSV"
          >
            <Download size={15} />
            CSV
          </button>
          <button
            type="button"
            onClick={onExportJson}
            disabled={!canExport}
            className="rounded-md border border-base px-3 py-1.5 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-50"
            title="Export result as JSON"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isRunning}
            className="rounded-md border border-base px-3 py-1.5 text-sm text-main hover:bg-element-hover disabled:cursor-not-allowed disabled:opacity-50"
            title="Load sample CSV"
          >
            Load Sample
          </button>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-md border border-base px-3 py-1.5 text-sm text-main hover:bg-element-hover"
          title="Reset sandbox"
        >
          <RefreshCw size={15} />
          Reset
        </button>
      </div>
      <div className="flex items-center gap-3 text-xs text-secondary">
        {lastExecutionMs !== undefined && (
          <span>
            {rowCount ?? 0} rows - {lastExecutionMs}ms
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success-subtle px-2 py-1 text-success">
          <ShieldCheck size={14} />
          Local DuckDB - runs in this browser
        </span>
      </div>
    </div>
  );
}
