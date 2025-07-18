import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExpiryCountdown } from '../components/ExpiryCountdown';
import { ClipboardItem } from '../types';

// Mock timers
jest.useFakeTimers();

describe('ExpiryCountdown', () => {
  const mockTimestamp = 1700000000000;

  beforeEach(() => {
    jest.setSystemTime(mockTimestamp);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should show pinned status for pinned items', () => {
    const pinnedItem: ClipboardItem = {
      id: '1',
      content: 'test',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 1000,
      isPinned: true,
      isFavorite: false,
      title: 'test',
    };

    render(<ExpiryCountdown item={pinnedItem} />);
    
    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.queryByText(/\d{2}:\d{2}:\d{2}/)).not.toBeInTheDocument();
    
    // Check tooltip for pinned items
    const pinnedDiv = screen.getByText('Pinned').closest('div');
    expect(pinnedDiv).toHaveAttribute('title', 'This item is pinned and will not expire');
  });

  it('should show countdown for non-pinned items', () => {
    const nonPinnedItem: ClipboardItem = {
      id: '1',
      content: 'test',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 3665000, // 1 hour, 1 minute, 5 seconds
      isPinned: false,
      isFavorite: false,
      title: 'test',
    };

    render(<ExpiryCountdown item={nonPinnedItem} />);
    
    expect(screen.getByText('01:01:05')).toBeInTheDocument();
    
    // Check tooltip for countdown items
    const countdownDiv = screen.getByText('01:01:05').closest('div');
    expect(countdownDiv).toHaveAttribute('title', 'This item will expire when the timer finishes. Pin to keep it permanently.');
  });

  it('should update countdown over time', () => {
    const nonPinnedItem: ClipboardItem = {
      id: '1',
      content: 'test',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 5000, // 5 seconds
      isPinned: false,
      isFavorite: false,
      title: 'test',
    };

    render(<ExpiryCountdown item={nonPinnedItem} />);
    
    expect(screen.getByText('00:00:05')).toBeInTheDocument();
    
    // Fast forward 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(screen.getByText('00:00:04')).toBeInTheDocument();
  });

  it('should stop countdown when expired', () => {
    const nonPinnedItem: ClipboardItem = {
      id: '1',
      content: 'test',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 1000, // 1 second
      isPinned: false,
      isFavorite: false,
      title: 'test',
    };

    render(<ExpiryCountdown item={nonPinnedItem} />);
    
    expect(screen.getByText('00:00:01')).toBeInTheDocument();
    
    // Fast forward past expiry
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
    
    // Check tooltip for expired items (when timer reaches 0)
    const expiredDiv = screen.getByText('00:00:00').closest('div');
    expect(expiredDiv).toHaveAttribute('title', 'This item has expired and will be removed');
  });

  it('should show expired immediately for already expired items', () => {
    const expiredItem: ClipboardItem = {
      id: '1',
      content: 'test',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp - 1000, // Already expired
      isPinned: false,
      isFavorite: false,
      title: 'test',
    };

    render(<ExpiryCountdown item={expiredItem} />);
    
    expect(screen.getByText('Expired')).toBeInTheDocument();
    
    // Check tooltip for expired items
    const expiredDiv = screen.getByText('Expired').closest('div');
    expect(expiredDiv).toHaveAttribute('title', 'This item has expired and will be removed');
  });

  it('should use custom icon size', () => {
    const pinnedItem: ClipboardItem = {
      id: '1',
      content: 'test',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 1000,
      isPinned: true,
      isFavorite: false,
      title: 'test',
    };

    const { container } = render(<ExpiryCountdown item={pinnedItem} size={16} />);
    
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('width', '16');
    expect(icon).toHaveAttribute('height', '16');
  });

  it('should clean up timer on unmount', () => {
    const nonPinnedItem: ClipboardItem = {
      id: '1',
      content: 'test',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 5000,
      isPinned: false,
      isFavorite: false,
      title: 'test',
    };

    const { unmount } = render(<ExpiryCountdown item={nonPinnedItem} />);
    
    const timerCount = jest.getTimerCount();
    expect(timerCount).toBeGreaterThan(0);
    
    unmount();
    
    // Timer should be cleaned up
    expect(jest.getTimerCount()).toBe(0);
  });
});