import type { Tab } from "../../../types";
import type {
  ActiveCanvasDocument,
  CanvasDocument,
  CanvasViewport,
} from "../types";
import { createDefaultCanvasSession } from "../utils/canvasSchemas";
import {
  canvasDocumentRepository,
  type CanvasDocumentRepositoryContract,
} from "./CanvasDocumentRepository";

export class CanvasDocumentManager {
  private readonly activeDocuments = new Map<string, ActiveCanvasDocument>();
  private readonly loadingDocuments = new Map<
    string,
    Promise<ActiveCanvasDocument>
  >();
  private readonly pendingSaves = new Map<string, Promise<void>>();
  private readonly referenceCounts = new Map<string, number>();

  constructor(
    private readonly repository: CanvasDocumentRepositoryContract =
      canvasDocumentRepository,
  ) {}

  async create(tab: Tab): Promise<CanvasDocument> {
    return this.repository.createWithTab(tab);
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
      createDefaultCanvasSession(tab.id);
    const active = { document, session };
    this.activeDocuments.set(tab.id, active);
    return active;
  }

  async save(tabId: string): Promise<void> {
    const active = this.activeDocuments.get(tabId);
    if (!active) return;
    await this.repository.saveDocument(active.document);
  }

  async saveViewport(tabId: string, viewport: CanvasViewport): Promise<void> {
    const active = this.activeDocuments.get(tabId);
    if (!active) return;

    active.session = {
      ...active.session,
      viewport: { ...viewport },
      updatedAt: Date.now(),
    };
    const sessionToSave = {
      ...active.session,
      viewport: { ...active.session.viewport },
    };

    const previousSave = this.pendingSaves.get(tabId) ?? Promise.resolve();
    const nextSave = previousSave
      .catch(() => undefined)
      .then(() => this.repository.saveSession(sessionToSave));
    this.pendingSaves.set(tabId, nextSave);

    try {
      await nextSave;
    } finally {
      if (this.pendingSaves.get(tabId) === nextSave) {
        this.pendingSaves.delete(tabId);
      }
    }
  }

  async flush(tabId: string): Promise<void> {
    await this.pendingSaves.get(tabId);
  }

  async flushAll(): Promise<void> {
    await Promise.all(this.pendingSaves.values());
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
  }

  async dispose(tabId: string): Promise<void> {
    this.referenceCounts.delete(tabId);
    await this.loadingDocuments.get(tabId);
    await this.flush(tabId);
    this.activeDocuments.delete(tabId);
  }

  async remove(tab: Tab): Promise<void> {
    await this.dispose(tab.id);
    await this.repository.removeWithTab(tab);
  }
}

export const canvasDocumentManager = new CanvasDocumentManager();
