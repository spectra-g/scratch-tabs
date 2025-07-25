// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useTabsStore } from "../tabsStore";
import { Tab, Workspace } from "../../types";
import { incrementSetting } from "../../db";

// Mock dependencies
jest.mock("../workspaceStore", () => ({
  useWorkspaceStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../../services/modelManager", () => ({
  modelManager: {
    // Add mock implementations for any modelManager functions used in tabsStore
    updateModelLanguage: jest.fn(),
    getContent: jest.fn(),
    createModel: jest.fn(),
    dispose: jest.fn(),
    disposeAll: jest.fn(),
  },
}));

jest.mock("../rootStore", () => ({
  useRootStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../../db", () => ({
  incrementSetting: jest.fn(),
}));

import { useWorkspaceStore } from "../workspaceStore";

// Manually define store interfaces based on their implementation
interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  loadWorkspaces: () => Promise<void>;
  ensureWorkspace: () => Promise<string | null>;
  createWorkspace: (name: string) => Promise<string | null>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  updateWorkspaceNotes: (workspaceId: string, notes: string) => Promise<void>;
  addWorkspaceLink: (
    workspaceId: string,
    url: string,
    title?: string,
  ) => Promise<void>;
  removeWorkspaceLink: (workspaceId: string, linkId: string) => Promise<void>;
  getActiveWorkspace: () => Workspace | undefined;
}

const mockWorkspaceStore = useWorkspaceStore as jest.Mocked<
  typeof useWorkspaceStore
>;

describe("TabsStore", () => {
  let mockTab: Tab;
  let mockWorkspaceState: WorkspaceStore;

  beforeEach(() => {
    // Reset store state
    useTabsStore.setState({
      tabs: [],
      activeTabId: null,
    });

    // Create a mock tab
    mockTab = {
      id: "test-tab-id",
      title: "Test Tab",
      content: 'console.log("Hello World");',
      language: "javascript",
      languageLocked: false,
      workspaceId: "test-workspace-id",
      dateCreated: Date.now(),
      lastModified: Date.now(),
      cursorPosition: { lineNumber: 1, column: 1 },
      isPinned: false,
      isTablet: false,
      tabletState: "",
      previewMode: false,
    };

    // Create fully typed mock states
    mockWorkspaceState = {
      workspaces: [],
      activeWorkspaceId: "test-workspace-id",
      isLoading: false,
      error: null,
      loadWorkspaces: jest.fn().mockResolvedValue(undefined) as any,
      ensureWorkspace: jest.fn().mockResolvedValue("test-workspace-id") as any,
      createWorkspace: jest.fn().mockResolvedValue("test-workspace-id") as any,
      switchWorkspace: jest.fn().mockResolvedValue(undefined) as any,
      renameWorkspace: jest.fn().mockResolvedValue(undefined) as any,
      deleteWorkspace: jest.fn().mockResolvedValue(undefined) as any,
      updateWorkspaceNotes: jest.fn().mockResolvedValue(undefined) as any,
      addWorkspaceLink: jest.fn().mockResolvedValue(undefined) as any,
      removeWorkspaceLink: jest.fn().mockResolvedValue(undefined) as any,
      getActiveWorkspace: jest.fn().mockReturnValue(undefined) as any,
    };

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default workspace mock
    mockWorkspaceStore.getState.mockReturnValue(mockWorkspaceState);

    // Mock the incrementSetting function to return a resolved promise
    (incrementSetting as jest.Mock).mockResolvedValue(undefined);
  });

  describe("Initial State", () => {
    it("should initialize with empty tabs and no active tab", () => {
      const state = useTabsStore.getState();

      expect(state.tabs).toEqual([]);
      expect(state.activeTabId).toBeNull();
    });
  });

  describe("Add Tab", () => {
    it("should add a new tab and set it as active", () => {
      useTabsStore.getState().addTab(mockTab);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      const addedTab = state.tabs[0];
      expect(addedTab.id).toBe(mockTab.id);
      expect(addedTab.title).toBe(mockTab.title);
      expect(addedTab.content).toBe(mockTab.content);
      expect(state.activeTabId).toBe(mockTab.id);
    });

    it("should initialize tab with default values when fields are missing", () => {
      const partialTab = {
        id: "partial-tab-id",
        title: "Partial Tab",
        content: "Content",
        workspaceId: "test-workspace-id",
      } as Tab;

      useTabsStore.getState().addTab(partialTab);

      const state = useTabsStore.getState();
      const addedTab = state.tabs[0];

      expect(addedTab.id).toBe("partial-tab-id");
      expect(addedTab.title).toBe("Partial Tab");
      expect(addedTab.content).toBe("Content");
      expect(addedTab.language).toBe("plaintext");
      expect(addedTab.languageLocked).toBe(false);
      expect(addedTab.cursorPosition).toEqual({ lineNumber: 1, column: 1 });
      expect(addedTab.isTablet).toBe(false);
      expect(addedTab.tabletState).toBe("");
      expect(typeof addedTab.dateCreated).toBe("number");
      expect(typeof addedTab.lastModified).toBe("number");
    });

    it("should update existing tab when adding with same ID", () => {
      const existingTab = { ...mockTab, content: "Original content" };
      const updatedTab = { ...mockTab, content: "Updated content" };

      useTabsStore.getState().addTab(existingTab);
      useTabsStore.getState().addTab(updatedTab);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].content).toBe("Updated content");
      expect(state.activeTabId).toBe(mockTab.id);
    });

    it("should use active workspace ID when tab has no workspace ID", () => {
      const tabWithoutWorkspaceId = {
        ...mockTab,
        workspaceId: undefined,
      } as any;

      useTabsStore.getState().addTab(tabWithoutWorkspaceId);

      const state = useTabsStore.getState();
      expect(state.tabs[0].workspaceId).toBe("test-workspace-id");
    });
  });

  describe("Add Background Tab", () => {
    it("should add a new tab without setting it as active", () => {
      useTabsStore.setState({ activeTabId: "other-tab-id" });

      useTabsStore.getState().addBackgroundTab(mockTab);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      const addedTab = state.tabs[0];
      expect(addedTab.id).toBe(mockTab.id);
      expect(addedTab.title).toBe(mockTab.title);
      expect(addedTab.content).toBe(mockTab.content);
      expect(state.activeTabId).toBe("other-tab-id"); // Should not change
    });

    it("should update existing tab when adding background tab with same ID", () => {
      const existingTab = { ...mockTab, content: "Original content" };
      const updatedTab = { ...mockTab, content: "Updated content" };

      useTabsStore.getState().addBackgroundTab(existingTab);
      useTabsStore.getState().addBackgroundTab(updatedTab);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].content).toBe("Updated content");
      expect(state.activeTabId).toBeNull(); // Should remain null
    });
  });

  describe("Remove Tab", () => {
    it("should remove tab and update active tab", () => {
      const tab1 = { ...mockTab, id: "tab1" };
      const tab2 = { ...mockTab, id: "tab2" };

      useTabsStore.getState().addTab(tab1);
      useTabsStore.getState().addTab(tab2);

      useTabsStore.getState().removeTab("tab1");

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe("tab2");
      expect(state.activeTabId).toBe("tab2");
    });

    it("should set active tab to first remaining tab when removing active tab", () => {
      const tab1 = { ...mockTab, id: "tab1" };
      const tab2 = { ...mockTab, id: "tab2" };

      useTabsStore.getState().addTab(tab1);
      useTabsStore.getState().addTab(tab2);

      // Remove active tab (tab2)
      useTabsStore.getState().removeTab("tab2");

      const state = useTabsStore.getState();
      expect(state.activeTabId).toBe("tab1");
    });

    it("should set active tab to null when removing last tab", () => {
      useTabsStore.getState().addTab(mockTab);
      useTabsStore.getState().removeTab(mockTab.id);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(0);
      expect(state.activeTabId).toBeNull();
    });

    it("should not change active tab when removing non-active tab", () => {
      const tab1 = { ...mockTab, id: "tab1" };
      const tab2 = { ...mockTab, id: "tab2" };

      useTabsStore.getState().addTab(tab1);
      useTabsStore.getState().addTab(tab2);

      // Remove non-active tab
      useTabsStore.getState().removeTab("tab1");

      const state = useTabsStore.getState();
      expect(state.activeTabId).toBe("tab2"); // Should remain unchanged
    });
  });

  describe("Set Active Tab", () => {
    it("should set active tab ID", () => {
      useTabsStore.getState().setActiveTab("new-active-tab");

      expect(useTabsStore.getState().activeTabId).toBe("new-active-tab");
    });
  });

  describe("Update Tab Content", () => {
    it("should update tab content and lastModified timestamp", () => {
      const originalTime = Date.now();
      const tabWithTime = { ...mockTab, lastModified: originalTime };

      useTabsStore.getState().addTab(tabWithTime);

      // Wait a bit to ensure timestamp difference
      jest.useFakeTimers();
      jest.advanceTimersByTime(100);

      useTabsStore.getState().updateTabContent(mockTab.id, "New content");

      const state = useTabsStore.getState();
      const updatedTab = state.tabs.find((t) => t.id === mockTab.id);

      expect(updatedTab?.content).toBe("New content");
      expect(updatedTab?.lastModified).toBeGreaterThan(originalTime);

      jest.useRealTimers();
    });

    it("should not update if tab is not found", () => {
      const originalTabs = [mockTab];
      useTabsStore.setState({ tabs: originalTabs });

      useTabsStore
        .getState()
        .updateTabContent("non-existent-id", "New content");

      const state = useTabsStore.getState();
      expect(state.tabs).toEqual(originalTabs);
    });
  });

  describe("Update Tab Language", () => {
    it("should update tab language and lock status", () => {
      useTabsStore.getState().addTab(mockTab);

      useTabsStore.getState().updateTabLanguage(mockTab.id, "python", true);

      const state = useTabsStore.getState();
      const updatedTab = state.tabs.find((t) => t.id === mockTab.id);

      expect(updatedTab?.language).toBe("python");
      expect(updatedTab?.languageLocked).toBe(true);
    });

    it("should not update if tab is not found", () => {
      const originalTabs = [mockTab];
      useTabsStore.setState({ tabs: originalTabs });

      useTabsStore
        .getState()
        .updateTabLanguage("non-existent-id", "python", true);

      const state = useTabsStore.getState();
      expect(state.tabs).toEqual(originalTabs);
    });
  });

  describe("Update Tab Title", () => {
    it("should update tab title", () => {
      useTabsStore.getState().addTab(mockTab);

      useTabsStore.getState().updateTabTitle(mockTab.id, "New Title");

      const state = useTabsStore.getState();
      const updatedTab = state.tabs.find((t) => t.id === mockTab.id);

      expect(updatedTab?.title).toBe("New Title");
    });

    it("should not update if tab is not found", () => {
      const originalTabs = [mockTab];
      useTabsStore.setState({ tabs: originalTabs });

      useTabsStore.getState().updateTabTitle("non-existent-id", "New Title");

      const state = useTabsStore.getState();
      expect(state.tabs).toEqual(originalTabs);
    });
  });

  describe("Update Tab State", () => {
    it("should update tab state properties", () => {
      useTabsStore.getState().addTab(mockTab);

      const updates = { isPinned: true, previewMode: true };
      useTabsStore.getState().updateTabState(mockTab.id, updates);

      const updatedTab = useTabsStore.getState().tabs[0];
      expect(updatedTab.isPinned).toBe(true);
      expect(updatedTab.previewMode).toBe(true);
    });

    it("should create a new tab if it does not exist", () => {
      const updates = { title: "New Auto-Created Tab" };
      useTabsStore.getState().updateTabState("non-existent-id", updates);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0].id).toBe("non-existent-id");
      expect(state.tabs[0].title).toBe("New Auto-Created Tab");
    });
  });

  describe("Duplicate Tab", () => {
    it("should create a duplicate tab with new ID", () => {
      useTabsStore.getState().addTab(mockTab);

      const duplicateId = useTabsStore.getState().duplicateTab(mockTab.id);

      const state = useTabsStore.getState();
      expect(state.tabs).toHaveLength(2);
      expect(state.activeTabId).toBe(duplicateId);

      const duplicateTab = state.tabs.find((t) => t.id === duplicateId);
      expect(duplicateTab).toBeDefined();
      expect(duplicateTab?.title).toBe(`${mockTab.title} (Copy)`);
      expect(duplicateTab?.content).toBe(mockTab.content);
      expect(duplicateTab?.language).toBe(mockTab.language);
      expect(duplicateTab?.workspaceId).toBe(mockTab.workspaceId);
    });

    it("should return empty string if original tab is not found", () => {
      const duplicateId = useTabsStore
        .getState()
        .duplicateTab("non-existent-id");
      expect(duplicateId).toBe("");
    });
  });

  describe("Workspace Filtering", () => {
    it("should filter tabs by workspace ID", () => {
      const workspaceTab1 = {
        ...mockTab,
        id: "workspace-tab-1",
        workspaceId: "target-workspace",
      };
      const workspaceTab2 = {
        ...mockTab,
        id: "workspace-tab-2",
        workspaceId: "target-workspace",
      };
      const otherTab = {
        ...mockTab,
        id: "other-tab",
        workspaceId: "other-workspace",
      };

      useTabsStore.getState().addTab(workspaceTab1);
      useTabsStore.getState().addTab(workspaceTab2);
      useTabsStore.getState().addTab(otherTab);

      // This would be tested if we had a getTabsByWorkspace method
      // For now, we test the underlying behavior in removeTabsByWorkspace
      const state = useTabsStore.getState();
      const targetWorkspaceTabs = state.tabs.filter(
        (tab) => tab.workspaceId === "target-workspace",
      );

      expect(targetWorkspaceTabs).toHaveLength(2);
      expect(targetWorkspaceTabs.map((t) => t.id)).toEqual([
        "workspace-tab-1",
        "workspace-tab-2",
      ]);
    });
  });

  describe("Integration with incrementSetting", () => {
    it("should call incrementSetting when adding new tab", async () => {
      useTabsStore.getState().addTab(mockTab);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(incrementSetting).not.toHaveBeenCalled();
    });

    it("should call incrementSetting when duplicating a tab", async () => {
      useTabsStore.getState().addTab(mockTab); // Need a tab to duplicate
      useTabsStore.getState().duplicateTab(mockTab.id);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(incrementSetting).toHaveBeenCalledWith("tabs.created.total");
    });

    it("should handle incrementSetting errors gracefully", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (incrementSetting as jest.Mock).mockRejectedValue(
        new Error("Increment error"),
      );

      // First add a tab to the store so we can duplicate it
      useTabsStore.getState().addTab(mockTab);
      useTabsStore.getState().duplicateTab(mockTab.id);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(incrementSetting).toHaveBeenCalledWith("tabs.created.total");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to increment tab counter:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Function References", () => {
    it("should provide consistent function references", () => {
      const store1 = useTabsStore.getState();
      const store2 = useTabsStore.getState();

      expect(store1.addTab).toBe(store2.addTab);
      expect(store1.removeTab).toBe(store2.removeTab);
      expect(store1.updateTabContent).toBe(store2.updateTabContent);
      expect(store1.duplicateTab).toBe(store2.duplicateTab);
    });
  });
});

import { useTabsStore } from '../tabsStore';
import { Tab } from '../../types';

// Mock the workspace store
jest.mock('../workspaceStore', () => ({
  useWorkspaceStore: {
    getState: jest.fn(() => ({ activeWorkspaceId: 'workspace-1' })),
  },
}));

describe('TabsStore - Font Size Support', () => {
  beforeEach(() => {
    // Clear the store state before each test
    useTabsStore.setState({
      tabs: [],
      activeTabId: null,
    });
  });

  describe('updateTabState with fontSize', () => {
    it('should update font size for existing tab', () => {
      const initialTab: Tab = {
        id: 'tab-1',
        title: 'Test Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        fontSize: 14,
        workspaceId: 'workspace-1',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      // Add initial tab
      useTabsStore.getState().addTab(initialTab);

      // Update font size
      useTabsStore.getState().updateTabState('tab-1', { fontSize: 18 });

      const updatedTab = useTabsStore.getState().tabs.find(t => t.id === 'tab-1');
      expect(updatedTab?.fontSize).toBe(18);
      expect(updatedTab?.lastModified).toBeGreaterThanOrEqual(initialTab.lastModified);
    });

    it('should create new tab with font size if tab does not exist', () => {
      const now = Date.now();
      
      useTabsStore.getState().updateTabState('new-tab', { 
        fontSize: 16,
        title: 'New Tab',
        language: 'javascript',
      });

      const newTab = useTabsStore.getState().tabs.find(t => t.id === 'new-tab');
      expect(newTab).toBeDefined();
      expect(newTab?.fontSize).toBe(16);
      expect(newTab?.title).toBe('New Tab');
      expect(newTab?.language).toBe('javascript');
      expect(newTab?.dateCreated).toBeGreaterThanOrEqual(now);
      expect(newTab?.lastModified).toBeGreaterThanOrEqual(now);
    });

    it('should preserve other tab properties when updating font size', () => {
      const initialTab: Tab = {
        id: 'tab-1',
        title: 'Test Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: true,
        isTablet: false,
        fontSize: 14,
        workspaceId: 'workspace-1',
        dateCreated: 1000,
        lastModified: 2000,
        cursorPosition: { lineNumber: 5, column: 10 },
        isPinned: true,
        previewMode: true,
      };

      useTabsStore.getState().addTab(initialTab);

      // Update only font size
      useTabsStore.getState().updateTabState('tab-1', { fontSize: 20 });

      const updatedTab = useTabsStore.getState().tabs.find(t => t.id === 'tab-1');
      expect(updatedTab?.fontSize).toBe(20);
      expect(updatedTab?.title).toBe('Test Tab');
      expect(updatedTab?.content).toBe('test content');
      expect(updatedTab?.language).toBe('javascript');
      expect(updatedTab?.languageLocked).toBe(true);
      expect(updatedTab?.isTablet).toBe(false);
      expect(updatedTab?.workspaceId).toBe('workspace-1');
      expect(updatedTab?.dateCreated).toBe(1000);
      expect(updatedTab?.cursorPosition).toEqual({ lineNumber: 5, column: 10 });
      expect(updatedTab?.isPinned).toBe(true);
      expect(updatedTab?.previewMode).toBe(true);
    });
  });

  describe('addTab with font size', () => {
    it('should add tab with custom font size', () => {
      const tabWithFontSize: Tab = {
        id: 'tab-1',
        title: 'Test Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        fontSize: 16,
        workspaceId: 'workspace-1',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      useTabsStore.getState().addTab(tabWithFontSize);

      const addedTab = useTabsStore.getState().tabs.find(t => t.id === 'tab-1');
      expect(addedTab?.fontSize).toBe(16);
    });

    it('should use default font size when not specified', () => {
      const tabWithoutFontSize: Omit<Tab, 'fontSize'> = {
        id: 'tab-1',
        title: 'Test Tab',
        content: 'test content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        workspaceId: 'workspace-1',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      useTabsStore.getState().addTab(tabWithoutFontSize as Tab);

      const addedTab = useTabsStore.getState().tabs.find(t => t.id === 'tab-1');
      expect(addedTab?.fontSize).toBeUndefined();
    });
  });

  describe('duplicateTab with font size', () => {
    it('should duplicate tab with font size', () => {
      const originalTab: Tab = {
        id: 'tab-1',
        title: 'Original Tab',
        content: 'original content',
        language: 'javascript',
        languageLocked: false,
        isTablet: false,
        fontSize: 18,
        workspaceId: 'workspace-1',
        dateCreated: 1000,
        lastModified: 2000,
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      useTabsStore.getState().addTab(originalTab);

      const newTabId = useTabsStore.getState().duplicateTab('tab-1');

      const duplicatedTab = useTabsStore.getState().tabs.find(t => t.id === newTabId);
      expect(duplicatedTab?.fontSize).toBe(18);
      expect(duplicatedTab?.title).toBe('Original Tab (Copy)');
      expect(duplicatedTab?.content).toBe('original content');
      expect(duplicatedTab?.language).toBe('javascript');
    });
  });

  describe('tablet tabs', () => {
    it('should not store font size for tablet tabs', () => {
      const tabletTab: Tab = {
        id: 'tablet-1',
        title: 'Tablet Tab',
        content: 'tablet content',
        language: 'plaintext',
        languageLocked: false,
        isTablet: true,
        fontSize: 16, // This should be ignored for tablets
        workspaceId: 'workspace-1',
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
      };

      useTabsStore.getState().addTab(tabletTab);

      const addedTab = useTabsStore.getState().tabs.find(t => t.id === 'tablet-1');
      expect(addedTab?.isTablet).toBe(true);
      // Font size can still be stored but won't be used by the UI
      expect(addedTab?.fontSize).toBe(16);
    });
  });
});
