import { db } from "../../../db";
import type { CanvasAssetRecord, CanvasDocument } from "../types";
import { parseCanvasDocument } from "../utils/canvasSchemas";
import { parseCanvasAssetRecord } from "./CanvasAssetRepository";

export interface CanvasImagePersistenceRepositoryContract {
  saveDocumentWithAsset(
    document: CanvasDocument,
    asset: CanvasAssetRecord,
  ): Promise<void>;
  saveDocumentWithAssets(
    document: CanvasDocument,
    assets: readonly CanvasAssetRecord[],
  ): Promise<void>;
}

export class CanvasImagePersistenceRepository implements CanvasImagePersistenceRepositoryContract {
  async saveDocumentWithAsset(
    document: CanvasDocument,
    asset: CanvasAssetRecord,
  ): Promise<void> {
    return this.saveDocumentWithAssets(document, [asset]);
  }

  async saveDocumentWithAssets(
    document: CanvasDocument,
    assets: readonly CanvasAssetRecord[],
  ): Promise<void> {
    const parsedDocument = parseCanvasDocument(document);
    const parsedAssets = assets.map(parseCanvasAssetRecord);
    if (
      parsedAssets.some(
        (asset) => parsedDocument.workspaceId !== asset.workspaceId,
      )
    ) {
      throw new Error("Canvas image assets belong to a different workspace");
    }
    if (
      new Set(parsedAssets.map((asset) => asset.id)).size !==
      parsedAssets.length
    ) {
      throw new Error("Canvas image asset IDs must be unique");
    }

    await db.transaction(
      "rw",
      db.canvasDocuments,
      db.canvasAssets,
      db.tabs,
      async () => {
        if (parsedAssets.length > 0) {
          await db.canvasAssets.bulkAdd(parsedAssets);
        }
        await db.canvasDocuments.put(parsedDocument);
        await db.tabs.update(parsedDocument.tabId, {
          lastModified: parsedDocument.updatedAt,
        });
      },
    );
  }
}

export const canvasImagePersistenceRepository =
  new CanvasImagePersistenceRepository();
