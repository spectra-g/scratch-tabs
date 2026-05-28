import React from "react";
import { OpenApiViewModel } from "../../utils/openApiTypes";
import { OpenApiBadge } from "./OpenApiBadge";

export const OpenApiSecurityView: React.FC<{ model: OpenApiViewModel }> = ({ model }) => (
  <div className="h-full overflow-auto bg-surface p-4 custom-scrollbar">
    <div className="grid gap-4 lg:grid-cols-2">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-main">Security Schemes</h3>
        <div className="space-y-2">
          {model.securitySchemes.length > 0 ? model.securitySchemes.map((scheme) => (
            <div key={scheme.name} className="rounded border border-base bg-element p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-main">{scheme.name}</span>
                {scheme.type && <OpenApiBadge>{scheme.type}</OpenApiBadge>}
                {scheme.scheme && <OpenApiBadge tone="muted">{scheme.scheme}</OpenApiBadge>}
                {scheme.in && <OpenApiBadge tone="muted">in {scheme.in}</OpenApiBadge>}
              </div>
              {scheme.description && <p className="mt-2 text-xs text-secondary">{scheme.description}</p>}
              {scheme.scopes.length > 0 && <p className="mt-2 text-xs text-secondary">Scopes: {scheme.scopes.join(", ")}</p>}
            </div>
          )) : <p className="text-sm text-secondary">No security schemes declared.</p>}
        </div>
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-main">Operation Coverage</h3>
        <div className="space-y-2">
          {model.globalSecurity.length > 0 && (
            <div className="rounded border border-base bg-element p-3 text-xs text-secondary">
              Global security: {model.globalSecurity.map((item) => item.scheme).join(", ")}
            </div>
          )}
          {model.operations.map((operation) => (
            <div key={operation.id} className="flex items-center justify-between gap-3 border-b border-base py-2 text-xs">
              <span className="min-w-0 truncate font-mono text-main">{operation.method.toUpperCase()} {operation.path}</span>
              <span className="flex shrink-0 gap-1">
                {operation.auth.length > 0 ? operation.auth.map((auth) => <OpenApiBadge key={auth.scheme} tone="muted">{auth.scheme}</OpenApiBadge>) : <OpenApiBadge tone={model.globalSecurity.length > 0 ? "warning" : "success"}>No auth</OpenApiBadge>}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
);
