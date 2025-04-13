import { create } from 'zustand';
import { SplitViewState } from '../types';
import {
  createDefaultSplitViewState,
  updateTabHistory,
  getPreviousActiveTab,
  removeTabFromHistory
} from '../utils';

interface SplitViewStore {
  splitView: SplitViewState;
  setSplitView: (splitView: Partial<SplitViewState>) => void;
  splitScreen: (leftTabIds: string[], rightTabId: string) => void;
  unsplitScreen: (fromRight: boolean) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setSplitRatio: (ratio: number) => void;
  addTabToSide: (tabId: string, toRightSide: boolean) => void;
  removeTabFromSide: (tabId: string) => void;
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  groupTabsByType: (isRightSide: boolean) => void;
}

export const useSplitViewStore = create<SplitViewStore>((set) => ({
  splitView: createDefaultSplitViewState(),

  setSplitView: (newSplitView) => set((state) => {
    // Ensure history arrays exist when loading from storage
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

    return {
      splitView: {
        ...state.splitView,
        isSplit: true,
        leftTabs: leftTabIds,
        rightTabs: [rightTabId],
        activeLeftTabId: leftTabIds[0],
        activeRightTabId: rightTabId,
        splitRatio: 0.5,
        leftTabHistory: [leftTabIds[0]],
        rightTabHistory: [rightTabId],
      }
    };
  }),

  unsplitScreen: (fromRight) => set((state) => {
    if (!state.splitView.isSplit) return state;

    const allTabs = [...state.splitView.leftTabs, ...state.splitView.rightTabs];
    const activeId = fromRight ? state.splitView.activeLeftTabId : state.splitView.activeRightTabId;

    return {
      splitView: {
        ...state.splitView,
        isSplit: false,
        leftTabs: allTabs,
        rightTabs: [],
        activeLeftTabId: activeId || allTabs[0] || null,
        activeRightTabId: null,
        splitRatio: 0.5,
        leftTabHistory: [activeId || allTabs[0] || null].filter(Boolean) as string[],
        rightTabHistory: [],
      }
    };
  }),

  moveTabToRight: (tabId) => set((state) => {
    if (!state.splitView.isSplit || !state.splitView.leftTabs.includes(tabId)) return state;

    const newLeftTabs = state.splitView.leftTabs.filter(id => id !== tabId);
    if (newLeftTabs.length === 0) return state;

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
        leftTabHistory: removeTabFromHistory(state.splitView.leftTabHistory, tabId),
        rightTabHistory: updateTabHistory(state.splitView.rightTabHistory, tabId),
      }
    };
  }),

  moveTabToLeft: (tabId) => set((state) => {
    if (!state.splitView.isSplit || !state.splitView.rightTabs.includes(tabId)) return state;

    const newRightTabs = state.splitView.rightTabs.filter(id => id !== tabId);
    if (newRightTabs.length === 0) return state;

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
        rightTabHistory: removeTabFromHistory(state.splitView.rightTabHistory, tabId),
        leftTabHistory: updateTabHistory(state.splitView.leftTabHistory, tabId),
      }
    };
  }),

  setActiveLeftTab: (id) => set((state) => ({
    splitView: {
      ...state.splitView,
      activeLeftTabId: id,
      leftTabHistory: updateTabHistory(state.splitView.leftTabHistory, id),
    }
  })),

  setActiveRightTab: (id) => set((state) => ({
    splitView: {
      ...state.splitView,
      activeRightTabId: id,
      rightTabHistory: updateTabHistory(state.splitView.rightTabHistory, id),
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
          rightTabHistory: updateTabHistory(state.splitView.rightTabHistory, tabId),
        }
      };
    } else {
      return {
        splitView: {
          ...state.splitView,
          leftTabs: [...state.splitView.leftTabs, tabId],
          activeLeftTabId: tabId,
          leftTabHistory: updateTabHistory(state.splitView.leftTabHistory, tabId),
        }
      };
    }
  }),

  removeTabFromSide: (tabId) => set((state) => {
    const newSplitView = { ...state.splitView };

    // Remove from left side
    if (newSplitView.leftTabs.includes(tabId)) {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => id !== tabId);
      newSplitView.leftTabHistory = removeTabFromHistory(newSplitView.leftTabHistory, tabId);

      if (newSplitView.activeLeftTabId === tabId) {
        newSplitView.activeLeftTabId = getPreviousActiveTab(newSplitView.leftTabHistory, newSplitView.leftTabs);
      }
    }

    // Remove from right side
    if (newSplitView.rightTabs.includes(tabId)) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => id !== tabId);
      newSplitView.rightTabHistory = removeTabFromHistory(newSplitView.rightTabHistory, tabId);

      if (newSplitView.activeRightTabId === tabId) {
        newSplitView.activeRightTabId = getPreviousActiveTab(newSplitView.rightTabHistory, newSplitView.rightTabs);
      }
    }

    // Handle unsplit if needed
    if (newSplitView.isSplit) {
      if (newSplitView.leftTabs.length === 0) {
        newSplitView.isSplit = false;
        newSplitView.leftTabs = [...newSplitView.rightTabs];
        newSplitView.rightTabs = [];
        newSplitView.activeLeftTabId = newSplitView.activeRightTabId;
        newSplitView.activeRightTabId = null;
        newSplitView.leftTabHistory = [...newSplitView.rightTabHistory];
        newSplitView.rightTabHistory = [];
      } else if (newSplitView.rightTabs.length === 0) {
        newSplitView.isSplit = false;
        newSplitView.rightTabs = [];
        newSplitView.activeRightTabId = null;
        newSplitView.rightTabHistory = [];
      }
    }

    return { splitView: newSplitView };
  }),

  closeTabsToLeft: (tabId, isRightSide) => set((state) => {
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);

    if (tabIndex <= 0) return state;

    const tabsToClose = currentTabList.slice(0, tabIndex);
    const newSplitView = { ...state.splitView };

    if (isRightSide) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => !tabsToClose.includes(id));
      newSplitView.rightTabHistory = newSplitView.rightTabHistory.filter(id => !tabsToClose.includes(id));
    } else {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => !tabsToClose.includes(id));
      newSplitView.leftTabHistory = newSplitView.leftTabHistory.filter(id => !tabsToClose.includes(id));
    }

    return { splitView: newSplitView };
  }),

  closeTabsToRight: (tabId, isRightSide) => set((state) => {
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    const tabIndex = currentTabList.indexOf(tabId);

    if (tabIndex === -1 || tabIndex === currentTabList.length - 1) return state;

    const tabsToClose = currentTabList.slice(tabIndex + 1);
    const newSplitView = { ...state.splitView };

    if (isRightSide) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => !tabsToClose.includes(id));
      newSplitView.rightTabHistory = newSplitView.rightTabHistory.filter(id => !tabsToClose.includes(id));
    } else {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => !tabsToClose.includes(id));
      newSplitView.leftTabHistory = newSplitView.leftTabHistory.filter(id => !tabsToClose.includes(id));
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

  groupTabsByType: (_isRightSide) => set((state) => state),
}));