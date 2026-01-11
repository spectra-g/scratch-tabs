import { renderHook, act } from '@testing-library/react';
import { useContextMenuConfig } from '../UseContextMenuConfig';
import { useTabsStore } from '../../../stores/tabsStore';
import { Tab } from '../../../types';

// Mock dependencies
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/splitViewStore');
jest.mock('../../../stores/rootStore');
jest.mock('../../../stores/batchToolsStore');
jest.mock('../../../services/modelManager');

// Import store types for proper mocking
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { useRootStore } from '../../../stores/rootStore';
import { useBatchToolsStore } from '../../../stores/batchToolsStore';

const mockUseSplitViewStore = useSplitViewStore as jest.MockedFunction<typeof useSplitViewStore>;
const mockUseRootStore = useRootStore as jest.MockedFunction<typeof useRootStore>;
const mockUseBatchToolsStore = useBatchToolsStore as jest.MockedFunction<typeof useBatchToolsStore>;

const mockUseTabsStore = useTabsStore as jest.MockedFunction<typeof useTabsStore>;

describe('UseContextMenuConfig - Actions and Structure', () => {
  const mockTab: Tab = {
    id: 'test-tab-id',
    title: 'Test Document',
    content: 'This is a test document content.',
    language: 'plaintext',
    languageLocked: false,
    isTablet: false,
    workspaceId: 'test-workspace',
    dateCreated: Date.now(),
    lastModified: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
  };

  const mockTabletTab: Tab = {
    ...mockTab,
    id: 'tablet-tab-id',
    isTablet: true,
  };

  const mockCloseContextMenu = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTabsStore.mockReturnValue({
      tabs: [mockTab, mockTabletTab],
    } as any);

    mockUseSplitViewStore.mockReturnValue({
      splitView: {
        leftTabs: ['test-tab-id'],
        rightTabs: ['tablet-tab-id'],
        isSplit: false,
      },
    } as any);

    mockUseRootStore.mockReturnValue({
      duplicateTab: jest.fn(),
      splitScreen: jest.fn(),
      toggleTabPin: jest.fn(),
    } as any);

    mockUseBatchToolsStore.mockReturnValue({
      batchToolsVisible: false,
    } as any);
  });

  it('should have Share as the first item', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    expect(menuItems[0].id).toBe('share');
    expect(menuItems[0].label).toBe('Share');
  });

  it('should have Compare as the second item', () => {
    // Mock conditions to ensure Compare shows up
    mockUseSplitViewStore.mockReturnValue({
      splitView: {
        leftTabs: ['test-tab-id'],
        rightTabs: ['other-tab-id'],
        isSplit: true,
        activeRightTabId: 'other-tab-id',
      },
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    expect(menuItems[1].id).toBe('compare');
  });

  it('should rename "Split View" to "Split Right"', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitItem = menuItems.find(item => item.id === 'split');

    expect(splitItem).toBeDefined();
    expect(splitItem?.label).toBe('Split Right');
  });

  it('should include "Open in..." submenu for editor tabs', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const openInItem = menuItems.find(item => item.id === 'openIn');

    expect(openInItem).toBeDefined();
    expect(openInItem?.label).toBe('Open in...');
    expect(openInItem?.submenu).toBeDefined();
  });

  it('should use Pin icon (checked by ID/label) and update label when pinned', () => {
    const pinnedTab = { ...mockTab, isPinned: true };
    mockUseTabsStore.mockReturnValue({
      tabs: [pinnedTab],
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const pinItem = menuItems.find(item => item.id === 'pin');

    expect(pinItem).toBeDefined();
    expect(pinItem?.label).toBe('Unpin');
    // Note: Pin icon is verified visually or by checking the icon component if needed
  });

  it('should handle tabs that do not exist gracefully', () => {
    mockUseTabsStore.mockReturnValue({
      tabs: [],
    } as any);

    const { result } = renderHook(() =>
      useContextMenuConfig('nonexistent-tab-id', false, mockCloseContextMenu)
    );

    expect(result.current.menuItems).toBeDefined();
  });

  it('should include split tab menu item for non-tablet tabs', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitTabItem = menuItems.find(item => item.id === 'splitTab');

    expect(splitTabItem).toBeDefined();
    expect(splitTabItem?.label).toBe('Split Tab...');
  });

  it('should set splitModalProps when split tab action is triggered', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitTabItem = menuItems.find(item => item.id === 'splitTab');

    act(() => {
      splitTabItem?.action?.();
    });

    expect(result.current.splitModalProps).not.toBeNull();
    expect(result.current.splitModalProps?.isOpen).toBe(true);
  });
});