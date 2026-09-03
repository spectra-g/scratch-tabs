import { memo, useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import {
  MIN_LINK_ITEM_HEIGHT,
  MIN_LINK_ITEM_WIDTH,
} from "../../constants";
import { useCanvasCopyFeedback } from "../../hooks/useCanvasCopyFeedback";
import { canvasUrlActionService } from "../../services/CanvasUrlActionService";
import { getCanvasItemAccessibleLabel } from "../../utils/canvasAccessibility";
import type { CanvasLinkFlowNode } from "../../utils/canvasFlowMapping";
import { useCanvasNodeInteraction } from "./CanvasNodeInteractionContext";
import { CanvasNodeHandles } from "./CanvasNodeHandles";
import { CanvasUrlNodeActions } from "./CanvasUrlNodeActions";

const LinkNodeComponent = ({
  id,
  data,
  selected,
}: NodeProps<CanvasLinkFlowNode>) => {
  const { item, isEditing, isFocused } = data;
  const {
    beginEditing,
    cancelEditing,
    commitResize,
    completePointerSelection,
    preparePointerSelection,
    syncFocusedItem,
  } = useCanvasNodeInteraction();
  const cardRef = useRef<HTMLElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const copyFeedback = useCanvasCopyFeedback(() =>
    canvasUrlActionService.copy(item.canonicalUrl),
  );

  useEffect(() => {
    if (isEditing) requestAnimationFrame(() => firstActionRef.current?.focus());
  }, [isEditing]);

  const runOpen = () => {
    setActionError(null);
    try {
      canvasUrlActionService.open(item.canonicalUrl);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "The link could not be opened.",
      );
    }
  };

  const leaveActions = () => {
    cancelEditing(id);
    requestAnimationFrame(() =>
      cardRef.current?.focus({ preventScroll: true }),
    );
  };

  return (
    <article
      ref={cardRef}
      className="canvas-link-node relative h-full w-full overflow-hidden rounded-lg border bg-surface p-4 shadow-sm"
      data-testid={`canvas-item-${id}`}
      data-item-id={id}
      data-item-type="link"
      data-canonical-url={item.canonicalUrl}
      data-hostname={item.hostname}
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
      onClickCapture={() =>
        requestAnimationFrame(() => completePointerSelection(id))
      }
      onDoubleClick={(event) => {
        event.stopPropagation();
        beginEditing(id);
      }}
      onKeyDown={(event) => {
        if (isEditing && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          leaveActions();
        }
      }}
    >
      <CanvasNodeHandles />
      <NodeResizer
        isVisible={selected && !isEditing}
        minWidth={MIN_LINK_ITEM_WIDTH}
        minHeight={MIN_LINK_ITEM_HEIGHT}
        onResizeEnd={(_event, bounds) => commitResize(id, bounds)}
      />
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="min-w-0">
          <ExternalLink
            className="mb-3 text-primary"
            size={22}
            aria-hidden="true"
          />
          <div className="truncate text-sm font-semibold text-main">
            {item.hostname}
          </div>
          <div className="mt-2 line-clamp-3 break-all text-xs text-secondary">
            {item.canonicalUrl}
          </div>
        </div>
        <CanvasUrlNodeActions
          ref={firstActionRef}
          copyState={copyFeedback.state}
          isEditing={isEditing}
          onCopy={() => void copyFeedback.copy()}
          onOpen={runOpen}
        />
      </div>
      {actionError && (
        <div className="mt-2 text-xs text-danger" role="alert">
          {actionError}
        </div>
      )}
    </article>
  );
};

export const LinkNode = memo(LinkNodeComponent);
