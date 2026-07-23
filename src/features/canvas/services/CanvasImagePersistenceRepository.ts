import { db } from "../../../db";
import type { CanvasAssetRecord, CanvasDocument } from "../types";
import { parseCanvasDocument } from "../utils/canvasSchemas";
import { parseCanvasAssetRecord } from "./CanvasAssetRepository";

export interface CanvasImagePersistenceRepositoryContract {
  saveDocumentWithAsset(
    document: CanvasDocument,
    asset: CanvasAssetRecord,
  ): Promise<void>;
}

export class CanvasImagePersistenceRepository implements CanvasImagePersistenceRepositoryContract {
  async saveDocumentWithAsset(
    document: CanvasDocument,
    asset: CanvasAssetRecord,
  ): Promise<void> {
    const parsedDocument = parseCanvasDocument(document);
    const parsedAsset = parseCanvasAssetRecord(asset);
    if (parsedDocument.workspaceId !== parsedAsset.workspaceId) {
      throw new Error("Canvas image asset belongs to a different workspace");
    }

    await db.transaction(
      "rw",
      db.canvasDocuments,
      db.canvasAssets,
      db.tabs,
      async () => {
        await db.canvasAssets.add(parsedAsset);
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
