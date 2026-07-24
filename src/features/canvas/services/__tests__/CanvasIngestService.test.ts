import type { CanvasAssetRecord, CanvasImageItem } from "../../types";
import type { CanvasAssetRepositoryContract } from "../CanvasAssetRepository";
import type { CanvasDocumentManager } from "../CanvasDocumentManager";
import { CanvasIngestService } from "../CanvasIngestService";

const target = {
  tabId: "canvas-tab",
  workspaceId: "workspace-1",
  anchor: { x: 100, y: 80 },
  pane: { width: 1_400, height: 900 },
  viewport: { x: 0, y: 0, zoom: 1 },
  nextZIndex: 4,
};

const imageAsset: CanvasAssetRecord = {
  id: "asset-1",
  workspaceId: "workspace-1",
  blob: new Blob(["image"], { type: "image/png" }),
  mimeType: "image/png",
  originalName: "diagram.png",
  byteLength: 5,
  width: 100,
  height: 50,
  createdAt: 1,
};

const createManager = () => ({
  addItemsWithAssets: jest.fn().mockResolvedValue(undefined),
});

const createAssetRepository = (
  asset: CanvasAssetRecord | undefined = undefined,
): CanvasAssetRepositoryContract => ({
  get: jest.fn().mockResolvedValue(asset),
});

describe("CanvasIngestService", () => {
  beforeAll(() => {
    let id = 0;
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      configurable: true,
      value: jest.fn(() => `generated-${++id}`),
    });
  });

  it("classifies and commits mixed external inputs once", async () => {
    const manager = createManager();
    const prepareImage = jest.fn().mockResolvedValue(imageAsset);
    const classifyInputs = jest.fn().mockResolvedValue([
      {
        kind: "image",
        file: new File(["image"], "diagram.png", { type: "image/png" }),
      },
      { kind: "text", text: "Release notes" },
      {
        kind: "code",
        source: '{\n  "ok": true\n}',
        language: "json",
        languageLocked: true,
      },
      {
        kind: "link",
        canonicalUrl: "https://example.com/",
        hostname: "example.com",
      },
      {
        kind: "video",
        canonicalUrl: "https://vimeo.com/76979871",
        hostname: "vimeo.com",
        provider: "vimeo",
        videoId: "76979871",
      },
    ]);
    const service = new CanvasIngestService(
      manager as unknown as CanvasDocumentManager,
      createAssetRepository(),
      prepareImage,
      classifyInputs,
      () => 10,
    );

    const items = await service.ingestInputs(target, [
      { kind: "text", text: "ignored by classifier stub" },
    ]);

    expect(items.map((item) => item.type)).toEqual([
      "image",
      "text",
      "code",
      "link",
      "video",
    ]);
    expect(items.map(({ x, y, zIndex }) => ({ x, y, zIndex }))).toEqual([
      { x: 100, y: 80, zIndex: 4 },
      { x: 492, y: 80, zIndex: 5 },
      { x: 1004, y: 80, zIndex: 6 },
      { x: 100, y: 432, zIndex: 7 },
      { x: 492, y: 432, zIndex: 8 },
    ]);
    expect(manager.addItemsWithAssets).toHaveBeenCalledTimes(1);
    expect(manager.addItemsWithAssets).toHaveBeenCalledWith(
      "canvas-tab",
      items,
      [imageAsset],
    );
  });

  it("returns no cards when the atomic persistence boundary rejects", async () => {
    const manager = createManager();
    manager.addItemsWithAssets.mockRejectedValue(
      new Error("IndexedDB transaction failed"),
    );
    const service = new CanvasIngestService(
      manager as unknown as CanvasDocumentManager,
      createAssetRepository(),
      jest.fn(),
      jest.fn().mockResolvedValue([{ kind: "text", text: "Unsaved" }]),
    );

    await expect(
      service.ingestInputs(target, [{ kind: "text", text: "Unsaved" }]),
    ).rejects.toThrow("IndexedDB transaction failed");
    expect(manager.addItemsWithAssets).toHaveBeenCalledTimes(1);
  });

  it("clones copied image assets when pasting into another workspace", async () => {
    const sourceAsset = {
      ...imageAsset,
      workspaceId: "workspace-source",
    };
    const sourceItem: CanvasImageItem = {
      id: "image-item",
      type: "image",
      x: 0,
      y: 0,
      width: 240,
      height: 120,
      zIndex: 1,
      createdAt: 1,
      updatedAt: 1,
      assetId: sourceAsset.id,
      altText: "diagram.png",
      objectFit: "contain",
    };
    const manager = createManager();
    const service = new CanvasIngestService(
      manager as unknown as CanvasDocumentManager,
      createAssetRepository(sourceAsset),
      jest.fn(),
      jest.fn(),
      () => 50,
    );

    const [pasted] = await service.ingestClipboard(target, {
      version: 1,
      sourceWorkspaceId: "workspace-source",
      items: [sourceItem],
    });

    expect(pasted).toEqual(
      expect.objectContaining({
        type: "image",
        assetId: expect.not.stringMatching(/^asset-1$/),
        x: 100,
        y: 80,
      }),
    );
    const persistedAssets = manager.addItemsWithAssets.mock.calls[0][2];
    expect(persistedAssets).toEqual([
      expect.objectContaining({
        workspaceId: "workspace-1",
        id: pasted.type === "image" ? pasted.assetId : "",
        createdAt: 50,
      }),
    ]);
  });
});
