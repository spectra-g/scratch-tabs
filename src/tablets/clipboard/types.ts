export type ContentType = "text" | "image" | "link" | "color";
export type ViewMode = "list" | "card";

export interface ClipboardItem {
  id: string;
  content: string;
  type: ContentType;
  timestamp: number;
  expiresAt: number;
  isPinned: boolean;
  isFavorite: boolean;
  title: string;
  sourceApp?: string;
}

export interface ClipboardData {
  items: ClipboardItem[];
  searchQuery: string;
  filterType: ContentType | null;
  showFavorites: boolean;
  viewMode: ViewMode;
}

export interface ClipboardTabletState {
  type: "clipboard";
  data: ClipboardData;
}

export interface ClipboardOperations {
  handlePaste: () => Promise<void>;
  handleCopy: (id: string, content: string, type: ContentType) => Promise<void>;
  handleDelete: (id: string) => void;
  handleTogglePin: (id: string) => void;
  handleToggleFavorite: (id: string) => void;
}

export interface ClipboardFilters {
  searchQuery: string;
  filterType: ContentType | null;
  showFavorites: boolean;
}

export interface ClipboardSettings {
  viewMode: ViewMode;
}