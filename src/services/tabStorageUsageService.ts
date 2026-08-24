import { db } from "../db";
import type { TabContentKind } from "../types";

export interface TabStorageUsage {
  tabId: string;
  workspaceId: string;
  title: string;
  kind: TabContentKind;
  language: string;
  bytes: number;
  lineCount?: number;
  cardCount?: number;
  imageCount?: number;
}

/**
 * The quota the browser reports for this origin. Only used as the denominator
 * for the live-data usage bar; browser-reported usage is deliberately not
 * surfaced because it counts un-compacted disk space and is confusing.
 */
export const getStorageQuotaBytes = async (): Promise<number | null> => {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    return typeof estimate.quota === "number" ? estimate.quota : null;
  } catch {
    return null;
  }
};

const encoder = new TextEncoder();

const utf8ByteLength = (value: string | undefined): number =>
  value ? encoder.encode(value).length : 0;

const countLines = (value: string): number => {
  if (!value) return 0;
  let lines = 1;
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) === 10) lines++;
  }
  return lines;
};

const deriveKind = (record: {
  isRich?: boolean;
  isTablet?: boolean;
  contentKind?: TabContentKind;
}): TabContentKind => {
  if (record.contentKind) return record.contentKind;
  if (record.isTablet) return "tablet";
  if (record.isRich) return "rich-text";
  return "text";
};

interface CanvasUsage {
  cardCount: number;
  imageCount: number;
  assetBytes: number;
}

const measureCanvasDocuments = async (
  documentIdsByTabId: Map<string, string[]>,
): Promise<Map<string, CanvasUsage>> => {
  const usageByTabId = new Map<string, CanvasUsage>();
  if (documentIdsByTabId.size === 0) return usageByTabId;

  const documents = await db.canvasDocuments.toArray();
  const documentById = new Map(documents.map((doc) => [doc.id, doc]));
  const referencedAssetIds = new Set<string>();

  for (const [tabId, documentIds] of documentIdsByTabId) {
    const items = documentIds.flatMap(
      (documentId) => documentById.get(documentId)?.items ?? [],
    );
    items
      .filter((item) => item.type === "image")
      .forEach((item) => {
        if ("assetId" in item && item.assetId) {
          referencedAssetIds.add(item.assetId);
        }
      });
    usageByTabId.set(tabId, {
      cardCount: items.length,
      imageCount: items.filter((item) => item.type === "image").length,
      assetBytes: 0,
    });
  }

  if (referencedAssetIds.size > 0) {
    const assets = await db.canvasAssets
      .where("id")
      .anyOf(Array.from(referencedAssetIds))
      .toArray();
    const bytesByAssetId = new Map(
      assets.map((asset) => [asset.id, asset.byteLength ?? 0]),
    );
    for (const [tabId] of usageByTabId) {
      const documentIds = documentIdsByTabId.get(tabId) ?? [];
      const assetIds = documentIds.flatMap((documentId) =>
        (documentById.get(documentId)?.items ?? [])
          .filter((item) => item.type === "image")
          .map((item) => ("assetId" in item ? item.assetId : undefined))
          .filter((assetId): assetId is string => Boolean(assetId)),
      );
      const usage = usageByTabId.get(tabId)!;
      usage.assetBytes = assetIds.reduce(
        (total, assetId) => total + (bytesByAssetId.get(assetId) ?? 0),
        0,
      );
    }
  }

  return usageByTabId;
};

/**
 * Estimates the IndexedDB footprint of every tab without hydrating any
 * editor. Records are visited one at a time via a cursor so large document
 * strings are never held in memory together; canvas asset sizes are read
 * from the precomputed `byteLength` field instead of decoding blobs.
 */
export const estimateTabStorageUsage = async (): Promise<
  TabStorageUsage[]
> => {
  const usagesByTabId = new Map<string, TabStorageUsage>();
  const documentIdsByTabId = new Map<string, string[]>();

  await db.tabs.each((record) => {
    const kind = deriveKind(record);
    const contentBytes =
      utf8ByteLength(record.content) +
      utf8ByteLength(record.richContent) +
      utf8ByteLength(record.tabletState);

    if (kind === "canvas") {
      const documentIds = record.documentId ? [record.documentId] : [];
      if (documentIds.length > 0) {
        documentIdsByTabId.set(record.id, documentIds);
      }
    }

    usagesByTabId.set(record.id, {
      tabId: record.id,
      workspaceId: record.workspaceId,
      title: record.title,
      kind,
      language: record.language || "plaintext",
      bytes: contentBytes,
      ...(kind === "text" || kind === "rich-text"
        ? { lineCount: countLines(record.content ?? "") }
        : {}),
    });
  });

  const canvasUsage = await measureCanvasDocuments(documentIdsByTabId);
  for (const [tabId, usage] of canvasUsage) {
    const entry = usagesByTabId.get(tabId);
    if (!entry) continue;
    entry.bytes += usage.assetBytes;
    entry.cardCount = usage.cardCount;
    entry.imageCount = usage.imageCount;
  }

  return Array.from(usagesByTabId.values()).sort((a, b) => b.bytes - a.bytes);
};
