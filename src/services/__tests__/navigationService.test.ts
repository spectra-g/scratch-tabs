import { navigationService } from "../navigationService";
import { useNavigationStore } from "../../stores/navigationStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { createDefaultSplitViewState } from "../../utils";

// Mock all stores
jest.mock("../../stores/navigationStore");
jest.mock("../../stores/workspaceStore");
jest.mock("../../stores/tabsStore");
jest.mock("../../stores/splitViewStore");

describe("navigationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("navigateTo", () => {
    it("should navigate to tab in same workspace", async () => {
      // Setup mocks
      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: jest.fn(),
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab1", workspaceId: "workspace1" }],
      });

      const mockSetActiveLeftTab = jest.fn();
      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab1"],
          rightTabs: [],
          activeLeftTabId: null,
        },
        setActiveLeftTab: mockSetActiveLeftTab,
        setActiveRightTab: jest.fn(),
      });

      // Execute
      const result = await navigationService.navigateTo({
        workspaceId: "workspace1",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      // Assert
      expect(result).toBe(true);
      expect(mockSetActiveLeftTab).toHaveBeenCalledWith("tab1");
    });

    it("should switch workspace before activating tab", async () => {
      // Setup mocks
      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: jest.fn(),
      });

      const mockSwitchWorkspace = jest.fn();
      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [
          { id: "workspace1", name: "Workspace 1" },
          { id: "workspace2", name: "Workspace 2" },
        ],
        switchWorkspace: mockSwitchWorkspace,
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab2", workspaceId: "workspace2" }],
      });

      const mockSetActiveLeftTab = jest.fn();
      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab2"],
          rightTabs: [],
        },
        setActiveLeftTab: mockSetActiveLeftTab,
        setActiveRightTab: jest.fn(),
      });

      // Execute
      const result = await navigationService.navigateTo({
        workspaceId: "workspace2",
        tabId: "tab2",
        timestamp: Date.now(),
      });

      // Assert
      expect(result).toBe(true);
      expect(mockSwitchWorkspace).toHaveBeenCalledWith("workspace2");
      expect(mockSetActiveLeftTab).toHaveBeenCalledWith("tab2");
    });

    it("should activate tab on right side if in right pane", async () => {
      // Setup mocks
      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: jest.fn(),
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab1", workspaceId: "workspace1" }],
      });

      const mockSetActiveRightTab = jest.fn();
      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: [],
          rightTabs: ["tab1"],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: mockSetActiveRightTab,
      });

      // Execute
      const result = await navigationService.navigateTo({
        workspaceId: "workspace1",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      // Assert
      expect(result).toBe(true);
      expect(mockSetActiveRightTab).toHaveBeenCalledWith("tab1");
    });

    it("should return false if workspace does not exist", async () => {
      // Setup mocks
      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: jest.fn(),
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [],
      });

      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: [],
          rightTabs: [],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: jest.fn(),
      });

      // Execute
      const result = await navigationService.navigateTo({
        workspaceId: "nonexistent",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should return false if tab does not exist in active workspace", async () => {
      // Setup mocks
      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: jest.fn(),
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab2", workspaceId: "workspace1" }],
      });

      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab2"],
          rightTabs: [],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: jest.fn(),
      });

      // Execute
      const result = await navigationService.navigateTo({
        workspaceId: "workspace1",
        tabId: "nonexistent",
        timestamp: Date.now(),
      });

      // Assert
      expect(result).toBe(false);
    });

    it("should prevent recursive navigation", async () => {
      // Setup mocks
      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: jest.fn(),
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab1", workspaceId: "workspace1" }],
      });

      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab1"],
          rightTabs: [],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: jest.fn(),
      });

      // Start first navigation
      const promise1 = navigationService.navigateTo({
        workspaceId: "workspace1",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      // Try to start second navigation while first is in progress
      const promise2 = navigationService.navigateTo({
        workspaceId: "workspace1",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // First should succeed, second should be blocked
      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe("goBack", () => {
    it("should navigate to previous entry", async () => {
      // Setup mocks
      const mockGoBack = jest.fn().mockReturnValue({
        workspaceId: "workspace1",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: mockGoBack,
        goForward: jest.fn(),
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab1", workspaceId: "workspace1" }],
      });

      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab1"],
          rightTabs: [],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: jest.fn(),
      });

      // Execute
      const result = await navigationService.goBack();

      // Assert
      expect(result).toBe(true);
      expect(mockGoBack).toHaveBeenCalled();
    });

    it("should skip invalid entries and try next", async () => {
      // Setup mocks
      let callCount = 0;
      const mockGoBack = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call returns invalid entry (nonexistent workspace)
          return {
            workspaceId: "nonexistent",
            tabId: "tab1",
            timestamp: Date.now(),
          };
        } else if (callCount === 2) {
          // Second call returns valid entry
          return {
            workspaceId: "workspace1",
            tabId: "tab1",
            timestamp: Date.now(),
          };
        }
        return null;
      });

      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: mockGoBack,
        goForward: jest.fn(),
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab1", workspaceId: "workspace1" }],
      });

      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab1"],
          rightTabs: [],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: jest.fn(),
      });

      // Execute
      const result = await navigationService.goBack();

      // Assert
      expect(result).toBe(true);
      expect(mockGoBack).toHaveBeenCalledTimes(2);
    });

    it("should return false when no history", async () => {
      // Setup mocks
      const mockGoBack = jest.fn().mockReturnValue(null);

      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: mockGoBack,
        goForward: jest.fn(),
      });

      // Execute
      const result = await navigationService.goBack();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("goForward", () => {
    it("should navigate to next entry", async () => {
      // Setup mocks
      const mockGoForward = jest.fn().mockReturnValue({
        workspaceId: "workspace1",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: mockGoForward,
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [{ id: "workspace1", name: "Workspace 1" }],
        switchWorkspace: jest.fn(),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab1", workspaceId: "workspace1" }],
      });

      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab1"],
          rightTabs: [],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: jest.fn(),
      });

      // Execute
      const result = await navigationService.goForward();

      // Assert
      expect(result).toBe(true);
      expect(mockGoForward).toHaveBeenCalled();
    });

    it("should return false when no forward history", async () => {
      // Setup mocks
      const mockGoForward = jest.fn().mockReturnValue(null);

      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: mockGoForward,
      });

      // Execute
      const result = await navigationService.goForward();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isCurrentlyNavigating", () => {
    it("should return false when not navigating", () => {
      expect(navigationService.isCurrentlyNavigating()).toBe(false);
    });

    it("should return true during navigation", async () => {
      // Setup mocks to make navigation slow
      (useNavigationStore.getState as jest.Mock).mockReturnValue({
        goBack: jest.fn(),
        goForward: jest.fn(),
      });

      let resolveSwitchWorkspace: () => void;
      const switchWorkspacePromise = new Promise<void>((resolve) => {
        resolveSwitchWorkspace = resolve;
      });

      (useWorkspaceStore.getState as jest.Mock).mockReturnValue({
        activeWorkspaceId: "workspace1",
        workspaces: [
          { id: "workspace1", name: "Workspace 1" },
          { id: "workspace2", name: "Workspace 2" },
        ],
        switchWorkspace: jest.fn().mockReturnValue(switchWorkspacePromise),
      });

      (useTabsStore.getState as jest.Mock).mockReturnValue({
        tabs: [{ id: "tab1", workspaceId: "workspace2" }],
      });

      (useSplitViewStore.getState as jest.Mock).mockReturnValue({
        splitView: {
          leftTabs: ["tab1"],
          rightTabs: [],
        },
        setActiveLeftTab: jest.fn(),
        setActiveRightTab: jest.fn(),
      });

      // Start navigation (don't await)
      const navigationPromise = navigationService.navigateTo({
        workspaceId: "workspace2",
        tabId: "tab1",
        timestamp: Date.now(),
      });

      // Check flag during navigation
      expect(navigationService.isCurrentlyNavigating()).toBe(true);

      // Complete navigation
      resolveSwitchWorkspace!();
      await navigationPromise;

      // Check flag after navigation
      expect(navigationService.isCurrentlyNavigating()).toBe(false);
    });
  });
});
