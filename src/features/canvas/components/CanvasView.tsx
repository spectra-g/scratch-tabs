import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Tab } from "../../../types";
import { useCanvasDocument } from "../hooks/useCanvasDocument";
import "./canvas.css";

interface CanvasViewProps {
  tab: Tab;
}

const CanvasView = ({ tab }: CanvasViewProps) => {
  const { activeDocument, status, error, saveViewport } =
    useCanvasDocument(tab);

  if (status === "error" || error) {
    return (
      <div
        className="flex h-full items-center justify-center bg-canvas p-6 text-danger"
        role="alert"
        data-testid="canvas-load-error"
      >
        <div className="max-w-md rounded border border-danger/40 bg-surface p-4 text-center">
          <p className="font-semibold">This Canvas could not be opened.</p>
          <p className="mt-1 text-sm text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (!activeDocument) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">
        Loading Canvas...
      </div>
    );
  }

  const backgroundVariant =
    activeDocument.document.settings.background === "grid"
      ? BackgroundVariant.Lines
      : BackgroundVariant.Dots;

  return (
    <div
      className="canvas-flow-root h-full w-full bg-canvas text-main"
      data-testid="canvas-flow"
      data-canvas-document-id={activeDocument.document.id}
      tabIndex={0}
      role="application"
      aria-label={`${tab.title} Canvas`}
    >
      <ReactFlow
        nodes={[]}
        edges={[]}
        defaultViewport={activeDocument.session.viewport}
        minZoom={0.1}
        maxZoom={4}
        panOnDrag
        zoomOnPinch
        zoomOnScroll
        zoomOnDoubleClick={false}
        onMoveEnd={(_event, viewport: Viewport) => {
          void saveViewport(viewport);
        }}
      >
        {activeDocument.document.settings.background !== "none" && (
          <Background
            variant={backgroundVariant}
            color="rgb(var(--color-border-base))"
            gap={20}
            size={1.5}
          />
        )}
        <Controls position="bottom-right" showInteractive={false} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg border border-base bg-surface/90 px-5 py-4 text-center shadow-sm backdrop-blur-sm">
            <p className="font-medium text-main">Empty Canvas</p>
            <p className="mt-1 text-xs text-muted">
              Pan by dragging and use the controls to zoom.
            </p>
          </div>
        </div>
        <div
          className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-base bg-surface/90 px-2.5 py-1 text-xs text-secondary shadow-sm backdrop-blur-sm"
          data-testid="canvas-save-status"
          data-save-state={status}
          aria-live="polite"
        >
          Local only · {status === "saving" ? "Saving..." : "Saved"}
        </div>
      </ReactFlow>
    </div>
  );
};

export default CanvasView;
