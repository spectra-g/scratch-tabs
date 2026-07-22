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

export type CanvasItemType = "text" | "code";

export interface CanvasItemBase {
  id: string;
  type: CanvasItemType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  createdAt: number;
  updatedAt: number;
}

export interface CanvasTextItem extends CanvasItemBase {
  type: "text";
  text: string;
  noteColor?: string;
}

export interface CanvasCodeItem extends CanvasItemBase {
  type: "code";
  source: string;
  language: string;
  languageLocked: boolean;
  collapsed: boolean;
  expandedHeight?: number;
  wrap: boolean;
}

export type CanvasItem = CanvasTextItem | CanvasCodeItem;

export interface CanvasDocument {
  id: string;
  tabId: string;
  workspaceId: string;
  schemaVersion: number;
  revision: number;
  items: CanvasItem[];
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

export interface CanvasDocumentSaveState {
  status: CanvasSaveStatus;
  revision: number;
  error?: string;
  lastModified?: number;
}

export type CanvasInteractionMode = "navigation" | "editing";
export type CanvasFocusOrigin = "keyboard" | "pointer" | null;

export interface CanvasInteractionState {
  mode: CanvasInteractionMode;
  focusedItemId: string | null;
  selectedItemIds: string[];
  focusOrigin: CanvasFocusOrigin;
}
