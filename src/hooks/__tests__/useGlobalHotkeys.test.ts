import { renderHook } from '@testing-library/react';
import { useGlobalHotkeys } from '../useGlobalHotkeys';
import { usePersistenceStore } from '../../stores/persistenceStore';
import { useSearchStore } from '../../stores/searchStore';
import { useTabsStore } from '../../stores/tabsStore';
import { useSplitViewStore } from '../../stores/splitViewStore';
import { useRootStore } from '../../stores/rootStore';

// Mock all stores
jest.mock('../../stores/persistenceStore');
jest.mock('../../stores/searchStore');
jest.mock('../../stores/tabsStore');
jest.mock('../../stores/splitViewStore');
jest.mock('../../stores/rootStore');

// Mock zustand/traditional
jest.mock('zustand/traditional', () => ({
  useStoreWithEqualityFn: jest.fn((store, selector) => selector(store.getState())),
}));

describe('useGlobalHotkeys', () => {
  const mockSaveState = jest.fn();
  const mockToggleSearch = jest.fn();
  const mockSaveTabDataById = jest.fn();
  const mockOnKeyboardCloseConfirmation = jest.fn();
  const mockOnTabClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock usePersistenceStore
    (usePersistenceStore as any).getState = () => ({
      saveState: mockSaveState,
    });

    // Mock useSearchStore
    (useSearchStore as any).mockReturnValue({
      toggleSearch: mockToggleSearch,
    });

    // Mock useTabsStore
    (useTabsStore as any).getState = () => ({
      tabs: [
        {
          id: 'tab-1',
          title: 'Test Tab',
          content: 'some content',
          isTablet: false,
        },
        {
          id: 'tab-2',
          title: 'Empty Tab',
          content: '',
          isTablet: false,
        },
        {
          id: 'tablet-tab',
          title: 'Tablet Tab',
          content: '',
          isTablet: true,
        },
      ],
    });

    // Mock useSplitViewStore
    (useSplitViewStore as any).getState = () => ({
      splitView: {
        activeSide: 'left',
        activeLeftTabId: 'tab-1',
        activeRightTabId: null,
      },
    });

    // Mock useRootStore
    (useRootStore as any).getState = () => ({
      saveTabDataById: mockSaveTabDataById,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderUseGlobalHotkeys = () => {
    return renderHook(() =>
      useGlobalHotkeys({
        onKeyboardCloseConfirmation: mockOnKeyboardCloseConfirmation,
        onTabClose: mockOnTabClose,
      })
    );
  };

  describe('Search shortcut (Ctrl+Shift+F)', () => {
    it('should open search when Ctrl+Shift+F is pressed', () => {
      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 'F',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockToggleSearch).toHaveBeenCalledWith('');
    });

    it('should pass selected text to search', () => {
      // Mock window.getSelection
      const mockSelection = {
        toString: () => 'selected text',
      };
      jest.spyOn(window, 'getSelection').mockReturnValue(mockSelection as any);

      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 'F',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockToggleSearch).toHaveBeenCalledWith('selected text');
    });
  });

  describe('Tab close shortcut (Ctrl+W)', () => {
    it('should show confirmation when closing tab with content', () => {
      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockOnKeyboardCloseConfirmation).toHaveBeenCalledWith('tab-1', 'Test Tab');
      expect(mockOnTabClose).not.toHaveBeenCalled();
    });

    it('should close tab directly when it has no content', () => {
      // Mock active tab to be the empty one
      (useSplitViewStore as any).getState = () => ({
        splitView: {
          activeSide: 'left',
          activeLeftTabId: 'tab-2',
          activeRightTabId: null,
        },
      });

      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockOnTabClose).toHaveBeenCalledWith('tab-2');
      expect(mockOnKeyboardCloseConfirmation).not.toHaveBeenCalled();
    });

    it('should show confirmation for tablet tabs', () => {
      // Mock active tab to be the tablet
      (useSplitViewStore as any).getState = () => ({
        splitView: {
          activeSide: 'left',
          activeLeftTabId: 'tablet-tab',
          activeRightTabId: null,
        },
      });

      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockOnKeyboardCloseConfirmation).toHaveBeenCalledWith('tablet-tab', 'Tablet Tab');
    });

    it('should use right side tab when activeSide is right', () => {
      (useSplitViewStore as any).getState = () => ({
        splitView: {
          activeSide: 'right',
          activeLeftTabId: 'tab-1',
          activeRightTabId: 'tab-2',
        },
      });

      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockOnTabClose).toHaveBeenCalledWith('tab-2');
    });

    it('should not close when Cmd+W (Mac-style) is pressed', () => {
      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 'w',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockOnKeyboardCloseConfirmation).not.toHaveBeenCalled();
      expect(mockOnTabClose).not.toHaveBeenCalled();
    });
  });

  describe('Save shortcut (Ctrl+S / Cmd+S)', () => {
    it('should call saveState when Ctrl+S is pressed', () => {
      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockSaveState).toHaveBeenCalled();
    });

    it('should call saveState when Cmd+S is pressed', () => {
      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockSaveState).toHaveBeenCalled();
    });

    it('should call saveTabDataById to download the active tab', () => {
      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockSaveTabDataById).toHaveBeenCalledWith('tab-1');
    });

    it('should download the right side tab when activeSide is right', () => {
      (useSplitViewStore as any).getState = () => ({
        splitView: {
          activeSide: 'right',
          activeLeftTabId: 'tab-1',
          activeRightTabId: 'tab-2',
        },
      });

      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockSaveTabDataById).toHaveBeenCalledWith('tab-2');
    });

    it('should default to left side when activeSide is not set', () => {
      (useSplitViewStore as any).getState = () => ({
        splitView: {
          activeSide: null,
          activeLeftTabId: 'tab-1',
          activeRightTabId: 'tab-2',
        },
      });

      renderUseGlobalHotkeys();

      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      });

      window.dispatchEvent(event);

      expect(mockSaveTabDataById).toHaveBeenCalledWith('tab-1');
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = renderUseGlobalHotkeys();
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });
});
