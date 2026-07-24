import type { SplitViewState, Tab, Workspace } from "../../types";
import type {
  CanvasAssetRecord,
  CanvasDocument,
  CanvasImageItem,
} from "../canvas/types";
import { createEmptyCanvasDocument } from "../canvas/utils/canvasSchemas";
import type { ExportData } from "./types";

export const workspace: Workspace = {
  id: "workspace-1",
  name: "Project",
  links: [],
  createdAt: 1,
  lastAccessed: 2,
};

export const textTab: Tab = {
  id: "tab-text",
  title: "Notes",
  content: "keep me",
  language: "plaintext",
  languageLocked: false,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 2,
  workspaceId: workspace.id,
};

export const canvasTab: Tab = {
  id: "tab-canvas",
  documentId: "document-1",
  contentKind: "canvas",
  title: "Architecture",
  content: "",
  language: "plaintext",
  languageLocked: true,
  cursorPosition: { lineNumber: 1, column: 1 },
  dateCreated: 1,
  lastModified: 2,
  workspaceId: workspace.id,
};

const imageItem: CanvasImageItem = {
  id: "image-1",
  type: "image",
  x: 125,
  y: -40,
  width: 640,
  height: 360,
  zIndex: 3,
  assetId: "asset-1",
  altText: "system diagram",
  originalName: "diagram.png",
  objectFit: "contain",
  createdAt: 3,
  updatedAt: 4,
};

export const canvasDocument: CanvasDocument = {
  ...createEmptyCanvasDocument({
    id: canvasTab.documentId!,
    tabId: canvasTab.id,
    workspaceId: workspace.id,
    now: 1,
  }),
  revision: 7,
  items: [imageItem],
  settings: { background: "grid", snapToGrid: true },
  searchText: "system diagram diagram.png",
  updatedAt: 4,
};

export const canvasAsset: CanvasAssetRecord = {
  id: "asset-1",
  workspaceId: workspace.id,
  blob: new Blob(["image"], { type: "image/png" }),
  mimeType: "image/png",
  originalName: "diagram.png",
  byteLength: 5,
  width: 640,
  height: 360,
  createdAt: 3,
};

export const splitView: SplitViewState = {
  id: "split-1",
  isSplit: true,
  leftTabs: [textTab.id],
  rightTabs: [canvasTab.id],
  activeLeftTabId: textTab.id,
  activeRightTabId: canvasTab.id,
  activeSide: "right",
  splitRatio: 0.5,
  leftTabHistory: [textTab.id],
  rightTabHistory: [canvasTab.id],
  workspaceId: workspace.id,
};

export const exportData: ExportData = {
  workspaces: [workspace],
  tabs: [textTab, canvasTab],
  splitViews: [splitView],
};
