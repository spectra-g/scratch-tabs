import React, { useCallback, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import type { WinnerHistoryItem } from "../types";
import { historyToText, summarizeHistory } from "../utils/historyModel";

interface HistoryPanelProps {
  history: WinnerHistoryItem[];
  onClear: () => void;
}

/**
 * Spin results: a count summary ("Alice × 3") plus the chronological list,
 * newest first. Copy puts one winner per line (oldest first) on the clipboard.
 */
export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onClear }) => {
  const [copied, setCopied] = useState(false);

  const summary = summarizeHistory(history);

  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(historyToText(history))
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }, [history]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-base/30">
        <span className="text-xs text-muted">
          {`${history.length} ${history.length === 1 ? "spin" : "spins"}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            disabled={history.length === 0}
            aria-label="Copy spin history to clipboard"
            title="Copy history"
            className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={onClear}
            disabled={history.length === 0}
            aria-label="Clear spin history"
            title="Clear history"
            className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {copied && (
        <p role="status" className="flex-shrink-0 px-3 pt-2 text-xs text-success">
          Copied to clipboard
        </p>
      )}

      {summary.length > 0 && (
        <div className="flex-shrink-0 flex flex-wrap gap-1.5 px-3 py-2 border-b border-base/30">
          {summary.map((row) => (
            <span
              key={row.label}
              data-testid="spinthewheel-history-summary"
              className="px-2 py-0.5 text-xs bg-element-hover rounded-full text-main truncate max-w-full"
              title={`${row.label}: won ${row.count} time${row.count === 1 ? "" : "s"}`}
            >
              {row.label} × {row.count}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        {history.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            No spins yet — winners will appear here.
          </p>
        ) : (
          <ol className="divide-y divide-base/20">
            {history.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="text-sm text-main truncate">{item.label}</span>
                <time className="flex-shrink-0 text-xs text-muted/70">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
