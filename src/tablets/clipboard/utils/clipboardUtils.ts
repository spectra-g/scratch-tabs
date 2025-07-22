import { ClipboardItem, ContentType } from '../types';
import { detectContentType, generateTitle, TWENTY_FOUR_HOURS_MS } from './contentUtils';

export const createClipboardItem = (
  content: string,
  type?: ContentType,
  sourceApp?: string
): ClipboardItem => {
  const detectedType = type || detectContentType(content);
  return {
    id: crypto.randomUUID(),
    content,
    type: detectedType,
    timestamp: Date.now(),
    expiresAt: Date.now() + TWENTY_FOUR_HOURS_MS,
    isPinned: false,
    isFavorite: false,
    title: generateTitle(content, detectedType),
    sourceApp,
  };
};

export const isItemExpired = (item: ClipboardItem): boolean => {
  return !item.isPinned && item.expiresAt <= Date.now();
};

export const filterItems = (
  items: ClipboardItem[],
  searchQuery: string,
  filterType: ContentType | null,
  showFavorites: boolean
): ClipboardItem[] => {
  return items
    .filter((item) => {
      if (showFavorites && !item.isFavorite) return false;
      if (filterType && item.type !== filterType) return false;
      if (
        searchQuery &&
        !item.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return b.timestamp - a.timestamp;
    });
};

export const findItemById = (items: ClipboardItem[], id: string): ClipboardItem | undefined => {
  return items.find(item => item.id === id);
};

export const updateItemById = (
  items: ClipboardItem[],
  id: string,
  updates: Partial<ClipboardItem>
): ClipboardItem[] => {
  return items.map(item => 
    item.id === id ? { ...item, ...updates } : item
  );
};

export const removeItemById = (items: ClipboardItem[], id: string): ClipboardItem[] => {
  return items.filter(item => item.id !== id);
};

export const removeExpiredItems = (items: ClipboardItem[]): ClipboardItem[] => {
  return items.filter(item => !isItemExpired(item));
};