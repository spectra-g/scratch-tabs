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
  dateCreated: number; // Unix timestamp in milliseconds
  lastModified: number; // Unix timestamp in milliseconds
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
}

export type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;