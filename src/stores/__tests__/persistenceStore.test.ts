// Define mockStorageProvider at the very top so it is used everywhere
const mockStorageProvider = {
  saveTabsInterval: jest.fn() as jest.MockedFunction<
    (tabs: import("../../types").Tab[]) => Promise<void>
  >,
  saveTabsNow: jest.fn() as jest.MockedFunction<
    (tabs: import("../../types").Tab[]) => Promise<void>
  >,
  saveSplitViewNow: jest.fn() as jest.MockedFunction<
    (splitView: any) => Promise<void>
  >,
};

// Mock dependencies first (before any imports)
jest.mock("../../db", () => ({
  StorageProviderFactory: {
    getProvider: () => mockStorageProvider,
  },
  db: {}, // Mock db object if needed
}));

jest.mock("../workspaceStore", () => ({
  useWorkspaceStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../tabsStore", () => ({
  useTabsStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../splitViewStore", () => ({
  useSplitViewStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../../services/modelManager", () => ({
  modelManager: {
    getContent: jest.fn(),
  },
}));

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { usePersistenceStore } from "../persistenceStore";
import { useWorkspaceStore } from "../workspaceStore";
import { useTabsStore } from "../tabsStore";
import { useSplitViewStore } from "../splitViewStore";
import { modelManager } from "../../services/modelManager";
import { Workspace, Tab, SplitViewState } from "../../types";

// Copy interface definitions for store types (do not redefine Workspace, Tab, SplitViewState)
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

interface TabsStore {
  tabs: Tab[];
  activeTabId: string | null;
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

interface SplitViewStore {
  splitView: SplitViewState;
  setSplitView: (splitView: Partial<SplitViewState>) => void;
  splitScreen: (leftTabIds: string[], rightTabId: string) => void;
  unsplitScreen: (tabId?: string) => void;
  moveTabToRight: (tabId: string) => void;
  moveTabToLeft: (tabId: string) => void;
  setActiveLeftTab: (id: string) => void;
  setActiveRightTab: (id: string) => void;
  setActiveSide: (side: "left" | "right") => void;
  setSplitRatio: (ratio: number) => void;
  addTabToSide: (
    tabId: string,
    toRightSide: boolean,
    activeTabId?: string,
  ) => void;
  removeTabFromSide: (tabId: string) => void;
  closeTabsToLeft: (tabId: string, isRightSide: boolean) => void;
  closeTabsToRight: (tabId: string, isRightSide: boolean) => void;
  closeAllExcept: (tabId: string, isRightSide: boolean) => void;
  closeAllExceptRespectingPins: (tabId: string, isRightSide: boolean, isPinnedTab: (id: string) => boolean) => void;
  closeTabsToLeftRespectingPins: (tabId: string, isRightSide: boolean, isPinnedTab: (id: string) => boolean) => void;
  closeTabsToRightRespectingPins: (tabId: string, isRightSide: boolean, isPinnedTab: (id: string) => boolean) => void;
  groupTabsByType: (isRightSide: boolean) => void;
  updateTabOrder: (newLeftTabs: string[], newRightTabs: string[]) => void;
  reorderTabs: (side: "left" | "right", newOrder: string[]) => void;
  getTabsToLeft: (tabId: string, isRightSide: boolean) => string[];
  getTabsToRight: (tabId: string, isRightSide: boolean) => string[];
  getAllExcept: (tabId: string, isRightSide: boolean) => string[];
  createDefaultSplitViewState: (workspaceId?: string) => SplitViewState;
  clearSplitViewForWorkspace: (workspaceId: string) => void;
}

const mockWorkspaceStore = useWorkspaceStore as jest.Mocked<
  typeof useWorkspaceStore
>;
const mockTabsStore = useTabsStore as jest.Mocked<typeof useTabsStore>;
const mockSplitViewStore = useSplitViewStore as jest.Mocked<
  typeof useSplitViewStore
>;
const mockModelManager = modelManager as jest.Mocked<typeof modelManager>;

const mockWorkspaceState: WorkspaceStore = {
  workspaces: [],
  activeWorkspaceId: "test-workspace-id",
  isLoading: false,
  error: null,
  loadWorkspaces: jest.fn(() => Promise.resolve()),
  ensureWorkspace: jest.fn(() => Promise.resolve("test-workspace-id")),
  createWorkspace: jest.fn((name: string) =>
    Promise.resolve("test-workspace-id"),
  ),
  switchWorkspace: jest.fn((workspaceId: string) => Promise.resolve()),
  renameWorkspace: jest.fn((workspaceId: string, newName: string) =>
    Promise.resolve(),
  ),
  deleteWorkspace: jest.fn((workspaceId: string) => Promise.resolve()),
  updateWorkspaceNotes: jest.fn((workspaceId: string, notes: string) =>
    Promise.resolve(),
  ),
  addWorkspaceLink: jest.fn(
    (workspaceId: string, url: string, title?: string) => Promise.resolve(),
  ),
  removeWorkspaceLink: jest.fn((workspaceId: string, linkId: string) =>
    Promise.resolve(),
  ),
  getActiveWorkspace: jest.fn(() => undefined),
};

const mockTabsState: TabsStore = {
  tabs: [],
  activeTabId: null,
  addTab: jest.fn(),
  addBackgroundTab: jest.fn(),
  removeTab: jest.fn(),
  setActiveTab: jest.fn(),
  updateTabContent: jest.fn(),
  updateTabLanguage: jest.fn(),
  updateTabTitle: jest.fn(),
  updateTabState: jest.fn(),
  duplicateTab: jest.fn((tabId: string) => "new-tab-id"),
};

const mockSplitViewState: SplitViewStore = {
  splitView: {
    id: "split-view-id",
    isSplit: false,
    leftTabs: [],
    rightTabs: [],
    activeLeftTabId: null,
    activeRightTabId: null,
    activeSide: "left",
    splitRatio: 0.5,
    workspaceId: "test-workspace-id",
    leftTabHistory: [],
    rightTabHistory: [],
  },
  setSplitView: jest.fn(),
  splitScreen: jest.fn(),
  unsplitScreen: jest.fn(),
  moveTabToRight: jest.fn(),
  moveTabToLeft: jest.fn(),
  setActiveLeftTab: jest.fn(),
  setActiveRightTab: jest.fn(),
  setActiveSide: jest.fn(),
  setSplitRatio: jest.fn(),
  addTabToSide: jest.fn(),
  removeTabFromSide: jest.fn(),
  closeTabsToLeft: jest.fn(),
  closeTabsToRight: jest.fn(),
  closeAllExcept: jest.fn(),
  closeAllExceptRespectingPins: jest.fn(),
  closeTabsToLeftRespectingPins: jest.fn(),
  closeTabsToRightRespectingPins: jest.fn(),
  groupTabsByType: jest.fn(),
  updateTabOrder: jest.fn(),
  reorderTabs: jest.fn(),
  getTabsToLeft: jest.fn((tabId: string, isRightSide: boolean) => []),
  getTabsToRight: jest.fn((tabId: string, isRightSide: boolean) => []),
  getAllExcept: jest.fn((tabId: string, isRightSide: boolean) => []),
  createDefaultSplitViewState: jest.fn((workspaceId?: string) => ({
    id: "default-split-view-id",
    isSplit: false,
    leftTabs: [],
    rightTabs: [],
    activeLeftTabId: null,
    activeRightTabId: null,
    activeSide: "left" as const,
    splitRatio: 0.5,
    workspaceId: workspaceId || "test-workspace-id",
    leftTabHistory: [],
    rightTabHistory: [],
  })),
  clearSplitViewForWorkspace: jest.fn(),
};

describe("PersistenceStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mocks
    mockStorageProvider.saveTabsInterval.mockResolvedValue(undefined);
    mockStorageProvider.saveTabsNow.mockResolvedValue(undefined);
    mockStorageProvider.saveSplitViewNow.mockResolvedValue(undefined);

    mockWorkspaceStore.getState.mockReturnValue(mockWorkspaceState);
    mockTabsStore.getState.mockReturnValue(mockTabsState);
    mockSplitViewStore.getState.mockReturnValue(mockSplitViewState);
    mockModelManager.getContent.mockReturnValue(undefined);
  });

  describe("Initial State", () => {
    it("should initialize with saveState function", () => {
      const store = usePersistenceStore.getState();

      expect(typeof store.saveState).toBe("function");
    });
  });

  describe("Save State - No Active Workspace", () => {
    it("should return early when no active workspace", async () => {
      mockWorkspaceStore.getState.mockReturnValue({
        ...mockWorkspaceState,
        activeWorkspaceId: null,
      });

      await usePersistenceStore.getState().saveState();

      expect(mockStorageProvider.saveTabsNow).not.toHaveBeenCalled();
      expect(mockStorageProvider.saveSplitViewNow).not.toHaveBeenCalled();
    });
  });

  describe("Save State - With Active Workspace", () => {
    const mockTabs: Tab[] = [
      {
        id: "tab1",
        title: "Tab 1",
        content: "original content 1",
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
      },
      {
        id: "tab2",
        title: "Tab 2",
        content: "original content 2",
        language: "json",
        languageLocked: true,
        workspaceId: "test-workspace-id",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        isPinned: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
      {
        id: "tab3",
        title: "Tab 3",
        content: "content from other workspace",
        language: "markdown",
        languageLocked: false,
        workspaceId: "other-workspace-id",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        isPinned: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
    ];

    it("should save tabs and split view for active workspace", async () => {
      mockTabsStore.getState.mockReturnValue({
        ...mockTabsState,
        tabs: mockTabs,
        activeTabId: "tab1",
      });

      await usePersistenceStore.getState().saveState();

      // Should save tabs from the active workspace
      expect(mockStorageProvider.saveTabsNow).toHaveBeenCalledWith([
        mockTabs[0], // tab1
        mockTabs[1], // tab2
        // tab3 should be excluded (different workspace)
      ]);

      // Should save split view with updated timestamp
      expect(mockStorageProvider.saveSplitViewNow).toHaveBeenCalledWith({
        ...mockSplitViewState.splitView,
        lastModified: expect.any(Number),
      });
    });

    it("should not save tabs if no tabs exist for workspace", async () => {
      mockTabsStore.getState.mockReturnValue({
        ...mockTabsState,
        tabs: [mockTabs[2]], // Only tab from other workspace
      });

      await usePersistenceStore.getState().saveState();

      expect(mockStorageProvider.saveTabsNow).not.toHaveBeenCalled();
      expect(mockStorageProvider.saveSplitViewNow).toHaveBeenCalled();
    });

    it("should not save split view if workspace ID does not match", async () => {
      mockSplitViewStore.getState.mockReturnValue({
        ...mockSplitViewState,
        splitView: {
          ...mockSplitViewState.splitView,
          workspaceId: "other-workspace-id", // Different workspace
        },
      });

      await usePersistenceStore.getState().saveState();

      expect(mockStorageProvider.saveSplitViewNow).not.toHaveBeenCalled();
    });
  });

  describe("Model Manager Integration", () => {
    it("should use live content from model manager when available", async () => {
      const mockTabs: Tab[] = [
        {
          id: "tab1",
          title: "Tab 1",
          content: "original content",
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
        },
      ];

      mockTabsStore.getState.mockReturnValue({
        ...mockTabsState,
        tabs: mockTabs,
        activeTabId: "tab1",
      });

      // Mock model manager to return live content
      mockModelManager.getContent.mockReturnValue("live content from editor");

      await usePersistenceStore.getState().saveState();

      expect(mockStorageProvider.saveTabsNow).toHaveBeenCalledWith([
        {
          ...mockTabs[0],
          content: "live content from editor", // Should use live content
        },
      ]);
    });

    it("should use original content when model manager returns undefined", async () => {
      const mockTabs: Tab[] = [
        {
          id: "tab1",
          title: "Tab 1",
          content: "original content",
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
        },
      ];

      mockTabsStore.getState.mockReturnValue({
        ...mockTabsState,
        tabs: mockTabs,
        activeTabId: "tab1",
      });

      // Mock model manager to return undefined
      mockModelManager.getContent.mockReturnValue(undefined);

      await usePersistenceStore.getState().saveState();

      expect(mockStorageProvider.saveTabsNow).toHaveBeenCalledWith([
        {
          ...mockTabs[0],
          content: "original content", // Should use original content
        },
      ]);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully and log them", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      mockStorageProvider.saveTabsNow.mockRejectedValueOnce(
        new Error("Storage error"),
      );

      mockTabsStore.getState.mockReturnValue({
        ...mockTabsState,
        tabs: [
          {
            id: "tab1",
            title: "Tab 1",
            content: "content",
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
          },
        ],
        activeTabId: "tab1",
      });

      await usePersistenceStore.getState().saveState();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[Persistence] Failed to save state:",
        expect.anything(),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Function References", () => {
    it("should provide consistent function references", () => {
      const store1 = usePersistenceStore.getState();
      const store2 = usePersistenceStore.getState();

      expect(store1.saveState).toBe(store2.saveState);
    });
  });
});
