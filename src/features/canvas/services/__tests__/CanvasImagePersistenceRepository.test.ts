jest.mock("../../../../db", () => ({
  db: {
    canvasDocuments: {
      get: jest.fn(),
      put: jest.fn(),
    },
    canvasAssets: {
      bulkAdd: jest.fn(),
      bulkPut: jest.fn(),
    },
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
import type { CanvasAssetRecord, CanvasDocument } from "../../types";
import { createEmptyCanvasDocument } from "../../utils/canvasSchemas";
import { CanvasImagePersistenceRepository } from "../CanvasImagePersistenceRepository";

const mockDb = db as unknown as {
  canvasDocuments: { get: jest.Mock; put: jest.Mock };
  canvasAssets: { bulkAdd: jest.Mock; bulkPut: jest.Mock };
};

const documentAt = (revision: number): CanvasDocument => ({
  ...createEmptyCanvasDocument({
    id: "document-1",
    tabId: "tab-1",
    workspaceId: "workspace-1",
    now: 1,
  }),
  revision,
});

const asset: CanvasAssetRecord = {
  id: "asset-1",
  workspaceId: "workspace-1",
  blob: new Blob(["image"], { type: "image/png" }),
  mimeType: "image/png",
  byteLength: 5,
  createdAt: 1,
};

describe("CanvasImagePersistenceRepository revision writes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("checks the document revision before adding image assets", async () => {
    mockDb.canvasDocuments.get.mockResolvedValue(documentAt(3));
    const repository = new CanvasImagePersistenceRepository();

    await expect(
      repository.saveDocumentWithAsset(documentAt(2), asset, 1),
    ).rejects.toThrow("expected revision 1, found 3");

    expect(mockDb.canvasAssets.bulkAdd).not.toHaveBeenCalled();
    expect(mockDb.canvasDocuments.put).not.toHaveBeenCalled();
  });

  it("keeps pending assets with the local scene during take-over", async () => {
    mockDb.canvasDocuments.get.mockResolvedValue(documentAt(6));
    const repository = new CanvasImagePersistenceRepository();

    const saved = await repository.takeOverDocumentWithAssets(documentAt(2), [
      asset,
    ]);

    expect(saved.revision).toBe(7);
    expect(mockDb.canvasAssets.bulkPut).toHaveBeenCalledWith([asset]);
    expect(mockDb.canvasDocuments.put).toHaveBeenCalledWith(
      expect.objectContaining({ revision: 7 }),
    );
  });
});
