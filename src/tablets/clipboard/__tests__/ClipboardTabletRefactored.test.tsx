import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClipboardTabletRefactored } from '../ClipboardTabletRefactored';

// Mock the hook
jest.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid'),
  },
});

describe('ClipboardTabletRefactored', () => {
  describe('tablet interface', () => {
    it('should have correct tablet properties', () => {
      expect(ClipboardTabletRefactored.id).toBe('clipboard');
      expect(ClipboardTabletRefactored.label).toBe('Clipboard Manager');
      expect(ClipboardTabletRefactored.keywords).toEqual(['clipboard', 'copy', 'paste', 'history', 'manager']);
    });

    it('should create initial state correctly', () => {
      const state = ClipboardTabletRefactored.createInitialState();
      
      expect(state).toEqual({
        type: 'clipboard',
        data: {
          items: [],
          searchQuery: '',
          filterType: null,
          showFavorites: false,
          viewMode: 'list',
        },
      });
    });

    it('should serialize state correctly', () => {
      const state = ClipboardTabletRefactored.createInitialState();
      const serialized = ClipboardTabletRefactored.serializeState(state);
      
      expect(serialized).toBe(JSON.stringify(state));
    });

    it('should deserialize valid state correctly', () => {
      const originalState = ClipboardTabletRefactored.createInitialState();
      originalState.data.searchQuery = 'test';
      originalState.data.viewMode = 'card';
      
      const serialized = JSON.stringify(originalState);
      const deserialized = ClipboardTabletRefactored.deserializeState(serialized);
      
      expect(deserialized).toEqual(originalState);
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = ClipboardTabletRefactored.deserializeState('invalid json');
      
      expect(result).toEqual(ClipboardTabletRefactored.createInitialState());
      expect(consoleSpy).toHaveBeenCalledWith('Failed to deserialize clipboard state:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed state gracefully', () => {
      const result = ClipboardTabletRefactored.deserializeState('{"type":"wrong"}');
      
      expect(result).toEqual(ClipboardTabletRefactored.createInitialState());
    });

    it('should migrate legacy items correctly', () => {
      const legacyState = {
        type: 'clipboard',
        data: {
          items: [
            {
              // Missing id, type, title, etc.
              content: 'test content',
              timestamp: 1000,
            },
          ],
        },
      };
      
      const result = ClipboardTabletRefactored.deserializeState(JSON.stringify(legacyState));
      
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0]).toEqual({
        id: 'test-uuid',
        content: 'test content',
        type: 'text',
        title: 'test content',
        isFavorite: false,
        isPinned: false,
        timestamp: 1000,
        expiresAt: expect.any(Number),
        sourceApp: undefined,
      });
    });
  });

  describe('component rendering', () => {
    it('should render clipboard manager component', () => {
      const state = ClipboardTabletRefactored.createInitialState();
      const mockOnChange = jest.fn();
      
      render(ClipboardTabletRefactored.render(state, mockOnChange));
      
      expect(screen.getByText('Clipboard')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search clipboard...')).toBeInTheDocument();
      expect(screen.getByText('All Items')).toBeInTheDocument();
      expect(screen.getByText('Favorites')).toBeInTheDocument();
    });

    it('should show empty state when no items', () => {
      const state = ClipboardTabletRefactored.createInitialState();
      const mockOnChange = jest.fn();
      
      render(ClipboardTabletRefactored.render(state, mockOnChange));
      
      expect(screen.getByText('No items match your filters')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
    });

    it('should display item count correctly', () => {
      const state = ClipboardTabletRefactored.createInitialState();
      const mockOnChange = jest.fn();
      
      render(ClipboardTabletRefactored.render(state, mockOnChange));
      
      expect(screen.getByText('0 of 0 items showing')).toBeInTheDocument();
    });
  });
});