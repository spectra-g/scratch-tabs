import type { Tab } from "../../../types";
import {
  CANVAS_DOCUMENT_SAVE_DEBOUNCE_MS,
  CANVAS_TAB_MODIFIED_THROTTLE_MS,
} from "../constants";
import type {
  ActiveCanvasDocument,
  CanvasDocument,
  CanvasDocumentSaveState,
  CanvasAssetRecord,
  CanvasImageItem,
  CanvasItem,
  CanvasViewport,
} from "../types";
import { createDefaultCanvasSession } from "../utils/canvasSchemas";
import {
  canvasDocumentRepository,
  type CanvasDocumentRepositoryContract,
} from "./CanvasDocumentRepository";
import {
  canvasImagePersistenceRepository,
  type CanvasImagePersistenceRepositoryContract,
} from "./CanvasImagePersistenceRepository";

interface DocumentSaveQueue {
  dirtyVersion: number;
  savedVersion: number;
  timer?: ReturnType<typeof setTimeout>;
  savePromise?: Promise<void>;
  lastParentTabUpdate: number | null;
}

type SaveStateListener = (state: CanvasDocumentSaveState) => void;

export class CanvasDocumentManager {
  private readonly activeDocuments = new Map<string, ActiveCanvasDocument>();
  private readonly loadingDocuments = new Map<
    string,
    Promise<ActiveCanvasDocument>
  >();
  private readonly documentSaveQueues = new Map<string, DocumentSaveQueue>();
  private readonly pendingSessionSaves = new Map<string, Promise<void>>();
  private readonly referenceCounts = new Map<string, number>();
  private readonly saveStateListeners = new Map<
    string,
    Set<SaveStateListener>
  >();

  constructor(
    private readonly repository: CanvasDocumentRepositoryContract = canvasDocumentRepository,
    private readonly now: () => number = Date.now,
    private readonly imagePersistence: CanvasImagePersistenceRepositoryContract = canvasImagePersistenceRepository,
  ) {}

  async create(tab: Tab): Promise<CanvasDocument> {
    return this.repository.createWithTab(tab);
  }

  subscribe(tabId: string, listener: SaveStateListener): () => void {
    const listeners = this.saveStateListeners.get(tabId) ?? new Set();
    listeners.add(listener);
    this.saveStateListeners.set(tabId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.saveStateListeners.delete(tabId);
    };
  }

  async acquire(
    tab: Pick<Tab, "id" | "documentId" | "workspaceId">,
  ): Promise<ActiveCanvasDocument> {
    this.referenceCounts.set(
      tab.id,
      (this.referenceCounts.get(tab.id) ?? 0) + 1,
    );

    const active = this.activeDocuments.get(tab.id);
    if (active) return active;

    const pending = this.loadingDocuments.get(tab.id);
    if (pending) return pending;

    const loadPromise = this.load(tab);
    this.loadingDocuments.set(tab.id, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.loadingDocuments.delete(tab.id);
    }
  }

  private async load(
    tab: Pick<Tab, "id" | "documentId" | "workspaceId">,
  ): Promise<ActiveCanvasDocument> {
    const document = await this.repository.getByTabId(tab.id);
    if (!document) {
      throw new Error(`Canvas document not found for tab ${tab.id}`);
    }
    if (
      document.id !== tab.documentId ||
      document.workspaceId !== tab.workspaceId
    ) {
      throw new Error(`Canvas document metadata does not match tab ${tab.id}`);
    }

    const session =
      (await this.repository.getSession(tab.id)) ??
      createDefaultCanvasSession(tab.id, this.now());
    const active = { document, session };
    this.activeDocuments.set(tab.id, active);
    this.documentSaveQueues.set(tab.id, {
      dirtyVersion: 0,
      savedVersion: 0,
      lastParentTabUpdate: document.revision === 0 ? null : document.updatedAt,
    });
    return active;
  }

  setItems(tabId: string, items: CanvasItem[]): CanvasDocument {
    const active = this.requireActive(tabId);
    const updatedAt = this.now();
    active.document = {
      ...active.document,
      items: items.map((item) => ({ ...item })),
      updatedAt,
    };
    this.markDocumentDirty(tabId);
    return active.document;
  }

  async addImage(
    tabId: string,
    item: CanvasImageItem,
    asset: CanvasAssetRecord,
  ): Promise<CanvasDocument> {
    return this.persistImageMutation(tabId, asset, (items) => [...items, item]);
  }

  async replaceImage(
    tabId: string,
    itemId: string,
    asset: CanvasAssetRecord,
  ): Promise<CanvasDocument> {
    const updatedAt = this.now();
    return this.persistImageMutation(tabId, asset, (items) => {
      let found = false;
      const nextItems = items.map((item) => {
        if (item.id !== itemId || item.type !== "image") return item;
        found = true;
        return {
          ...item,
          assetId: asset.id,
          updatedAt,
        };
      });
      if (!found) throw new Error("Canvas image card not found");
      return nextItems;
    });
  }

  private async persistImageMutation(
    tabId: string,
    asset: CanvasAssetRecord,
    updateItems: (items: CanvasItem[]) => CanvasItem[],
  ): Promise<CanvasDocument> {
    await this.flush(tabId);
    const active = this.requireActive(tabId);
    const queue = this.documentSaveQueues.get(tabId);
    if (!queue) throw new Error(`Canvas save queue ${tabId} is not active`);

    const savedAt = this.now();
    const documentToSave: CanvasDocument = {
      ...active.document,
      items: updateItems(active.document.items).map((item) => ({ ...item })),
      edges: active.document.edges.map((edge) => ({ ...edge })),
      settings: { ...active.document.settings },
      revision: active.document.revision + 1,
      updatedAt: savedAt,
    };
    this.notify(tabId, {
      status: "saving",
      revision: active.document.revision,
    });

    const savePromise = this.imagePersistence.saveDocumentWithAsset(
      documentToSave,
      asset,
    );
    queue.savePromise = savePromise;
    try {
      await savePromise;
      active.document = {
        ...active.document,
        items: updateItems(active.document.items).map((item) => ({ ...item })),
        revision: documentToSave.revision,
        updatedAt: Math.max(active.document.updatedAt, savedAt),
      };
      queue.lastParentTabUpdate = savedAt;
      const hasPendingChanges = queue.dirtyVersion > queue.savedVersion;
      this.notify(tabId, {
        status: hasPendingChanges ? "saving" : "saved",
        revision: documentToSave.revision,
        lastModified: savedAt,
      });
      return active.document;
    } catch (error) {
      this.notify(tabId, {
        status: "error",
        revision: active.document.revision,
        error:
          error instanceof Error
            ? error.message
            : "Unable to save this Canvas image",
      });
      throw error;
    } finally {
      if (queue.savePromise === savePromise) queue.savePromise = undefined;
      if (queue.dirtyVersion > queue.savedVersion && !queue.timer) {
        queue.timer = setTimeout(() => {
          queue.timer = undefined;
          void this.persistLatestDocument(tabId).catch(() => undefined);
        }, CANVAS_DOCUMENT_SAVE_DEBOUNCE_MS);
      }
    }
  }

  private requireActive(tabId: string): ActiveCanvasDocument {
    const active = this.activeDocuments.get(tabId);
    if (!active) {
      throw new Error(`Canvas document ${tabId} is not active`);
    }
    return active;
  }

  private markDocumentDirty(tabId: string): void {
    const queue = this.documentSaveQueues.get(tabId);
    const active = this.requireActive(tabId);
    if (!queue) throw new Error(`Canvas save queue ${tabId} is not active`);

    queue.dirtyVersion += 1;
    if (queue.timer) clearTimeout(queue.timer);
    queue.timer = setTimeout(() => {
      queue.timer = undefined;
      void this.persistLatestDocument(tabId).catch(() => undefined);
    }, CANVAS_DOCUMENT_SAVE_DEBOUNCE_MS);
    this.notify(tabId, {
      status: "saving",
      revision: active.document.revision,
    });
  }

  private async persistLatestDocument(tabId: string): Promise<void> {
    const queue = this.documentSaveQueues.get(tabId);
    const active = this.activeDocuments.get(tabId);
    if (!queue || !active || queue.dirtyVersion === queue.savedVersion) return;
    if (queue.savePromise) return queue.savePromise;

    const versionBeingSaved = queue.dirtyVersion;
    const savedAt = this.now();
    const documentToSave: CanvasDocument = {
      ...active.document,
      items: active.document.items.map((item) => ({ ...item })),
      edges: active.document.edges.map((edge) => ({ ...edge })),
      settings: { ...active.document.settings },
      revision: active.document.revision + 1,
      updatedAt: savedAt,
    };
    const updateParentTab =
      queue.lastParentTabUpdate === null ||
      savedAt - queue.lastParentTabUpdate >= CANVAS_TAB_MODIFIED_THROTTLE_MS;

    const savePromise = this.repository
      .saveDocument(documentToSave, updateParentTab)
      .then(() => {
        const latest = this.activeDocuments.get(tabId);
        if (!latest) return;
        latest.document = {
          ...latest.document,
          revision: documentToSave.revision,
          updatedAt: Math.max(latest.document.updatedAt, savedAt),
        };
        queue.savedVersion = versionBeingSaved;
        if (updateParentTab) queue.lastParentTabUpdate = savedAt;
        const hasPendingChanges = queue.dirtyVersion > versionBeingSaved;
        this.notify(tabId, {
          status: hasPendingChanges ? "saving" : "saved",
          revision: latest.document.revision,
          ...(updateParentTab ? { lastModified: savedAt } : {}),
        });
      })
      .catch((error: unknown) => {
        this.notify(tabId, {
          status: "error",
          revision: active.document.revision,
          error:
            error instanceof Error
              ? error.message
              : "Unable to save this Canvas",
        });
        throw error;
      })
      .finally(() => {
        if (queue.savePromise === savePromise) queue.savePromise = undefined;
        if (queue.dirtyVersion > versionBeingSaved && !queue.timer) {
          queue.timer = setTimeout(() => {
            queue.timer = undefined;
            void this.persistLatestDocument(tabId).catch(() => undefined);
          }, CANVAS_DOCUMENT_SAVE_DEBOUNCE_MS);
        }
      });
    queue.savePromise = savePromise;
    return savePromise;
  }

  private notify(tabId: string, state: CanvasDocumentSaveState): void {
    this.saveStateListeners.get(tabId)?.forEach((listener) => listener(state));
  }

  async save(tabId: string): Promise<void> {
    await this.flush(tabId);
  }

  async hasContent(tabId: string): Promise<boolean> {
    const active = this.activeDocuments.get(tabId);
    if (active) return active.document.items.length > 0;

    const loading = this.loadingDocuments.get(tabId);
    if (loading) return (await loading).document.items.length > 0;

    return this.repository.hasContent(tabId);
  }

  async saveViewport(tabId: string, viewport: CanvasViewport): Promise<void> {
    const active = this.activeDocuments.get(tabId);
    if (!active) return;

    active.session = {
      ...active.session,
      viewport: { ...viewport },
      updatedAt: this.now(),
    };
    const sessionToSave = {
      ...active.session,
      viewport: { ...active.session.viewport },
    };

    const previousSave =
      this.pendingSessionSaves.get(tabId) ?? Promise.resolve();
    const nextSave = previousSave
      .catch(() => undefined)
      .then(() => this.repository.saveSession(sessionToSave));
    this.pendingSessionSaves.set(tabId, nextSave);

    try {
      await nextSave;
    } finally {
      if (this.pendingSessionSaves.get(tabId) === nextSave) {
        this.pendingSessionSaves.delete(tabId);
      }
    }
  }

  async flush(tabId: string): Promise<void> {
    const queue = this.documentSaveQueues.get(tabId);
    if (queue?.timer) {
      clearTimeout(queue.timer);
      queue.timer = undefined;
    }
    await queue?.savePromise;
    while (queue && queue.dirtyVersion > queue.savedVersion) {
      await queue.savePromise;
      await this.persistLatestDocument(tabId);
      if (queue.timer) {
        clearTimeout(queue.timer);
        queue.timer = undefined;
      }
    }
    await this.pendingSessionSaves.get(tabId);
  }

  async flushAll(): Promise<void> {
    await Promise.all(
      Array.from(this.activeDocuments.keys(), (tabId) => this.flush(tabId)),
    );
  }

  async release(tabId: string): Promise<void> {
    const nextCount = Math.max((this.referenceCounts.get(tabId) ?? 1) - 1, 0);
    if (nextCount > 0) {
      this.referenceCounts.set(tabId, nextCount);
      return;
    }

    this.referenceCounts.delete(tabId);
    await this.loadingDocuments.get(tabId);
    if ((this.referenceCounts.get(tabId) ?? 0) > 0) return;
    await this.flush(tabId);
    this.activeDocuments.delete(tabId);
    this.documentSaveQueues.delete(tabId);
  }

  async dispose(tabId: string): Promise<void> {
    this.referenceCounts.delete(tabId);
    await this.loadingDocuments.get(tabId);
    await this.flush(tabId);
    this.activeDocuments.delete(tabId);
    this.documentSaveQueues.delete(tabId);
  }

  async remove(tab: Tab): Promise<void> {
    await this.dispose(tab.id);
    await this.repository.removeWithTab(tab);
  }
}

export const canvasDocumentManager = new CanvasDocumentManager();
