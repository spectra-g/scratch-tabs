import * as React from "react";
import { AlertTriangle } from "../../../../components/Icons";
import { CsvDiagnostic } from "../types";

interface CsvDiagnosticsFooterProps {
  diagnostics: CsvDiagnostic[];
}

export const CsvDiagnosticsFooter: React.FC<CsvDiagnosticsFooterProps> = ({
  diagnostics,
}) => {
  if (diagnostics.length === 0) return null;

  return (
    <div className="flex-none border-t border-base bg-surface max-h-32 overflow-auto custom-scrollbar">
      <div className="p-2 space-y-1">
        {diagnostics.slice(0, 10).map((diag, index) => (
          <div
            key={index}
            className={`text-xs flex items-center space-x-2 ${diag.type === "error" ? "text-danger" : "text-warning"
              }`}
          >
            <AlertTriangle size={12} />
            <span>
              {diag.line && `Line ${diag.line}: `}
              {diag.column && `Col ${diag.column}: `}
              {diag.message}
            </span>
          </div>
        ))}
        {diagnostics.length > 10 && (
          <div className="text-xs text-muted">
            ... and {diagnostics.length - 10} more issues
          </div>
        )}
      </div>
    </div>
  );
};
