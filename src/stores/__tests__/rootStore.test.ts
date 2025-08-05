// @ts-nocheck
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useRootStore } from "../rootStore";
import { Tab } from "../../types";

// Mock dependencies
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

jest.mock("../workspaceStore", () => ({
  useWorkspaceStore: {
    getState: jest.fn(),
  },
}));

import { useWorkspaceStore } from "../workspaceStore";

jest.mock("../editorStore", () => ({
  useEditorStore: {
    getState: jest.fn(),
  },
}));

jest.mock("../../db", () => ({
  incrementSetting: jest.fn().mockResolvedValue(undefined),
  StorageProviderFactory: {
    getProvider: jest.fn().mockReturnValue({
      deleteTab: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock("../broadcastStore", () => ({
  broadcastManager: {
    broadcastWorkspaceState: jest.fn(),
  },
}));

jest.mock("../../services/modelManager", () => ({
  modelManager: {
    dispose: jest.fn(),
  },
}));

import { useTabsStore } from "../tabsStore";
import { useSplitViewStore } from "../splitViewStore";

describe("RootStore - Pinned Tabs Protection", () => {
  let tabsStoreMock: any;
  let splitViewStoreMock: any;
  let workspaceStoreMock: any;
  let mockTabs: Tab[];
  let rootStore: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock tabs
    mockTabs = [
      {
        id: "welcome",
        title: "Welcome",
        content: "",
        language: "plaintext",
        isPinned: true,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
      {
        id: "scratch1",
        title: "Scratch 1",
        content: "",
        language: "plaintext",
        isPinned: true,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
      {
        id: "scratch2",
        title: "Scratch 2",
        content: "",
        language: "plaintext",
        isPinned: false,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
      {
        id: "scratch3",
        title: "Scratch 3",
        content: "",
        language: "plaintext",
        isPinned: false,
        workspaceId: "workspace1",
        dateCreated: Date.now(),
        lastModified: Date.now(),
        cursorPosition: { lineNumber: 1, column: 1 },
        languageLocked: false,
        isTablet: false,
        tabletState: "",
        previewMode: false,
      },
    ];

    // Setup mocks
    tabsStoreMock = {
      tabs: mockTabs,
      removeTab: jest.fn(),
    };

    splitViewStoreMock = {
      splitView: {
        leftTabs: ["welcome", "scratch1", "scratch2", "scratch3"],
        rightTabs: [],
        activeLeftTabId: "scratch3",
        activeRightTabId: null,
        leftTabHistory: [],
        rightTabHistory: [],
      },
      getAllExcept: jest.fn(),
      setSplitView: jest.fn(),
      removeTabFromSide: jest.fn(),
    };

    workspaceStoreMock = {
      activeWorkspaceId: "workspace1",
      deleteWorkspace: jest.fn().mockResolvedValue(undefined),
    };

    (useTabsStore as any).getState.mockReturnValue(tabsStoreMock);
    (useSplitViewStore as any).getState.mockReturnValue(splitViewStoreMock);
    (useWorkspaceStore as any).getState.mockReturnValue(workspaceStoreMock);

    // Get a fresh instance of the store
    rootStore = useRootStore.getState();
  });

  it("should protect pinned tabs when closing all other tabs", () => {
    // Setup: Split view store returns tabs that would be closed
    splitViewStoreMock.getAllExcept.mockReturnValue(["welcome", "scratch1", "scratch2"]);
    
    // Execute: Close all other tabs except scratch3
    rootStore.closeAllExcept("scratch3", false);

    // Verify: Only unpinned tabs should be removed from data store
    expect(tabsStoreMock.removeTab).toHaveBeenCalledTimes(1);
    expect(tabsStoreMock.removeTab).toHaveBeenCalledWith("scratch2");
    expect(tabsStoreMock.removeTab).not.toHaveBeenCalledWith("welcome");
    expect(tabsStoreMock.removeTab).not.toHaveBeenCalledWith("scratch1");

    // Verify: Split view should be updated to keep pinned tabs and current tab
    expect(splitViewStoreMock.setSplitView).toHaveBeenCalledWith({
      leftTabs: ["welcome", "scratch1", "scratch3"],
      activeLeftTabId: "scratch3",
      leftTabHistory: [],
    });
  });

  it("should protect pinned tabs when closing tabs to the left", () => {
    // Setup: Split view store returns tabs that would be closed  
    splitViewStoreMock.getTabsToLeft = jest.fn().mockReturnValue(["welcome", "scratch1"]);
    
    // Execute: Close tabs to the left of scratch2
    rootStore.closeTabsToLeft("scratch2", false);

    // Verify: No pinned tabs should be removed from data store
    expect(tabsStoreMock.removeTab).not.toHaveBeenCalled();

    // Verify: Split view should keep pinned tabs and tabs from current position onwards
    expect(splitViewStoreMock.setSplitView).toHaveBeenCalledWith({
      leftTabs: ["welcome", "scratch1", "scratch2", "scratch3"],
      leftTabHistory: [],
    });
  });

  it("should protect pinned tabs when closing tabs to the right", () => {
    // Setup: Split view store returns tabs that would be closed
    splitViewStoreMock.getTabsToRight = jest.fn().mockReturnValue(["scratch2", "scratch3"]);
    
    // Execute: Close tabs to the right of scratch1
    rootStore.closeTabsToRight("scratch1", false);

    // Verify: Only unpinned tabs should be removed from data store
    expect(tabsStoreMock.removeTab).toHaveBeenCalledTimes(2);
    expect(tabsStoreMock.removeTab).toHaveBeenCalledWith("scratch2");
    expect(tabsStoreMock.removeTab).toHaveBeenCalledWith("scratch3");

    // Verify: Split view should keep tabs up to current and pinned tabs to the right
    expect(splitViewStoreMock.setSplitView).toHaveBeenCalledWith({
      leftTabs: ["welcome", "scratch1"],
      leftTabHistory: [],
    });
  });
});