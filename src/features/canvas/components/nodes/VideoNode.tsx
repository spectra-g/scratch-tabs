import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import {
  MIN_VIDEO_ITEM_HEIGHT,
  MIN_VIDEO_ITEM_WIDTH,
} from "../../constants";
import { useCanvasCopyFeedback } from "../../hooks/useCanvasCopyFeedback";
import { canvasUrlActionService } from "../../services/CanvasUrlActionService";
import { getCanvasItemAccessibleLabel } from "../../utils/canvasAccessibility";
import type { CanvasVideoFlowNode } from "../../utils/canvasFlowMapping";
import { parseCanvasVideoUrl } from "../../utils/canvasVideoProviders";
import { useCanvasNodeInteraction } from "./CanvasNodeInteractionContext";
import { CanvasUrlNodeActions } from "./CanvasUrlNodeActions";

const VideoNodeComponent = ({
  id,
  data,
  selected,
}: NodeProps<CanvasVideoFlowNode>) => {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const video = useMemo(
    () => parseCanvasVideoUrl(item.canonicalUrl),
    [item.canonicalUrl],
  );
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
        error instanceof Error
          ? error.message
          : "The video link could not be opened.",
      );
    }
  };

  const leaveActions = () => {
    cancelEditing(id);
    requestAnimationFrame(() =>
      cardRef.current?.focus({ preventScroll: true }),
    );
  };
  const providerLabel =
    video?.providerLabel ?? (item.provider === "youtube" ? "YouTube" : "Vimeo");

  return (
    <article
      ref={cardRef}
      className="canvas-video-node relative h-full w-full overflow-hidden rounded-lg border bg-surface shadow-sm"
      data-testid={`canvas-item-${id}`}
      data-item-id={id}
      data-item-type="video"
      data-canonical-url={item.canonicalUrl}
      data-video-provider={item.provider}
      data-video-id={item.videoId}
      data-x={item.x}
      data-y={item.y}
      data-width={item.width}
      data-height={item.height}
      data-z-index={item.zIndex}
      data-editing={isEditing}
      data-playing={isPlaying}
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
      <NodeResizer
        isVisible={selected && !isEditing}
        minWidth={MIN_VIDEO_ITEM_WIDTH}
        minHeight={MIN_VIDEO_ITEM_HEIGHT}
        keepAspectRatio
        onResizeEnd={(_event, bounds) => commitResize(id, bounds)}
      />
      {isPlaying && video ? (
        <iframe
          className="nodrag nowheel h-[calc(100%_-_48px)] w-full border-0 bg-canvas"
          data-testid="canvas-video-iframe"
          src={video.embedUrl}
          title={`${providerLabel} video ${item.videoId}`}
          sandbox={video.iframePolicy.sandbox}
          allow={video.iframePolicy.allow}
          referrerPolicy={video.iframePolicy.referrerPolicy}
          allowFullScreen
        />
      ) : (
        <div className="flex h-[calc(100%_-_48px)] flex-col items-center justify-center gap-3 bg-canvas p-5 text-center">
          <Play size={36} className="text-primary" aria-hidden="true" />
          <div>
            <div className="text-sm font-semibold text-main">
              {providerLabel} video
            </div>
            <div className="mt-1 break-all text-xs text-muted">
              {item.hostname}
            </div>
          </div>
          <div className="text-xs text-secondary">
            The video loads only when you choose Play.
          </div>
        </div>
      )}
      <div className="flex h-12 items-center justify-between gap-2 border-t border-base px-3">
        <span className="min-w-0 flex-1 truncate text-xs text-muted">
          {item.canonicalUrl}
        </span>
        <CanvasUrlNodeActions
          ref={firstActionRef}
          copyState={copyFeedback.state}
          isEditing={isEditing}
          playback={isPlaying ? "playing" : "stopped"}
          onPlay={() => {
            setActionError(null);
            if (video) setIsPlaying(true);
            else setActionError("This video provider is unavailable.");
          }}
          onStop={() => setIsPlaying(false)}
          onCopy={() => void copyFeedback.copy()}
          onOpen={runOpen}
        />
      </div>
      {actionError && (
        <div
          className="absolute inset-x-2 top-2 rounded bg-surface/95 p-2 text-xs text-danger shadow"
          role="alert"
        >
          {actionError}
        </div>
      )}
    </article>
  );
};

export const VideoNode = memo(VideoNodeComponent);
