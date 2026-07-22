import type { CanvasViewport } from "../types";
import type { CanvasPoint } from "./canvasItemFactory";

export interface CanvasPaneBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const screenPointToCanvasPoint = (
  point: CanvasPoint,
  pane: Pick<CanvasPaneBounds, "left" | "top">,
  viewport: CanvasViewport,
): CanvasPoint => ({
  x: (point.x - pane.left - viewport.x) / viewport.zoom,
  y: (point.y - pane.top - viewport.y) / viewport.zoom,
});

export const getCanvasViewportCenter = (
  pane: CanvasPaneBounds,
  viewport: CanvasViewport,
): CanvasPoint =>
  screenPointToCanvasPoint(
    {
      x: pane.left + pane.width / 2,
      y: pane.top + pane.height / 2,
    },
    pane,
    viewport,
  );
