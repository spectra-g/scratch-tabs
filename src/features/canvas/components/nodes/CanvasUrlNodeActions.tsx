import { forwardRef } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Play,
  Square,
  TriangleAlert,
} from "lucide-react";
import type { CanvasCopyState } from "../../hooks/useCanvasCopyFeedback";

interface CanvasUrlNodeActionsProps {
  copyState: CanvasCopyState;
  isEditing: boolean;
  playback?: "stopped" | "playing";
  onCopy: () => void;
  onOpen: () => void;
  onPlay?: () => void;
  onStop?: () => void;
}

const actionClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-base bg-surface text-secondary shadow-sm transition-colors hover:bg-element-hover hover:text-main focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export const CanvasUrlNodeActions = forwardRef<
  HTMLButtonElement,
  CanvasUrlNodeActionsProps
>(
  (
    {
      copyState,
      isEditing,
      playback,
      onCopy,
      onOpen,
      onPlay,
      onStop,
    },
    firstActionRef,
  ) => (
    <div
      className="nodrag nowheel flex shrink-0 items-center gap-1"
      aria-label="URL actions"
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {playback === "stopped" && (
        <button
          ref={firstActionRef}
          type="button"
          className={actionClass}
          data-testid="canvas-video-play"
          aria-label="Play video"
          title="Play video"
          tabIndex={isEditing ? 0 : -1}
          onClick={onPlay}
        >
          <Play size={14} fill="currentColor" aria-hidden="true" />
        </button>
      )}
      {playback === "playing" && (
        <button
          ref={firstActionRef}
          type="button"
          className={actionClass}
          data-testid="canvas-video-stop"
          aria-label="Stop video"
          title="Stop video"
          tabIndex={isEditing ? 0 : -1}
          onClick={onStop}
        >
          <Square size={13} fill="currentColor" aria-hidden="true" />
        </button>
      )}
      <button
        ref={playback === undefined ? firstActionRef : undefined}
        type="button"
        className={actionClass}
        data-testid="canvas-url-open"
        aria-label="Open URL"
        title="Open URL"
        tabIndex={isEditing ? 0 : -1}
        onClick={onOpen}
      >
        <ExternalLink size={15} aria-hidden="true" />
      </button>
      <button
        type="button"
        className={actionClass}
        data-testid="canvas-url-copy"
        aria-label={
          copyState === "copied"
            ? "Copied URL"
            : copyState === "failed"
              ? "Copy URL failed"
              : "Copy URL"
        }
        title={
          copyState === "copied"
            ? "Copied URL"
            : copyState === "failed"
              ? "Copy URL failed"
              : "Copy URL"
        }
        tabIndex={isEditing ? 0 : -1}
        onClick={onCopy}
      >
        {copyState === "copied" ? (
          <Check size={14} className="text-success" aria-hidden="true" />
        ) : copyState === "failed" ? (
          <TriangleAlert size={15} className="text-danger" aria-hidden="true" />
        ) : (
          <Copy size={15} aria-hidden="true" />
        )}
      </button>
    </div>
  ),
);

CanvasUrlNodeActions.displayName = "CanvasUrlNodeActions";
