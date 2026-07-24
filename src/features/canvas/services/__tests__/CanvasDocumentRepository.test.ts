jest.mock("../../../../db", () => ({
  db: {
    canvasDocuments: {
      get: jest.fn(),
      put: jest.fn(),
    },
    canvasSessions: {},
    tabs: {
      update: jest.fn(),
    },
    transaction: jest.fn(
      async (...args: Array<unknown>) =>
        await (args.at(-1) as () => Promise<void>)(),
    ),
  },
}));

import { db } from "../../../../db";
import { createEmptyCanvasDocument } from "../../utils/canvasSchemas";
import { CanvasDocumentRepository } from "../CanvasDocumentRepository";
import { CanvasRevisionConflictError } from "../CanvasRevisionConflict";

const mockDb = db as unknown as {
  canvasDocuments: {
    get: jest.Mock;
    put: jest.Mock;
  };
  tabs: {
    update: jest.Mock;
  };
};

const documentAt = (revision: number) => ({
  ...createEmptyCanvasDocument({
    id: "document-1",
    tabId: "tab-1",
    workspaceId: "workspace-1",
    now: 1,
  }),
  revision,
  updatedAt: revision + 1,
});

describe("CanvasDocumentRepository revision writes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("compares the stored revision before writing", async () => {
    mockDb.canvasDocuments.get.mockResolvedValue(documentAt(4));
    const repository = new CanvasDocumentRepository();

    await expect(
      repository.saveDocument(documentAt(4), {
        expectedRevision: 3,
        updateParentTabModified: true,
      }),
    ).rejects.toEqual(new CanvasRevisionConflictError(3, 4));

    expect(mockDb.canvasDocuments.put).not.toHaveBeenCalled();
    expect(mockDb.tabs.update).not.toHaveBeenCalled();
  });

  it("writes an exact next revision and parent metadata in one transaction", async () => {
    mockDb.canvasDocuments.get.mockResolvedValue(documentAt(4));
    const repository = new CanvasDocumentRepository();

    await repository.saveDocument(documentAt(5), {
      expectedRevision: 4,
      updateParentTabModified: true,
    });

    expect(mockDb.canvasDocuments.put).toHaveBeenCalledWith(documentAt(5));
    expect(mockDb.tabs.update).toHaveBeenCalledWith("tab-1", {
      lastModified: 6,
    });
  });

  it("takes over from the latest revision instead of the stale local revision", async () => {
    mockDb.canvasDocuments.get.mockResolvedValue(documentAt(9));
    const repository = new CanvasDocumentRepository();

    const saved = await repository.takeOverDocument(documentAt(2), true);

    expect(saved.revision).toBe(10);
    expect(mockDb.canvasDocuments.put).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 10 }),
    );
  });
});
