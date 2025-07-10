export interface Tab {
  id: string;
  title: string;
  content?: string;
  language: string;
  languageLocked: boolean;
  isTablet?: boolean;
  tabletState?: string;
  cursorPosition: EditorPosition;
  isPinned?: boolean;
  dateCreated: number;
  lastModified: number;
  workspaceId: string;
  activeViewId?: string | null; // For extended views like CSV table editor
  previewMode?: boolean; // Per-tab preview mode for markdown/html
}

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

export interface SplitViewRecord {
  id: string;
  isSplit: boolean;
  leftTabs: string[];
  rightTabs: string[];
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  activeSide: "left" | "right" | null;
  splitRatio: number;
  workspaceId: string;
  lastModified: number;
  leftTabHistory: string[];
  rightTabHistory: string[];
}

export interface SplitViewState {
  id: string;
  isSplit: boolean;
  leftTabs: string[];
  rightTabs: string[];
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  activeSide: "left" | "right" | null;
  splitRatio: number;
  leftTabHistory: string[];
  rightTabHistory: string[];
  workspaceId: string;
}

export interface WorkspaceLink {
  id: string;
  url: string;
  title?: string;
}

export interface Workspace {
  id: string;
  name: string;
  notes?: string;
  links: WorkspaceLink[];
  createdAt: number;
  lastAccessed: number;
}

export type ResizeObserverCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver,
) => void;
