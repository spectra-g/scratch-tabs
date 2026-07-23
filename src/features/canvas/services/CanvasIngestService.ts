import type {
  CanvasAssetRecord,
  CanvasImageItem,
  CanvasItem,
  CanvasViewport,
} from "../types";
import type { CanvasPaneBounds } from "../utils/canvasCoordinates";
import type { CanvasClipboardPayload } from "../utils/canvasClipboard";
import {
  classifyCanvasInputs,
  type CanvasClassifiedInput,
  type CanvasNormalizedInput,
} from "../utils/clipboardClassification";
import {
  keepCanvasIngestItemsInViewport,
  layoutCanvasIngestItems,
} from "../utils/canvasIngestLayout";
import {
  createCodeCanvasItem,
  createImageCanvasItem,
  createTextCanvasItem,
  type CanvasPoint,
} from "../utils/canvasItemFactory";
import { prepareCanvasImageAsset } from "../utils/canvasImageValidation";
import {
  canvasAssetRepository,
  type CanvasAssetRepositoryContract,
} from "./CanvasAssetRepository";
import {
  canvasDocumentManager,
  type CanvasDocumentManager,
} from "./CanvasDocumentManager";

interface CanvasIngestLocation {
  anchor: CanvasPoint;
  pane: Pick<CanvasPaneBounds, "width" | "height">;
  viewport: CanvasViewport;
}

interface CanvasIngestTarget extends CanvasIngestLocation {
  tabId: string;
  workspaceId: string;
  nextZIndex: number;
}

const cloneAssetForWorkspace = (
  asset: CanvasAssetRecord,
  workspaceId: string,
  now: number,
): CanvasAssetRecord => ({
  ...asset,
  id: crypto.randomUUID(),
  workspaceId,
  blob: asset.blob.slice(0, asset.blob.size, asset.mimeType),
  createdAt: now,
});

export class CanvasIngestService {
  constructor(
    private readonly manager: CanvasDocumentManager = canvasDocumentManager,
    private readonly assetRepository: CanvasAssetRepositoryContract = canvasAssetRepository,
    private readonly prepareImage = prepareCanvasImageAsset,
    private readonly classifyInputs = classifyCanvasInputs,
    private readonly now: () => number = Date.now,
  ) {}

  async ingestInputs(
    target: CanvasIngestTarget,
    inputs: readonly CanvasNormalizedInput[],
  ): Promise<CanvasItem[]> {
    const classified = await this.classifyInputs(inputs);
    if (classified.length === 0) return [];

    const assets: CanvasAssetRecord[] = [];
    const items: CanvasItem[] = [];
    for (const [index, input] of classified.entries()) {
      const zIndex = target.nextZIndex + index;
      const created = await this.createItem(
        input,
        target.workspaceId,
        zIndex,
        assets,
      );
      items.push(created);
    }

    const laidOut = keepCanvasIngestItemsInViewport(
      layoutCanvasIngestItems(items, target.anchor),
      target.pane,
      target.viewport,
    );
    await this.manager.addItemsWithAssets(target.tabId, laidOut, assets);
    return laidOut;
  }

  async ingestClipboard(
    target: CanvasIngestTarget,
    payload: CanvasClipboardPayload,
  ): Promise<CanvasItem[]> {
    const now = this.now();
    const assets: CanvasAssetRecord[] = [];
    const remappedAssetIds = new Map<string, string>();

    const items = await Promise.all(
      payload.items.map(async (item, index): Promise<CanvasItem> => {
        let assetId: string | undefined;
        if (item.type === "image") {
          assetId = await this.resolveClipboardAsset(
            item,
            payload.sourceWorkspaceId,
            target.workspaceId,
            now,
            remappedAssetIds,
            assets,
          );
        }
        return {
          ...item,
          id: crypto.randomUUID(),
          x: target.anchor.x + item.x,
          y: target.anchor.y + item.y,
          zIndex: target.nextZIndex + index,
          createdAt: now,
          updatedAt: now,
          ...(item.type === "image" ? { assetId: assetId! } : {}),
        };
      }),
    );

    const positioned = keepCanvasIngestItemsInViewport(
      items,
      target.pane,
      target.viewport,
    );
    await this.manager.addItemsWithAssets(target.tabId, positioned, assets);
    return positioned;
  }

  private async createItem(
    input: CanvasClassifiedInput,
    workspaceId: string,
    zIndex: number,
    assets: CanvasAssetRecord[],
  ): Promise<CanvasItem> {
    if (input.kind === "text") {
      return createTextCanvasItem({
        position: { x: 0, y: 0 },
        zIndex,
        text: input.text,
      });
    }
    if (input.kind === "code") {
      return createCodeCanvasItem({
        position: { x: 0, y: 0 },
        zIndex,
        source: input.source,
        language: input.language,
        languageLocked: input.languageLocked,
      });
    }

    const asset = await this.prepareImage(input.file, workspaceId);
    if (!asset.width || !asset.height) {
      throw new Error("Canvas image dimensions are unavailable");
    }
    assets.push(asset);
    return createImageCanvasItem({
      position: { x: 0, y: 0 },
      zIndex,
      assetId: asset.id,
      sourceWidth: asset.width,
      sourceHeight: asset.height,
      altText: input.file.name,
    });
  }

  private async resolveClipboardAsset(
    item: CanvasImageItem,
    sourceWorkspaceId: string,
    targetWorkspaceId: string,
    now: number,
    remappedAssetIds: Map<string, string>,
    assets: CanvasAssetRecord[],
  ): Promise<string> {
    const existingRemap = remappedAssetIds.get(item.assetId);
    if (existingRemap) return existingRemap;

    const sourceAsset = await this.assetRepository.get(item.assetId);
    if (!sourceAsset || sourceAsset.workspaceId !== sourceWorkspaceId) {
      throw new Error("A copied Canvas image is no longer available.");
    }
    if (sourceWorkspaceId === targetWorkspaceId) {
      remappedAssetIds.set(item.assetId, item.assetId);
      return item.assetId;
    }

    const clonedAsset = cloneAssetForWorkspace(
      sourceAsset,
      targetWorkspaceId,
      now,
    );
    assets.push(clonedAsset);
    remappedAssetIds.set(item.assetId, clonedAsset.id);
    return clonedAsset.id;
  }
}

export const canvasIngestService = new CanvasIngestService();
