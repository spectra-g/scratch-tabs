export interface Tab {
  id: string;
  title: string;
  content: string;
  language: string;
  languageLocked: boolean;
  isTablet?: boolean;
  tabletState?: string;
  cursorPosition: EditorPosition;
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
}

export type ResizeObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;