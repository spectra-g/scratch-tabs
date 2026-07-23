import type { Tab } from "../../../../types";
import type { CanvasDocumentLifecycleRepositoryContract } from "../CanvasDocumentLifecycleRepository";
import { CanvasTabDocumentAdapter } from "../CanvasTabDocumentAdapter";

const tab: Tab = {
  id: "tab-1",
  documentId: "document-1",
  contentKind: "canvas",
  title: "Canvas",
  content: "",
  language: "plaintext",
  languageLocked: true,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 2,
  workspaceId: "workspace-1",
};

const manager = () => ({
  flush: jest.fn().mockResolvedValue(undefined),
  dispose: jest.fn().mockResolvedValue(undefined),
  hasContent: jest.fn().mockResolvedValue(true),
});

const repository = (): jest.Mocked<CanvasDocumentLifecycleRepositoryContract> =>
  ({
    duplicate: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue([]),
    move: jest.fn().mockResolvedValue({
      document: {},
      sourceAssetIds: [],
    }),
    garbageCollect: jest.fn().mockResolvedValue([]),
  }) as unknown as jest.Mocked<CanvasDocumentLifecycleRepositoryContract>;

describe("CanvasTabDocumentAdapter", () => {
  it("flushes and duplicates the scene while assigning independent IDs", async () => {
    const documentManager = manager();
    const lifecycle = repository();
    const ids = ["tab-2", "document-2"];
    const adapter = new CanvasTabDocumentAdapter(
      documentManager,
      lifecycle,
      () => 10,
      () => ids.shift()!,
    );

    const duplicate = await adapter.duplicate(tab, tab.workspaceId);

    expect(documentManager.flush).toHaveBeenCalledWith(tab.id);
    expect(lifecycle.duplicate).toHaveBeenCalledWith(tab, duplicate, 10);
    expect(duplicate).toEqual(
      expect.objectContaining({
        id: "tab-2",
        documentId: "document-2",
        title: "Canvas (Copy)",
        isPinned: false,
      }),
    );
  });

  it("does not dispose an active scene when its delete transaction fails", async () => {
    const documentManager = manager();
    const lifecycle = repository();
    lifecycle.remove.mockRejectedValue(new Error("transaction rolled back"));
    const adapter = new CanvasTabDocumentAdapter(documentManager, lifecycle);

    await expect(adapter.remove(tab)).rejects.toThrow(
      "transaction rolled back",
    );
    expect(documentManager.dispose).not.toHaveBeenCalled();
    expect(lifecycle.garbageCollect).not.toHaveBeenCalled();
  });

  it("collects unreferenced assets after a successful delete", async () => {
    const documentManager = manager();
    const lifecycle = repository();
    lifecycle.remove.mockResolvedValue(["shared", "orphan"]);
    const adapter = new CanvasTabDocumentAdapter(documentManager, lifecycle);

    await adapter.remove(tab);

    expect(documentManager.dispose).toHaveBeenCalledWith(tab.id);
    expect(lifecycle.garbageCollect).toHaveBeenCalledWith("workspace-1", [
      "shared",
      "orphan",
    ]);
  });

  it("copies and remaps assets before disposing a moved scene", async () => {
    const documentManager = manager();
    const lifecycle = repository();
    lifecycle.move.mockResolvedValue({
      document: {} as never,
      sourceAssetIds: ["asset-1"],
    });
    const adapter = new CanvasTabDocumentAdapter(
      documentManager,
      lifecycle,
      () => 20,
    );

    const moved = await adapter.move(tab, "workspace-2");

    expect(lifecycle.move).toHaveBeenCalledWith(tab, moved, 20);
    expect(documentManager.dispose).toHaveBeenCalledWith(tab.id);
    expect(lifecycle.garbageCollect).toHaveBeenCalledWith("workspace-1", [
      "asset-1",
    ]);
  });

  it("keeps the active scene when a move transaction rolls back", async () => {
    const documentManager = manager();
    const lifecycle = repository();
    lifecycle.move.mockRejectedValue(new Error("move rolled back"));
    const adapter = new CanvasTabDocumentAdapter(documentManager, lifecycle);

    await expect(adapter.move(tab, "workspace-2")).rejects.toThrow(
      "move rolled back",
    );
    expect(documentManager.dispose).not.toHaveBeenCalled();
    expect(lifecycle.garbageCollect).not.toHaveBeenCalled();
  });

  it("treats post-commit cleanup failure as a safe orphan, not a failed move", async () => {
    const lifecycle = repository();
    lifecycle.garbageCollect.mockRejectedValue(new Error("cleanup failed"));
    const reportCleanupError = jest.fn();
    const adapter = new CanvasTabDocumentAdapter(
      manager(),
      lifecycle,
      () => 20,
      () => "unused",
      reportCleanupError,
    );

    await expect(adapter.move(tab, "workspace-2")).resolves.toEqual(
      expect.objectContaining({ workspaceId: "workspace-2" }),
    );
    expect(reportCleanupError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "cleanup failed" }),
    );
  });
});
