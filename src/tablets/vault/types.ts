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
}

export type SortOrder =
  | "title"
  | "created"
  | "modified"
  | "lastUsed"
  | "usageCount";

export type ViewMode = "card" | "list";

export interface VaultTabletState {
  type: "vault";
  data: {
    items: VaultItem[];
    searchQuery: string;
    activeFilters: {
      labels: string[];
      contentType: ContentType | null;
      showPinnedOnly: boolean;
    };
    sortOrder: SortOrder;
    editItem: VaultItem | null;
    isAddingItem: boolean;
    viewMode: ViewMode;
  };
}
