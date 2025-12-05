export type ContentType = "plaintext" | "code" | "script" | "url";

export interface VaultItem {
  id: string;
  title: string;
  content: string;
  contentType: string;
  labels: string[];
  createdTimestamp: number;
  modifiedTimestamp: number;
  isPinned: boolean;
  usageCount: number;
  lastUsedTimestamp: number;
  order: number; // For manual reordering within a category
}

export type SortOrder =
  | "title"
  | "created"
  | "modified"
  | "lastUsed"
  | "usageCount";

export type ViewMode = "card" | "list" | "canvas";

export interface VaultTabletState {
  type: "vault";
  data: {
    items: VaultItem[];
    // Legacy fields (preserved for backward compatibility)
    searchQuery?: string;
    activeFilters?: {
      labels: string[];
      contentType: ContentType | null;
      showPinnedOnly: boolean;
    };
    sortOrder?: SortOrder;
    editItem?: VaultItem | null;
    isAddingItem?: boolean;
    viewMode: ViewMode;
    // New canvas mode fields
    categories: string[];
    scratchpadContent: string;
    isScratchpadOpen: boolean;
    isSpotlightOpen: boolean;
    selectedCategory: string | null;
    scratchpadSourceItemId: string | null;
  };
}
