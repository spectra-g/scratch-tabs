import type { Tab } from "../../../../types";
import { CanvasDocumentManager } from "../CanvasDocumentManager";
import type { CanvasDocumentRepositoryContract } from "../CanvasDocumentRepository";
import type { CanvasImagePersistenceRepositoryContract } from "../CanvasImagePersistenceRepository";
import type { CanvasRevisionChannelContract } from "../CanvasRevisionChannel";
import { CanvasRevisionConflictError } from "../CanvasRevisionConflict";
import {
  createDefaultCanvasSession,
  createEmptyCanvasDocument,
} from "../../utils/canvasSchemas";
import type {
  CanvasAssetRecord,
  CanvasImageItem,
  CanvasTextItem,
} from "../../types";

const canvasTab: Tab = {
  id: "tab-1",
  documentId: "tab-1",
  contentKind: "canvas",
  title: "Canvas 1",
  content: "",
  language: "plaintext",
  languageLocked: true,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 100,
  lastModified: 100,
  workspaceId: "workspace-1",
};

const document = createEmptyCanvasDocument({
  id: "tab-1",
  tabId: "tab-1",
  workspaceId: "workspace-1",
  now: 100,
});

const createRepository = (): jest.Mocked<CanvasDocumentRepositoryContract> => ({
  createWithTab: jest.fn().mockResolvedValue({ ...document }),
  getByTabId: jest.fn().mockResolvedValue({
    ...document,
    items: [],
    edges: [],
    settings: { ...document.settings },
  }),
  hasContent: jest.fn().mockResolvedValue(false),
  saveDocument: jest.fn().mockResolvedValue(undefined),
  takeOverDocument: jest.fn().mockImplementation(async (candidate) => ({
    ...candidate,
    revision: candidate.revision + 1,
  })),
  getSession: jest.fn().mockResolvedValue(undefined),
  saveSession: jest.fn().mockResolvedValue(undefined),
  removeWithTab: jest.fn().mockResolvedValue(undefined),
});

const textItem = (text: string): CanvasTextItem => ({
  id: "item-1",
  type: "text",
  x: 10,
  y: 20,
  width: 280,
  height: 180,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  text,
});

const imageItem: CanvasImageItem = {
  id: "image-1",
  type: "image",
  x: 0,
  y: 0,
  width: 400,
  height: 300,
  zIndex: 1,
  createdAt: 100,
  updatedAt: 100,
  assetId: "asset-1",
  altText: "Diagram",
  objectFit: "contain",
};

const imageAsset: CanvasAssetRecord = {
  id: "asset-1",
  workspaceId: "workspace-1",
  blob: new Blob(["image"], { type: "image/png" }),
  mimeType: "image/png",
  byteLength: 5,
  width: 400,
  height: 300,
  createdAt: 100,
};

const createImagePersistence =
  (): jest.Mocked<CanvasImagePersistenceRepositoryContract> => ({
    saveDocumentWithAsset: jest.fn().mockResolvedValue(undefined),
    saveDocumentWithAssets: jest.fn().mockResolvedValue(undefined),
    takeOverDocumentWithAssets: jest
      .fn()
      .mockImplementation(async (candidate) => ({
        ...candidate,
        revision: candidate.revision + 1,
      })),
  });

const revisionChannel: CanvasRevisionChannelContract = {
  publish: jest.fn(),
  subscribe: jest.fn(() => () => undefined),
};

class TestRevisionChannel implements CanvasRevisionChannelContract {
  readonly published: Array<{
    tabId: string;
    documentId: string;
    revision: number;
  }> = [];
  private readonly listeners = new Set<
    (message: { tabId: string; documentId: string; revision: number }) => void
  >();

  publish(message: {
    tabId: string;
    documentId: string;
    revision: number;
  }): void {
    this.published.push(message);
    this.listeners.forEach((listener) => listener(message));
  }

  subscribe(
    listener: (message: {
      tabId: string;
      documentId: string;
      revision: number;
    }) => void,
  ): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

describe("CanvasDocumentManager", () => {
  it("loads a document once while it has multiple active consumers", async () => {
    const repository = createRepository();
    const manager = new CanvasDocumentManager(repository);

    const [first, second] = await Promise.all([
      manager.acquire(canvasTab),
      manager.acquire(canvasTab),
    ]);

    expect(first).toBe(second);
    expect(repository.getByTabId).toHaveBeenCalledTimes(1);
    expect(first.session).toEqual(
      createDefaultCanvasSession("tab-1", first.session.updatedAt),
    );

    await manager.release(canvasTab.id);
    await manager.release(canvasTab.id);
  });

  it("serializes viewport writes and flushes the last pending save", async () => {
    const repository = createRepository();
    let finishFirstSave: (() => void) | undefined;
    repository.saveSession
      .mockImplementationOnce(
        () => new Promise<void>((resolve) => (finishFirstSave = resolve)),
      )
      .mockResolvedValueOnce(undefined);
    const manager = new CanvasDocumentManager(repository);
    await manager.acquire(canvasTab);

    const first = manager.saveViewport(canvasTab.id, { x: 10, y: 20, zoom: 2 });
    const second = manager.saveViewport(canvasTab.id, {
      x: 30,
      y: 40,
      zoom: 1.5,
    });
    const flush = manager.flush(canvasTab.id);

    await Promise.resolve();
    await Promise.resolve();
    expect(repository.saveSession).toHaveBeenCalledTimes(1);
    finishFirstSave?.();
    await Promise.all([first, second, flush]);

    expect(repository.saveSession).toHaveBeenCalledTimes(2);
    expect(repository.saveSession.mock.calls[1][0].viewport).toEqual({
      x: 30,
      y: 40,
      zoom: 1.5,
    });
  });

  it("flushes before removing the Canvas transactionally through the repository", async () => {
    const repository = createRepository();
    const manager = new CanvasDocumentManager(repository);
    await manager.acquire(canvasTab);

    await manager.remove(canvasTab);

    expect(repository.removeWithTab).toHaveBeenCalledWith(canvasTab);
  });

  it("debounces document writes, increments revisions, and throttles parent-tab updates", async () => {
    jest.useFakeTimers();
    let now = 1_000;
    const repository = createRepository();
    const manager = new CanvasDocumentManager(
      repository,
      () => now,
      createImagePersistence(),
      undefined,
      revisionChannel,
    );
    const saveStates: string[] = [];
    manager.subscribe(canvasTab.id, (state) => saveStates.push(state.status));
    await manager.acquire(canvasTab);

    manager.setItems(canvasTab.id, [textItem("first")]);
    manager.setItems(canvasTab.id, [textItem("latest")]);
    expect(repository.saveDocument).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(500);
    expect(repository.saveDocument).toHaveBeenCalledTimes(1);
    expect(repository.saveDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({
        revision: 1,
        items: [expect.objectContaining({ text: "latest" })],
        searchText: "latest",
      }),
      { expectedRevision: 0, updateParentTabModified: true },
    );

    now = 1_500;
    manager.setItems(canvasTab.id, [textItem("second save")]);
    await jest.advanceTimersByTimeAsync(500);

    expect(repository.saveDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({ revision: 2 }),
      { expectedRevision: 1, updateParentTabModified: false },
    );
    expect(saveStates).toEqual([
      "saving",
      "saving",
      "saved",
      "saving",
      "saved",
    ]);

    await manager.release(canvasTab.id);
    jest.useRealTimers();
  });

  it("flushes a pending scene immediately", async () => {
    jest.useFakeTimers();
    const repository = createRepository();
    const manager = new CanvasDocumentManager(
      repository,
      () => 5_000,
      createImagePersistence(),
      undefined,
      revisionChannel,
    );
    await manager.acquire(canvasTab);
    manager.setItems(canvasTab.id, [textItem("flush me")]);

    await manager.flush(canvasTab.id);

    expect(repository.saveDocument).toHaveBeenCalledTimes(1);
    expect(repository.saveDocument.mock.calls[0][0].revision).toBe(1);
    expect(repository.saveDocument.mock.calls[0][0].searchText).toBe(
      "flush me",
    );
    expect(jest.getTimerCount()).toBe(0);
    await manager.release(canvasTab.id);
    jest.useRealTimers();
  });

  it("persists an image asset and document as one completed operation", async () => {
    const repository = createRepository();
    const imagePersistence = createImagePersistence();
    const manager = new CanvasDocumentManager(
      repository,
      () => 5_000,
      imagePersistence,
    );
    await manager.acquire(canvasTab);

    const saved = await manager.addImage(canvasTab.id, imageItem, imageAsset);

    expect(imagePersistence.saveDocumentWithAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        revision: 1,
        items: [imageItem],
        updatedAt: 5_000,
      }),
      imageAsset,
      0,
    );
    expect(saved.items).toEqual([imageItem]);
    expect(await manager.hasContent(canvasTab.id)).toBe(true);
    await manager.release(canvasTab.id);
  });

  it("keeps the active document unchanged when atomic image persistence fails", async () => {
    const repository = createRepository();
    const imagePersistence = createImagePersistence();
    imagePersistence.saveDocumentWithAsset.mockRejectedValue(
      new Error("IndexedDB transaction failed"),
    );
    const manager = new CanvasDocumentManager(
      repository,
      () => 5_000,
      imagePersistence,
    );
    await manager.acquire(canvasTab);

    await expect(
      manager.addImage(canvasTab.id, imageItem, imageAsset),
    ).rejects.toThrow("IndexedDB transaction failed");
    expect(await manager.hasContent(canvasTab.id)).toBe(false);
    await manager.release(canvasTab.id);
  });

  it("persists mixed ingested cards and assets in one transaction", async () => {
    const repository = createRepository();
    const imagePersistence = createImagePersistence();
    const manager = new CanvasDocumentManager(
      repository,
      () => 5_000,
      imagePersistence,
    );
    await manager.acquire(canvasTab);
    const pastedText = textItem("pasted");

    const saved = await manager.addItemsWithAssets(
      canvasTab.id,
      [imageItem, pastedText],
      [imageAsset],
    );

    expect(imagePersistence.saveDocumentWithAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        revision: 1,
        items: [imageItem, pastedText],
      }),
      imageAsset,
      0,
    );
    expect(saved.items).toEqual([imageItem, pastedText]);
    await manager.release(canvasTab.id);
  });

  it("does not expose any mixed ingested cards when persistence fails", async () => {
    const repository = createRepository();
    const imagePersistence = createImagePersistence();
    imagePersistence.saveDocumentWithAssets.mockRejectedValue(
      new Error("transaction rolled back"),
    );
    const manager = new CanvasDocumentManager(
      repository,
      () => 5_000,
      imagePersistence,
    );
    await manager.acquire(canvasTab);

    await expect(
      manager.addItemsWithAssets(
        canvasTab.id,
        [textItem("one"), textItem("two")],
        [],
      ),
    ).rejects.toThrow("transaction rolled back");
    expect(await manager.hasContent(canvasTab.id)).toBe(false);
    await manager.release(canvasTab.id);
  });

  it("preserves edits made while an atomic image transaction is in flight", async () => {
    const repository = createRepository();
    const imagePersistence = createImagePersistence();
    let finishImageSave: (() => void) | undefined;
    imagePersistence.saveDocumentWithAsset.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishImageSave = resolve;
        }),
    );
    const manager = new CanvasDocumentManager(
      repository,
      () => 5_000,
      imagePersistence,
    );
    await manager.acquire(canvasTab);

    const imageSave = manager.addImage(canvasTab.id, imageItem, imageAsset);
    for (let attempt = 0; attempt < 10 && !finishImageSave; attempt += 1) {
      await Promise.resolve();
    }
    expect(finishImageSave).toBeDefined();
    manager.setItems(canvasTab.id, [textItem("concurrent edit")]);
    finishImageSave?.();

    const merged = await imageSave;
    expect(merged.items).toEqual([textItem("concurrent edit"), imageItem]);
    await manager.flush(canvasTab.id);
    expect(repository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        revision: 2,
        items: [textItem("concurrent edit"), imageItem],
      }),
      { expectedRevision: 1, updateParentTabModified: false },
    );
    await manager.release(canvasTab.id);
  });

  it("reports unsaved active content without reading the repository", async () => {
    const repository = createRepository();
    const manager = new CanvasDocumentManager(repository);
    await manager.acquire(canvasTab);

    manager.setItems(canvasTab.id, [textItem("not persisted yet")]);

    await expect(manager.hasContent(canvasTab.id)).resolves.toBe(true);
    expect(repository.hasContent).not.toHaveBeenCalled();
    await manager.release(canvasTab.id);
  });

  it("reads persisted content for an inactive Canvas", async () => {
    const repository = createRepository();
    repository.hasContent.mockResolvedValue(true);
    const manager = new CanvasDocumentManager(repository);

    await expect(manager.hasContent(canvasTab.id)).resolves.toBe(true);
    expect(repository.hasContent).toHaveBeenCalledWith(canvasTab.id);
  });

  it("flushes every active Canvas independently", async () => {
    const repository = createRepository();
    repository.getByTabId.mockImplementation(async (tabId) => ({
      ...document,
      id: tabId,
      tabId,
      items: [],
      edges: [],
      settings: { ...document.settings },
    }));
    const manager = new CanvasDocumentManager(repository, () => 5_000);
    const secondTab = {
      ...canvasTab,
      id: "tab-2",
      documentId: "tab-2",
    };
    await Promise.all([manager.acquire(canvasTab), manager.acquire(secondTab)]);
    manager.setItems(canvasTab.id, [textItem("left")]);
    manager.setItems(secondTab.id, [{ ...textItem("right"), id: "item-2" }]);

    await manager.flushAll();

    expect(repository.saveDocument).toHaveBeenCalledTimes(2);
    expect(
      repository.saveDocument.mock.calls.map(([saved]) => saved.tabId).sort(),
    ).toEqual(["tab-1", "tab-2"]);
    await Promise.all([
      manager.release(canvasTab.id),
      manager.release(secondTab.id),
    ]);
  });

  it("flushes dirty content before releasing the final consumer", async () => {
    const repository = createRepository();
    const manager = new CanvasDocumentManager(repository, () => 5_000);
    await manager.acquire(canvasTab);
    manager.setItems(canvasTab.id, [textItem("dispose safely")]);

    await manager.release(canvasTab.id);

    expect(repository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ text: "dispose safely" })],
      }),
      { expectedRevision: 0, updateParentTabModified: true },
    );
  });

  it("keeps a remounted Strict Mode consumer alive while the first cleanup waits for loading", async () => {
    const repository = createRepository();
    let finishLoad: ((value: typeof document) => void) | undefined;
    repository.getByTabId.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishLoad = resolve;
        }),
    );
    const manager = new CanvasDocumentManager(repository);

    const firstAcquire = manager.acquire(canvasTab);
    const firstCleanup = manager.release(canvasTab.id);
    const remountAcquire = manager.acquire(canvasTab);
    finishLoad?.(document);

    const [first, remounted] = await Promise.all([
      firstAcquire,
      remountAcquire,
      firstCleanup,
    ]);
    expect(remounted).toBe(first);

    await manager.saveViewport(canvasTab.id, { x: 5, y: 10, zoom: 2 });
    expect(repository.saveSession).toHaveBeenCalledTimes(1);
    await manager.release(canvasTab.id);
  });

  it("reloads or takes over stale local work with monotonic revisions", async () => {
    let stored = {
      ...document,
      items: [],
      edges: [],
      settings: { ...document.settings },
    };
    const repository = createRepository();
    repository.getByTabId.mockImplementation(async () => ({
      ...stored,
      items: stored.items.map((item) => ({ ...item })),
    }));
    repository.saveDocument.mockImplementation(async (candidate, options) => {
      if (stored.revision !== options.expectedRevision) {
        throw new CanvasRevisionConflictError(
          options.expectedRevision,
          stored.revision,
        );
      }
      stored = {
        ...candidate,
        items: candidate.items.map((item) => ({ ...item })),
      };
    });
    repository.takeOverDocument.mockImplementation(async (candidate) => {
      stored = {
        ...candidate,
        items: candidate.items.map((item) => ({ ...item })),
        revision: stored.revision + 1,
      };
      return stored;
    });
    const channel = new TestRevisionChannel();
    let now = 1_000;
    const firstWindow = new CanvasDocumentManager(
      repository,
      () => now,
      createImagePersistence(),
      undefined,
      channel,
    );
    const secondWindow = new CanvasDocumentManager(
      repository,
      () => now,
      createImagePersistence(),
      undefined,
      channel,
    );
    const secondStates: string[] = [];
    secondWindow.subscribe(canvasTab.id, (state) =>
      secondStates.push(state.status),
    );
    await Promise.all([
      firstWindow.acquire(canvasTab),
      secondWindow.acquire(canvasTab),
    ]);

    firstWindow.setItems(canvasTab.id, [textItem("first window")]);
    await firstWindow.flush(canvasTab.id);
    secondWindow.setItems(canvasTab.id, [textItem("stale local")]);

    expect(secondStates.at(-1)).toBe("conflict");
    const reloaded = await secondWindow.reloadAfterConflict(canvasTab.id);
    expect(reloaded.document.items).toEqual([
      expect.objectContaining({ text: "first window" }),
    ]);
    expect(reloaded.document.revision).toBe(1);

    now = 2_000;
    firstWindow.setItems(canvasTab.id, [textItem("newer remote")]);
    await firstWindow.flush(canvasTab.id);
    secondWindow.setItems(canvasTab.id, [textItem("chosen local")]);
    const takenOver = await secondWindow.takeOverAfterConflict(canvasTab.id);

    expect(takenOver.document.revision).toBe(3);
    expect(stored.items).toEqual([
      expect.objectContaining({ text: "chosen local" }),
    ]);
    expect(channel.published).toEqual([
      { tabId: "tab-1", documentId: "tab-1", revision: 1 },
      { tabId: "tab-1", documentId: "tab-1", revision: 2 },
      { tabId: "tab-1", documentId: "tab-1", revision: 3 },
    ]);
  });

  it("isolates a conflict so unrelated Canvas documents keep saving", async () => {
    const repository = createRepository();
    repository.getByTabId.mockImplementation(async (tabId) => ({
      ...document,
      id: tabId,
      tabId,
      items: [],
      edges: [],
      settings: { ...document.settings },
    }));
    const channel = new TestRevisionChannel();
    const manager = new CanvasDocumentManager(
      repository,
      () => 5_000,
      createImagePersistence(),
      undefined,
      channel,
    );
    const secondTab = {
      ...canvasTab,
      id: "tab-2",
      documentId: "tab-2",
    };
    await Promise.all([manager.acquire(canvasTab), manager.acquire(secondTab)]);

    manager.setItems(canvasTab.id, [textItem("conflicting")]);
    channel.publish({
      tabId: canvasTab.id,
      documentId: canvasTab.documentId!,
      revision: 4,
    });
    manager.setItems(secondTab.id, [
      { ...textItem("independent"), id: "item-2" },
    ]);
    await manager.flush(secondTab.id);

    expect(repository.saveDocument).toHaveBeenCalledTimes(1);
    expect(repository.saveDocument.mock.calls[0][0]).toEqual(
      expect.objectContaining({ tabId: "tab-2", revision: 1 }),
    );
  });
});
