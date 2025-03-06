import { create } from 'zustand';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { useEditorStore } from './editorStore';
import { Tab } from '../types';
import {
  findTabById,
  isTabEmpty,
  countEmptyTabs
} from '../utils';

// Define the combined store interface
interface RootStore {
  // Tab management
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab, toRightSide?: boolean) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string, lock?: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabState: (id: string, updates: Partial<Tab>) => void;

  // Editor state
  cursorPosition: { lineNumber: number; column: number };
  previewMode: boolean;
  setCursorPosition: (position: { lineNumber: number; column: number }) => void;
  togglePreviewMode: () => void;

  // Split view
  splitView: {
    isSplit: boolean;
    leftTabs: string[];
    rightTabs: string[];
    activeLeftTabId: string | null;
    activeRightTabId: string | null;
    splitRatio: number;
  };
  splitScreen: (leftTabId: string, rightTabId?: string) => void;
  unsplitScreen: (fromRight: boolean) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setSplitRatio: (ratio: number) => void;

  // Bulk tab operations
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  duplicateTab: (tabId: string, isRightSide: boolean) => string;
  groupTabsByType: (isRightSide: boolean) => void;

  // Tab limit checks
  canAddNewTab: (toRightSide?: boolean) => boolean;
}

// Create the combined store
export const useRootStore = create<RootStore>((set, get) => {
  // Get the individual stores
  const tabsStore = useTabsStore.getState();
  const splitViewStore = useSplitViewStore.getState();
  const editorStore = useEditorStore.getState();

  // Set up subscriptions to keep the root store in sync with individual stores
  useTabsStore.subscribe((state) => {
    set({
      tabs: state.tabs,
      activeTabId: state.activeTabId,
    });
  });

  useSplitViewStore.subscribe((state) => {
    set({
      splitView: state.splitView,
    });
  });

  useEditorStore.subscribe((state) => {
    set({
      cursorPosition: state.cursorPosition,
      previewMode: state.previewMode,
    });
  });

  return {
    // Initial state from individual stores
    tabs: tabsStore.tabs,
    activeTabId: tabsStore.activeTabId,
    cursorPosition: editorStore.cursorPosition,
    previewMode: editorStore.previewMode,
    splitView: splitViewStore.splitView,

    // Tab management functions
    addTab: (tab, toRightSide = false) => {
      // Add the tab to the tabs store
      useTabsStore.getState().addTab(tab);

      // Add the tab to the appropriate side in split view
      useSplitViewStore.getState().addTabToSide(tab.id, toRightSide);
    },

    removeTab: (id) => {
      // Remove the tab from the split view
      useSplitViewStore.getState().removeTabFromSide(id);

      // Remove the tab from the tabs store
      useTabsStore.getState().removeTab(id);
    },

    setActiveTab: (id) => {
      const { splitView } = get();

      // Set the active tab in the tabs store
      useTabsStore.getState().setActiveTab(id);

      // Set the active tab in the appropriate side of the split view
      if (splitView.isSplit) {
        if (splitView.leftTabs.includes(id)) {
          useSplitViewStore.getState().setActiveLeftTab(id);
        } else if (splitView.rightTabs.includes(id)) {
          useSplitViewStore.getState().setActiveRightTab(id);
        }
      }
    },

    updateTabContent: (id, content) => {
      useTabsStore.getState().updateTabContent(id, content);
    },

    updateTabLanguage: (id, language, lock = true) => {
      useTabsStore.getState().updateTabLanguage(id, language, lock);
    },

    updateTabTitle: (id, title) => {
      useTabsStore.getState().updateTabTitle(id, title);
    },

    updateTabState: (id, updates) => {
      useTabsStore.getState().updateTabState(id, updates);
    },

    // Editor state functions
    setCursorPosition: (position) => {
      useEditorStore.getState().setCursorPosition(position);
    },

    togglePreviewMode: () => {
      useEditorStore.getState().togglePreviewMode();
    },

    // Split view functions
    splitScreen: (leftTabId, rightTabId) => {
      const { tabs } = get();

      if (rightTabId) {
        // If a right tab is specified, use it directly
        useSplitViewStore.getState().splitScreen(leftTabId, [rightTabId]);
      } else {
        // Get all tabs except the one being moved to the right
        const otherTabIds = tabs
          .filter(tab => tab.id !== leftTabId)
          .map(tab => tab.id);

        useSplitViewStore.getState().splitScreen(leftTabId, otherTabIds);
      }
      useTabsStore.getState().setActiveTab(leftTabId);
    },

    unsplitScreen: (fromRight) => {
      useSplitViewStore.getState().unsplitScreen(fromRight);

      // Set the active tab based on which side was active
      const { splitView } = useSplitViewStore.getState();
      if (fromRight) {
        useTabsStore.getState().setActiveTab(splitView.activeLeftTabId || '');
      } else {
        useTabsStore.getState().setActiveTab(splitView.activeRightTabId || '');
      }
    },

    moveTabToRight: (tabId) => {
      useSplitViewStore.getState().moveTabToRight(tabId);
      useTabsStore.getState().setActiveTab(tabId);
    },

    moveTabToLeft: (tabId) => {
      useSplitViewStore.getState().moveTabToLeft(tabId);
      useTabsStore.getState().setActiveTab(tabId);
    },

    setActiveLeftTab: (id) => {
      useSplitViewStore.getState().setActiveLeftTab(id);
      useTabsStore.getState().setActiveTab(id);
    },

    setActiveRightTab: (id) => {
      useSplitViewStore.getState().setActiveRightTab(id);
      useTabsStore.getState().setActiveTab(id);
    },

    setSplitRatio: (ratio) => {
      useSplitViewStore.getState().setSplitRatio(ratio);
    },

    // Bulk tab operations
    closeTabsToLeft: (tabId, isRightSide) => {
      const { splitView } = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);

      if (tabIndex <= 0) return; // No tabs to the left

      // Get the tabs to close
      const tabsToClose = currentTabList.slice(0, tabIndex);

      // Close the tabs in the split view
      useSplitViewStore.getState().closeTabsToLeft(tabId, isRightSide);

      // Remove the tabs from the tabs store
      tabsToClose.forEach(id => {
        useTabsStore.getState().removeTab(id);
      });
    },

    closeTabsToRight: (tabId, isRightSide) => {
      const { splitView } = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);

      if (tabIndex === -1 || tabIndex === currentTabList.length - 1) return; // No tabs to the right

      // Get the tabs to close
      const tabsToClose = currentTabList.slice(tabIndex + 1);

      // Close the tabs in the split view
      useSplitViewStore.getState().closeTabsToRight(tabId, isRightSide);

      // Remove the tabs from the tabs store
      tabsToClose.forEach(id => {
        useTabsStore.getState().removeTab(id);
      });

      // Set the active tab
      if (isRightSide) {
        useSplitViewStore.getState().setActiveRightTab(tabId);
      } else {
        useSplitViewStore.getState().setActiveLeftTab(tabId);
      }
      useTabsStore.getState().setActiveTab(tabId);
    },

    closeAllExcept: (tabId, isRightSide) => {
      const { splitView } = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;

      if (currentTabList.length <= 1) return; // Only one tab, nothing to close

      // Get the tabs to close
      const tabsToClose = currentTabList.filter(id => id !== tabId);

      // Close the tabs in the split view
      useSplitViewStore.getState().closeAllExcept(tabId, isRightSide);

      // Remove the tabs from the tabs store
      tabsToClose.forEach(id => {
        useTabsStore.getState().removeTab(id);
      });

      // Set the active tab
      if (isRightSide) {
        useSplitViewStore.getState().setActiveRightTab(tabId);
      } else {
        useSplitViewStore.getState().setActiveLeftTab(tabId);
      }
      useTabsStore.getState().setActiveTab(tabId);
    },

    duplicateTab: (tabId, isRightSide) => {
      // Duplicate the tab in the tabs store
      const newTabId = useTabsStore.getState().duplicateTab(tabId);

      if (!newTabId) return '';

      // Add the new tab to the appropriate side in split view
      const { splitView } = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
      const tabIndex = currentTabList.indexOf(tabId);

      // Insert the new tab after the current tab
      const newTabList = [...currentTabList];
      newTabList.splice(tabIndex + 1, 0, newTabId);

      // Update the split view
      if (isRightSide) {
        useSplitViewStore.getState().setSplitView({
          rightTabs: newTabList,
          activeRightTabId: newTabId,
        });
      } else {
        useSplitViewStore.getState().setSplitView({
          leftTabs: newTabList,
          activeLeftTabId: newTabId,
        });
      }

      // Set the active tab
      useTabsStore.getState().setActiveTab(newTabId);

      return newTabId;
    },

    groupTabsByType: (isRightSide) => {
      const { tabs, splitView } = get();
      const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;

      // Use the utility function to group tabs by language
      const groupedTabs = groupTabsByLanguage(tabs, currentTabList);

      // Update the split view
      if (isRightSide) {
        useSplitViewStore.getState().setSplitView({
          rightTabs: groupedTabs,
        });
      } else {
        useSplitViewStore.getState().setSplitView({
          leftTabs: groupedTabs,
        });
      }
    },

    // Tab limit checks
    canAddNewTab: (toRightSide = false) => {
      const { tabs, splitView } = get();

      // If in split view, check the appropriate side
      if (splitView.isSplit) {
        if (toRightSide) {
          // Check right side tabs
          const rightTabIds = splitView.rightTabs;
          const emptyRightTabs = rightTabIds.filter(id => {
            const tab = findTabById(tabs, id);
            return tab && isTabEmpty(tab);
          });

          return emptyRightTabs.length < 3;
        } else {
          // Check left side tabs
          const leftTabIds = splitView.leftTabs;
          const emptyLeftTabs = leftTabIds.filter(id => {
            const tab = findTabById(tabs, id);
            return tab && isTabEmpty(tab);
          });

          return emptyLeftTabs.length < 3;
        }
      } else {
        // Not in split view, check all tabs
        return countEmptyTabs(tabs) < 3;
      }
    },
  };
});