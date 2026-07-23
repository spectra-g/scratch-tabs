import {
  CANVAS_INGEST_GAP,
  CANVAS_INGEST_VIEWPORT_PADDING,
} from "../constants";
import type { CanvasItem, CanvasViewport } from "../types";
import type { CanvasPaneBounds } from "./canvasCoordinates";
import type { CanvasPoint } from "./canvasItemFactory";

export const layoutCanvasIngestItems = (
  items: readonly CanvasItem[],
  anchor: CanvasPoint,
): CanvasItem[] => {
  if (items.length === 0) return [];
  const columnCount = Math.ceil(Math.sqrt(items.length));
  const columnWidths = Array.from({ length: columnCount }, () => 0);
  const rowCount = Math.ceil(items.length / columnCount);
  const rowHeights = Array.from({ length: rowCount }, () => 0);

  items.forEach((item, index) => {
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    columnWidths[column] = Math.max(columnWidths[column], item.width);
    rowHeights[row] = Math.max(rowHeights[row], item.height);
  });

  const columnOffsets = columnWidths.map((_, index) =>
    columnWidths
      .slice(0, index)
      .reduce((total, width) => total + width + CANVAS_INGEST_GAP, 0),
  );
  const rowOffsets = rowHeights.map((_, index) =>
    rowHeights
      .slice(0, index)
      .reduce((total, height) => total + height + CANVAS_INGEST_GAP, 0),
  );

  return items.map((item, index) => ({
    ...item,
    x: anchor.x + columnOffsets[index % columnCount],
    y: anchor.y + rowOffsets[Math.floor(index / columnCount)],
  }));
};

export const keepCanvasIngestItemsInViewport = (
  items: readonly CanvasItem[],
  pane: Pick<CanvasPaneBounds, "width" | "height">,
  viewport: CanvasViewport,
  padding = CANVAS_INGEST_VIEWPORT_PADDING,
): CanvasItem[] => {
  if (items.length === 0) return [];
  const left = Math.min(...items.map((item) => item.x));
  const top = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.width));
  const bottom = Math.max(...items.map((item) => item.y + item.height));
  const visibleLeft = (padding - viewport.x) / viewport.zoom;
  const visibleTop = (padding - viewport.y) / viewport.zoom;
  const visibleRight = (pane.width - padding - viewport.x) / viewport.zoom;
  const visibleBottom = (pane.height - padding - viewport.y) / viewport.zoom;
  const width = right - left;
  const height = bottom - top;

  const targetLeft =
    width <= visibleRight - visibleLeft
      ? Math.min(Math.max(left, visibleLeft), visibleRight - width)
      : Math.max(left, visibleLeft);
  const targetTop =
    height <= visibleBottom - visibleTop
      ? Math.min(Math.max(top, visibleTop), visibleBottom - height)
      : Math.max(top, visibleTop);
  const deltaX = targetLeft - left;
  const deltaY = targetTop - top;

  return items.map((item) => ({
    ...item,
    x: item.x + deltaX,
    y: item.y + deltaY,
  }));
};
