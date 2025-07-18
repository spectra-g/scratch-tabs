import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExpiryCountdown } from '../components/ExpiryCountdown';
import { ClipboardItem } from '../types';

// Mock timers for more control
jest.useFakeTimers();

describe('ExpiryCountdown Tooltip Integration', () => {
  const mockTimestamp = 1700000000000;

  beforeEach(() => {
    jest.setSystemTime(mockTimestamp);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should show different tooltips for different states', () => {
    // Test 1: Pinned item
    const pinnedItem: ClipboardItem = {
      id: '1',
      content: 'pinned item',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 1000,
      isPinned: true,
      isFavorite: false,
      title: 'pinned item',
    };

    const { rerender, unmount } = render(<ExpiryCountdown item={pinnedItem} />);
    
    const pinnedElement = screen.getByText('Pinned').closest('div');
    expect(pinnedElement).toHaveAttribute('title', 'This item is pinned and will not expire');

    // Clean up and start fresh for each test
    unmount();

    // Test 2: Active countdown
    const activeItem: ClipboardItem = {
      id: '2',
      content: 'active item',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 5000, // 5 seconds left
      isPinned: false,
      isFavorite: false,
      title: 'active item',
    };

    const { rerender: rerender2, unmount: unmount2 } = render(<ExpiryCountdown item={activeItem} />);
    
    // Find any element with the countdown tooltip text
    const activeElement = screen.getByTitle('This item will expire when the timer finishes. Pin to keep it permanently.');
    expect(activeElement).toBeInTheDocument();

    // Clean up and start fresh
    unmount2();

    // Test 3: Already expired item
    const expiredItem: ClipboardItem = {
      id: '3',
      content: 'expired item',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp - 1000, // Already expired
      isPinned: false,
      isFavorite: false,
      title: 'expired item',
    };

    render(<ExpiryCountdown item={expiredItem} />);
    
    const expiredElement = screen.getByText('Expired').closest('div');
    expect(expiredElement).toHaveAttribute('title', 'This item has expired and will be removed');
  });

  it('should show tooltip for user interaction flow', () => {
    const activeItem: ClipboardItem = {
      id: '1',
      content: 'test item',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 2000, // 2 seconds left
      isPinned: false,
      isFavorite: false,
      title: 'test item',
    };

    render(<ExpiryCountdown item={activeItem} />);
    
    // Initially should show active tooltip
    let countdownElement = screen.getByText('00:00:02').closest('div');
    expect(countdownElement).toHaveAttribute('title', 'This item will expire when the timer finishes. Pin to keep it permanently.');

    // After 1 second, should still show active tooltip
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    countdownElement = screen.getByText('00:00:01').closest('div');
    expect(countdownElement).toHaveAttribute('title', 'This item will expire when the timer finishes. Pin to keep it permanently.');

    // After expiry, should show expired tooltip
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    countdownElement = screen.getByText('00:00:00').closest('div');
    expect(countdownElement).toHaveAttribute('title', 'This item has expired and will be removed');
  });

  it('should handle mouse events properly with tooltip', () => {
    const activeItem: ClipboardItem = {
      id: '1',
      content: 'test item',
      type: 'text',
      timestamp: mockTimestamp,
      expiresAt: mockTimestamp + 5000,
      isPinned: false,
      isFavorite: false,
      title: 'test item',
    };

    render(<ExpiryCountdown item={activeItem} />);
    
    const countdownElement = screen.getByText('00:00:05').closest('div');
    
    // Should handle mouse events without errors
    fireEvent.mouseEnter(countdownElement!);
    fireEvent.mouseLeave(countdownElement!);
    
    // Tooltip should still be present
    expect(countdownElement).toHaveAttribute('title', 'This item will expire when the timer finishes. Pin to keep it permanently.');
  });
});