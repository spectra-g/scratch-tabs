import { ContentType } from '../types';

export const detectContentType = (content: string): ContentType => {
  if (content.startsWith("data:image/")) return "image";
  if (content.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)) return "color";
  try {
    new URL(content);
    if (content.includes("://")) return "link";
  } catch {
    // Not a URL
  }
  return "text";
};

export const generateTitle = (content: string, type: ContentType): string => {
  switch (type) {
    case "image":
      return `Image - ${new Date().toLocaleString()}`;
    case "link":
      try {
        const url = new URL(content);
        return url.hostname;
      } catch {
        return "Link";
      }
    case "color":
      return `Color - ${content}`;
    case "text":
      return content.split("\n")[0].substring(0, 50).trim() || "Text Snippet";
    default:
      return "Clipboard Item";
  }
};

export const formatDuration = (ms: number): string => {
  if (ms < 0) return "Expired";
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60));
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_CHECK_INTERVAL_MS = 1000;