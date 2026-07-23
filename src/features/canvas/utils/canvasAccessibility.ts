import type { CanvasItem } from "../types";

export const getCanvasItemAccessibleLabel = (item: CanvasItem): string => {
  if (item.type === "image") {
    const summary = item.altText.trim().replace(/\s+/g, " ").slice(0, 80);
    return `Image${summary ? `, ${summary}` : ""}`;
  }
  if (item.type === "link") {
    return `Link card, ${item.hostname}`;
  }
  if (item.type === "video") {
    const provider = item.provider === "youtube" ? "YouTube" : "Vimeo";
    return `${provider} video card, ${item.videoId}`;
  }
  const content = item.type === "code" ? item.source : item.text;
  const summary = content.trim().replace(/\s+/g, " ").slice(0, 80);
  if (item.type === "code") {
    const type = item.language === "json" ? "JSON" : item.language;
    return `${type} code card${summary ? `, ${summary}` : ""}`;
  }
  return `Text card${summary ? `, ${summary}` : ""}`;
};
