import { create } from 'zustand';
import { SplitViewState } from '../types';
import {
  updateTabHistory,
  getPreviousActiveTab,
  removeTabFromHistory,
  createDefaultSplitViewState
} from '../utils';

interface SplitViewStore {
  splitView: SplitViewState;
  setSplitView: (splitView: Partial<SplitViewState>) => void;
  splitScreen: (leftTabIds: string[], rightTabId: string) => void;
  unsplitScreen: () => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setActiveSide: (side: string) => void;
  setSplitRatio: (ratio: number) => void;
  addTabToSide: (tabId: string, toRightSide: boolean, activeTabId?: string) => void;
  removeTabFromSide: (tabId: string) => void;
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  groupTabsByType: (isRightSide: boolean) => void;
  updateTabOrder: (newLeftTabs: string[], newRightTabs: string[]) => void;
  reorderTabs: (side: 'left' | 'right', newOrder: string[]) => void;
  getTabsToLeft: (tabId: string, isRightSide: boolean) => string[];
  getTabsToRight: (tabId: string, isRightSide: boolean) => string[];
  getAllExcept: (tabId: string, isRightSide: boolean) => string[];
  createDefaultSplitViewState: (workspaceId?: string) => SplitViewState;
  clearSplitViewForWorkspace: (workspaceId: string) => void;
}

export const useSplitViewStore = create<SplitViewStore>((set, get) => ({
  splitView: createDefaultSplitViewState(),

  createDefaultSplitViewState: (workspaceId?: string) => createDefaultSplitViewState(workspaceId),

  setSplitView: (newSplitView) => set((state) => {
    const leftTabHistory = newSplitView.leftTabHistory || state.splitView.leftTabHistory || [];
    const rightTabHistory = newSplitView.rightTabHistory || state.splitView.rightTabHistory || [];
    return {
      splitView: {
        ...state.splitView,
        ...newSplitView,
        leftTabHistory,
        rightTabHistory
      }
    };
  }),

  splitScreen: (leftTabIds, rightTabId) => set((state) => {
    if (state.splitView.isSplit) return state;
    
    // Use the existing tab history to determine which tab should be active on the left side
    // Filter the current history to only include tabs that will be on the left side
    const filteredHistory = (state.splitView.leftTabHistory || []).filter(id => leftTabIds.includes(id));
    
    const newActiveLeftTabId = getPreviousActiveTab(filteredHistory, leftTabIds);
    
    return {
      splitView: {
        ...state.splitView,
        isSplit: true,
        leftTabs: leftTabIds,
        rightTabs: [rightTabId],
        activeLeftTabId: newActiveLeftTabId,
        activeRightTabId: rightTabId,
        activeSide: 'right',
        splitRatio: 0.5,
        leftTabHistory: newActiveLeftTabId ? [newActiveLeftTabId] : [],
        rightTabHistory: [rightTabId],
      }
    };
  }),

  unsplitScreen: () => set((state) => {
    if (!state.splitView.isSplit) return state;
    const allTabs = [...state.splitView.leftTabs, ...state.splitView.rightTabs];
    const activeId = state.splitView.activeLeftTabId;
    const finalActiveId = activeId || allTabs[0] || null;
    return {
      splitView: {
        ...state.splitView,
        isSplit: false,
        leftTabs: allTabs,
        rightTabs: [],
        activeLeftTabId: finalActiveId,
        activeRightTabId: null,
        activeSide: 'left',
        splitRatio: 0.5,
        leftTabHistory: finalActiveId ? [finalActiveId] : [],
        rightTabHistory: [],
      }
    };
  }),

  moveTabToRight: (tabId) => set((state) => {
    if (!state.splitView.isSplit || !state.splitView.leftTabs.includes(tabId)) return state;
    const newLeftTabs = state.splitView.leftTabs.filter(id => id !== tabId);
    if (newLeftTabs.length === 0 && state.splitView.rightTabs.length === 0) return state; // Prevent moving last tab
    if (newLeftTabs.length === 0 && state.splitView.rightTabs.length > 0) { // If left becomes empty, unsplit to right
      const allTabs = [...state.splitView.rightTabs, tabId];
      const activeTab = tabId; // Make the moved tab active
      return {
        splitView: {
          ...state.splitView,
          isSplit: false,
          leftTabs: allTabs,
          rightTabs: [],
          activeLeftTabId: activeTab,
          activeRightTabId: null,
          activeSide: 'left',
          leftTabHistory: updateTabHistory(state.splitView.rightTabHistory, tabId), // Use right history as base
          rightTabHistory: []
        }
      };
    }
    const newRightTabs = [...state.splitView.rightTabs, tabId];
    const newActiveLeftTabId = state.splitView.activeLeftTabId === tabId
      ? getPreviousActiveTab(state.splitView.leftTabHistory, newLeftTabs)
      : state.splitView.activeLeftTabId;
    return {
      splitView: {
        ...state.splitView,
        leftTabs: newLeftTabs,
        rightTabs: newRightTabs,
        activeLeftTabId: newActiveLeftTabId,
        activeRightTabId: tabId,
        activeSide: 'right',
        leftTabHistory: removeTabFromHistory(state.splitView.leftTabHistory, tabId),
        rightTabHistory: updateTabHistory(state.splitView.rightTabHistory, tabId),
      }
    };
  }),

  moveTabToLeft: (tabId) => set((state) => {
    if (!state.splitView.isSplit || !state.splitView.rightTabs.includes(tabId)) return state;
    const newRightTabs = state.splitView.rightTabs.filter(id => id !== tabId);
    if (newRightTabs.length === 0 && state.splitView.leftTabs.length === 0) return state; // Prevent moving last tab
    if (newRightTabs.length === 0 && state.splitView.leftTabs.length > 0) { // If right becomes empty, unsplit to left
      const allTabs = [...state.splitView.leftTabs, tabId];
      const activeTab = tabId;
      return {
        splitView: {
          ...state.splitView,
          isSplit: false,
          leftTabs: allTabs,
          rightTabs: [],
          activeLeftTabId: activeTab,
          activeRightTabId: null,
          activeSide: 'left',
          leftTabHistory: updateTabHistory(state.splitView.leftTabHistory, tabId), // Use left history
          rightTabHistory: []
        }
      };
    }
    const newLeftTabs = [...state.splitView.leftTabs, tabId];
    const newActiveRightTabId = state.splitView.activeRightTabId === tabId
      ? getPreviousActiveTab(state.splitView.rightTabHistory, newRightTabs)
      : state.splitView.activeRightTabId;
    return {
      splitView: {
        ...state.splitView,
        leftTabs: newLeftTabs,
        rightTabs: newRightTabs,
        activeRightTabId: newActiveRightTabId,
        activeLeftTabId: tabId,
        activeSide: 'left',
        rightTabHistory: removeTabFromHistory(state.splitView.rightTabHistory, tabId),
        leftTabHistory: updateTabHistory(state.splitView.leftTabHistory, tabId),
      }
    };
  }),

  setActiveLeftTab: (id) => set((state) => ({
    splitView: {
      ...state.splitView,
      activeLeftTabId: id,
      activeSide: 'left',
      leftTabHistory: updateTabHistory(state.splitView.leftTabHistory || [], id),
    }
  })),

  setActiveRightTab: (id) => set((state) => ({
    splitView: {
      ...state.splitView,
      activeRightTabId: id,
      activeSide: 'right',
      rightTabHistory: updateTabHistory(state.splitView.rightTabHistory || [], id),
    }
  })),

  setActiveSide: (side) => set((state) => ({
    splitView: { ...state.splitView, activeSide: side }
  })),

  setSplitRatio: (ratio) => set((state) => ({
    splitView: { ...state.splitView, splitRatio: ratio }
  })),

  addTabToSide: (tabId, toRightSide, activeTabIdFromCaller) => set((state) => {
    const targetActiveTabId = activeTabIdFromCaller || tabId; // Use provided active ID or default to new tab
    if (toRightSide) {
      return {
        splitView: {
          ...state.splitView,
          rightTabs: [...(state.splitView.rightTabs || []), tabId],
          activeRightTabId: targetActiveTabId,
          activeSide: 'right',
          rightTabHistory: updateTabHistory(state.splitView.rightTabHistory || [], targetActiveTabId),
        }
      };
    } else {
      return {
        splitView: {
          ...state.splitView,
          leftTabs: [...(state.splitView.leftTabs || []), tabId],
          activeLeftTabId: targetActiveTabId,
          activeSide: 'left',
          leftTabHistory: updateTabHistory(state.splitView.leftTabHistory || [], targetActiveTabId),
        }
      };
    }
  }),

  removeTabFromSide: (tabId) => set((state) => {
    const newSplitView = { ...state.splitView };
    let wasTabOnLeft = false;
    let wasTabOnRight = false;

    if (newSplitView.leftTabs.includes(tabId)) {
      wasTabOnLeft = true;
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => id !== tabId);
      newSplitView.leftTabHistory = removeTabFromHistory(newSplitView.leftTabHistory || [], tabId);
      if (newSplitView.activeLeftTabId === tabId) {
        newSplitView.activeLeftTabId = getPreviousActiveTab(newSplitView.leftTabHistory, newSplitView.leftTabs);
      }
    }
    if (newSplitView.rightTabs.includes(tabId)) {
      wasTabOnRight = true;
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => id !== tabId);
      newSplitView.rightTabHistory = removeTabFromHistory(newSplitView.rightTabHistory || [], tabId);
      if (newSplitView.activeRightTabId === tabId) {
        newSplitView.activeRightTabId = getPreviousActiveTab(newSplitView.rightTabHistory, newSplitView.rightTabs);
      }
    }

    if (newSplitView.isSplit) {
      if (newSplitView.leftTabs.length === 0 && newSplitView.rightTabs.length > 0) {
        // Left side empty, unsplit to right
        newSplitView.isSplit = false;
        newSplitView.leftTabs = [...newSplitView.rightTabs];
        newSplitView.leftTabHistory = [...newSplitView.rightTabHistory];
        newSplitView.activeLeftTabId = newSplitView.activeRightTabId || newSplitView.leftTabs[0] || null;
        newSplitView.rightTabs = [];
        newSplitView.rightTabHistory = [];
        newSplitView.activeRightTabId = null;
        newSplitView.activeSide = 'left';
      } else if (newSplitView.rightTabs.length === 0 && newSplitView.leftTabs.length > 0) {
        // Right side empty, unsplit to left
        newSplitView.isSplit = false;
        newSplitView.activeRightTabId = null;
        newSplitView.rightTabHistory = [];
        newSplitView.activeSide = 'left'; // Keep focus on left
      } else if (newSplitView.leftTabs.length === 0 && newSplitView.rightTabs.length === 0) {
        // Both sides empty
        newSplitView.isSplit = false;
        newSplitView.activeLeftTabId = null;
        newSplitView.activeRightTabId = null;
        newSplitView.activeSide = 'left';
      }
    } else { // Not split
      if (newSplitView.leftTabs.length === 0) {
        newSplitView.activeLeftTabId = null;
      }
    }
    // Determine active side after removal
    if (!newSplitView.isSplit) {
      newSplitView.activeSide = 'left';
    } else if (wasTabOnLeft && newSplitView.leftTabs.length === 0 && newSplitView.rightTabs.length > 0) {
      newSplitView.activeSide = 'right'; // If left became empty, shift focus to right
    } else if (wasTabOnRight && newSplitView.rightTabs.length === 0 && newSplitView.leftTabs.length > 0) {
      newSplitView.activeSide = 'left'; // If right became empty, shift focus to left
    } else if (newSplitView.activeSide === 'left' && newSplitView.leftTabs.length === 0 && newSplitView.rightTabs.length > 0) {
      newSplitView.activeSide = 'right';
    } else if (newSplitView.activeSide === 'right' && newSplitView.rightTabs.length === 0 && newSplitView.leftTabs.length > 0) {
      newSplitView.activeSide = 'left';
    }


    return { splitView: newSplitView };
  }),

  closeTabsToLeft: (tabId, isRightSide) => set((state) => {
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);
    if (tabIndex <= 0) return state;
    const tabsToKeep = currentTabList.slice(tabIndex);
    const newSplitView = { ...state.splitView };
    if (isRightSide) {
      newSplitView.rightTabs = tabsToKeep;
      newSplitView.rightTabHistory = (newSplitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id) || id === tabId);
      if (!tabsToKeep.includes(newSplitView.activeRightTabId!)) newSplitView.activeRightTabId = tabId;
    } else {
      newSplitView.leftTabs = tabsToKeep;
      newSplitView.leftTabHistory = (newSplitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id) || id === tabId);
      if (!tabsToKeep.includes(newSplitView.activeLeftTabId!)) newSplitView.activeLeftTabId = tabId;
    }
    return { splitView: newSplitView };
  }),

  closeTabsToRight: (tabId, isRightSide) => set((state) => {
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);
    if (tabIndex === -1 || tabIndex >= currentTabList.length - 1) return state;
    const tabsToKeep = currentTabList.slice(0, tabIndex + 1);
    const newSplitView = { ...state.splitView };
    if (isRightSide) {
      newSplitView.rightTabs = tabsToKeep;
      newSplitView.rightTabHistory = (newSplitView.rightTabHistory || []).filter(id => tabsToKeep.includes(id));
      if (!tabsToKeep.includes(newSplitView.activeRightTabId!)) newSplitView.activeRightTabId = tabId;
    } else {
      newSplitView.leftTabs = tabsToKeep;
      newSplitView.leftTabHistory = (newSplitView.leftTabHistory || []).filter(id => tabsToKeep.includes(id));
      if (!tabsToKeep.includes(newSplitView.activeLeftTabId!)) newSplitView.activeLeftTabId = tabId;
    }
    return { splitView: newSplitView };
  }),

  closeAllExcept: (tabId, isRightSide) => set((state) => {
    const newSplitView = { ...state.splitView };
    if (isRightSide) {
      newSplitView.rightTabs = [tabId];
      newSplitView.activeRightTabId = tabId;
      newSplitView.rightTabHistory = [tabId];
    } else {
      newSplitView.leftTabs = [tabId];
      newSplitView.activeLeftTabId = tabId;
      newSplitView.leftTabHistory = [tabId];
    }
    return { splitView: newSplitView };
  }),

  groupTabsByType: (_isRightSide) => set((state) => state), // No-op as grouping logic is in rootStore

  updateTabOrder: (newLeftTabs, newRightTabs) => set((state) => {
    // This function assumes rootStore has already filtered histories if needed.
    // It directly sets the new tab orders and ensures active tabs are valid.
    const currentSplitView = state.splitView;
    return {
      splitView: {
        ...currentSplitView,
        leftTabs: newLeftTabs,
        rightTabs: newRightTabs,
        activeLeftTabId: newLeftTabs.includes(currentSplitView.activeLeftTabId!)
          ? currentSplitView.activeLeftTabId
          : newLeftTabs[0] || null,
        activeRightTabId: newRightTabs.includes(currentSplitView.activeRightTabId!)
          ? currentSplitView.activeRightTabId
          : newRightTabs[0] || null,
        // Consider if history should be fully re-evaluated here or if rootStore manages it
        leftTabHistory: (currentSplitView.leftTabHistory || []).filter(id => newLeftTabs.includes(id)),
        rightTabHistory: (currentSplitView.rightTabHistory || []).filter(id => newRightTabs.includes(id)),
      }
    };
  }),

  reorderTabs: (side, newOrder) => set((state) => {
    // This is a more specific reorder if rootStore uses this name.
    // It's similar to updateTabOrder but for a single side.
    const currentSplitView = state.splitView;
    if (side === 'left') {
      return {
        splitView: {
          ...currentSplitView,
          leftTabs: newOrder,
          activeLeftTabId: newOrder.includes(currentSplitView.activeLeftTabId!)
            ? currentSplitView.activeLeftTabId
            : newOrder[0] || null,
          leftTabHistory: (currentSplitView.leftTabHistory || []).filter(id => newOrder.includes(id)),
        }
      };
    } else { // side === 'right'
      return {
        splitView: {
          ...currentSplitView,
          rightTabs: newOrder,
          activeRightTabId: newOrder.includes(currentSplitView.activeRightTabId!)
            ? currentSplitView.activeRightTabId
            : newOrder[0] || null,
          rightTabHistory: (currentSplitView.rightTabHistory || []).filter(id => newOrder.includes(id)),
        }
      };
    }
  }),

  getTabsToLeft: (tabId, isRightSide) => {
    const { splitView } = get(); // Use get() to access current state
    const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);
    if (tabIndex <= 0) return [];
    return currentTabList.slice(0, tabIndex);
  },

  getTabsToRight: (tabId, isRightSide) => {
    const { splitView } = get();
    const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);
    if (tabIndex === -1 || tabIndex >= currentTabList.length - 1) return [];
    return currentTabList.slice(tabIndex + 1);
  },

  getAllExcept: (tabId, isRightSide) => {
    const { splitView } = get();
    const currentTabList = isRightSide ? splitView.rightTabs : splitView.leftTabs;
    if (currentTabList.length <= 1 && currentTabList.includes(tabId)) return [];
    return currentTabList.filter(id => id !== tabId);
  },

  clearSplitViewForWorkspace: (workspaceId) => set((state) => {
    // This is a more specific reorder if rootStore uses this name.
    // It's similar to updateTabOrder but for a single side.
    const currentSplitView = state.splitView;
    if (currentSplitView && currentSplitView.workspaceId === workspaceId) {
      return {
        splitView: undefined
      };
    }
    return {};
  }),

}));