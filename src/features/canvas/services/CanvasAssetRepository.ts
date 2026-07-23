import { db } from "../../../db";
import type { CanvasAssetRecord } from "../types";
import { CANVAS_IMAGE_MIME_TYPES } from "../constants";

const supportedMimeTypes = new Set<string>(CANVAS_IMAGE_MIME_TYPES);

export interface CanvasAssetRepositoryContract {
  get(assetId: string): Promise<CanvasAssetRecord | undefined>;
}

const parseOptionalPositiveInteger = (
  value: unknown,
  field: string,
): number | undefined => {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new Error(
      `Invalid Canvas asset: ${field} must be a positive integer`,
    );
  }
  return value as number;
};

export const parseCanvasAssetRecord = (value: unknown): CanvasAssetRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid Canvas asset record");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    !record.id ||
    typeof record.workspaceId !== "string" ||
    !record.workspaceId ||
    !(record.blob instanceof Blob) ||
    typeof record.mimeType !== "string" ||
    !record.mimeType ||
    !supportedMimeTypes.has(record.mimeType.toLowerCase()) ||
    record.blob.type.toLowerCase() !== record.mimeType.toLowerCase() ||
    !Number.isInteger(record.byteLength) ||
    (record.byteLength as number) < 0 ||
    record.byteLength !== record.blob.size ||
    typeof record.createdAt !== "number" ||
    !Number.isFinite(record.createdAt)
  ) {
    throw new Error("Invalid Canvas asset record");
  }
  if (
    record.originalName !== undefined &&
    typeof record.originalName !== "string"
  ) {
    throw new Error("Invalid Canvas asset: originalName must be a string");
  }
  if (record.sha256 !== undefined && typeof record.sha256 !== "string") {
    throw new Error("Invalid Canvas asset: sha256 must be a string");
  }
  return {
    id: record.id,
    workspaceId: record.workspaceId,
    blob: record.blob,
    mimeType: record.mimeType,
    ...(record.originalName === undefined
      ? {}
      : { originalName: record.originalName }),
    byteLength: record.byteLength as number,
    ...(record.width === undefined
      ? {}
      : { width: parseOptionalPositiveInteger(record.width, "width") }),
    ...(record.height === undefined
      ? {}
      : { height: parseOptionalPositiveInteger(record.height, "height") }),
    ...(record.sha256 === undefined ? {} : { sha256: record.sha256 }),
    createdAt: record.createdAt,
  };
};

export class CanvasAssetRepository implements CanvasAssetRepositoryContract {
  async get(assetId: string): Promise<CanvasAssetRecord | undefined> {
    const record = await db.canvasAssets.get(assetId);
    return record ? parseCanvasAssetRecord(record) : undefined;
  }
}

export const canvasAssetRepository = new CanvasAssetRepository();
