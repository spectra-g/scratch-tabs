import type { CanvasViewport } from "../types";
import type { CanvasPoint } from "./canvasItemFactory";

interface CanvasDocumentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const getCombinedCanvasBounds = (
  bounds: CanvasDocumentBounds[],
): CanvasDocumentBounds | null => {
  if (bounds.length === 0) return null;
  const left = Math.min(...bounds.map((item) => item.x));
  const top = Math.min(...bounds.map((item) => item.y));
  const right = Math.max(...bounds.map((item) => item.x + item.width));
  const bottom = Math.max(...bounds.map((item) => item.y + item.height));
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
};

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

/** Returns the smallest pan needed to fully reveal an item at the current zoom. */
export const getViewportToRevealCanvasBounds = (
  item: CanvasDocumentBounds,
  pane: Pick<CanvasPaneBounds, "width" | "height">,
  viewport: CanvasViewport,
  padding = 32,
): CanvasViewport => {
  const availableWidth = Math.max(0, pane.width - padding * 2);
  const availableHeight = Math.max(0, pane.height - padding * 2);
  const itemScreenWidth = item.width * viewport.zoom;
  const itemScreenHeight = item.height * viewport.zoom;
  const left = item.x * viewport.zoom + viewport.x;
  const top = item.y * viewport.zoom + viewport.y;
  const right = left + itemScreenWidth;
  const bottom = top + itemScreenHeight;
  let x = viewport.x;
  let y = viewport.y;

  if (itemScreenWidth > availableWidth) {
    x += padding - left;
  } else if (left < padding) {
    x += padding - left;
  } else if (right > pane.width - padding) {
    x -= right - (pane.width - padding);
  }

  if (itemScreenHeight > availableHeight) {
    y += padding - top;
  } else if (top < padding) {
    y += padding - top;
  } else if (bottom > pane.height - padding) {
    y -= bottom - (pane.height - padding);
  }

  return { x, y, zoom: viewport.zoom };
};
