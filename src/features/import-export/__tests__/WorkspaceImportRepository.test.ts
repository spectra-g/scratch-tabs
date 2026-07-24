jest.mock("../../../db", () => ({
  db: {
    splitView: {
      toArray: jest.fn(),
    },
    canvasDocuments: {
      toArray: jest.fn(),
    },
    canvasAssets: {
      toArray: jest.fn(),
    },
  },
}));

import { db, type StorageProvider } from "../../../db";
import { WorkspaceImportRepository } from "../WorkspaceImportRepository";

const mockDb = db as unknown as {
  splitView: { toArray: jest.Mock };
  canvasDocuments: { toArray: jest.Mock };
  canvasAssets: { toArray: jest.Mock };
};

describe("WorkspaceImportRepository", () => {
  it("reserves tab IDs owned by orphaned Canvas documents", async () => {
    const storage = {
      getWorkspaces: jest.fn().mockResolvedValue([]),
      getTabs: jest.fn().mockResolvedValue([]),
    } as unknown as StorageProvider;
    mockDb.splitView.toArray.mockResolvedValue([]);
    mockDb.canvasDocuments.toArray.mockResolvedValue([
      {
        id: "document-1",
        tabId: "deleted-tab",
      },
    ]);
    mockDb.canvasAssets.toArray.mockResolvedValue([]);

    const existing = await new WorkspaceImportRepository(
      storage,
    ).readExistingIds();

    expect(existing.tabIds).toEqual(new Set(["deleted-tab"]));
    expect(existing.canvasDocumentIds).toEqual(new Set(["document-1"]));
  });
});
