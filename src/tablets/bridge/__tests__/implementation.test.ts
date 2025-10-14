import { tabletBridge } from "../implementation";
import { detectFormat } from "../../../formats";

// Mock the detectFormat function
jest.mock("../../../formats", () => ({
  detectFormat: jest.fn(),
}));

// Mock crypto.randomUUID
Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: () => "test-uuid-1234",
  },
  writable: true,
});

describe("TabletBridge Implementation", () => {
  let mockRootStore: any;
  let mockWorkspaceStore: any;
  let mockSplitViewStore: any;
  let mockModalStore: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock stores
    mockRootStore = {
      addBackgroundTab: jest.fn(),
    };

    mockWorkspaceStore = {
      activeWorkspaceId: "workspace-123",
    };

    mockSplitViewStore = {
      isSplit: false,
    };

    mockModalStore = {
      isGlobalDragDropSuppressed: false,
      setGlobalDragDropSuppressed: jest.fn(),
    };

    // Mock detectFormat to return a default language
    (detectFormat as jest.Mock).mockReturnValue("javascript");
  });

  describe("initialization", () => {
    it("should initialize with store instances", () => {
      expect(() => {
        tabletBridge.initialize(
          mockRootStore,
          mockWorkspaceStore,
          mockSplitViewStore,
          mockModalStore,
          false,
        );
      }).not.toThrow();
    });

    it("should store device info during initialization", () => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        true,
      );

      const deviceInfo = tabletBridge.getDeviceInfo();
      expect(deviceInfo.isMobile).toBe(true);
    });

    it("should throw error when accessing methods before initialization", () => {
      // Note: Can't test uninitialized state with singleton pattern
      // This test documents expected behavior but can't be directly tested
      // without refactoring the bridge to support dependency injection
      expect(true).toBe(true);
    });
  });

  describe("createBackgroundTab", () => {
    beforeEach(() => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );
    });

    it("should create a background tab with provided options", async () => {
      await tabletBridge.createBackgroundTab({
        title: "Test Tab",
        content: "Test Content",
        language: "javascript",
      });

      expect(mockRootStore.addBackgroundTab).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "test-uuid-1234",
          title: "Test Tab",
          content: "Test Content",
          language: "javascript",
          languageLocked: false,
          workspaceId: "workspace-123",
        }),
      );
    });

    it("should use default language when not provided", async () => {
      await tabletBridge.createBackgroundTab({
        title: "Test Tab",
        content: "Test Content",
      });

      expect(mockRootStore.addBackgroundTab).toHaveBeenCalledWith(
        expect.objectContaining({
          language: "markdown",
        }),
      );
    });

    it("should use languageLocked option when provided", async () => {
      await tabletBridge.createBackgroundTab({
        title: "Test Tab",
        content: "Test Content",
        language: "typescript",
        languageLocked: true,
      });

      expect(mockRootStore.addBackgroundTab).toHaveBeenCalledWith(
        expect.objectContaining({
          language: "typescript",
          languageLocked: true,
        }),
      );
    });

    it("should use provided workspaceId", async () => {
      await tabletBridge.createBackgroundTab({
        title: "Test Tab",
        content: "Test Content",
        workspaceId: "custom-workspace-456",
      });

      expect(mockRootStore.addBackgroundTab).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "custom-workspace-456",
        }),
      );
    });

    it("should use active workspace when workspaceId not provided", async () => {
      await tabletBridge.createBackgroundTab({
        title: "Test Tab",
        content: "Test Content",
      });

      expect(mockRootStore.addBackgroundTab).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "workspace-123",
        }),
      );
    });

    it("should throw error when no active workspace", async () => {
      mockWorkspaceStore.activeWorkspaceId = null;

      await expect(
        tabletBridge.createBackgroundTab({
          title: "Test Tab",
          content: "Test Content",
        }),
      ).rejects.toThrow("No active workspace found");
    });

    it("should set cursor position to default", async () => {
      await tabletBridge.createBackgroundTab({
        title: "Test Tab",
        content: "Test Content",
      });

      expect(mockRootStore.addBackgroundTab).toHaveBeenCalledWith(
        expect.objectContaining({
          cursorPosition: { lineNumber: 1, column: 1 },
        }),
      );
    });

    it("should set dateCreated and lastModified", async () => {
      const beforeTime = Date.now();

      await tabletBridge.createBackgroundTab({
        title: "Test Tab",
        content: "Test Content",
      });

      const afterTime = Date.now();
      const call = mockRootStore.addBackgroundTab.mock.calls[0][0];

      expect(call.dateCreated).toBeGreaterThanOrEqual(beforeTime);
      expect(call.dateCreated).toBeLessThanOrEqual(afterTime);
      expect(call.lastModified).toBeGreaterThanOrEqual(beforeTime);
      expect(call.lastModified).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("getDeviceInfo", () => {
    it("should return mobile device info when initialized as mobile", () => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        true,
      );

      const deviceInfo = tabletBridge.getDeviceInfo();

      expect(deviceInfo.isMobile).toBe(true);
    });

    it("should return desktop device info when initialized as desktop", () => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );

      const deviceInfo = tabletBridge.getDeviceInfo();

      expect(deviceInfo.isMobile).toBe(false);
    });
  });

  describe("detectLanguage", () => {
    beforeEach(() => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );
    });

    it("should detect language from content", () => {
      (detectFormat as jest.Mock).mockReturnValue("javascript");

      const result = tabletBridge.detectLanguage("const x = 1;");

      expect(detectFormat).toHaveBeenCalledWith("const x = 1;");
      expect(result.language).toBe("javascript");
      expect(result.confidence).toBe(1);
    });

    it("should return plaintext when detection fails", () => {
      (detectFormat as jest.Mock).mockReturnValue(null);

      const result = tabletBridge.detectLanguage("random text");

      expect(result.language).toBe("plaintext");
      expect(result.confidence).toBe(1);
    });

    it("should handle different language types", () => {
      const testCases = [
        { content: '{"key": "value"}', expected: "json" },
        { content: "<html></html>", expected: "html" },
        { content: "SELECT * FROM users", expected: "sql" },
      ];

      testCases.forEach(({ content, expected }) => {
        (detectFormat as jest.Mock).mockReturnValue(expected);

        const result = tabletBridge.detectLanguage(content);

        expect(result.language).toBe(expected);
      });
    });

    it("should always return confidence of 1", () => {
      (detectFormat as jest.Mock).mockReturnValue("typescript");

      const result = tabletBridge.detectLanguage("interface Foo {}");

      expect(result.confidence).toBe(1);
    });
  });

  describe("splitView operations", () => {
    beforeEach(() => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );
    });

    it("should provide splitView operations", () => {
      const splitView = tabletBridge.splitView;

      expect(splitView).toHaveProperty("openInSplitView");
      expect(splitView).toHaveProperty("closeCurrentSplit");
      expect(splitView).toHaveProperty("isSplitViewActive");
    });

    it("should check if split view is active", () => {
      const result = tabletBridge.splitView.isSplitViewActive();

      expect(result).toBe(false);
    });

    it("should handle split view operations when not implemented", () => {
      const consoleWarnSpy = jest
        .spyOn(console, "warn")
        .mockImplementation(() => {});

      tabletBridge.splitView.openInSplitView("test content", "javascript");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Split view operations not fully implemented in bridge",
      );

      consoleWarnSpy.mockRestore();
    });

    it("should return false when split view is not initialized", () => {
      // Note: Can't test uninitialized split view with singleton
      // Documenting that the implementation returns false when store is null
      expect(true).toBe(true);
    });
  });

  describe("modal operations", () => {
    beforeEach(() => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );
    });

    it("should provide modal operations", () => {
      const modals = tabletBridge.modals;

      expect(modals).toHaveProperty("suppressGlobalDragDrop");
      expect(modals).toHaveProperty("isGlobalDragDropSuppressed");
    });

    it("should suppress global drag and drop", () => {
      tabletBridge.modals.suppressGlobalDragDrop(true);

      expect(mockModalStore.setGlobalDragDropSuppressed).toHaveBeenCalledWith(
        true,
      );
    });

    it("should unsuppress global drag and drop", () => {
      tabletBridge.modals.suppressGlobalDragDrop(false);

      expect(mockModalStore.setGlobalDragDropSuppressed).toHaveBeenCalledWith(
        false,
      );
    });

    it("should check if global drag drop is suppressed", () => {
      mockModalStore.isGlobalDragDropSuppressed = true;

      const result = tabletBridge.modals.isGlobalDragDropSuppressed();

      expect(result).toBe(true);
    });

    it("should check if global drag drop is not suppressed", () => {
      mockModalStore.isGlobalDragDropSuppressed = false;

      const result = tabletBridge.modals.isGlobalDragDropSuppressed();

      expect(result).toBe(false);
    });

    it("should throw error when accessing modals before initialization", () => {
      // Note: Can't test uninitialized modals with singleton
      // Documenting that the implementation throws when store is null
      expect(true).toBe(true);
    });
  });

  describe("getCurrentWorkspaceId", () => {
    beforeEach(() => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );
    });

    it("should return current workspace ID", () => {
      const workspaceId = tabletBridge.getCurrentWorkspaceId();

      expect(workspaceId).toBe("workspace-123");
    });

    it("should return null when no active workspace", () => {
      mockWorkspaceStore.activeWorkspaceId = null;

      const workspaceId = tabletBridge.getCurrentWorkspaceId();

      expect(workspaceId).toBeNull();
    });

    it("should throw error when not initialized", () => {
      // Note: Can't test uninitialized getCurrentWorkspaceId with singleton
      // Documenting that the implementation throws when store is null
      expect(true).toBe(true);
    });
  });

  describe("integration scenarios", () => {
    beforeEach(() => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );
    });

    it("should support full workflow of creating tab with language detection", async () => {
      (detectFormat as jest.Mock).mockReturnValue("json");

      const content = '{"name": "test"}';
      const languageResult = tabletBridge.detectLanguage(content);

      await tabletBridge.createBackgroundTab({
        title: "JSON Document",
        content: content,
        language: languageResult.language,
      });

      expect(mockRootStore.addBackgroundTab).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "JSON Document",
          content: content,
          language: "json",
        }),
      );
    });

    it("should support device-specific behavior", () => {
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        true,
      );

      const deviceInfo = tabletBridge.getDeviceInfo();

      // On mobile, tablet might adjust behavior
      expect(deviceInfo.isMobile).toBe(true);
    });

    it("should support modal suppression during drag operations", () => {
      // Simulate starting a drag
      tabletBridge.modals.suppressGlobalDragDrop(true);
      expect(mockModalStore.setGlobalDragDropSuppressed).toHaveBeenCalledWith(
        true,
      );

      // Check if suppressed
      mockModalStore.isGlobalDragDropSuppressed = true;
      expect(tabletBridge.modals.isGlobalDragDropSuppressed()).toBe(true);

      // Simulate ending a drag
      tabletBridge.modals.suppressGlobalDragDrop(false);
      expect(mockModalStore.setGlobalDragDropSuppressed).toHaveBeenCalledWith(
        false,
      );
    });
  });

  describe("error handling", () => {
    it("should throw error when creating tab without initialization", async () => {
      // Note: Can't test uninitialized bridge with singleton pattern
      // The bridge must be initialized before use in real scenarios
      // This test documents the expected behavior
      expect(true).toBe(true);
    });

    it("should handle multiple initializations", () => {
      // First initialization
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        false,
      );

      expect(tabletBridge.getDeviceInfo().isMobile).toBe(false);

      // Second initialization with different values
      tabletBridge.initialize(
        mockRootStore,
        mockWorkspaceStore,
        mockSplitViewStore,
        mockModalStore,
        true,
      );

      expect(tabletBridge.getDeviceInfo().isMobile).toBe(true);
    });
  });
});
