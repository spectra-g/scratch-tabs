import { CANVAS_CLIPBOARD_VERSION } from "../constants";
import type { CanvasItem } from "../types";
import { parseCanvasItem } from "./canvasSchemas";

export interface CanvasClipboardPayload {
  version: number;
  sourceWorkspaceId: string;
  items: CanvasItem[];
}

const MAX_CLIPBOARD_ITEMS = 1_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const createCanvasClipboardPayload = (
  items: readonly CanvasItem[],
  sourceWorkspaceId: string,
): CanvasClipboardPayload => {
  const left = Math.min(...items.map((item) => item.x));
  const top = Math.min(...items.map((item) => item.y));
  return {
    version: CANVAS_CLIPBOARD_VERSION,
    sourceWorkspaceId,
    items: items.map((item) => ({
      ...item,
      x: item.x - left,
      y: item.y - top,
    })),
  };
};

export const serializeCanvasClipboard = (
  items: readonly CanvasItem[],
  sourceWorkspaceId: string,
): string =>
  JSON.stringify(createCanvasClipboardPayload(items, sourceWorkspaceId));

export const parseCanvasClipboard = (
  serialized: string,
): CanvasClipboardPayload | null => {
  try {
    const value: unknown = JSON.parse(serialized);
    if (
      !isRecord(value) ||
      value.version !== CANVAS_CLIPBOARD_VERSION ||
      typeof value.sourceWorkspaceId !== "string" ||
      !value.sourceWorkspaceId ||
      !Array.isArray(value.items) ||
      value.items.length === 0 ||
      value.items.length > MAX_CLIPBOARD_ITEMS
    ) {
      return null;
    }
    const items = value.items.map(parseCanvasItem);
    if (new Set(items.map((item) => item.id)).size !== items.length)
      return null;
    return {
      version: CANVAS_CLIPBOARD_VERSION,
      sourceWorkspaceId: value.sourceWorkspaceId,
      items,
    };
  } catch {
    return null;
  }
};

export const getCanvasClipboardPlainText = (
  items: readonly CanvasItem[],
): string =>
  items
    .map((item) => {
      switch (item.type) {
        case "text":
          return item.text;
        case "code":
          return item.source;
        case "image":
          return item.altText ? `[Image: ${item.altText}]` : "[Image]";
        case "link":
        case "video":
          return item.canonicalUrl;
      }
    })
    .join("\n\n");
