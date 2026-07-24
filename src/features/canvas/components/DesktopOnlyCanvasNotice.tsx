import { Monitor } from "../../../components/Icons";

interface DesktopOnlyCanvasNoticeProps {
  onClose: () => void;
  onReturnToTabs?: () => void;
}

export const DesktopOnlyCanvasNotice = ({
  onClose,
  onReturnToTabs,
}: DesktopOnlyCanvasNoticeProps) => (
  <div
    className="flex h-full items-center justify-center bg-canvas p-6 text-main"
    data-testid="canvas-desktop-only-notice"
  >
    <div className="max-w-md rounded-xl border border-base bg-surface p-6 text-center shadow-lg">
      <Monitor className="mx-auto mb-3 text-secondary" size={32} />
      <h2 className="text-lg font-semibold">
        Canvas editing is currently available on desktop
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Use a wider window or pane to pan, zoom, and edit this Canvas.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        {onReturnToTabs && (
          <button
            type="button"
            className="rounded border border-base bg-element px-3 py-1.5 text-sm hover:bg-element-hover"
            onClick={onReturnToTabs}
          >
            Back to tabs
          </button>
        )}
        <button
          type="button"
          className="rounded bg-danger px-3 py-1.5 text-sm text-white hover:bg-danger/90"
          onClick={onClose}
        >
          Close Canvas
        </button>
      </div>
    </div>
  </div>
);
