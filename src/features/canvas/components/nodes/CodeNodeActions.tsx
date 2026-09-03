import { Check } from "lucide-react";
import type { CanvasCodeCopyState } from "../../hooks/useCanvasCodeCopy";

interface CodeNodeActionsProps {
  collapsed: boolean;
  wrap: boolean;
  isDerived: boolean;
  formatError: string | null;
  copyState: CanvasCodeCopyState;
  onCopy: () => void;
  onFormat: () => void;
  onTransform: () => void;
  onToggleCollapsed: () => void;
  onToggleWrap: () => void;
  onOpenInTab: () => void;
}

const actionClassName =
  "nodrag rounded px-1.5 py-1 text-[11px] text-secondary hover:bg-element-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export const CodeNodeActions = ({
  collapsed,
  wrap,
  isDerived,
  formatError,
  copyState,
  onCopy,
  onFormat,
  onTransform,
  onToggleCollapsed,
  onToggleWrap,
  onOpenInTab,
}: CodeNodeActionsProps) => (
  <div
    className="nodrag flex min-w-0 items-center gap-0.5"
    data-testid="canvas-code-actions"
    onPointerDown={(event) => event.stopPropagation()}
    onDoubleClick={(event) => event.stopPropagation()}
  >
    <button
      type="button"
      className={actionClassName}
      data-testid="canvas-code-copy"
      aria-label={
        copyState === "copied"
          ? "Copied code"
          : copyState === "failed"
            ? "Copy code failed"
            : "Copy code"
      }
      onClick={onCopy}
    >
      {copyState === "copied" ? (
        <Check size={14} className="text-success" aria-hidden="true" />
      ) : copyState === "failed" ? (
        "Copy failed"
      ) : (
        "Copy"
      )}
    </button>
    <button
      type="button"
      className={actionClassName}
      data-testid="canvas-code-format"
      aria-label="Format JSON"
      aria-describedby={formatError ? "canvas-code-format-error" : undefined}
      disabled={isDerived}
      title={isDerived ? "Detach this card before formatting it directly" : undefined}
      onClick={onFormat}
    >
      Format
    </button>
    <button
      type="button"
      className={actionClassName}
      data-testid="canvas-code-transform"
      aria-label="Quick transform into a linked card"
      onClick={onTransform}
    >
      Transform
    </button>
    <button
      type="button"
      className={actionClassName}
      data-testid="canvas-code-collapse"
      aria-label={collapsed ? "Expand code preview" : "Collapse code preview"}
      aria-pressed={collapsed}
      onClick={onToggleCollapsed}
    >
      {collapsed ? "Expand" : "Collapse"}
    </button>
    <button
      type="button"
      className={actionClassName}
      data-testid="canvas-code-wrap"
      aria-label={wrap ? "Disable code wrapping" : "Enable code wrapping"}
      aria-pressed={wrap}
      onClick={onToggleWrap}
    >
      Wrap
    </button>
    <button
      type="button"
      className={actionClassName}
      data-testid="canvas-code-open-tab"
      aria-label="Open code in text tab"
      onClick={onOpenInTab}
    >
      Open in tab
    </button>
    {formatError && (
      <span
        id="canvas-code-format-error"
        className="sr-only"
        role="status"
      >
        {formatError}
      </span>
    )}
  </div>
);
