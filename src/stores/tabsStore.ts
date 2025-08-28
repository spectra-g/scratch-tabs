import { create } from "zustand";
import { Tab } from "../types";
import { duplicateTab as duplicateTabUtil } from "../utils/tabUtils";
import { useWorkspaceStore } from "./workspaceStore";
import { incrementSetting } from "../db";
import { modelManager } from "../services/modelManager";

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
  duplicateTab: (tabId: string) => string;
}

// Helper function to initialize a tab with default values
const initializeTab = (tab: Tab): Tab => {
  const now = Date.now();
  const { activeWorkspaceId } = useWorkspaceStore.getState();

  return {
    id: tab.id ?? crypto.randomUUID(),
    title: tab.title ?? "New Tab",
    content: tab.content ?? "",
    richContent: tab.richContent ?? null,
    language: tab.language ?? "plaintext",
    languageLocked: tab.languageLocked ?? false,
    isRich: tab.isRich ?? false,
    cursorPosition: tab.cursorPosition ?? { lineNumber: 1, column: 1 },
    dateCreated: tab.dateCreated ?? now,
    lastModified: tab.lastModified ?? now,
    isTablet: tab.isTablet ?? false,
    tabletState: tab.tabletState ?? "",
    workspaceId: tab.workspaceId ?? activeWorkspaceId ?? "default",
    fontSize: tab.fontSize, // Preserve fontSize if provided
    isPinned: tab.isPinned, // Preserve isPinned if provided
    previewMode: tab.previewMode, // Preserve previewMode if provided
  };
};

export const useTabsStore = create<TabsStore>((set, get) => ({
  cursorPosition: { lineNumber: 1, column: 1 },
  tabs: [],
  activeTabId: null,

  addTab: (tab) =>
    set((state) => {
      const existingTab = state.tabs.find((t) => t.id === tab.id);
      if (existingTab) {
        return {
          tabs: state.tabs.map((t) =>
            t.id === tab.id ? { ...t, ...initializeTab(tab) } : t,
          ),
          activeTabId: tab.id,
        };
      }
      return {
        tabs: [...state.tabs, initializeTab(tab)],
        activeTabId: tab.id,
      };
    }),

  addBackgroundTab: (tab) =>
    set((state) => {
      const existingTab = state.tabs.find((t) => t.id === tab.id);
      if (existingTab) {
        return {
          tabs: state.tabs.map((t) =>
            t.id === tab.id ? { ...t, ...initializeTab(tab) } : t,
          ),
        };
      }
      return {
        tabs: [...state.tabs, initializeTab(tab)],
      };
    }),

  removeTab: (id) =>
    set((state) => {
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

  updateTabContent: (id, content) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, content, lastModified: Date.now() } : tab,
      ),
    }));
  },

  updateTabLanguage: (id, language, lock = true) =>
    set((state) => {
      // Update the model language if the model exists
      try {
        modelManager.updateModelLanguage(id, language);
      } catch (error) {
        console.warn(
          `[TabsStore] ❌ Failed to update model language for tab ${id}:`,
          error,
        );
      }

      return {
        tabs: state.tabs.map((tab) =>
          tab.id === id ? { ...tab, language, languageLocked: lock } : tab,
        ),
      };
    }),

  updateTabTitle: (id, title) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === id ? { ...tab, title, lastModified: Date.now() } : tab,
      ),
    })),

  updateTabState: (id, updates) =>
    set((state) => {
      const tabExists = state.tabs.some((tab) => tab.id === id);
      if (tabExists) {
        return {
          tabs: state.tabs.map((tab) =>
            tab.id === id
              ? { ...tab, ...updates, lastModified: Date.now() }
              : tab,
          ),
        };
      } else {
        // If tab doesn't exist, create it.
        // This can happen in race conditions during tab creation.
        const newTab = initializeTab({ id, ...updates } as Tab);
        return {
          tabs: [...state.tabs, newTab],
        };
      }
    }),

  duplicateTab: (tabId) => {
    const state = get();
    const tabToDuplicate = state.tabs.find((tab) => tab.id === tabId);
    if (!tabToDuplicate) return "";

    // Use the utility function to create a duplicate tab
    const now = Date.now();
    const newTab = {
      ...duplicateTabUtil(tabToDuplicate),
      dateCreated: now,
      lastModified: now,
    };

    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id,
    }));

    // Increment the total tabs created counter
    incrementSetting("tabs.created.total").catch((err) =>
      console.error("Failed to increment tab counter:", err),
    );

    return newTab.id;
  },
}));
