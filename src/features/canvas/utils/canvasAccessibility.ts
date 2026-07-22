import type { CanvasItem } from "../types";

export const getCanvasItemAccessibleLabel = (item: CanvasItem): string => {
  const summary = item.text.trim().replace(/\s+/g, " ").slice(0, 80);
  return `Text card${summary ? `, ${summary}` : ""}`;
};
