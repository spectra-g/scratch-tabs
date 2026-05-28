import React from "react";
import { OpenApiDiagnostic } from "../../utils/openApiTypes";
import { OpenApiBadge } from "./OpenApiBadge";

export const OpenApiDiagnosticsView: React.FC<{ diagnostics: OpenApiDiagnostic[] }> = ({ diagnostics }) => (
  <div className="h-full overflow-auto bg-surface p-4 custom-scrollbar">
    <h3 className="mb-3 text-sm font-semibold text-main">Diagnostics</h3>
    {diagnostics.length > 0 ? (
      <div className="space-y-2">
        {diagnostics.map((diagnostic, index) => (
          <div key={`${diagnostic.message}-${index}`} className="rounded border border-base bg-element p-3">
            <div className="flex flex-wrap items-center gap-2">
              <OpenApiBadge tone={diagnostic.severity === "error" ? "danger" : diagnostic.severity === "warning" ? "warning" : "muted"}>{diagnostic.severity}</OpenApiBadge>
              {diagnostic.path && <span className="font-mono text-xs text-secondary">{diagnostic.path}</span>}
            </div>
            <p className="mt-2 text-sm text-main">{diagnostic.message}</p>
          </div>
        ))}
      </div>
    ) : <p className="text-sm text-secondary">No local diagnostics found.</p>}
  </div>
);
