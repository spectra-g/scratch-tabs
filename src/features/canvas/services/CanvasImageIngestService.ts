import type { CanvasImageItem } from "../types";
import {
  createImageCanvasItem,
  type CanvasPoint,
} from "../utils/canvasItemFactory";
import {
  createCanvasStorageFullError,
  isQuotaExceededError,
  prepareCanvasImageAsset,
} from "../utils/canvasImageValidation";
import {
  canvasDocumentManager,
  type CanvasDocumentManager,
} from "./CanvasDocumentManager";

const saveImageAsset = async <T>(save: () => Promise<T>): Promise<T> => {
  try {
    return await save();
  } catch (error) {
    if (isQuotaExceededError(error)) throw createCanvasStorageFullError();
    throw error;
  }
};

export class CanvasImageIngestService {
  constructor(
    private readonly manager: CanvasDocumentManager = canvasDocumentManager,
    private readonly prepareAsset = prepareCanvasImageAsset,
  ) {}

  async add({
    tabId,
    workspaceId,
    file,
    position,
    zIndex,
  }: {
    tabId: string;
    workspaceId: string;
    file: File;
    position: CanvasPoint;
    zIndex: number;
  }): Promise<CanvasImageItem> {
    const asset = await this.prepareAsset(file, workspaceId);
    if (!asset.width || !asset.height) {
      throw new Error("Canvas image dimensions are unavailable");
    }
    const item = createImageCanvasItem({
      position,
      zIndex,
      assetId: asset.id,
      sourceWidth: asset.width,
      sourceHeight: asset.height,
      altText: file.name,
      originalName: file.name,
    });
    await saveImageAsset(() => this.manager.addImage(tabId, item, asset));
    return item;
  }

  async replace({
    tabId,
    workspaceId,
    item,
    file,
  }: {
    tabId: string;
    workspaceId: string;
    item: CanvasImageItem;
    file: File;
  }): Promise<CanvasImageItem> {
    const asset = await this.prepareAsset(file, workspaceId);
    const document = await saveImageAsset(() =>
      this.manager.replaceImage(tabId, item.id, asset, file.name),
    );
    const replacement = document.items.find(
      (candidate): candidate is CanvasImageItem =>
        candidate.id === item.id && candidate.type === "image",
    );
    if (!replacement) throw new Error("Canvas image replacement was not saved");
    return replacement;
  }
}

export const canvasImageIngestService = new CanvasImageIngestService();
