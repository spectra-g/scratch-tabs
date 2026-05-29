import React, { useState } from "react";
import { ChevronDown, Code, ExternalLink, FileText } from "../../../components/Icons";

interface ExportPanelProps {
  onOpenReport: (format: "markdown" | "json" | "csv") => void;
  onOpenRedacted: () => void;
  disabled: boolean;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ onOpenReport, onOpenRedacted, disabled }) => {
  const [showReportMenu, setShowReportMenu] = useState(false);

  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-base bg-surface-secondary px-3 py-2">
      {/* Report dropdown */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowReportMenu((v) => !v)}
          className="inline-flex items-center gap-2 rounded-md border border-base bg-surface px-3 py-2 text-sm text-main hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText size={16} />
          Open Safe Report
          <ChevronDown size={12} className={`transition-transform ${showReportMenu ? "rotate-180" : ""}`} />
        </button>

        {showReportMenu && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setShowReportMenu(false)} />
            <div className="absolute left-0 top-full z-40 mt-1 min-w-[180px] rounded-lg border border-base bg-surface shadow-xl">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => { onOpenReport("markdown"); setShowReportMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-main hover:bg-surface-secondary"
                >
                  <FileText size={15} className="text-secondary" />
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => { onOpenReport("json"); setShowReportMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-main hover:bg-surface-secondary"
                >
                  <Code size={15} className="text-info" />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => { onOpenReport("csv"); setShowReportMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-main hover:bg-surface-secondary"
                >
                  <FileText size={15} className="text-success" />
                  CSV
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenRedacted}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md border border-base bg-surface px-3 py-2 text-sm text-main hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ExternalLink size={16} />
        Open Redacted
      </button>
    </div>
  );
};
