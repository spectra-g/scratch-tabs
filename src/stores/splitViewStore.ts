import { create } from 'zustand';
import { SplitViewState } from '../types';
import {
  createDefaultSplitViewState
} from '../utils';

interface SplitViewStore {
  splitView: SplitViewState;

  // Split view management
  setSplitView: (splitView: Partial<SplitViewState>) => void;
  splitScreen: (leftTabId: string, rightTabIds: string[]) => void;
  unsplitScreen: (fromRight: boolean) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setSplitRatio: (ratio: number) => void;

  // Tab list management for split view
  addTabToSide: (tabId: string, toRightSide: boolean) => void;
  removeTabFromSide: (tabId: string) => void;
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  groupTabsByType: (isRightSide: boolean) => void;
}

export const useSplitViewStore = create<SplitViewStore>((set, get) => ({
  splitView: createDefaultSplitViewState(),

  setSplitView: (newSplitView) => set((state) => ({
    splitView: { ...state.splitView, ...newSplitView }
  })),

  splitScreen: (leftTabId, rightTabIds) => set((state) => {
    if (state.splitView.isSplit) return state; // Already split

    return {
      splitView: {
        isSplit: true,
        leftTabs: [leftTabId],
        rightTabs: rightTabIds,
        activeLeftTabId: leftTabId,
        activeRightTabId: rightTabIds[0] || null,
        splitRatio: 0.5, // Default to 50/50 split
      }
    };
  }),

  unsplitScreen: (fromRight) => set((state) => {
    if (!state.splitView.isSplit) return state;

    // If unsplitting from right, move right tabs to left
    if (fromRight) {
      const allTabs = [...state.splitView.leftTabs, ...state.splitView.rightTabs];
      return {
        splitView: {
          isSplit: false,
          leftTabs: allTabs,
          rightTabs: [],
          activeLeftTabId: state.splitView.activeLeftTabId || allTabs[0] || null,
          activeRightTabId: null,
          splitRatio: 0.5, // Reset to default
        }
      };
    }
    // If unsplitting from left, move left tabs to right
    else {
      const allTabs = [...state.splitView.leftTabs, ...state.splitView.rightTabs];
      return {
        splitView: {
          isSplit: false,
          leftTabs: allTabs,
          rightTabs: [],
          activeLeftTabId: state.splitView.activeRightTabId || allTabs[0] || null,
          activeRightTabId: null,
          splitRatio: 0.5, // Reset to default
        }
      };
    }
  }),

  moveTabToRight: (tabId) => set((state) => {
    if (!state.splitView.isSplit) return state;
    if (!state.splitView.leftTabs.includes(tabId)) return state;

    // Remove from left tabs
    const newLeftTabs = state.splitView.leftTabs.filter(id => id !== tabId);

    // If this would leave left side empty, don't allow the move
    if (newLeftTabs.length === 0) return state;

    // Add to right tabs
    const newRightTabs = [...state.splitView.rightTabs, tabId];

    return {
      splitView: {
        ...state.splitView,
        leftTabs: newLeftTabs,
        rightTabs: newRightTabs,
        activeLeftTabId: state.splitView.activeLeftTabId === tabId
            ? newLeftTabs[0] || null
            : state.splitView.activeLeftTabId,
        activeRightTabId: tabId,
      }
    };
  }),

  moveTabToLeft: (tabId) => set((state) => {
    if (!state.splitView.isSplit) return state;
    if (!state.splitView.rightTabs.includes(tabId)) return state;

    // Remove from right tabs
    const newRightTabs = state.splitView.rightTabs.filter(id => id !== tabId);

    // If this would leave right side empty, don't allow the move
    if (newRightTabs.length === 0) return state;

    // Add to left tabs
    const newLeftTabs = [...state.splitView.leftTabs, tabId];

    return {
      splitView: {
        ...state.splitView,
        leftTabs: newLeftTabs,
        rightTabs: newRightTabs,
        activeRightTabId: state.splitView.activeRightTabId === tabId
            ? newRightTabs[0] || null
            : state.splitView.activeRightTabId,
        activeLeftTabId: tabId,
      }
    };
  }),

  setActiveLeftTab: (id) => set((state) => ({
    splitView: {
      ...state.splitView,
      activeLeftTabId: id,
    }
  })),

  setActiveRightTab: (id) => set((state) => ({
    splitView: {
      ...state.splitView,
      activeRightTabId: id,
    }
  })),

  setSplitRatio: (ratio) => set((state) => ({
    splitView: {
      ...state.splitView,
      splitRatio: ratio,
    }
  })),

  addTabToSide: (tabId, toRightSide) => set((state) => {
    if (toRightSide) {
      return {
        splitView: {
          ...state.splitView,
          rightTabs: [...state.splitView.rightTabs, tabId],
          activeRightTabId: tabId,
        }
      };
    } else {
      return {
        splitView: {
          ...state.splitView,
          leftTabs: [...state.splitView.leftTabs, tabId],
          activeLeftTabId: tabId,
        }
      };
    }
  }),

  removeTabFromSide: (tabId) => set((state) => {
    const newSplitView = { ...state.splitView };

    // Remove from left tabs if present
    if (newSplitView.leftTabs.includes(tabId)) {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => id !== tabId);

      // If the active left tab was removed, set a new active left tab
      if (newSplitView.activeLeftTabId === tabId) {
        newSplitView.activeLeftTabId = newSplitView.leftTabs[0] || null;
      }
    }

    // Remove from right tabs if present
    if (newSplitView.rightTabs.includes(tabId)) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => id !== tabId);

      // If the active right tab was removed, set a new active right tab
      if (newSplitView.activeRightTabId === tabId) {
        newSplitView.activeRightTabId = newSplitView.rightTabs[0] || null;
      }
    }

    // If split view is active but one side has no tabs, unsplit
    if (newSplitView.isSplit) {
      if (newSplitView.leftTabs.length === 0) {
        newSplitView.isSplit = false;
        newSplitView.leftTabs = [...newSplitView.rightTabs];
        newSplitView.rightTabs = [];
        newSplitView.activeLeftTabId = newSplitView.activeRightTabId;
        newSplitView.activeRightTabId = null;
      } else if (newSplitView.rightTabs.length === 0) {
        newSplitView.isSplit = false;
        newSplitView.rightTabs = [];
        newSplitView.activeRightTabId = null;
      }
    }

    return { splitView: newSplitView };
  }),

  closeTabsToLeft: (tabId, isRightSide) => set((state) => {
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;

    // Find the index of the current tab in its list
    const tabIndex = currentTabList.indexOf(tabId);

    if (tabIndex <= 0) return state; // No tabs to the left

    // Get the tabs to close (all tabs to the left of the current tab)
    const tabsToClose = currentTabList.slice(0, tabIndex);

    // Update the tab lists
    const newSplitView = { ...state.splitView };

    if (isRightSide) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => !tabsToClose.includes(id));
    } else {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => !tabsToClose.includes(id));
    }

    return { splitView: newSplitView };
  }),

  closeTabsToRight: (tabId, isRightSide) => set((state) => {
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;

    // Find the index of the current tab in its list
    const tabIndex = currentTabList.indexOf(tabId);

    if (tabIndex === -1 || tabIndex === currentTabList.length - 1) return state; // No tabs to the right

    // Get the tabs to close (all tabs to the right of the current tab)
    const tabsToClose = currentTabList.slice(tabIndex + 1);

    // Update the tab lists
    const newSplitView = { ...state.splitView };

    if (isRightSide) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => !tabsToClose.includes(id));

      // If the active right tab was closed, set the current tab as active
      if (tabsToClose.includes(newSplitView.activeRightTabId || '')) {
        newSplitView.activeRightTabId = tabId;
      }
    } else {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => !tabsToClose.includes(id));

      // If the active left tab was closed, set the current tab as active
      if (tabsToClose.includes(newSplitView.activeLeftTabId || '')) {
        newSplitView.activeLeftTabId = tabId;
      }
    }

    return { splitView: newSplitView };
  }),

  closeAllExcept: (tabId, isRightSide) => set((state) => {
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;

    if (currentTabList.length <= 1) return state; // Only one tab, nothing to close

    // Update the tab lists
    const newSplitView = { ...state.splitView };

    if (isRightSide) {
      newSplitView.rightTabs = [tabId];
      newSplitView.activeRightTabId = tabId;
    } else {
      newSplitView.leftTabs = [tabId];
      newSplitView.activeLeftTabId = tabId;
    }

    return { splitView: newSplitView };
  }),

  groupTabsByType: (_isRightSide) => set((state) => {
    // This function will be connected with the tabsStore in the rootStore
    // For now, we'll just return the current state
    return state;
  }),
}));