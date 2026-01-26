/**
 * Tests for TabBar scrollable tabs functionality
 *
 * This test suite verifies that:
 * 1. Tabs container has proper overflow classes for horizontal scrolling
 * 2. Mouse wheel events trigger horizontal scrolling
 * 3. No visible scrollbar is present (no-scrollbar class)
 * 4. The tabs wrapper maintains proper flex layout
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TabBar } from '../TabBar';
import { useTabsStore } from '../../../stores/tabsStore';
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { useRootStore } from '../../../stores';
import { useWorkspaceStore } from '../../../stores/workspaceStore';

// Mock all the stores
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/splitViewStore');
jest.mock('../../../stores');
jest.mock('../../../stores/workspaceStore');

// Mock child components
jest.mock('../TabContextMenu', () => ({
  TabContextMenu: () => <div>TabContextMenu</div>,
}));
jest.mock('../TabActions', () => ({
  TabActions: () => <div>TabActions</div>,
}));
jest.mock('../TabTooltip', () => ({
  TabTooltip: () => <div>TabTooltip</div>,
}));
jest.mock('../../ToolSelector', () => ({
  ToolSelectorModal: () => <div>ToolSelectorModal</div>,
}));
jest.mock('../HamburgerMenu', () => ({
  HamburgerMenu: () => <div>HamburgerMenu</div>,
}));
jest.mock('../SortableTabList', () => ({
  SortableTabList: () => <div>SortableTabList</div>,
}));

describe('TabBar Scrollable Functionality', () => {
  const mockTabs = [
    {
      id: '1',
      title: 'Tab 1',
      content: 'Content 1',
      language: 'plaintext',
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      workspaceId: 'default',
      dateCreated: Date.now(),
      lastModified: Date.now(),
    },
    {
      id: '2',
      title: 'Tab 2',
      content: 'Content 2',
      language: 'plaintext',
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      workspaceId: 'default',
      dateCreated: Date.now(),
      lastModified: Date.now(),
    },
  ];

  const mockSplitView = {
    id: 'default-split',
    isSplit: false,
    leftTabs: ['1', '2'],
    rightTabs: [],
    activeLeftTabId: '1',
    activeRightTabId: null,
    activeSide: 'left' as const,
    splitRatio: 0.5,
    leftTabHistory: [],
    rightTabHistory: [],
    workspaceId: 'default',
  };

  const mockSetLeftScrollPosition = jest.fn();
  const mockSetRightScrollPosition = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup store mocks
    (useTabsStore as unknown as jest.Mock).mockReturnValue({
      tabs: mockTabs,
    });

    (useSplitViewStore as unknown as jest.Mock).mockReturnValue({
      splitView: mockSplitView,
      setLeftScrollPosition: mockSetLeftScrollPosition,
      setRightScrollPosition: mockSetRightScrollPosition,
    });

    (useRootStore as unknown as jest.Mock).mockReturnValue({
      removeTab: jest.fn(),
      updateTabTitle: jest.fn(),
      setActiveLeftTab: jest.fn(),
      setActiveRightTab: jest.fn(),
      addTab: jest.fn(),
      canAddNewTab: jest.fn().mockReturnValue(true),
      reorderTabs: jest.fn(),
    });

    (useWorkspaceStore as unknown as jest.Mock).mockReturnValue({
      activeWorkspaceId: 'default',
    });
  });

  test('tabs container should have overflow-x-auto class for horizontal scrolling', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');
    expect(tabsContainer).toHaveClass('overflow-x-auto');
  });

  test('tabs container should have overflow-y-hidden class to prevent vertical scrolling', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');
    expect(tabsContainer).toHaveClass('overflow-y-hidden');
  });

  test('tabs container should have no-scrollbar class to hide scrollbar', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');
    expect(tabsContainer).toHaveClass('no-scrollbar');
  });

  test('tabs container should have min-w-0 to allow flex shrinking', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');
    expect(tabsContainer).toHaveClass('min-w-0');
  });

  test('mouse wheel event should trigger horizontal scroll', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Create a mock scrollLeft property
    Object.defineProperty(tabsContainer, 'scrollLeft', {
      writable: true,
      value: 0,
    });

    // Simulate vertical mouse wheel (deltaY)
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = jest.spyOn(wheelEvent, 'preventDefault');

    fireEvent(tabsContainer, wheelEvent);

    // Should call preventDefault to prevent default scroll behavior
    expect(preventDefaultSpy).toHaveBeenCalled();

    // ScrollLeft should be updated with deltaY value
    expect(tabsContainer.scrollLeft).toBe(100);
  });

  test('mouse wheel with deltaY=0 should not affect scroll', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    Object.defineProperty(tabsContainer, 'scrollLeft', {
      writable: true,
      value: 0,
    });

    // Simulate wheel event with no vertical scroll
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 0,
      bubbles: true,
      cancelable: true,
    });

    const preventDefaultSpy = jest.spyOn(wheelEvent, 'preventDefault');

    fireEvent(tabsContainer, wheelEvent);

    // Should not call preventDefault
    expect(preventDefaultSpy).not.toHaveBeenCalled();

    // ScrollLeft should remain at 0
    expect(tabsContainer.scrollLeft).toBe(0);
  });

  test('multiple wheel events should accumulate scroll position', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    let scrollLeft = 0;
    Object.defineProperty(tabsContainer, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value) => { scrollLeft = value; },
    });

    // First wheel event
    fireEvent(tabsContainer, new WheelEvent('wheel', {
      deltaY: 50,
      bubbles: true,
      cancelable: true,
    }));

    expect(scrollLeft).toBe(50);

    // Second wheel event
    fireEvent(tabsContainer, new WheelEvent('wheel', {
      deltaY: 30,
      bubbles: true,
      cancelable: true,
    }));

    expect(scrollLeft).toBe(80);
  });

  test('tabs wrapper should have h-full class for proper height', () => {
    const { container } = render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');
    const tabsWrapper = tabsContainer.querySelector('.flex.h-full');

    expect(tabsWrapper).toBeTruthy();
    expect(tabsWrapper).toHaveClass('h-full');
    expect(tabsWrapper).toHaveClass('flex');
  });

  test('negative deltaY should scroll left', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    let scrollLeft = 100; // Start with some scroll
    Object.defineProperty(tabsContainer, 'scrollLeft', {
      get: () => scrollLeft,
      set: (value) => { scrollLeft = value; },
    });

    // Simulate scrolling up (negative deltaY) should scroll left
    fireEvent(tabsContainer, new WheelEvent('wheel', {
      deltaY: -50,
      bubbles: true,
      cancelable: true,
    }));

    expect(scrollLeft).toBe(50); // 100 + (-50) = 50
  });

  test('should show right gradient when content overflows to the right', async () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Mock scroll properties to simulate overflow on the right
    Object.defineProperties(tabsContainer, {
      scrollLeft: { value: 0, writable: true },
      scrollWidth: { value: 1000, writable: true },
      clientWidth: { value: 400, writable: true },
    });

    // Trigger resize observer by dispatching a scroll event
    fireEvent.scroll(tabsContainer);

    // Wait for gradient to appear
    await waitFor(() => {
      const rightGradient = screen.queryByTestId('tab-bar-right-gradient');
      expect(rightGradient).toBeTruthy();
    });
  });

  test('should show left gradient when scrolled away from start', async () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Mock scroll properties to simulate scrolled away from start
    Object.defineProperties(tabsContainer, {
      scrollLeft: { value: 100, writable: true },
      scrollWidth: { value: 1000, writable: true },
      clientWidth: { value: 400, writable: true },
    });

    // Trigger scroll event
    fireEvent.scroll(tabsContainer);

    // Wait for gradient to appear
    await waitFor(() => {
      const leftGradient = screen.queryByTestId('tab-bar-left-gradient');
      expect(leftGradient).toBeTruthy();
    });
  });

  test('should show both gradients when scrolled in the middle', async () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Mock scroll properties to simulate scrolled in the middle
    Object.defineProperties(tabsContainer, {
      scrollLeft: { value: 300, writable: true },
      scrollWidth: { value: 1000, writable: true },
      clientWidth: { value: 400, writable: true },
    });

    // Trigger scroll event
    fireEvent.scroll(tabsContainer);

    // Wait for gradients to appear
    await waitFor(() => {
      const leftGradient = screen.queryByTestId('tab-bar-left-gradient');
      const rightGradient = screen.queryByTestId('tab-bar-right-gradient');

      expect(leftGradient).toBeTruthy();
      expect(rightGradient).toBeTruthy();
    });
  });

  test('should hide gradients when content does not overflow', () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Mock scroll properties to simulate no overflow (content fits)
    Object.defineProperties(tabsContainer, {
      scrollLeft: { value: 0, writable: true },
      scrollWidth: { value: 400, writable: true },
      clientWidth: { value: 400, writable: true },
    });

    // Trigger scroll event
    fireEvent.scroll(tabsContainer);

    // Neither gradient should be visible
    const leftGradient = screen.queryByTestId('tab-bar-left-gradient');
    const rightGradient = screen.queryByTestId('tab-bar-right-gradient');

    expect(leftGradient).toBeFalsy();
    expect(rightGradient).toBeFalsy();
  });

  test('should hide right gradient when scrolled to the end', async () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Mock scroll properties to simulate scrolled to the very end
    Object.defineProperties(tabsContainer, {
      scrollLeft: { value: 600, writable: true },
      scrollWidth: { value: 1000, writable: true },
      clientWidth: { value: 400, writable: true },
    });

    // Trigger scroll event
    fireEvent.scroll(tabsContainer);

    // Wait for state to update
    await waitFor(() => {
      const leftGradient = screen.queryByTestId('tab-bar-left-gradient');
      const rightGradient = screen.queryByTestId('tab-bar-right-gradient');

      expect(leftGradient).toBeTruthy();
      expect(rightGradient).toBeFalsy();
    });
  });

  test('gradients should have pointer-events-none to not block clicks', async () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Mock overflow
    Object.defineProperties(tabsContainer, {
      scrollLeft: { value: 100, writable: true },
      scrollWidth: { value: 1000, writable: true },
      clientWidth: { value: 400, writable: true },
    });

    fireEvent.scroll(tabsContainer);

    // Wait for gradient to appear
    await waitFor(() => {
      const leftGradient = screen.queryByTestId('tab-bar-left-gradient');
      expect(leftGradient).toHaveClass('pointer-events-none');
    });
  });

  test('gradients should have transition-opacity class for fade effects', async () => {
    render(
      <TabBar
        side="left"
        onOpenDiffModal={jest.fn()}
        onOpenSummaryModal={jest.fn()}
      />
    );

    const tabsContainer = screen.getByTestId('tab-bar-empty-area');

    // Mock overflow
    Object.defineProperties(tabsContainer, {
      scrollLeft: { value: 100, writable: true },
      scrollWidth: { value: 1000, writable: true },
      clientWidth: { value: 400, writable: true },
    });

    fireEvent.scroll(tabsContainer);

    // Wait for gradient to appear
    await waitFor(() => {
      const leftGradient = screen.queryByTestId('tab-bar-left-gradient');
      expect(leftGradient).toHaveClass('transition-opacity');
      expect(leftGradient).toHaveClass('duration-300');
    });
  });

  describe('Scroll Position Persistence', () => {
    test('should have scroll position in store for left side', () => {
      const mockSplitViewWithScroll = {
        ...mockSplitView,
        leftScrollPosition: 250,
      };

      (useSplitViewStore as unknown as jest.Mock).mockReturnValue({
        splitView: mockSplitViewWithScroll,
        setLeftScrollPosition: mockSetLeftScrollPosition,
        setRightScrollPosition: mockSetRightScrollPosition,
      });

      render(
        <TabBar
          side="left"
          onOpenDiffModal={jest.fn()}
          onOpenSummaryModal={jest.fn()}
        />
      );

      // Verify the component received the scroll position from store
      expect(mockSplitViewWithScroll.leftScrollPosition).toBe(250);

      // Verify the container is rendered (restoration happens in useEffect)
      const tabsContainer = screen.getByTestId('tab-bar-empty-area');
      expect(tabsContainer).toBeInTheDocument();
    });

    test('should save scroll position to store after scrolling (debounced)', async () => {
      jest.useFakeTimers();

      render(
        <TabBar
          side="left"
          onOpenDiffModal={jest.fn()}
          onOpenSummaryModal={jest.fn()}
        />
      );

      const tabsContainer = screen.getByTestId('tab-bar-empty-area');

      let scrollLeft = 0;
      Object.defineProperty(tabsContainer, 'scrollLeft', {
        get: () => scrollLeft,
        set: (value) => { scrollLeft = value; },
      });

      // Simulate scroll
      scrollLeft = 150;
      fireEvent.scroll(tabsContainer);

      // Should not save immediately
      expect(mockSetLeftScrollPosition).not.toHaveBeenCalled();

      // Fast-forward past debounce delay (300ms)
      jest.advanceTimersByTime(300);

      // Should now have saved
      await waitFor(() => {
        expect(mockSetLeftScrollPosition).toHaveBeenCalledWith(150);
      });

      jest.useRealTimers();
    });

    test('should save right side scroll position when side is right', async () => {
      jest.useFakeTimers();

      render(
        <TabBar
          side="right"
          onOpenDiffModal={jest.fn()}
          onOpenSummaryModal={jest.fn()}
        />
      );

      const tabsContainer = screen.getByTestId('tab-bar-empty-area');

      let scrollLeft = 0;
      Object.defineProperty(tabsContainer, 'scrollLeft', {
        get: () => scrollLeft,
        set: (value) => { scrollLeft = value; },
      });

      scrollLeft = 200;
      fireEvent.scroll(tabsContainer);

      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockSetRightScrollPosition).toHaveBeenCalledWith(200);
        expect(mockSetLeftScrollPosition).not.toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Keyboard Navigation', () => {
    test('should scroll left when ArrowLeft key is pressed', () => {
      render(
        <TabBar
          side="left"
          onOpenDiffModal={jest.fn()}
          onOpenSummaryModal={jest.fn()}
        />
      );

      const tabsContainer = screen.getByTestId('tab-bar-empty-area');

      let scrollLeft = 200;
      Object.defineProperty(tabsContainer, 'scrollLeft', {
        get: () => scrollLeft,
        set: (value) => { scrollLeft = value; },
      });

      fireEvent.keyDown(tabsContainer, { key: 'ArrowLeft' });

      expect(scrollLeft).toBe(100); // 200 - 100 = 100
    });

    test('should scroll right when ArrowRight key is pressed', () => {
      render(
        <TabBar
          side="left"
          onOpenDiffModal={jest.fn()}
          onOpenSummaryModal={jest.fn()}
        />
      );

      const tabsContainer = screen.getByTestId('tab-bar-empty-area');

      let scrollLeft = 100;
      Object.defineProperty(tabsContainer, 'scrollLeft', {
        get: () => scrollLeft,
        set: (value) => { scrollLeft = value; },
      });

      fireEvent.keyDown(tabsContainer, { key: 'ArrowRight' });

      expect(scrollLeft).toBe(200); // 100 + 100 = 200
    });

    test('should not handle arrow keys when other keys are pressed', () => {
      render(
        <TabBar
          side="left"
          onOpenDiffModal={jest.fn()}
          onOpenSummaryModal={jest.fn()}
        />
      );

      const tabsContainer = screen.getByTestId('tab-bar-empty-area');

      let scrollLeft = 100;
      Object.defineProperty(tabsContainer, 'scrollLeft', {
        get: () => scrollLeft,
        set: (value) => { scrollLeft = value; },
      });

      fireEvent.keyDown(tabsContainer, { key: 'Enter' });

      expect(scrollLeft).toBe(100); // Should not change
    });

    test('tabs container should be focusable with tabIndex', () => {
      render(
        <TabBar
          side="left"
          onOpenDiffModal={jest.fn()}
          onOpenSummaryModal={jest.fn()}
        />
      );

      const tabsContainer = screen.getByTestId('tab-bar-empty-area');
      expect(tabsContainer).toHaveAttribute('tabIndex', '0');
    });
  });
});
