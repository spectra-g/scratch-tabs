import { useRootStore } from "../../../stores/rootStore";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import type { CanvasAssetRecord } from "../types";
import {
  canvasImageBlobToDataUri,
  rasterizeCanvasImageToPng,
} from "../utils/canvasImageBlob";
import {
  canvasAssetRepository,
  type CanvasAssetRepositoryContract,
} from "./CanvasAssetRepository";

const safeFileName = (asset: CanvasAssetRecord): string => {
  const fallbackExtension =
    asset.mimeType.split("/")[1]?.replace("jpeg", "jpg") || "img";
  const name = asset.originalName || `canvas-image.${fallbackExtension}`;
  return name.replace(/[\\/:*?"<>|]/g, "_");
};

export class CanvasImageActionService {
  constructor(
    private readonly assets: CanvasAssetRepositoryContract = canvasAssetRepository,
  ) {}

  async requireAsset(assetId: string): Promise<CanvasAssetRecord> {
    const asset = await this.assets.get(assetId);
    if (!asset) throw new Error("This image is missing from local storage.");
    return asset;
  }

  async copy(assetId: string): Promise<void> {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      throw new Error("Image copying is not supported by this browser.");
    }

    // Start the clipboard write while the click's user activation is still
    // available. ClipboardItem accepts a Blob promise, so IndexedDB lookup and
    // optional rasterization can finish without forfeiting that activation.
    const clipboardBlob = this.prepareClipboardBlob(assetId);
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": clipboardBlob }),
    ]);
  }

  private async prepareClipboardBlob(assetId: string): Promise<Blob> {
    const asset = await this.requireAsset(assetId);
    return asset.mimeType === "image/png"
      ? asset.blob
      : rasterizeCanvasImageToPng(asset.blob);
  }

  async download(assetId: string): Promise<void> {
    const asset = await this.requireAsset(assetId);
    const url = URL.createObjectURL(asset.blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = safeFileName(asset);
      link.click();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async openInSmartView(
    canvasTabId: string,
    assetId: string,
  ): Promise<string | undefined> {
    const asset = await this.requireAsset(assetId);
    const openOnRight = useSplitViewStore
      .getState()
      .splitView.rightTabs.includes(canvasTabId);
    const tabId = await useRootStore.getState().handleNewPopulatedTab(
      {
        title: asset.originalName || "Image from Canvas",
        content: await canvasImageBlobToDataUri(asset.blob),
        language: "image",
        languageLocked: true,
        contentKind: "text",
      },
      openOnRight,
    );
    if (tabId) useRootStore.getState().setActiveView(tabId, "image-smart-view");
    return tabId;
  }
}

export const canvasImageActionService = new CanvasImageActionService();
