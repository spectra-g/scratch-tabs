import { db } from "../../../db";
import type { CanvasAssetRecord, CanvasDocument } from "../types";
import { parseCanvasDocument } from "../utils/canvasSchemas";
import { parseCanvasAssetRecord } from "./CanvasAssetRepository";
import {
  assertCanvasRevision,
  createCanvasTakeOverDocument,
} from "./CanvasRevisionConflict";

export interface CanvasImagePersistenceRepositoryContract {
  saveDocumentWithAsset(
    document: CanvasDocument,
    asset: CanvasAssetRecord,
    expectedRevision: number,
  ): Promise<void>;
  saveDocumentWithAssets(
    document: CanvasDocument,
    assets: readonly CanvasAssetRecord[],
    expectedRevision: number,
  ): Promise<void>;
  takeOverDocumentWithAssets(
    document: CanvasDocument,
    assets: readonly CanvasAssetRecord[],
  ): Promise<CanvasDocument>;
}

export class CanvasImagePersistenceRepository implements CanvasImagePersistenceRepositoryContract {
  async saveDocumentWithAsset(
    document: CanvasDocument,
    asset: CanvasAssetRecord,
    expectedRevision: number,
  ): Promise<void> {
    return this.saveDocumentWithAssets(document, [asset], expectedRevision);
  }

  async saveDocumentWithAssets(
    document: CanvasDocument,
    assets: readonly CanvasAssetRecord[],
    expectedRevision: number,
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
        const stored = await db.canvasDocuments.get(parsedDocument.id);
        assertCanvasRevision(stored, parsedDocument, expectedRevision);
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

  async takeOverDocumentWithAssets(
    document: CanvasDocument,
    assets: readonly CanvasAssetRecord[],
  ): Promise<CanvasDocument> {
    const parsedDocument = parseCanvasDocument(document);
    const parsedAssets = assets.map(parseCanvasAssetRecord);
    if (
      parsedAssets.some(
        (asset) => parsedDocument.workspaceId !== asset.workspaceId,
      )
    ) {
      throw new Error("Canvas image assets belong to a different workspace");
    }

    let savedDocument: CanvasDocument | undefined;
    await db.transaction(
      "rw",
      db.canvasDocuments,
      db.canvasAssets,
      db.tabs,
      async () => {
        const stored = await db.canvasDocuments.get(parsedDocument.id);
        if (!stored) {
          throw new Error(
            `Canvas document ${parsedDocument.id} no longer exists`,
          );
        }
        savedDocument = parseCanvasDocument(
          createCanvasTakeOverDocument(
            parsedDocument,
            parseCanvasDocument(stored),
          ),
        );
        if (parsedAssets.length > 0) {
          await db.canvasAssets.bulkPut(parsedAssets);
        }
        await db.canvasDocuments.put(savedDocument);
        await db.tabs.update(savedDocument.tabId, {
          lastModified: savedDocument.updatedAt,
        });
      },
    );
    if (!savedDocument) {
      throw new Error("Canvas take-over transaction did not complete");
    }
    return savedDocument;
  }
}

export const canvasImagePersistenceRepository =
  new CanvasImagePersistenceRepository();
