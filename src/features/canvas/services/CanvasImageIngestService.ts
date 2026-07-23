import type { CanvasImageItem } from "../types";
import {
  createImageCanvasItem,
  type CanvasPoint,
} from "../utils/canvasItemFactory";
import { prepareCanvasImageAsset } from "../utils/canvasImageValidation";
import {
  canvasDocumentManager,
  type CanvasDocumentManager,
} from "./CanvasDocumentManager";

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
    });
    await this.manager.addImage(tabId, item, asset);
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
    const document = await this.manager.replaceImage(tabId, item.id, asset);
    const replacement = document.items.find(
      (candidate): candidate is CanvasImageItem =>
        candidate.id === item.id && candidate.type === "image",
    );
    if (!replacement) throw new Error("Canvas image replacement was not saved");
    return replacement;
  }
}

export const canvasImageIngestService = new CanvasImageIngestService();
