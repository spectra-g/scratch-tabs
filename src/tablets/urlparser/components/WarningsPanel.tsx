import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Info } from "lucide-react";
import { UrlWarning } from "../types";

interface WarningsPanelProps {
  warnings: UrlWarning[];
}

export const WarningsPanel: React.FC<WarningsPanelProps> = ({ warnings }) => {
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(
    new Set(),
  );

  if (warnings.length === 0) {
    return null;
  }

  const toggleWarning = (index: number) => {
    const newExpanded = new Set(expandedWarnings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWarnings(newExpanded);
  };

  const errorCount = warnings.filter((w) => w.type === "error").length;
  const warningCount = warnings.filter((w) => w.type === "warning").length;

  return (
    <div className="mt-4 bg-surface-secondary border border-base rounded-md overflow-hidden">
      <div className="bg-surface-raised p-3 border-b border-base flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle size={16} className="text-warning" />
          <h3 className="text-sm font-medium text-main">
            Security Analysis
          </h3>
        </div>
        <div className="flex items-center space-x-3">
          {errorCount > 0 && (
            <span className="px-2 py-0.5 bg-danger-subtle text-danger rounded text-xs">
              {errorCount} {errorCount === 1 ? "Error" : "Errors"}
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 bg-warning-subtle text-warning rounded text-xs">
              {warningCount} {warningCount === 1 ? "Warning" : "Warnings"}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-base">
        {warnings.map((warning, index) => (
          <div key={index} className="p-3">
            <div
              className="flex items-start cursor-pointer"
              onClick={() => toggleWarning(index)}
            >
              <div className="flex-shrink-0 mt-0.5">
                {warning.type === "error" ? (
                  <AlertTriangle size={16} className="text-danger" />
                ) : (
                  <Info size={16} className="text-warning" />
                )}
              </div>
              <div className="ml-2 flex-1">
                <div
                  className={`font-medium ${
                    warning.type === "error"
                      ? "text-danger"
                      : "text-warning"
                  }`}
                >
                  {warning.message}
                </div>
                <div className="text-xs text-secondary mt-1">
                  Component: {warning.component}
                </div>
              </div>
              <div className="flex-shrink-0 ml-2">
                {expandedWarnings.has(index) ? (
                  <ChevronUp size={16} className="text-secondary" />
                ) : (
                  <ChevronDown size={16} className="text-secondary" />
                )}
              </div>
            </div>

            {expandedWarnings.has(index) && (
              <div className="mt-2 ml-6 text-sm text-main">
                <p>{warning.description}</p>
                {warning.suggestion && (
                  <p className="mt-1 text-info">{warning.suggestion}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
