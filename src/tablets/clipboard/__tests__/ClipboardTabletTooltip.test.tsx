import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClipboardTablet } from '../ClipboardTablet';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid'),
  },
});

// Mock the hook
jest.mock('../../../hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

describe('ClipboardTablet Tooltip Integration', () => {
  it('should show tooltip for expiry countdown in original tablet', () => {
    // Create a state with a clipboard item
    const state = {
      type: 'clipboard' as const,
      data: {
        items: [
          {
            id: 'test-item-1',
            content: 'Test content',
            type: 'text' as const,
            timestamp: Date.now(),
            expiresAt: Date.now() + 5000, // 5 seconds left
            isPinned: false,
            isFavorite: false,
            title: 'Test content',
          },
        ],
        searchQuery: '',
        filterType: null,
        showFavorites: false,
        viewMode: 'list' as const,
      },
    };

    const mockOnChange = jest.fn();
    
    render(ClipboardTablet.render(state, mockOnChange));
    
    // Should find the countdown element with tooltip
    const countdownElement = screen.getByTitle('This item will expire when the timer finishes. Pin to keep it permanently.');
    expect(countdownElement).toBeInTheDocument();
  });

  it('should show tooltip for pinned item in original tablet', () => {
    // Create a state with a pinned clipboard item
    const state = {
      type: 'clipboard' as const,
      data: {
        items: [
          {
            id: 'test-item-1',
            content: 'Pinned content',
            type: 'text' as const,
            timestamp: Date.now(),
            expiresAt: Date.now() + 5000,
            isPinned: true,
            isFavorite: false,
            title: 'Pinned content',
          },
        ],
        searchQuery: '',
        filterType: null,
        showFavorites: false,
        viewMode: 'list' as const,
      },
    };

    const mockOnChange = jest.fn();
    
    render(ClipboardTablet.render(state, mockOnChange));
    
    // Should find the pinned element with tooltip
    const pinnedElement = screen.getByTitle('This item is pinned and will not expire');
    expect(pinnedElement).toBeInTheDocument();
    
    // Should also show the "Pinned" text
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });
});