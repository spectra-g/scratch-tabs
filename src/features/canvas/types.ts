export type CanvasBackground = "dots" | "grid" | "none";

export interface CanvasSettings {
  background: CanvasBackground;
  snapToGrid: boolean;
}

export interface CanvasEdge {
  id: string;
  sourceItemId: string;
  targetItemId: string;
}

export interface CanvasDocument {
  id: string;
  tabId: string;
  workspaceId: string;
  schemaVersion: number;
  revision: number;
  items: never[];
  edges: CanvasEdge[];
  settings: CanvasSettings;
  searchText: string;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface CanvasSessionRecord {
  tabId: string;
  viewport: CanvasViewport;
  lastTool: string;
  updatedAt: number;
}

export interface CanvasAssetRecord {
  id: string;
  workspaceId: string;
  blob: Blob;
  mimeType: string;
  originalName?: string;
  byteLength: number;
  width?: number;
  height?: number;
  sha256?: string;
  createdAt: number;
}

export interface ActiveCanvasDocument {
  document: CanvasDocument;
  session: CanvasSessionRecord;
}

export type CanvasSaveStatus = "loading" | "saved" | "saving" | "error";
