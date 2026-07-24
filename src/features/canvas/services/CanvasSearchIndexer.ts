import type { CanvasItem, CanvasItemType } from "../types";

export interface CanvasSearchEntry {
  itemId: string;
  itemType: CanvasItemType;
  itemLabel: string;
  language: string;
  text: string;
}

const ITEM_LABELS: Record<CanvasItemType, string> = {
  text: "Text card",
  code: "Code card",
  image: "Image card",
  link: "Link card",
  video: "Video card",
};

export const normalizeCanvasSearchField = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim();

const uniqueSearchFields = (
  fields: Array<string | undefined>,
): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const field of fields) {
    if (!field) continue;
    const value = normalizeCanvasSearchField(field);
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    normalized.push(value);
  }
  return normalized;
};

const getItemFields = (item: CanvasItem): string[] => {
  switch (item.type) {
    case "text":
      return uniqueSearchFields([item.text]);
    case "code":
      return uniqueSearchFields([item.source]);
    case "image":
      return uniqueSearchFields([item.originalName, item.altText]);
    case "link":
      return uniqueSearchFields([
        item.canonicalUrl,
        item.hostname,
        item.metadata?.title,
        item.metadata?.description,
        item.metadata?.siteName,
      ]);
    case "video":
      return uniqueSearchFields([
        item.canonicalUrl,
        item.hostname,
        item.provider,
        item.title,
      ]);
  }
};

export const getCanvasSearchEntries = (
  items: readonly CanvasItem[],
): CanvasSearchEntry[] =>
  items.flatMap((item) => {
    const fields = getItemFields(item);
    if (fields.length === 0) return [];
    return [
      {
        itemId: item.id,
        itemType: item.type,
        itemLabel: ITEM_LABELS[item.type],
        language: item.type === "code" ? item.language : "plaintext",
        text: fields.join("\n"),
      },
    ];
  });

export const buildCanvasSearchText = (
  items: readonly CanvasItem[],
): string => getCanvasSearchEntries(items).map((entry) => entry.text).join("\n");

interface PendingIndex {
  items: CanvasItem[];
  apply: (searchText: string) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class CanvasSearchIndexer {
  private readonly pending = new Map<string, PendingIndex>();

  constructor(private readonly debounceMs = 150) {}

  schedule(
    tabId: string,
    items: readonly CanvasItem[],
    apply: (searchText: string) => void,
  ): void {
    this.cancel(tabId);
    const copiedItems = items.map((item) => ({ ...item }));
    const timer = setTimeout(() => {
      this.pending.delete(tabId);
      apply(buildCanvasSearchText(copiedItems));
    }, this.debounceMs);
    this.pending.set(tabId, { items: copiedItems, apply, timer });
  }

  flush(tabId: string): void {
    const pending = this.pending.get(tabId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(tabId);
    pending.apply(buildCanvasSearchText(pending.items));
  }

  cancel(tabId: string): void {
    const pending = this.pending.get(tabId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(tabId);
  }
}

export const canvasSearchIndexer = new CanvasSearchIndexer();
