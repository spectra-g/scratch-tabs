export interface Tab {
  id: string;
  title: string;
  content: string;
  language: string;
  languageLocked: boolean;
}

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

export interface SplitViewState {
  isSplit: boolean;
  leftTabs: string[]; // Tab IDs
  rightTabs: string[]; // Tab IDs
  activeLeftTabId: string | null;
  activeRightTabId: string | null;
  splitRatio: number; // Ratio between left and right panes (0 to 1)
}