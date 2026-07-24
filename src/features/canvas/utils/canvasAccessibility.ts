import type { CanvasItem } from "../types";

const summarize = (value: string | undefined): string =>
  value?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "";

export const getCanvasItemAccessibleLabel = (item: CanvasItem): string => {
  if (item.type === "image") {
    const summary = summarize(item.altText) || summarize(item.originalName);
    return `Image${summary ? `, ${summary}` : ""}`;
  }
  if (item.type === "link") {
    const title = summarize(item.metadata?.title);
    return `Link card, ${title ? `${title}, ` : ""}${item.hostname}`;
  }
  if (item.type === "video") {
    const provider = item.provider === "youtube" ? "YouTube" : "Vimeo";
    const title = summarize(item.title);
    return `${provider} video card, ${title || item.videoId}`;
  }
  const content = item.type === "code" ? item.source : item.text;
  const summary = summarize(content);
  if (item.type === "code") {
    const type = item.language === "json" ? "JSON" : item.language;
    return `${type} code card${summary ? `, ${summary}` : ""}`;
  }
  return `Text card${summary ? `, ${summary}` : ""}`;
};
