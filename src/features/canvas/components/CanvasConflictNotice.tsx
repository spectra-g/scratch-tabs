interface CanvasConflictNoticeProps {
  remoteRevision: number;
  isResolving: boolean;
  onReload: () => void;
  onTakeOver: () => void;
}

export const CanvasConflictNotice = ({
  remoteRevision,
  isResolving,
  onReload,
  onTakeOver,
}: CanvasConflictNoticeProps) => (
  <div
    className="absolute left-1/2 top-4 z-30 w-[min(34rem,calc(100%-2rem))] -translate-x-1/2 rounded-lg border border-warning/50 bg-surface p-4 text-sm shadow-lg"
    role="alert"
    data-testid="canvas-conflict-notice"
    data-remote-revision={remoteRevision}
  >
    <p className="font-semibold text-main">
      Changes conflict with another window
    </p>
    <p className="mt-1 text-secondary">
      A newer version was saved elsewhere. Your unsaved changes are still
      visible here and have not been saved.
    </p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        className="rounded border border-base bg-surface-raised px-3 py-1.5 text-main hover:bg-hover disabled:opacity-50"
        disabled={isResolving}
        onClick={onReload}
        data-testid="canvas-conflict-reload"
      >
        Discard mine and reload
      </button>
      <button
        type="button"
        className="rounded bg-primary px-3 py-1.5 text-white hover:bg-primary-hover disabled:opacity-50"
        disabled={isResolving}
        onClick={onTakeOver}
        data-testid="canvas-conflict-take-over"
      >
        Save mine over newer changes
      </button>
    </div>
  </div>
);
