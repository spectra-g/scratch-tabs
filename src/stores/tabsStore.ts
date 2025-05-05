import { create } from 'zustand';
import { EditorPosition, Tab } from '../types';
import { duplicateTab as duplicateTabUtil } from '../utils/tabUtils';
import { useWorkspaceStore } from './workspaceStore';

interface TabsStore {
  tabs: Tab[];
  activeTabId: string | null;
  
  // Tab management
  addTab: (tab: Tab) => void;
  addBackgroundTab: (tab: Tab) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabContent: (id: string, content: string) => void;
  updateTabLanguage: (id: string, language: string, lock?: boolean) => void;
  updateTabTitle: (id: string, title: string) => void;
  updateTabState: (id: string, updates: Partial<Tab>) => void;
  duplicateTab: (tabId: string) => string; // Returns the new tab ID
  setCursorPosition: (tabId: string, cursorPosition: EditorPosition) => void;
}

// Helper function to initialize a tab with default values
const initializeTab = (tab: Tab): Tab => {
  const now = Date.now();
  const { activeWorkspaceId } = useWorkspaceStore.getState();
  
  return {
    id: tab.id ?? crypto.randomUUID(),
    title: tab.title ?? 'New Tab',
    content: tab.content ?? '',
    language: tab.language ?? 'plaintext',
    languageLocked: tab.languageLocked ?? false,
    cursorPosition: tab.cursorPosition ?? { lineNumber: 1, column: 1 },
    dateCreated: tab.dateCreated ?? now,
    lastModified: tab.lastModified ?? now,
    workspaceId: tab.workspaceId ?? activeWorkspaceId ?? 'default'
  };
};

export const useTabsStore = create<TabsStore>((set, get) => ({
  cursorPosition: { lineNumber: 1, column: 1 },
  tabs: [],
  activeTabId: null,

  setCursorPosition: (tabId, cursorPosition) => set((state) => ({
    tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, cursorPosition } : tab
    ),
  })),

  addTab: (tab) => set((state) => ({
    tabs: [...state.tabs, initializeTab(tab)],
    activeTabId: tab.id,
  })),

  addBackgroundTab: (tab) => set((state) => ({
    tabs: [...state.tabs, initializeTab(tab)],
  })),

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
      tab.id === id ? { ...tab, content, lastModified: Date.now() } : tab
    ),
  })),

  updateTabLanguage: (id, language, lock = true) => set((state) => ({
    tabs: state.tabs.map((tab) =>
      tab.id === id ? { ...tab, language, languageLocked: lock } : tab
    ),
  })),

  updateTabTitle: (id, title) => set((state) => ({
    tabs: state.tabs.map((tab) =>
      tab.id === id ? { ...tab, title, lastModified: Date.now() } : tab
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
    const now = Date.now();
    const newTab = {
      ...duplicateTabUtil(tabToDuplicate),
      dateCreated: now,
      lastModified: now
    };
    
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));
    
    return newTab.id;
  },
}));