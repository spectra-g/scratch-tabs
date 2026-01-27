import { useNavigationStore, NavigationEntry } from "../navigationStore";
import { getSetting, setSetting } from "../../db";

// Mock the database functions
jest.mock("../../db", () => ({
  getSetting: jest.fn(),
  setSetting: jest.fn(),
}));

const mockGetSetting = getSetting as jest.MockedFunction<typeof getSetting>;
const mockSetSetting = setSetting as jest.MockedFunction<typeof setSetting>;

describe("navigationStore", () => {
  beforeEach(() => {
    // Reset store state before each test by directly setting state
    useNavigationStore.setState({
      history: [],
      currentIndex: -1,
      isLoaded: false,
    });
    jest.clearAllMocks();
    // Mock the persistence functions to return resolved promises
    mockSetSetting.mockResolvedValue(undefined as any);
    mockGetSetting.mockResolvedValue(undefined);
  });

  describe("pushEntry", () => {
    it("should add a new entry to history", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");

      const store = useNavigationStore.getState();
      expect(store.history).toHaveLength(1);
      expect(store.history[0]).toMatchObject({
        workspaceId: "workspace1",
        tabId: "tab1",
      });
      expect(store.currentIndex).toBe(0);
    });

    it("should not add duplicate consecutive entries", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab1"); // Duplicate

      const store = useNavigationStore.getState();
      expect(store.history).toHaveLength(1);
    });

    it("should add different entries even for same workspace", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");

      const store = useNavigationStore.getState();
      expect(store.history).toHaveLength(2);
    });

    it("should truncate forward history when adding new entry from middle", () => {
      // Create history: A -> B -> C
      useNavigationStore.getState().pushEntry("workspace1", "tabA");
      useNavigationStore.getState().pushEntry("workspace1", "tabB");
      useNavigationStore.getState().pushEntry("workspace1", "tabC");

      // Go back twice: now at A
      useNavigationStore.getState().goBack();
      useNavigationStore.getState().goBack();

      // Add new entry: should truncate B and C
      useNavigationStore.getState().pushEntry("workspace1", "tabD");

      const store = useNavigationStore.getState();
      expect(store.history).toHaveLength(2);
      expect(store.history[0].tabId).toBe("tabA");
      expect(store.history[1].tabId).toBe("tabD");
      expect(store.currentIndex).toBe(1);
    });

    it("should limit history size to 50 entries", () => {
      // Add 60 entries
      for (let i = 0; i < 60; i++) {
        useNavigationStore.getState().pushEntry("workspace1", `tab${i}`);
      }

      const store = useNavigationStore.getState();
      expect(store.history).toHaveLength(50);
      // Should have removed the oldest entries
      expect(store.history[0].tabId).toBe("tab10");
      expect(store.history[49].tabId).toBe("tab59");
    });

    it("should persist history to IndexedDB", async () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");

      // Wait for async persistence
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSetSetting).toHaveBeenCalledWith(
        "navigation_history_v1",
        expect.stringContaining("workspace1")
      );
    });
  });

  describe("goBack", () => {
    it("should move back in history", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");

      const entry = useNavigationStore.getState().goBack();

      const store = useNavigationStore.getState();
      expect(entry).toMatchObject({
        workspaceId: "workspace1",
        tabId: "tab1",
      });
      expect(store.currentIndex).toBe(0);
    });

    it("should return null when at the beginning", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().goBack(); // Already at beginning

      const entry = useNavigationStore.getState().goBack();

      const store = useNavigationStore.getState();
      expect(entry).toBeNull();
      expect(store.currentIndex).toBe(0);
    });

    it("should return null when history is empty", () => {
      const entry = useNavigationStore.getState().goBack();

      expect(entry).toBeNull();
    });
  });

  describe("goForward", () => {
    it("should move forward in history", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");
      useNavigationStore.getState().goBack(); // Go back to tab1

      const entry = useNavigationStore.getState().goForward();

      const store = useNavigationStore.getState();
      expect(entry).toMatchObject({
        workspaceId: "workspace1",
        tabId: "tab2",
      });
      expect(store.currentIndex).toBe(1);
    });

    it("should return null when at the end", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");

      const entry = useNavigationStore.getState().goForward();

      const store = useNavigationStore.getState();
      expect(entry).toBeNull();
      expect(store.currentIndex).toBe(1);
    });

    it("should return null when history is empty", () => {
      const entry = useNavigationStore.getState().goForward();

      expect(entry).toBeNull();
    });
  });

  describe("canGoBack", () => {
    it("should return true when not at beginning", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");

      expect(useNavigationStore.getState().canGoBack()).toBe(true);
    });

    it("should return false when at beginning", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().goBack();

      expect(useNavigationStore.getState().canGoBack()).toBe(false);
    });

    it("should return false when history is empty", () => {
      expect(useNavigationStore.getState().canGoBack()).toBe(false);
    });
  });

  describe("canGoForward", () => {
    it("should return true when not at end", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");
      useNavigationStore.getState().goBack();

      expect(useNavigationStore.getState().canGoForward()).toBe(true);
    });

    it("should return false when at end", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");

      expect(useNavigationStore.getState().canGoForward()).toBe(false);
    });

    it("should return false when history is empty", () => {
      expect(useNavigationStore.getState().canGoForward()).toBe(false);
    });
  });

  describe("loadHistory", () => {
    it("should load history from IndexedDB", async () => {
      const mockHistory: NavigationEntry[] = [
        { workspaceId: "workspace1", tabId: "tab1", timestamp: 1000 },
        { workspaceId: "workspace1", tabId: "tab2", timestamp: 2000 },
      ];

      mockGetSetting.mockResolvedValue(
        JSON.stringify({ history: mockHistory, currentIndex: 1 })
      );

      await useNavigationStore.getState().loadHistory();

      const store = useNavigationStore.getState();
      expect(store.history).toEqual(mockHistory);
      expect(store.currentIndex).toBe(1);
      expect(store.isLoaded).toBe(true);
    });

    it("should handle missing data gracefully", async () => {
      mockGetSetting.mockResolvedValue(undefined);

      await useNavigationStore.getState().loadHistory();

      const store = useNavigationStore.getState();
      expect(store.history).toEqual([]);
      expect(store.currentIndex).toBe(-1);
      expect(store.isLoaded).toBe(true);
    });

    it("should handle corrupt data gracefully", async () => {
      mockGetSetting.mockResolvedValue("invalid json");

      await useNavigationStore.getState().loadHistory();

      const store = useNavigationStore.getState();
      expect(store.history).toEqual([]);
      expect(store.isLoaded).toBe(true);
    });

    it("should handle database errors gracefully", async () => {
      mockGetSetting.mockRejectedValue(new Error("Database error"));

      await useNavigationStore.getState().loadHistory();

      const store = useNavigationStore.getState();
      expect(store.history).toEqual([]);
      expect(store.isLoaded).toBe(true);
    });
  });

  describe("clearHistory", () => {
    it("should clear all history", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");

      useNavigationStore.getState().clearHistory();

      const store = useNavigationStore.getState();
      expect(store.history).toEqual([]);
      expect(store.currentIndex).toBe(-1);
    });

    it("should persist cleared history", async () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().clearHistory();

      // Wait for async persistence
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockSetSetting).toHaveBeenCalledWith(
        "navigation_history_v1",
        '{"history":[],"currentIndex":-1}'
      );
    });
  });

  describe("complex navigation scenarios", () => {
    it("should handle back-forward-back navigation", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace1", "tab2");
      useNavigationStore.getState().pushEntry("workspace1", "tab3");

      // Back twice
      useNavigationStore.getState().goBack();
      useNavigationStore.getState().goBack();

      let store = useNavigationStore.getState();
      expect(store.currentIndex).toBe(0);

      // Forward once
      useNavigationStore.getState().goForward();
      store = useNavigationStore.getState();
      expect(store.currentIndex).toBe(1);

      // Back once
      useNavigationStore.getState().goBack();
      store = useNavigationStore.getState();
      expect(store.currentIndex).toBe(0);
    });

    it("should handle cross-workspace navigation", () => {
      useNavigationStore.getState().pushEntry("workspace1", "tab1");
      useNavigationStore.getState().pushEntry("workspace2", "tab2");
      useNavigationStore.getState().pushEntry("workspace1", "tab3");

      const store = useNavigationStore.getState();
      expect(store.history).toHaveLength(3);
      expect(store.history[0].workspaceId).toBe("workspace1");
      expect(store.history[1].workspaceId).toBe("workspace2");
      expect(store.history[2].workspaceId).toBe("workspace1");
    });
  });
});
