import { db } from "../../../db";
import type { Tab } from "../../../types";
import { getTabContentKind } from "../../../utils/tabContentKind";
import type { CanvasDocument } from "../types";
import {
  collectCanvasAssetIds,
  collectDocumentAssetIds,
  copyCanvasAsset,
  remapCanvasAssetIds,
} from "../utils/canvasAssetReferences";
import { parseCanvasDocument } from "../utils/canvasSchemas";
import { parseCanvasAssetRecord } from "./CanvasAssetRepository";

export interface CanvasMoveResult {
  document: CanvasDocument;
  sourceAssetIds: string[];
}

export interface CanvasDocumentLifecycleRepositoryContract {
  duplicate(tab: Tab, duplicate: Tab, now: number): Promise<CanvasDocument>;
  remove(tab: Tab): Promise<string[]>;
  move(tab: Tab, movedTab: Tab, now: number): Promise<CanvasMoveResult>;
  garbageCollect(
    workspaceId: string,
    candidateAssetIds: readonly string[],
  ): Promise<string[]>;
}

const toPersistedCanvasTab = (tab: Tab) => ({
  id: tab.id,
  title: tab.title,
  content: "",
  language: tab.language,
  languageLocked: tab.languageLocked,
  isTablet: false,
  isRich: false,
  contentKind: tab.contentKind,
  documentId: tab.documentId,
  lastModified: tab.lastModified,
  lastAccessed: tab.lastAccessed,
  dateCreated: tab.dateCreated,
  workspaceId: tab.workspaceId,
  cursorPosition: tab.cursorPosition,
  isPinned: tab.isPinned,
});

const assertCanvasTab = (tab: Tab): void => {
  if (getTabContentKind(tab) !== "canvas" || !tab.documentId) {
    throw new Error("Canvas lifecycle requires a Canvas tab");
  }
};

const assertDocumentOwnership = (document: CanvasDocument, tab: Tab): void => {
  if (
    document.id !== tab.documentId ||
    document.tabId !== tab.id ||
    document.workspaceId !== tab.workspaceId
  ) {
    throw new Error(`Canvas document metadata does not match tab ${tab.id}`);
  }
};

export const cloneCanvasDocument = (
  source: CanvasDocument,
  duplicate: Tab,
  now: number,
): CanvasDocument => {
  if (!duplicate.documentId) {
    throw new Error("Duplicated Canvas tab is missing a document ID");
  }
  return parseCanvasDocument({
    ...source,
    id: duplicate.documentId,
    tabId: duplicate.id,
    workspaceId: duplicate.workspaceId,
    revision: 0,
    items: source.items.map((item) => ({ ...item })),
    edges: source.edges.map((edge) => ({ ...edge })),
    settings: { ...source.settings },
    createdAt: now,
    updatedAt: now,
  });
};

export class CanvasDocumentLifecycleRepository implements CanvasDocumentLifecycleRepositoryContract {
  constructor(
    private readonly createId: () => string = () => crypto.randomUUID(),
  ) {}

  async duplicate(
    tab: Tab,
    duplicate: Tab,
    now: number,
  ): Promise<CanvasDocument> {
    assertCanvasTab(tab);
    assertCanvasTab(duplicate);
    if (tab.workspaceId !== duplicate.workspaceId) {
      throw new Error("Canvas duplication must stay within one workspace");
    }

    return db.transaction("rw", db.tabs, db.canvasDocuments, async () => {
      const stored = await db.canvasDocuments.get(tab.documentId!);
      if (!stored)
        throw new Error(`Canvas document not found for tab ${tab.id}`);

      const source = parseCanvasDocument(stored);
      assertDocumentOwnership(source, tab);
      const document = cloneCanvasDocument(source, duplicate, now);
      await db.tabs.add(toPersistedCanvasTab(duplicate));
      await db.canvasDocuments.add(document);
      return document;
    });
  }

  async remove(tab: Tab): Promise<string[]> {
    assertCanvasTab(tab);

    return db.transaction(
      "rw",
      db.tabs,
      db.canvasDocuments,
      db.canvasSessions,
      async () => {
        const stored = await db.canvasDocuments.get(tab.documentId!);
        const document = stored ? parseCanvasDocument(stored) : undefined;
        if (document) assertDocumentOwnership(document, tab);
        const assetIds = document
          ? [...collectCanvasAssetIds(document.items)]
          : [];

        await db.tabs.delete(tab.id);
        await db.canvasDocuments.delete(tab.documentId!);
        await db.canvasSessions.delete(tab.id);
        return assetIds;
      },
    );
  }

  async move(tab: Tab, movedTab: Tab, now: number): Promise<CanvasMoveResult> {
    assertCanvasTab(tab);
    assertCanvasTab(movedTab);
    if (
      movedTab.id !== tab.id ||
      movedTab.documentId !== tab.documentId ||
      movedTab.workspaceId === tab.workspaceId
    ) {
      throw new Error("Invalid Canvas workspace move");
    }

    return db.transaction(
      "rw",
      db.tabs,
      db.canvasDocuments,
      db.canvasAssets,
      async () => {
        const stored = await db.canvasDocuments.get(tab.documentId!);
        if (!stored) {
          throw new Error(`Canvas document not found for tab ${tab.id}`);
        }
        const source = parseCanvasDocument(stored);
        assertDocumentOwnership(source, tab);

        const sourceAssetIds = [...collectCanvasAssetIds(source.items)];
        const storedAssets = await db.canvasAssets.bulkGet(sourceAssetIds);
        if (storedAssets.some((asset) => asset === undefined)) {
          throw new Error("Canvas move could not find every referenced asset");
        }

        const idMap = new Map(
          sourceAssetIds.map((assetId) => [assetId, this.createId()]),
        );
        const copiedAssets = storedAssets.map((asset) => {
          const parsed = parseCanvasAssetRecord(asset);
          if (parsed.workspaceId !== tab.workspaceId) {
            throw new Error("Canvas move found an asset in another workspace");
          }
          return copyCanvasAsset(
            parsed,
            idMap.get(parsed.id)!,
            movedTab.workspaceId,
            now,
          );
        });
        const document = parseCanvasDocument({
          ...source,
          workspaceId: movedTab.workspaceId,
          revision: source.revision + 1,
          items: remapCanvasAssetIds(source.items, idMap, now),
          edges: source.edges.map((edge) => ({ ...edge })),
          settings: { ...source.settings },
          updatedAt: now,
        });

        if (copiedAssets.length > 0) {
          await db.canvasAssets.bulkAdd(copiedAssets);
        }
        await db.canvasDocuments.put(document);
        await db.tabs.put(toPersistedCanvasTab(movedTab));
        return { document, sourceAssetIds };
      },
    );
  }

  async garbageCollect(
    workspaceId: string,
    candidateAssetIds: readonly string[],
  ): Promise<string[]> {
    const candidates = [...new Set(candidateAssetIds)];
    if (candidates.length === 0) return [];

    return db.transaction(
      "rw",
      db.canvasDocuments,
      db.canvasAssets,
      async () => {
        const storedDocuments = await db.canvasDocuments
          .where("workspaceId")
          .equals(workspaceId)
          .toArray();
        const referenced = collectDocumentAssetIds(
          storedDocuments.map(parseCanvasDocument),
        );
        const storedAssets = await db.canvasAssets.bulkGet(candidates);
        const orphanIds = storedAssets.flatMap((asset) => {
          if (!asset) return [];
          const parsed = parseCanvasAssetRecord(asset);
          return parsed.workspaceId === workspaceId &&
            !referenced.has(parsed.id)
            ? [parsed.id]
            : [];
        });
        if (orphanIds.length > 0) await db.canvasAssets.bulkDelete(orphanIds);
        return orphanIds;
      },
    );
  }
}

export const canvasDocumentLifecycleRepository =
  new CanvasDocumentLifecycleRepository();
