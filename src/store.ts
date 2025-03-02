import { create } from 'zustand';
import { Tab, EditorPosition, SplitViewState } from './types';

interface EditorStore {
  tabs: Tab[];
  activeTabId: string | null;
  cursorPosition: EditorPosition;
  previewMode: boolean;
  splitView: SplitViewState;
  forceUpdate: number; // Add a counter to force re-renders
  
  // Tab management
  addTab: (tab: Tab, toRightSide?: boolean) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string, lock?: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  setCursorPosition: (position: EditorPosition) => void;
  togglePreviewMode: () => void;
  
  // Split view management
  splitScreen: (tabId: string) => void;
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
  duplicateTab: (tabId: string, isRightSide: boolean) => void;
  groupTabsByType: (isRightSide: boolean) => void;
  
  // Tab limit checks
  canAddNewTab: (toRightSide?: boolean) => boolean;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  cursorPosition: { lineNumber: 1, column: 1 },
  previewMode: false,
  forceUpdate: 0, // Initialize counter
  splitView: {
    isSplit: false,
    leftTabs: [],
    rightTabs: [],
    activeLeftTabId: null,
    activeRightTabId: null,
    splitRatio: 0.5, // Default to 50/50 split
  },
  
  addTab: (tab, toRightSide = false) => set((state) => {
    // Check if we can add a new tab based on empty tab limits
    if (!get().canAddNewTab(toRightSide)) {
      return state;
    }
    
    const newTab = { ...tab, languageLocked: false };
    
    // If split view is active, add to the specified side
    if (state.splitView.isSplit) {
      if (toRightSide) {
        return {
          tabs: [...state.tabs, newTab],
          activeTabId: tab.id,
          splitView: {
            ...state.splitView,
            rightTabs: [...state.splitView.rightTabs, tab.id],
            activeRightTabId: tab.id,
          }
        };
      } else {
        return {
          tabs: [...state.tabs, newTab],
          activeTabId: tab.id,
          splitView: {
            ...state.splitView,
            leftTabs: [...state.splitView.leftTabs, tab.id],
            activeLeftTabId: tab.id,
          }
        };
      }
    }
    
    // Normal case (no split)
    return {
      tabs: [...state.tabs, newTab],
      activeTabId: tab.id,
      splitView: {
        ...state.splitView,
        leftTabs: [...state.splitView.leftTabs, tab.id],
        activeLeftTabId: tab.id,
      }
    };
  }),
  
  removeTab: (id) => set((state) => {
    // Remove the tab from the tabs array
    const newTabs = state.tabs.filter((tab) => tab.id !== id);
    
    // Handle split view tab removal
    let newSplitView = { ...state.splitView };
    
    // Remove from left tabs if present
    if (newSplitView.leftTabs.includes(id)) {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(tabId => tabId !== id);
      
      // If the active left tab was removed, set a new active left tab
      if (newSplitView.activeLeftTabId === id) {
        newSplitView.activeLeftTabId = newSplitView.leftTabs[0] || null;
      }
    }
    
    // Remove from right tabs if present
    if (newSplitView.rightTabs.includes(id)) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(tabId => tabId !== id);
      
      // If the active right tab was removed, set a new active right tab
      if (newSplitView.activeRightTabId === id) {
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
    
    // Determine the new active tab
    let newActiveTabId = state.activeTabId;
    if (state.activeTabId === id) {
      if (newSplitView.isSplit) {
        // If in split view, set active tab based on which side was active
        if (newSplitView.leftTabs.includes(id)) {
          newActiveTabId = newSplitView.activeLeftTabId;
        } else {
          newActiveTabId = newSplitView.activeRightTabId;
        }
      } else {
        // Not in split view, just take the first available tab
        newActiveTabId = newTabs[0]?.id ?? null;
      }
    }
    
    return {
      tabs: newTabs,
      activeTabId: newActiveTabId,
      splitView: newSplitView,
    };
  }),
  
  setActiveTab: (id) => set((state) => {
    // Determine which side the tab is on in split view
    if (state.splitView.isSplit) {
      if (state.splitView.leftTabs.includes(id)) {
        return {
          activeTabId: id,
          splitView: {
            ...state.splitView,
            activeLeftTabId: id,
          }
        };
      } else if (state.splitView.rightTabs.includes(id)) {
        return {
          activeTabId: id,
          splitView: {
            ...state.splitView,
            activeRightTabId: id,
          }
        };
      }
    }
    
    return { activeTabId: id };
  }),
  
  updateTabContent: (id, content) => set((state) => ({
    tabs: state.tabs.map((tab) => 
      tab.id === id ? { ...tab, content } : tab
    ),
  })),

  updateTabLanguage: (id, language, lock = true) => set((state) => ({
    tabs: state.tabs.map((tab) =>
      tab.id === id ? { ...tab, language, languageLocked: lock } : tab
    ),
  })),

  updateTabTitle: (id, title) => set((state) => ({
    tabs: state.tabs.map((tab) =>
      tab.id === id ? { ...tab, title } : tab
    ),
  })),
  
  setCursorPosition: (position) => set({ cursorPosition: position }),
  
  togglePreviewMode: () => set((state) => ({ previewMode: !state.previewMode })),
  
  // Split view actions
  splitScreen: (tabId) => set((state) => {
    if (state.splitView.isSplit) return state; // Already split
    if (state.tabs.length < 2) return state; // Need at least 2 tabs to split
    
    // Get all tabs except the one being moved to the right
    const leftTabIds = state.tabs
      .filter(tab => tab.id !== tabId)
      .map(tab => tab.id);
    
    return {
      splitView: {
        isSplit: true,
        leftTabs: leftTabIds,
        rightTabs: [tabId],
        activeLeftTabId: leftTabIds[0] || null,
        activeRightTabId: tabId,
        splitRatio: 0.5, // Default to 50/50 split
      },
      activeTabId: tabId, // Set the right tab as active
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
        },
        activeTabId: state.splitView.activeLeftTabId || allTabs[0] || null,
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
        },
        activeTabId: state.splitView.activeRightTabId || allTabs[0] || null,
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
      },
      activeTabId: tabId,
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
      },
      activeTabId: tabId,
    };
  }),
  
  setActiveLeftTab: (id) => set((state) => ({
    activeTabId: id,
    splitView: {
      ...state.splitView,
      activeLeftTabId: id,
    }
  })),
  
  setActiveRightTab: (id) => set((state) => ({
    activeTabId: id,
    splitView: {
      ...state.splitView,
      activeRightTabId: id,
    }
  })),
  
  // Set the split ratio (0 to 1)
  setSplitRatio: (ratio) => set((state) => ({
    splitView: {
      ...state.splitView,
      splitRatio: ratio,
    }
  })),
  
  // Bulk tab operations
  closeTabsToLeft: (tabId, isRightSide) => set((state) => {
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    
    // Find the index of the current tab in its list
    const tabIndex = currentTabList.indexOf(tabId);
    
    if (tabIndex <= 0) return state; // No tabs to the left
    
    // Get the tabs to close (all tabs to the left of the current tab)
    const tabsToClose = currentTabList.slice(0, tabIndex);
    
    // Filter out the tabs to close from the tabs array
    const newTabs = state.tabs.filter(tab => !tabsToClose.includes(tab.id));
    
    // Update the tab lists
    let newSplitView = { ...state.splitView };
    
    if (isRightSide) {
      newSplitView.rightTabs = newSplitView.rightTabs.filter(id => !tabsToClose.includes(id));
    } else {
      newSplitView.leftTabs = newSplitView.leftTabs.filter(id => !tabsToClose.includes(id));
    }
    
    return {
      tabs: newTabs,
      splitView: newSplitView,
    };
  }),
  
  closeTabsToRight: (tabId, isRightSide) => set((state) => {
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    
    // Find the index of the current tab in its list
    const tabIndex = currentTabList.indexOf(tabId);
    
    if (tabIndex === -1 || tabIndex === currentTabList.length - 1) return state; // No tabs to the right
    
    // Get the tabs to close (all tabs to the right of the current tab)
    const tabsToClose = currentTabList.slice(tabIndex + 1);
    
    // Filter out the tabs to close from the tabs array
    const newTabs = state.tabs.filter(tab => !tabsToClose.includes(tab.id));
    
    // Update the tab lists
    let newSplitView = { ...state.splitView };
    
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
    
    // Update the active tab if needed
    let newActiveTabId = state.activeTabId;
    if (tabsToClose.includes(state.activeTabId || '')) {
      newActiveTabId = tabId;
    }
    
    return {
      tabs: newTabs,
      activeTabId: newActiveTabId,
      splitView: newSplitView,
    };
  }),
  
  closeAllExcept: (tabId, isRightSide) => set((state) => {
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    
    if (currentTabList.length <= 1) return state; // Only one tab, nothing to close
    
    // Get the tabs to close (all tabs except the current one)
    const tabsToClose = currentTabList.filter(id => id !== tabId);
    
    // Filter out the tabs to close from the tabs array
    const newTabs = state.tabs.filter(tab => !tabsToClose.includes(tab.id) || tab.id === tabId);
    
    // Update the tab lists
    let newSplitView = { ...state.splitView };
    
    if (isRightSide) {
      newSplitView.rightTabs = [tabId];
      newSplitView.activeRightTabId = tabId;
    } else {
      newSplitView.leftTabs = [tabId];
      newSplitView.activeLeftTabId = tabId;
    }
    
    // Update the active tab if needed
    let newActiveTabId = state.activeTabId;
    if (tabsToClose.includes(state.activeTabId || '')) {
      newActiveTabId = tabId;
    }
    
    return {
      tabs: newTabs,
      activeTabId: newActiveTabId,
      splitView: newSplitView,
    };
  }),
  
  // Duplicate tab function
  duplicateTab: (tabId, isRightSide) => set((state) => {
    // Find the tab to duplicate
    const tabToDuplicate = state.tabs.find(tab => tab.id === tabId);
    if (!tabToDuplicate) return state;
    
    // Check if we can add a new tab based on empty tab limits
    if (!get().canAddNewTab(isRightSide)) {
      return state;
    }
    
    // Create a new tab with the same content but a new ID
    const newTabId = crypto.randomUUID();
    const newTab = {
      ...tabToDuplicate,
      id: newTabId,
      title: `${tabToDuplicate.title} (copy)`
    };
    
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    
    // Find the index of the current tab in its list
    const tabIndex = currentTabList.indexOf(tabId);
    
    // Update the tab lists
    let newSplitView = { ...state.splitView };
    
    if (isRightSide) {
      // Insert the new tab after the current tab
      const newRightTabs = [...newSplitView.rightTabs];
      newRightTabs.splice(tabIndex + 1, 0, newTabId);
      
      newSplitView.rightTabs = newRightTabs;
      newSplitView.activeRightTabId = newTabId;
    } else {
      // Insert the new tab after the current tab
      const newLeftTabs = [...newSplitView.leftTabs];
      newLeftTabs.splice(tabIndex + 1, 0, newTabId);
      
      newSplitView.leftTabs = newLeftTabs;
      newSplitView.activeLeftTabId = newTabId;
    }
    
    return {
      tabs: [...state.tabs, newTab],
      activeTabId: newTabId,
      splitView: newSplitView,
    };
  }),
  
  // Group tabs by type function
  groupTabsByType: (isRightSide) => set((state) => {
    // Get the current tab list based on which side we're on
    const currentTabList = isRightSide ? state.splitView.rightTabs : state.splitView.leftTabs;
    
    // Get the active tab ID for the current side
    const activeTabId = isRightSide ? state.splitView.activeRightTabId : state.splitView.activeLeftTabId;
    
    // Get the tabs with their languages
    const tabsWithLanguages = currentTabList.map(id => {
      const tab = state.tabs.find(t => t.id === id);
      return { id, language: tab ? tab.language : 'plaintext' };
    });
    
    // Group tabs by language
    const groupedTabs = groupTabsByLanguage(tabsWithLanguages);
    
    // Update the tab lists
    let newSplitView = { ...state.splitView };
    
    if (isRightSide) {
      newSplitView.rightTabs = [...groupedTabs]; // Create a new array to ensure reference change
    } else {
      newSplitView.leftTabs = [...groupedTabs]; // Create a new array to ensure reference change
    }
    
    // Increment the force update counter to trigger re-renders
    return {
      splitView: newSplitView,
      forceUpdate: state.forceUpdate + 1,
    };
  }),
  
  // Check if we can add a new tab based on empty tab limits
  canAddNewTab: (toRightSide = false) => {
    const state = get();
    const { tabs, splitView } = state;
    
    // If in split view, check the appropriate side
    if (splitView.isSplit) {
      if (toRightSide) {
        // Check right side tabs
        const rightTabIds = splitView.rightTabs;
        const emptyRightTabs = rightTabIds.filter(id => {
          const tab = tabs.find(t => t.id === id);
          return tab && tab.content.trim() === '';
        });
        
        return emptyRightTabs.length < 3;
      } else {
        // Check left side tabs
        const leftTabIds = splitView.leftTabs;
        const emptyLeftTabs = leftTabIds.filter(id => {
          const tab = tabs.find(t => t.id === id);
          return tab && tab.content.trim() === '';
        });
        
        return emptyLeftTabs.length < 3;
      }
    } else {
      // Not in split view, check all tabs
      const emptyTabs = tabs.filter(tab => tab.content.trim() === '');
      return emptyTabs.length < 3;
    }
  }
}));

// Helper function to group tabs by language
function groupTabsByLanguage(tabs: { id: string; language: string }[]): string[] {
  // Create a map of language -> tab IDs
  const languageMap: Record<string, string[]> = {};
  
  // Group tabs by language
  tabs.forEach(tab => {
    if (!languageMap[tab.language]) {
      languageMap[tab.language] = [];
    }
    languageMap[tab.language].push(tab.id);
  });
  
  // Flatten the map back to an array, preserving the order of languages
  const languages = Object.keys(languageMap);
  const result: string[] = [];
  
  languages.forEach(language => {
    result.push(...languageMap[language]);
  });
  
  return result;
}