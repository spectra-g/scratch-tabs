import { db } from "../../db";
import { getTabContentKind } from "../../utils/tabContentKind";
import { parseCanvasAssetRecord } from "../canvas/services/CanvasAssetRepository";
import type { CanvasAssetRecord, CanvasDocument } from "../canvas/types";
import { collectDocumentAssetIds } from "../canvas/utils/canvasAssetReferences";
import { parseCanvasDocument } from "../canvas/utils/canvasSchemas";
import type { Tab } from "../../types";
import type { CanvasExportData } from "./types";

export interface CanvasExportSource {
  getDocument(documentId: string): Promise<CanvasDocument | undefined>;
  getAsset(assetId: string): Promise<CanvasAssetRecord | undefined>;
}

export interface CanvasExportCollectorContract {
  collect(tabs: readonly Tab[]): Promise<CanvasExportData>;
}

const databaseCanvasExportSource: CanvasExportSource = {
  async getDocument(documentId) {
    const record = await db.canvasDocuments.get(documentId);
    return record ? parseCanvasDocument(record) : undefined;
  },
  async getAsset(assetId) {
    const record = await db.canvasAssets.get(assetId);
    return record ? parseCanvasAssetRecord(record) : undefined;
  },
};

export class CanvasExportCollector implements CanvasExportCollectorContract {
  constructor(
    private readonly source: CanvasExportSource = databaseCanvasExportSource,
  ) {}

  async collect(tabs: readonly Tab[]): Promise<CanvasExportData> {
    const canvasTabs = tabs.filter(
      (tab) => getTabContentKind(tab) === "canvas",
    );
    const documents: CanvasDocument[] = [];

    for (const tab of canvasTabs) {
      if (!tab.documentId) {
        throw new Error(`Canvas tab ${tab.title} is missing its document ID.`);
      }
      const document = await this.source.getDocument(tab.documentId);
      if (!document) {
        throw new Error(`Canvas document for ${tab.title} could not be found.`);
      }
      if (
        document.id !== tab.documentId ||
        document.tabId !== tab.id ||
        document.workspaceId !== tab.workspaceId
      ) {
        throw new Error(
          `Canvas document for ${tab.title} does not match its tab metadata.`,
        );
      }
      documents.push(document);
    }

    const assets: CanvasAssetRecord[] = [];
    for (const assetId of collectDocumentAssetIds(documents)) {
      const asset = await this.source.getAsset(assetId);
      if (!asset) {
        throw new Error(
          `Referenced Canvas asset ${assetId} could not be found.`,
        );
      }
      const referencingDocument = documents.find((document) =>
        document.items.some(
          (item) => item.type === "image" && item.assetId === assetId,
        ),
      );
      if (
        referencingDocument &&
        asset.workspaceId !== referencingDocument.workspaceId
      ) {
        throw new Error(
          `Referenced Canvas asset ${assetId} belongs to another workspace.`,
        );
      }
      assets.push(asset);
    }

    return { documents, assets };
  }
}

export const canvasExportCollector = new CanvasExportCollector();
