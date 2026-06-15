import React, { useRef, useEffect } from "react";
import { OperationDefinition } from "../../services/pipeline/types";
import { QuickTransformItem } from "../../services/quickTransform/types";
import { OperationParamField } from "../Pipeline/OperationParamField";

interface Props {
  item: QuickTransformItem;
  operation: OperationDefinition;
  params: Record<string, unknown>;
  onParamsChange: (params: Record<string, unknown>) => void;
  applyPerLine: boolean;
  onApplyPerLineChange: (value: boolean) => void;
  onExecute: () => void;
  onBack: () => void;
  isExecuting: boolean;
  error: string | null;
}

export const QuickTransformParamsForm: React.FC<Props> = ({
  item,
  operation,
  params,
  onParamsChange,
  applyPerLine,
  onApplyPerLineChange,
  onExecute,
  onBack,
  isExecuting,
  error,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLElement>(
      "input, select, textarea",
    );
    first?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onBack();
      return;
    }
    const tagName = (e.target as HTMLElement).tagName;
    if (e.key === "Enter" && tagName !== "TEXTAREA" && tagName !== "BUTTON") {
      e.preventDefault();
      onExecute();
    }
  };

  const isConfigurable = operation.processingMode === "configurable";

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} data-testid="quick-transform-params-form">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-base">
        <button
          onClick={onBack}
          className="text-muted hover:text-main text-sm flex-shrink-0"
          aria-label="Back to search"
        >
          ←
        </button>
        <span className="text-sm font-medium text-main truncate">{item.name}</span>
        {item.type === "pipeline" && (
          <span className="text-xs px-1 rounded bg-surface border border-base text-muted flex-shrink-0">
            Pipeline
          </span>
        )}
      </div>

      {/* Parameter fields */}
      <div className="px-3 py-2 space-y-3 max-h-64 overflow-y-auto">
        {operation.parameters.map((param) => (
          <div key={param.name}>
            <OperationParamField
              param={param}
              value={params[param.name]}
              onChange={(value) =>
                onParamsChange({ ...params, [param.name]: value })
              }
            />
          </div>
        ))}

        {isConfigurable && (
          <label
            className="flex items-center gap-2 cursor-pointer pt-1 border-t border-base"
            data-testid="apply-per-line-toggle"
          >
            <input
              type="checkbox"
              checked={applyPerLine}
              onChange={(e) => onApplyPerLineChange(e.target.checked)}
              disabled={isExecuting}
              className="rounded border-base"
            />
            <span className="text-xs text-main">Apply to every line</span>
          </label>
        )}
      </div>

      {/* Error or footer hint */}
      {error ? (
        <div className="px-3 py-1.5 border-t border-base">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      ) : (
        <div className="px-3 py-1 border-t border-base flex items-center justify-between">
          <span className="text-xs text-muted">Esc to go back</span>
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="text-xs text-muted hover:text-main disabled:opacity-50"
          >
            ↵ apply
          </button>
        </div>
      )}
    </div>
  );
};
