import { Component, type ErrorInfo, type ReactNode } from "react";

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  onClose: () => void;
  onReload: () => void;
}

interface CanvasErrorBoundaryState {
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Canvas renderer failed:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="flex h-full items-center justify-center bg-canvas p-6 text-main"
        role="alert"
        data-testid="canvas-render-error"
      >
        <div className="max-w-md rounded border border-danger/40 bg-surface p-5 text-center shadow">
          <h2 className="font-semibold text-danger">
            This Canvas could not be displayed
          </h2>
          <p className="mt-2 text-sm text-secondary">
            Your local Canvas data is still stored. Reload the app to retry the
            Canvas code, or close this tab and continue working elsewhere.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              className="rounded bg-primary px-3 py-2 text-xs font-medium text-white"
              data-testid="canvas-render-reload"
              onClick={this.props.onReload}
            >
              Reload app
            </button>
            <button
              type="button"
              className="rounded border border-base px-3 py-2 text-xs font-medium"
              onClick={this.props.onClose}
            >
              Close Canvas
            </button>
          </div>
        </div>
      </div>
    );
  }
}
