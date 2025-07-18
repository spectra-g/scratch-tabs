import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  createClipboardItem, 
  isItemExpired, 
  filterItems, 
  findItemById, 
  updateItemById, 
  removeItemById, 
  removeExpiredItems 
} from '../utils/clipboardUtils';
import { ClipboardItem, ContentType } from '../types';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid'),
  },
});

describe('clipboardUtils', () => {
  const mockTimestamp = 1700000000000;
  const mockExpiresAt = mockTimestamp + 24 * 60 * 60 * 1000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createClipboardItem', () => {
    it('should create a clipboard item with detected type', () => {
      const item = createClipboardItem('Hello world');
      
      expect(item).toEqual({
        id: 'test-uuid',
        content: 'Hello world',
        type: 'text',
        timestamp: mockTimestamp,
        expiresAt: mockExpiresAt,
        isPinned: false,
        isFavorite: false,
        title: 'Hello world',
        sourceApp: undefined,
      });
    });

    it('should create a clipboard item with specified type', () => {
      const item = createClipboardItem('https://example.com', 'link');
      
      expect(item.type).toBe('link');
      expect(item.title).toBe('example.com');
    });

    it('should create a clipboard item with source app', () => {
      const item = createClipboardItem('test', 'text', 'TestApp');
      
      expect(item.sourceApp).toBe('TestApp');
    });
  });

  describe('isItemExpired', () => {
    it('should return false for pinned items', () => {
      const item: ClipboardItem = {
        id: '1',
        content: 'test',
        type: 'text',
        timestamp: 0,
        expiresAt: 0,
        isPinned: true,
        isFavorite: false,
        title: 'test',
      };

      expect(isItemExpired(item)).toBe(false);
    });

    it('should return true for expired unpinned items', () => {
      const item: ClipboardItem = {
        id: '1',
        content: 'test',
        type: 'text',
        timestamp: 0,
        expiresAt: mockTimestamp - 1000,
        isPinned: false,
        isFavorite: false,
        title: 'test',
      };

      expect(isItemExpired(item)).toBe(true);
    });

    it('should return false for non-expired items', () => {
      const item: ClipboardItem = {
        id: '1',
        content: 'test',
        type: 'text',
        timestamp: 0,
        expiresAt: mockTimestamp + 1000,
        isPinned: false,
        isFavorite: false,
        title: 'test',
      };

      expect(isItemExpired(item)).toBe(false);
    });
  });

  describe('filterItems', () => {
    const mockItems: ClipboardItem[] = [
      {
        id: '1',
        content: 'Hello world',
        type: 'text',
        timestamp: 1000,
        expiresAt: 2000,
        isPinned: false,
        isFavorite: true,
        title: 'Hello world',
      },
      {
        id: '2',
        content: 'https://example.com',
        type: 'link',
        timestamp: 2000,
        expiresAt: 3000,
        isPinned: true,
        isFavorite: false,
        title: 'example.com',
      },
      {
        id: '3',
        content: 'data:image/png;base64,abc',
        type: 'image',
        timestamp: 3000,
        expiresAt: 4000,
        isPinned: false,
        isFavorite: false,
        title: 'Image - 2023',
      },
    ];

    it('should filter by search query', () => {
      const result = filterItems(mockItems, 'hello', null, false);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter by content type', () => {
      const result = filterItems(mockItems, '', 'link', false);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should filter by favorites', () => {
      const result = filterItems(mockItems, '', null, true);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should sort by pinned first', () => {
      const result = filterItems(mockItems, '', null, false);
      expect(result[0].id).toBe('2'); // Pinned item first
    });

    it('should sort by favorites after pinned', () => {
      const result = filterItems(mockItems, '', null, false);
      expect(result[1].id).toBe('1'); // Favorite item second
    });

    it('should sort by timestamp for same priority', () => {
      const result = filterItems(mockItems, '', null, false);
      expect(result[2].id).toBe('3'); // Most recent non-pinned, non-favorite
    });
  });

  describe('findItemById', () => {
    const mockItems: ClipboardItem[] = [
      {
        id: '1',
        content: 'test1',
        type: 'text',
        timestamp: 1000,
        expiresAt: 2000,
        isPinned: false,
        isFavorite: false,
        title: 'test1',
      },
      {
        id: '2',
        content: 'test2',
        type: 'text',
        timestamp: 2000,
        expiresAt: 3000,
        isPinned: false,
        isFavorite: false,
        title: 'test2',
      },
    ];

    it('should find item by id', () => {
      const result = findItemById(mockItems, '1');
      expect(result?.id).toBe('1');
      expect(result?.content).toBe('test1');
    });

    it('should return undefined for non-existent id', () => {
      const result = findItemById(mockItems, '999');
      expect(result).toBeUndefined();
    });
  });

  describe('updateItemById', () => {
    const mockItems: ClipboardItem[] = [
      {
        id: '1',
        content: 'test1',
        type: 'text',
        timestamp: 1000,
        expiresAt: 2000,
        isPinned: false,
        isFavorite: false,
        title: 'test1',
      },
      {
        id: '2',
        content: 'test2',
        type: 'text',
        timestamp: 2000,
        expiresAt: 3000,
        isPinned: false,
        isFavorite: false,
        title: 'test2',
      },
    ];

    it('should update item by id', () => {
      const result = updateItemById(mockItems, '1', { isPinned: true });
      
      expect(result).toHaveLength(2);
      expect(result[0].isPinned).toBe(true);
      expect(result[1].isPinned).toBe(false);
    });

    it('should not modify original array', () => {
      const result = updateItemById(mockItems, '1', { isPinned: true });
      
      expect(mockItems[0].isPinned).toBe(false);
      expect(result[0].isPinned).toBe(true);
    });

    it('should handle non-existent id', () => {
      const result = updateItemById(mockItems, '999', { isPinned: true });
      
      expect(result).toHaveLength(2);
      expect(result[0].isPinned).toBe(false);
      expect(result[1].isPinned).toBe(false);
    });
  });

  describe('removeItemById', () => {
    const mockItems: ClipboardItem[] = [
      {
        id: '1',
        content: 'test1',
        type: 'text',
        timestamp: 1000,
        expiresAt: 2000,
        isPinned: false,
        isFavorite: false,
        title: 'test1',
      },
      {
        id: '2',
        content: 'test2',
        type: 'text',
        timestamp: 2000,
        expiresAt: 3000,
        isPinned: false,
        isFavorite: false,
        title: 'test2',
      },
    ];

    it('should remove item by id', () => {
      const result = removeItemById(mockItems, '1');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should handle non-existent id', () => {
      const result = removeItemById(mockItems, '999');
      
      expect(result).toHaveLength(2);
    });
  });

  describe('removeExpiredItems', () => {
    const mockItems: ClipboardItem[] = [
      {
        id: '1',
        content: 'expired',
        type: 'text',
        timestamp: 1000,
        expiresAt: mockTimestamp - 1000,
        isPinned: false,
        isFavorite: false,
        title: 'expired',
      },
      {
        id: '2',
        content: 'pinned expired',
        type: 'text',
        timestamp: 2000,
        expiresAt: mockTimestamp - 1000,
        isPinned: true,
        isFavorite: false,
        title: 'pinned expired',
      },
      {
        id: '3',
        content: 'not expired',
        type: 'text',
        timestamp: 3000,
        expiresAt: mockTimestamp + 1000,
        isPinned: false,
        isFavorite: false,
        title: 'not expired',
      },
    ];

    it('should remove expired items but keep pinned ones', () => {
      const result = removeExpiredItems(mockItems);
      
      expect(result).toHaveLength(2);
      expect(result.find(item => item.id === '1')).toBeUndefined();
      expect(result.find(item => item.id === '2')).toBeDefined();
      expect(result.find(item => item.id === '3')).toBeDefined();
    });
  });
});