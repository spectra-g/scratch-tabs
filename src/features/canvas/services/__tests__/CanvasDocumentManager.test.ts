import type { Tab } from "../../../../types";
import { CanvasDocumentManager } from "../CanvasDocumentManager";
import type { CanvasDocumentRepositoryContract } from "../CanvasDocumentRepository";
import {
  createDefaultCanvasSession,
  createEmptyCanvasDocument,
} from "../../utils/canvasSchemas";

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
  createWithTab: jest.fn().mockResolvedValue(document),
  getByTabId: jest.fn().mockResolvedValue(document),
  saveDocument: jest.fn().mockResolvedValue(undefined),
  getSession: jest.fn().mockResolvedValue(undefined),
  saveSession: jest.fn().mockResolvedValue(undefined),
  removeWithTab: jest.fn().mockResolvedValue(undefined),
});

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
    expect(first.session).toEqual(createDefaultCanvasSession("tab-1", first.session.updatedAt));

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
    const second = manager.saveViewport(canvasTab.id, { x: 30, y: 40, zoom: 1.5 });
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
});
