import { memo, useEffect, useMemo, useRef, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import {
  MIN_CODE_ITEM_HEIGHT,
  MIN_CODE_ITEM_WIDTH,
} from "../../constants";
import type { CanvasCodeFlowNode } from "../../utils/canvasFlowMapping";
import { getCanvasItemAccessibleLabel } from "../../utils/canvasAccessibility";
import { getCanvasCodePreview } from "../../utils/canvasCode";
import { useCanvasNodeInteraction } from "./CanvasNodeInteractionContext";
import { CanvasNodeHandles } from "./CanvasNodeHandles";
import { CodeNodeActions } from "./CodeNodeActions";
import { HighlightedCode } from "./HighlightedCode";
import { useCanvasCodeCopy } from "../../hooks/useCanvasCodeCopy";

const CodeNodeComponent = ({
  id,
  data,
  selected,
}: NodeProps<CanvasCodeFlowNode>) => {
  const { item, isEditing, isFocused } = data;
  const {
    beginEditing,
    cancelEditing,
    commitCode,
    commitResize,
    completePointerSelection,
    formatCode,
    openCodeInTab,
    detachDerived,
    requestTransform,
    preparePointerSelection,
    syncFocusedItem,
    toggleCodeCollapsed,
    toggleCodeWrap,
  } = useCanvasNodeInteraction();
  const [draft, setDraft] = useState(item.source);
  const [formatError, setFormatError] = useState<string | null>(null);
  const initialSourceRef = useRef(item.source);
  const cardRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const preview = useMemo(
    () => getCanvasCodePreview(item.source),
    [item.source],
  );
  const codeCopy = useCanvasCodeCopy(item.source);

  useEffect(() => {
    if (!isEditing) {
      setDraft(item.source);
      initialSourceRef.current = item.source;
      return;
    }
    initialSourceRef.current = item.source;
    setDraft(item.source);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, [isEditing, item.source]);

  const commit = () => commitCode(id, draft);  const cancel = () => {
    setDraft(initialSourceRef.current);
    cancelEditing(id);
    requestAnimationFrame(() =>
      cardRef.current?.focus({ preventScroll: true }),
    );
  };

  const format = () => {
    const result = formatCode(id);
    setFormatError(result.ok ? null : result.error);
  };

  const isDerived = item.derivedFrom !== undefined;

  return (
    <article
      ref={cardRef}
      className="canvas-code-node flex h-full w-full flex-col overflow-hidden rounded-lg border bg-surface shadow-sm"
      data-testid={`canvas-item-${id}`}
      data-item-id={id}
      data-item-type="code"
      data-language={item.language}
      data-language-locked={item.languageLocked}
      data-collapsed={item.collapsed}
      data-wrap={item.wrap}
      data-derived={isDerived}
      data-preview-truncated={preview.isTruncated}
      data-x={item.x}
      data-y={item.y}
      data-width={item.width}
      data-height={item.height}
      data-z-index={item.zIndex}
      data-editing={isEditing}
      data-focused={isFocused}
      tabIndex={isFocused ? 0 : -1}
      aria-label={getCanvasItemAccessibleLabel(item)}
      aria-selected={selected}
      onFocus={() => syncFocusedItem(id, "keyboard")}
      onPointerDownCapture={(event) => {
        if (!isEditing && event.button === 0) {
          preparePointerSelection(
            id,
            event.metaKey || event.ctrlKey || event.shiftKey,
          );
          syncFocusedItem(id, "pointer");
          event.currentTarget.focus({ preventScroll: true });
        }
      }}
      onClickCapture={() => {
        requestAnimationFrame(() => completePointerSelection(id));
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        beginEditing(id);
      }}
    >
      <CanvasNodeHandles />
      <NodeResizer
        isVisible={selected && !isEditing && !item.collapsed}
        minWidth={MIN_CODE_ITEM_WIDTH}
        minHeight={MIN_CODE_ITEM_HEIGHT}
        onResizeEnd={(_event, bounds) => commitResize(id, bounds)}
      />
      {isEditing && !isDerived ? (
        <textarea
          ref={editorRef}
          className="nodrag nowheel custom-scrollbar h-full w-full resize-none overflow-auto bg-transparent p-4 font-mono text-xs leading-5 text-main outline-none"
          data-testid="canvas-code-editor"
          aria-label="Edit code card"
          wrap={item.wrap ? "soft" : "off"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
            } else if (
              event.key === "Enter" &&
              (event.metaKey || event.ctrlKey)
            ) {
              event.preventDefault();
              commit();
            }
          }}
        />
      ) : (
        <>
          <header
            className="flex min-h-9 cursor-grab items-center justify-between gap-2 border-b border-base px-2 active:cursor-grabbing"
            data-testid="canvas-code-drag-handle"
          >
            <span
              className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted"
              data-testid="canvas-code-language"
            >
              {item.language}
            </span>
            <CodeNodeActions
              collapsed={item.collapsed}
              wrap={item.wrap}
              isDerived={isDerived}
              formatError={formatError}
              copyState={codeCopy.state}
              onCopy={() => void codeCopy.copy()}
              onFormat={format}
              onTransform={() => requestTransform(id)}
              onToggleCollapsed={() => toggleCodeCollapsed(id)}
              onToggleWrap={() => toggleCodeWrap(id)}
              onOpenInTab={() => void openCodeInTab(id)}
            />
          </header>
          {isDerived && item.derivedFrom ? (
            <div
              className="nodrag flex items-center gap-2 border-b border-base bg-element px-2 py-1 text-[11px] text-secondary"
              data-testid="canvas-code-derived-badge"
              title={`Derived from a linked card via ${item.derivedFrom.operationName}`}
            >
              <span className="min-w-0 flex-1 truncate">
                {item.derivedFrom.operationName}
                {item.transformError ? ` - ${item.transformError}` : ""}
              </span>
              <button
                type="button"
                className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-secondary hover:bg-element-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="canvas-code-detach"
                aria-label="Detach from source and edit directly"
                onClick={() => detachDerived(id)}
                onPointerDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
              >
                Detach
              </button>
            </div>
          ) : null}
          {!item.collapsed && (
            <div className="nowheel custom-scrollbar min-h-0 flex-1 overflow-auto">
              <HighlightedCode
                source={preview.source}
                language={item.language}
                wrap={item.wrap}
              />
              {preview.isTruncated && (
                <div
                  className="sticky bottom-0 border-t border-base bg-surface/95 px-3 py-2 text-xs text-muted"
                  data-testid="canvas-code-preview-truncated"
                >
                  Preview truncated. Use Open in tab for the complete source.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
};

export const CodeNode = memo(CodeNodeComponent);
