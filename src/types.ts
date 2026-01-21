export type BackgroundTexture = 'grid' | 'lined' | 'texture' | 'dots' | null;

export interface RichContentAttrs {
  backgroundTexture?: BackgroundTexture;
  // Future rich text settings can be added here:
  // fontSize?: number;
  // theme?: string;
  // margins?: { top: number; bottom: number; };
}

export interface RichContent {
  type: 'doc';
  content: any[]; // TipTap content nodes
  attrs?: RichContentAttrs;
}

export interface Tab {
  id: string;
  title: string;
  content?: string;
  richContent?: RichContent; // Properly typed rich content structure
  language: string;
  languageLocked: boolean;
  isTablet?: boolean;
  tabletState?: string;
  isRich?: boolean; // New property for rich text mode
  cursorPosition: EditorPosition;
  isPinned?: boolean;
  dateCreated: number;
  lastModified: number;
  workspaceId: string;
  activeViewId?: string | null; // For extended views like CSV table editor
  previewMode?: boolean; // Per-tab preview mode for markdown/html
  fontSize?: number; // Per-tab font size for editor tabs
  smartViewIndicatorDismissed?: boolean; // Track if user dismissed smart view notification
}

export interface EditorPosition {
  lineNumber: number;
  column: number;
}

export interface EditorRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
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
  leftScrollPosition?: number;
  rightScrollPosition?: number;
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
  leftScrollPosition?: number;
  rightScrollPosition?: number;
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
