import { memo, useCallback, useEffect, useRef, useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { MIN_IMAGE_ITEM_HEIGHT, MIN_IMAGE_ITEM_WIDTH } from "../../constants";
import { useCanvasAssetUrl } from "../../hooks/useCanvasAssetUrl";
import { useCanvasCopyFeedback } from "../../hooks/useCanvasCopyFeedback";
import type { CanvasImageFlowNode } from "../../utils/canvasFlowMapping";
import { getCanvasItemAccessibleLabel } from "../../utils/canvasAccessibility";
import { useCanvasNodeInteraction } from "./CanvasNodeInteractionContext";
import { CanvasNodeHandles } from "./CanvasNodeHandles";
import { ImageNodeActions } from "./ImageNodeActions";

const ImageNodeComponent = ({
  id,
  data,
  selected,
}: NodeProps<CanvasImageFlowNode>) => {
  const { item, isEditing, isFocused } = data;
  const {
    beginEditing,
    cancelEditing,
    commitImageAlt,
    commitResize,
    completePointerSelection,
    copyImage,
    downloadImage,
    openImageInSmartView,
    preparePointerSelection,
    replaceImage,
    syncFocusedItem,
  } = useCanvasNodeInteraction();
  const assetState = useCanvasAssetUrl(item.assetId);
  const [draftAlt, setDraftAlt] = useState(item.altText);
  const [renderFailed, setRenderFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const altInputRef = useRef<HTMLInputElement>(null);
  const copyAsset = useCallback(
    () => copyImage(item.assetId),
    [copyImage, item.assetId],
  );
  const copyFeedback = useCanvasCopyFeedback(copyAsset);

  useEffect(() => {
    setRenderFailed(false);
    setActionError(null);
  }, [item.assetId]);

  useEffect(() => {
    setDraftAlt(item.altText);
    if (isEditing) requestAnimationFrame(() => altInputRef.current?.focus());
  }, [isEditing, item.altText]);

  const runAction = (action: () => Promise<void>) => {
    setActionError(null);
    void action().catch((error: unknown) =>
      setActionError(
        error instanceof Error ? error.message : "The image action failed.",
      ),
    );
  };

  const commitAlt = () => commitImageAlt(id, draftAlt);
  const cancelAlt = () => {
    setDraftAlt(item.altText);
    cancelEditing(id);
    requestAnimationFrame(() =>
      cardRef.current?.focus({ preventScroll: true }),
    );
  };
  const unavailable = assetState.status !== "ready" || renderFailed;
  const assetError =
    assetState.status === "missing" || assetState.status === "error"
      ? assetState.error
      : renderFailed
        ? "This image asset is corrupt or cannot be decoded."
        : null;

  return (
    <article
      ref={cardRef}
      className="group canvas-image-node relative h-full w-full overflow-hidden rounded-lg border bg-surface shadow-sm"
      data-testid={`canvas-item-${id}`}
      data-item-id={id}
      data-item-type="image"
      data-asset-id={item.assetId}
      data-asset-status={assetError ? "error" : assetState.status}
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
    >
      <CanvasNodeHandles />
      <NodeResizer
        isVisible={selected && !isEditing}
        minWidth={MIN_IMAGE_ITEM_WIDTH}
        minHeight={MIN_IMAGE_ITEM_HEIGHT}
        keepAspectRatio
        onResizeEnd={(_event, bounds) => commitResize(id, bounds)}
      />
      <ImageNodeActions
        disabled={unavailable}
        alwaysVisible={
          isEditing || copyFeedback.state !== "idle" || actionError !== null
        }
        copyState={copyFeedback.state}
        onCopy={() => runAction(copyFeedback.copy)}
        onDownload={() => runAction(() => downloadImage(item.assetId))}
        onOpen={() => runAction(() => openImageInSmartView(item.assetId))}
        onReplace={(file) => runAction(() => replaceImage(id, file))}
      />
      {assetState.status === "loading" && (
        <div className="flex h-full items-center justify-center text-sm text-muted">
          Loading image…
        </div>
      )}
      {assetState.status === "ready" && !renderFailed && (
        <img
          className="h-full w-full bg-canvas"
          data-testid="canvas-image-rendered"
          src={assetState.url}
          alt={item.altText}
          draggable={false}
          style={{ objectFit: item.objectFit }}
          onError={() => setRenderFailed(true)}
        />
      )}
      {assetError && (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center"
          role="alert"
          data-testid="canvas-image-placeholder"
        >
          <span className="font-medium text-main">Image unavailable</span>
          <span className="text-xs text-secondary">{assetError}</span>
          <span className="text-xs text-muted">
            Use Replace to recover this card.
          </span>
        </div>
      )}
      {isEditing && (
        <div className="nodrag absolute inset-x-2 bottom-2 rounded bg-surface/95 p-2 shadow">
          <label
            className="block text-[11px] font-medium text-secondary"
            htmlFor={`canvas-image-alt-${id}`}
          >
            Alt text
          </label>
          <input
            ref={altInputRef}
            id={`canvas-image-alt-${id}`}
            className="mt-1 w-full rounded border border-base bg-canvas px-2 py-1 text-xs text-main outline-none focus:ring-2 focus:ring-primary"
            data-testid="canvas-image-alt-editor"
            value={draftAlt}
            onChange={(event) => setDraftAlt(event.target.value)}
            onBlur={commitAlt}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") {
                event.preventDefault();
                cancelAlt();
              } else if (event.key === "Enter") {
                event.preventDefault();
                commitAlt();
              }
            }}
          />
        </div>
      )}
      {actionError && (
        <div
          className="absolute inset-x-2 bottom-2 rounded bg-surface/95 p-2 text-xs text-danger shadow"
          role="alert"
          data-testid="canvas-image-action-error"
        >
          {actionError}
        </div>
      )}
    </article>
  );
};

export const ImageNode = memo(ImageNodeComponent);
