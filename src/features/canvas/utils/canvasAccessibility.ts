import type { CanvasItem } from "../types";

export const getCanvasItemAccessibleLabel = (item: CanvasItem): string => {
  const content = item.type === "code" ? item.source : item.text;
  const summary = content.trim().replace(/\s+/g, " ").slice(0, 80);
  if (item.type === "code") {
    const type = item.language === "json" ? "JSON" : item.language;
    return `${type} code card${summary ? `, ${summary}` : ""}`;
  }
  return `Text card${summary ? `, ${summary}` : ""}`;
};
