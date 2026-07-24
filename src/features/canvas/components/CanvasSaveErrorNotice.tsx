interface CanvasSaveErrorNoticeProps {
  error: string;
  isRetrying: boolean;
  onRetry: () => void;
}

export const CanvasSaveErrorNotice = ({
  error,
  isRetrying,
  onRetry,
}: CanvasSaveErrorNoticeProps) => (
  <div
    className="absolute left-1/2 top-3 z-30 w-[min(34rem,calc(100%_-_2rem))] -translate-x-1/2 rounded border border-danger/50 bg-surface p-3 shadow-lg"
    role="alert"
    data-testid="canvas-save-error"
  >
    <p className="text-sm font-semibold text-danger">
      This Canvas has unsaved changes
    </p>
    <p className="mt-1 text-xs text-secondary">{error}</p>
    <button
      type="button"
      className="mt-3 rounded bg-primary px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
      data-testid="canvas-save-retry"
      disabled={isRetrying}
      onClick={onRetry}
    >
      {isRetrying ? "Retrying..." : "Retry save"}
    </button>
  </div>
);
