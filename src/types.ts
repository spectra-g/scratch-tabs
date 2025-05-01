export interface Tab {
  id: string;
  title: string;
  content: string;
  language: string;
  languageLocked: boolean;
  isTablet?: boolean;
  tabletState?: string;
  cursorPosition: EditorPosition;
  isPinned?: boolean;
  dateCreated: number;
  lastModified: number;
  workspaceId: string; // New field
}

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

export interface SplitViewState {
  isSplit: boolean;
  leftTabs: string[];
  rightTabs: string[];
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  splitRatio: number;
  leftTabHistory: string[];
  rightTabHistory: string[];
  activeSide: string | null;
  workspaceId: string; // New field
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

export type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;
