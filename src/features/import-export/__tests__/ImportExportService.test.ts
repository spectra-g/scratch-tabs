import type { StorageProvider } from "../../../db";
import { ImportExportService } from "../ImportExportService";
import { createWorkspaceArchive } from "../archiveCodec";
import {
  canvasDocument,
  canvasAsset,
  canvasTab,
  exportData,
  textTab,
  workspace,
} from "../testFixtures.fixture";

const storage = {
  getWorkspace: jest.fn(),
  getTabsByWorkspace: jest.fn(),
  getSplitViewByWorkspace: jest.fn(),
} as unknown as StorageProvider;

const emptyExisting = {
  workspaceIds: new Set<string>(),
  tabIds: new Set<string>(),
  splitViewIds: new Set<string>(),
  canvasDocumentIds: new Set<string>(),
  canvasAssetIds: new Set<string>(),
  maxDisplayOrder: 0,
};

const blobToFile = (blob: Blob): Promise<File> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () =>
      resolve(
        new File([reader.result as ArrayBuffer], "workspace.scratch", {
          type: "application/octet-stream",
        }),
      );
    reader.readAsArrayBuffer(blob);
  });

describe("ImportExportService export orchestration", () => {
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    storage.getWorkspace = jest.fn().mockResolvedValue(workspace);
    storage.getTabsByWorkspace = jest
      .fn()
      .mockResolvedValue([textTab, canvasTab]);
    storage.getSplitViewByWorkspace = jest.fn().mockResolvedValue(null);
  });

  afterEach(() => {
    clickSpy.mockRestore();
  });

  it("flushes live managers before reading selected workspace records", async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const collect = jest.fn().mockResolvedValue({
      documents: [canvasDocument],
      assets: [canvasAsset],
    });
    const service = new ImportExportService(storage, { flush }, { collect });

    await service.exportWorkspaces([workspace.id]);

    expect(flush).toHaveBeenCalledTimes(1);
    expect(storage.getWorkspace).toHaveBeenCalledWith(workspace.id);
    expect(flush.mock.invocationCallOrder[0]).toBeLessThan(
      (storage.getWorkspace as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(collect).toHaveBeenCalledWith([textTab, canvasTab]);
  });

  it("deduplicates selected workspace IDs", async () => {
    const service = new ImportExportService(
      storage,
      { flush: jest.fn().mockResolvedValue(undefined) },
      {
        collect: jest.fn().mockResolvedValue({
          documents: [],
          assets: [],
        }),
      },
    );

    await service.exportWorkspaces([workspace.id, workspace.id]);

    expect(storage.getWorkspace).toHaveBeenCalledTimes(1);
  });

  it("saves a validated Canvas import plan through the repository boundary", async () => {
    const archive = await createWorkspaceArchive(
      exportData,
      [canvasDocument],
      [canvasAsset],
    );
    const save = jest.fn().mockResolvedValue(undefined);
    const service = new ImportExportService(
      storage,
      { flush: jest.fn() },
      { collect: jest.fn() },
      {
        readExistingIds: jest.fn().mockResolvedValue(emptyExisting),
        save,
      },
    );

    const summary = await service.importWorkspaces(await blobToFile(archive));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        tabs: expect.arrayContaining([
          expect.objectContaining({ id: canvasTab.id }),
        ]),
        canvasDocuments: [expect.objectContaining({ id: canvasDocument.id })],
        canvasAssets: [expect.objectContaining({ id: canvasAsset.id })],
      }),
    );
    expect(summary.errors).toEqual([]);
    expect(summary.importedWorkspaces).toHaveLength(1);
  });

  it("does not report workspaces as imported when the transaction fails", async () => {
    const archive = await createWorkspaceArchive(exportData, [], []);
    const service = new ImportExportService(
      storage,
      { flush: jest.fn() },
      { collect: jest.fn() },
      {
        readExistingIds: jest.fn().mockResolvedValue(emptyExisting),
        save: jest.fn().mockRejectedValue(new Error("quota exhausted")),
      },
    );

    const summary = await service.importWorkspaces(await blobToFile(archive));

    expect(summary.importedWorkspaces).toEqual([]);
    expect(summary.errors).toEqual([
      "Failed to import workspace data: quota exhausted",
    ]);
  });
});
