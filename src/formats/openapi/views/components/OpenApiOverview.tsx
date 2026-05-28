import React, { useState } from "react";
import { OpenApiViewModel } from "../../utils/openApiTypes";
import { OpenApiBadge } from "./OpenApiBadge";
import { OpenApiMarkdown } from "./OpenApiMarkdown";

interface OpenApiOverviewProps {
  model: OpenApiViewModel;
  methodCounts: Record<string, number>;
}

export const OpenApiOverview: React.FC<OpenApiOverviewProps> = ({ model, methodCounts }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const deprecated = model.operations.filter((operation) => operation.deprecated).length;
  const errors = model.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warnings = model.diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  const summary = model.description ? summarizeMarkdown(model.description) : "";

  return (
    <div className="border-b border-base bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-base font-semibold text-main">{model.title}</h2>
            <OpenApiBadge>{model.specVersion}</OpenApiBadge>
            {model.apiVersion && <OpenApiBadge tone="muted">v{model.apiVersion}</OpenApiBadge>}
          </div>
          {summary && (
            <div className="mt-1">
              <p className="line-clamp-2 text-xs text-secondary">{summary}</p>
              {model.description && (
                <button
                  className="mt-1 text-xs text-primary hover:underline"
                  onClick={() => setShowFullDescription((value) => !value)}
                >
                  {showFullDescription ? "Hide description" : "Show full description"}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs sm:grid-cols-6">
          <Metric label="Endpoints" value={model.operations.length} />
          <Metric label="Schemas" value={model.schemas.length} />
          <Metric label="Auth" value={model.securitySchemes.length} />
          <Metric label="Deprecated" value={deprecated} />
          <Metric label="Warnings" value={warnings} />
          <Metric label="Errors" value={errors} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(methodCounts).map(([method, count]) => (
          <OpenApiBadge key={method} tone="muted">{method.toUpperCase()} {count}</OpenApiBadge>
        ))}
        {model.tags.slice(0, 12).map((tag) => (
          <OpenApiBadge key={tag.name} tone="muted">{tag.name} {tag.count}</OpenApiBadge>
        ))}
      </div>
      {showFullDescription && model.description && (
        <div className="mt-3 max-h-64 overflow-auto rounded border border-base bg-element p-3 custom-scrollbar" data-testid="openapi-full-description">
          <OpenApiMarkdown>{model.description}</OpenApiMarkdown>
        </div>
      )}
    </div>
  );
};

function summarizeMarkdown(markdown: string): string {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .filter((line) => !line.startsWith("* ") && !line.startsWith("- "));

  return (lines[0] ?? markdown)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

const Metric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <div className="text-sm font-semibold text-main">{value}</div>
    <div className="text-[11px] text-secondary">{label}</div>
  </div>
);
