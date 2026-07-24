import type { CanvasAssetRepositoryContract } from "../CanvasAssetRepository";
import { CanvasImageActionService } from "../CanvasImageActionService";
import type { CanvasAssetRecord } from "../../types";

const asset: CanvasAssetRecord = {
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

describe("CanvasImageActionService", () => {
  const originalClipboardItem = globalThis.ClipboardItem;

  afterEach(() => {
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: originalClipboardItem,
    });
  });

  it("copies a PNG Blob without converting it to a data URI", async () => {
    const write = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });
    const clipboardItem = jest.fn((contents) => ({ contents }));
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: clipboardItem,
    });
    const repository: CanvasAssetRepositoryContract = {
      get: jest.fn().mockResolvedValue(asset),
    };
    const service = new CanvasImageActionService(repository);

    await service.copy(asset.id);

    const clipboardBlob = clipboardItem.mock.calls[0][0]["image/png"];
    expect(clipboardBlob).toBeInstanceOf(Promise);
    await expect(clipboardBlob).resolves.toBe(asset.blob);
    expect(write).toHaveBeenCalledWith([
      { contents: { "image/png": clipboardBlob } },
    ]);
  });

  it("starts the clipboard write before asynchronous asset loading completes", async () => {
    let resolveAsset!: (value: CanvasAssetRecord) => void;
    const assetPromise = new Promise<CanvasAssetRecord>((resolve) => {
      resolveAsset = resolve;
    });
    const repository: CanvasAssetRepositoryContract = {
      get: jest.fn().mockReturnValue(assetPromise),
    };
    const clipboardItem = jest.fn((contents) => ({ contents }));
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: clipboardItem,
    });
    const write = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });

    const copyPromise = new CanvasImageActionService(repository).copy(asset.id);

    expect(write).toHaveBeenCalledTimes(1);
    resolveAsset(asset);
    await copyPromise;
    await expect(
      clipboardItem.mock.calls[0][0]["image/png"],
    ).resolves.toBe(asset.blob);
  });

  it("reports a missing asset through the clipboard write", async () => {
    const clipboardItem = jest.fn((contents) => ({ contents }));
    Object.defineProperty(globalThis, "ClipboardItem", {
      configurable: true,
      value: clipboardItem,
    });
    const write = jest.fn(async ([item]) => {
      await item.contents["image/png"];
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { write },
    });
    const service = new CanvasImageActionService({
      get: jest.fn().mockResolvedValue(undefined),
    });

    await expect(service.copy("missing")).rejects.toThrow(
      "missing from local storage",
    );
  });
});
