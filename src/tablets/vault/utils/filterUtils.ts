import { VaultItem, SortOrder } from "../types";

/**
 * Filter items based on search query and active filters
 */
export function filterItems(
  items: VaultItem[],
  searchQuery: string,
  activeFilters: {
    labels: string[];
    contentType: string | null;
    showPinnedOnly: boolean;
  },
): VaultItem[] {
  return items.filter((item) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = item.title.toLowerCase().includes(query);
      const matchesContent = item.content.toLowerCase().includes(query);
      const matchesLabels = item.labels.some((label) =>
        label.toLowerCase().includes(query),
      );

      if (!matchesTitle && !matchesContent && !matchesLabels) {
        return false;
      }
    }

    // Filter by labels
    if (activeFilters.labels.length > 0) {
      // Item must have ALL selected labels (AND logic)
      const hasAllLabels = activeFilters.labels.every((label) =>
        item.labels.includes(label),
      );

      if (!hasAllLabels) {
        return false;
      }
    }

    // Filter by content type
    if (
      activeFilters.contentType &&
      item.contentType !== activeFilters.contentType
    ) {
      return false;
    }

    // Filter by pinned status
    if (activeFilters.showPinnedOnly && !item.isPinned) {
      return false;
    }

    return true;
  });
}

/**
 * Sort items based on sort order
 */
export function sortItems(
  items: VaultItem[],
  sortOrder: SortOrder,
): VaultItem[] {
  const sortedItems = [...items];

  switch (sortOrder) {
    case "title":
      sortedItems.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "created":
      sortedItems.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
      break;
    case "modified":
      sortedItems.sort((a, b) => b.modifiedTimestamp - a.modifiedTimestamp);
      break;
    case "lastUsed":
      sortedItems.sort((a, b) => b.lastUsedTimestamp - a.lastUsedTimestamp);
      break;
    case "usageCount":
      sortedItems.sort((a, b) => b.usageCount - a.usageCount);
      break;
    default:
      // Default to lastUsed
      sortedItems.sort((a, b) => b.lastUsedTimestamp - a.lastUsedTimestamp);
  }

  // Always put pinned items at the top, maintaining the sort order within pinned items
  return [
    ...sortedItems.filter((item) => item.isPinned),
    ...sortedItems.filter((item) => !item.isPinned),
  ];
}
