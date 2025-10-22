import { renderHook, act } from '@testing-library/react';
import { useContextMenuConfig } from '../UseContextMenuConfig';
import { useTabsStore } from '../../../stores/tabsStore';
import { tabletMetadata } from '../../../tablets/tabletMetadata';
import { Tab } from '../../../types';

// Mock dependencies
jest.mock('../../../stores/tabsStore');
jest.mock('../../../stores/splitViewStore');
jest.mock('../../../stores/rootStore');
jest.mock('../../../stores/batchToolsStore');
jest.mock('../../../services/modelManager');
jest.mock('../../../tablets/tabletMetadata');

// Import store types for proper mocking
import { useSplitViewStore } from '../../../stores/splitViewStore';
import { useRootStore } from '../../../stores/rootStore';
import { useBatchToolsStore } from '../../../stores/batchToolsStore';

const mockUseSplitViewStore = useSplitViewStore as jest.MockedFunction<typeof useSplitViewStore>;
const mockUseRootStore = useRootStore as jest.MockedFunction<typeof useRootStore>;
const mockUseBatchToolsStore = useBatchToolsStore as jest.MockedFunction<typeof useBatchToolsStore>;

const mockUseTabsStore = useTabsStore as jest.MockedFunction<typeof useTabsStore>;
const mockTabletMetadata = tabletMetadata as jest.Mocked<typeof tabletMetadata>;

describe('UseContextMenuConfig - Dynamic Actions', () => {
  const mockTab: Tab = {
    id: 'test-tab-id',
    title: 'Test Document',
    content: 'This is a test document with more than 50 characters of content to trigger dynamic actions.',
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
      handleNewTabFromPaste: jest.fn(),
    } as any);
    
    mockUseBatchToolsStore.mockReturnValue({
      batchToolsVisible: false,
    } as any);

    // Mock tablet metadata with action discovery
    mockTabletMetadata.flatMap = jest.fn().mockReturnValue([
      {
        id: 'wordcount.new-tab-from-content',
        label: 'Open in Word Count',
        icon: jest.fn(),
        action: jest.fn(),
      }
    ]);
  });

  it('should generate dynamic menu items for non-tablet tabs', () => {
    const { result } = renderHook(() => 
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    expect(mockTabletMetadata.flatMap).toHaveBeenCalledWith(
      expect.any(Function)
    );

    // Check that dynamic actions are included in menu items
    const menuItems = result.current.menuItems;
    const dynamicAction = menuItems.find(item => item.id === 'wordcount.new-tab-from-content');
    
    expect(dynamicAction).toBeDefined();
    expect(dynamicAction?.label).toBe('Open in Word Count');
  });

  it('should not generate dynamic menu items for tablet tabs', () => {
    mockTabletMetadata.flatMap = jest.fn().mockReturnValue([]);

    const { result } = renderHook(() => 
      useContextMenuConfig('tablet-tab-id', false, mockCloseContextMenu)
    );

    // For tablet tabs, no actions should be generated - hook should not call flatMap
    expect(mockTabletMetadata.flatMap).not.toHaveBeenCalled();

    const menuItems = result.current.menuItems;
    const dynamicAction = menuItems.find(item => item.id === 'wordcount.new-tab-from-content');
    
    expect(dynamicAction).toBeUndefined();
  });

  it('should update dynamic actions when tab content changes', () => {
    // Create a fresh mock for this test
    const testFlatMap = jest.fn().mockReturnValue([
      {
        id: 'test-action',
        label: 'Test Action',
        icon: jest.fn(),
        action: jest.fn(),
      }
    ]);
    mockTabletMetadata.flatMap = testFlatMap;

    // Render the hook initially
    const { rerender } = renderHook(() => 
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    // Should call flatMap once on initial render
    expect(testFlatMap).toHaveBeenCalledTimes(1);

    // Update the tabs store to trigger re-render
    const updatedTab = { ...mockTab, content: 'Updated content with more than 50 characters for testing dynamic updates.' };
    mockUseTabsStore.mockReturnValue({
      tabs: [updatedTab, mockTabletTab],
    } as any);

    // Force a rerender by changing a prop (not tabId since that's fixed)
    rerender();

    // Should be called again due to tabs dependency
    expect(testFlatMap).toHaveBeenCalledTimes(2);
  });

  it('should call closeContextMenu when dynamic action is executed', () => {
    const mockAction = jest.fn();
    mockTabletMetadata.flatMap = jest.fn().mockReturnValue([
      {
        id: 'test-action',
        label: 'Test Action',
        icon: jest.fn(),
        action: mockAction,
      }
    ]);

    const { result } = renderHook(() => 
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const dynamicAction = menuItems.find(item => item.id === 'test-action');
    
    expect(dynamicAction).toBeDefined();
    
    // Execute the action
    act(() => {
      dynamicAction?.action?.();
    });

    expect(mockAction).toHaveBeenCalledTimes(1);
    expect(mockCloseContextMenu).toHaveBeenCalledTimes(1);
  });

  it('should add separator when dynamic actions exist alongside static actions', () => {
    mockTabletMetadata.flatMap = jest.fn().mockReturnValue([
      {
        id: 'dynamic-action',
        label: 'Dynamic Action',
        icon: jest.fn(),
        action: jest.fn(),
      }
    ]);

    const { result } = renderHook(() => 
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const separatorIndex = menuItems.findIndex(item => item.id === 'sep-tablet-actions');
    const dynamicActionIndex = menuItems.findIndex(item => item.id === 'dynamic-action');
    
    expect(separatorIndex).toBeGreaterThan(-1);
    expect(dynamicActionIndex).toBeGreaterThan(separatorIndex);
  });

  it('should handle empty dynamic actions gracefully', () => {
    mockTabletMetadata.flatMap = jest.fn().mockReturnValue([]);

    const { result } = renderHook(() => 
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    
    // Should not have separator or dynamic actions
    expect(menuItems.find(item => item.id === 'sep-tablet-actions')).toBeUndefined();
    expect(menuItems.find(item => item.id?.startsWith('wordcount'))).toBeUndefined();
  });

  it('should pass correct context to tablet metadata', () => {
    const mockGetActionsForContext = jest.fn().mockReturnValue([]);
    
    mockTabletMetadata.flatMap = jest.fn().mockImplementation((callback) => {
      // Simulate the flatMap behavior
      const meta = { getActionsForContext: mockGetActionsForContext };
      return callback(meta, 0, [meta]);
    });

    renderHook(() => 
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    expect(mockGetActionsForContext).toHaveBeenCalledWith({
      source: 'editor-tab',
      tab: mockTab,
      content: mockTab.content,
      side: 'left',
    });
  });

  it('should handle tabs that do not exist', () => {
    mockUseTabsStore.mockReturnValue({
      tabs: [], // No tabs
    } as any);

    mockTabletMetadata.flatMap = jest.fn().mockReturnValue([]);

    const { result } = renderHook(() => 
      useContextMenuConfig('nonexistent-tab-id', false, mockCloseContextMenu)
    );

    // Should not crash and should have empty dynamic actions
    // For nonexistent tabs, hook should not call flatMap
    expect(result.current.menuItems).toBeDefined();
    expect(mockTabletMetadata.flatMap).not.toHaveBeenCalled();
  });

  it('should maintain dependency array for useEffect correctly', () => {
    const { rerender } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    const initialCallCount = (mockTabletMetadata.flatMap as jest.Mock).mock.calls.length;

    // Rerender with same props - should not trigger additional calls due to useEffect deps
    rerender();

    // The hook should be stable and not cause unnecessary re-renders
    expect((mockTabletMetadata.flatMap as jest.Mock).mock.calls.length).toBe(initialCallCount);
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

  it('should not include split tab menu item for tablet tabs', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('tablet-tab-id', false, mockCloseContextMenu)
    );

    const menuItems = result.current.menuItems;
    const splitTabItem = menuItems.find(item => item.id === 'splitTab');

    expect(splitTabItem).toBeUndefined();
  });

  it('should set splitModalProps when split tab action is triggered', () => {
    const { result } = renderHook(() =>
      useContextMenuConfig('test-tab-id', false, mockCloseContextMenu)
    );

    // Initially, splitModalProps should be null
    expect(result.current.splitModalProps).toBeNull();

    // Find and execute the split tab action
    const menuItems = result.current.menuItems;
    const splitTabItem = menuItems.find(item => item.id === 'splitTab');

    expect(splitTabItem).toBeDefined();

    // Execute the action
    act(() => {
      splitTabItem?.action?.();
    });

    // Now splitModalProps should be set
    expect(result.current.splitModalProps).not.toBeNull();
    expect(result.current.splitModalProps?.isOpen).toBe(true);
    expect(result.current.splitModalProps?.tabId).toBe('test-tab-id');
  });
});