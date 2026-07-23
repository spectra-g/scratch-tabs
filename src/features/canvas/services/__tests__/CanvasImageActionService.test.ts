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

    expect(clipboardItem).toHaveBeenCalledWith({ "image/png": asset.blob });
    expect(write).toHaveBeenCalledWith([
      { contents: { "image/png": asset.blob } },
    ]);
  });

  it("reports a missing asset instead of running an action", async () => {
    const service = new CanvasImageActionService({
      get: jest.fn().mockResolvedValue(undefined),
    });

    await expect(service.copy("missing")).rejects.toThrow(
      "missing from local storage",
    );
  });
});
