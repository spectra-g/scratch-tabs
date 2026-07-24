import { Workspace, Tab, SplitViewState } from "../../types";
import type { CanvasAssetRecord, CanvasDocument } from "../canvas/types";

export const EXPORT_FORMAT_VERSION = "2.0.0";
export const LEGACY_EXPORT_FORMAT_VERSIONS = new Set(["1.0.0", "1.1.0"]);
export const WORKSPACE_DATA_PATH = "data/workspaces.json";

export interface ExportData {
  workspaces: Workspace[];
  tabs: Tab[];
  splitViews: SplitViewState[];
}

export interface ExportFileContent {
  exportFormatVersion: string;
  exportedAt: string; // ISO 8601 timestamp
  data: ExportData;
}

export type ArchiveEntryKind =
  | "workspace-data"
  | "canvas-document"
  | "canvas-asset";

export interface ArchiveManifestEntry {
  path: string;
  kind: ArchiveEntryKind;
  sha256: string;
  byteLength: number;
  id?: string;
  workspaceId?: string;
  mimeType?: string;
  originalName?: string;
  width?: number;
  height?: number;
  createdAt?: number;
}

export interface ArchiveManifest {
  exportFormatVersion: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  entries: ArchiveManifestEntry[];
}

export interface CanvasExportData {
  documents: CanvasDocument[];
  assets: CanvasAssetRecord[];
}

export interface DecodedWorkspaceArchive {
  exportFormatVersion: string;
  data: ExportData;
  canvasDocuments: CanvasDocument[];
  canvasAssets: CanvasAssetRecord[];
  canvasErrors: string[];
}

export interface ImportSummaryItem {
  name: string;
  tabCount: number;
  status: "imported" | "merged" | "skipped"; // Or more granular status
  reason?: string;
  canvasCount?: number;
  skippedCanvasCount?: number;
}

export interface ImportProcessSummary {
  importedWorkspaces: ImportSummaryItem[];
  errors: string[];
  canvasErrors: string[];
}
