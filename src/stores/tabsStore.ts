import { create } from 'zustand';
import { Tab } from '../types';
import { generateTabId, duplicateTab as duplicateTabUtil } from '../utils/tabUtils';

interface TabsStore {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Tab management
  addTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string, lock?: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabState: (id: string, updates: Partial<Tab>) => void;
  duplicateTab: (tabId: string) => string; // Returns the new tab ID
}

export const useTabsStore = create<TabsStore>((set, get) => ({
  tabs: [],
  activeTabId: null,
  
  addTab: (tab) => set((state) => {
    const newTab = { ...tab, languageLocked: tab.languageLocked ?? false };
    return {
      tabs: [...state.tabs, newTab],
      activeTabId: tab.id,
    };
  }),
  
  removeTab: (id) => set((state) => {
    const newTabs = state.tabs.filter((tab) => tab.id !== id);
    
    // Determine the new active tab
    let newActiveTabId = state.activeTabId;
    if (state.activeTabId === id) {
      newActiveTabId = newTabs[0]?.id ?? null;
    }
    
    return {
      tabs: newTabs,
      activeTabId: newActiveTabId,
    };
  }),
  
  setActiveTab: (id) => set({ activeTabId: id }),
  
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

  updateTabState: (id, updates) => set((state) => ({
    tabs: state.tabs.map((tab) =>
      tab.id === id ? { ...tab, ...updates } : tab
    ),
  })),
  
  duplicateTab: (tabId) => {
    const state = get();
    const tabToDuplicate = state.tabs.find(tab => tab.id === tabId);
    if (!tabToDuplicate) return '';
    
    // Use the utility function to create a duplicate tab
    const newTab = duplicateTabUtil(tabToDuplicate);
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
    
    return newTab.id;
  },
}));