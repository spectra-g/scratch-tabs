import { modelManager } from "../modelManager";
import { Tab } from "../../types";

// Mock the dependencies
jest.mock("../../db", () => ({
  StorageProviderFactory: {
    getProvider: jest.fn(() => ({
      getTabContent: jest.fn(() => Promise.resolve("test content from db")),
    })),
  },
}));

jest.mock("../../stores/tabsStore", () => ({
  useTabsStore: {
    getState: jest.fn(() => ({
      updateTabContent: jest.fn(),
    })),
  },
}));

// Mock Monaco
const mockMonaco = {
  Uri: {
    parse: jest.fn((uri) => ({ toString: () => uri })),
  },
  editor: {
    createModel: jest.fn(),
    getModel: jest.fn(),
    setModelLanguage: jest.fn(),
  },
};

const mockModel = {
  uri: { toString: () => "inmemory://model/test-tab" },
  isDisposed: jest.fn(() => false),
  getValue: jest.fn(() => "test content"),
  setValue: jest.fn(),
  onDidChangeContent: jest.fn(() => ({ dispose: jest.fn() })),
  dispose: jest.fn(),
};

const mockListener = {
  dispose: jest.fn(),
};

describe("ModelManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modelManager.disposeAll();
    modelManager.initialize(mockMonaco as any);
    mockModel.isDisposed.mockReturnValue(false);
    mockModel.onDidChangeContent.mockReturnValue(mockListener);
    mockMonaco.editor.createModel.mockReturnValue(mockModel);
    mockMonaco.editor.getModel.mockReturnValue(null);
  });

  describe("initialization", () => {
    it("should initialize with Monaco instance", () => {
      expect(modelManager.getDebugInfo()).toBeDefined();
    });
  });

  describe("model creation and caching", () => {
    const testTab: Tab = {
      id: "test-tab",
      title: "Test Tab",
      content: "initial content",
      language: "javascript",
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      isTablet: false,
      tabletState: "",
      workspaceId: "default",
    };

    it("should create a new model when not in cache", async () => {
      const model = await modelManager.get(testTab);

      expect(mockMonaco.editor.createModel).toHaveBeenCalledWith(
        "initial content",
        "javascript",
        expect.any(Object),
      );
      expect(model).toBe(mockModel);
    });

    it("should return cached model when available", async () => {
      // First call creates the model
      await modelManager.get(testTab);

      // Reset mock to verify it's not called again
      mockMonaco.editor.createModel.mockClear();

      // Second call should return cached model
      const cachedModel = await modelManager.get(testTab);

      expect(mockMonaco.editor.createModel).not.toHaveBeenCalled();
      expect(cachedModel).toBe(mockModel);
    });

    it("should handle disposed models in cache", async () => {
      // First call creates the model
      await modelManager.get(testTab);

      // Mark model as disposed
      mockModel.isDisposed.mockReturnValue(true);

      // Reset mock to verify it's called again
      mockMonaco.editor.createModel.mockClear();

      // Second call should create new model
      await modelManager.get(testTab);

      expect(mockMonaco.editor.createModel).toHaveBeenCalled();
    });

    it("should dispose lingering models before creating new ones", async () => {
      modelManager.disposeAll();
      const lingeringModel = { ...mockModel, dispose: jest.fn() };
      mockMonaco.editor.getModel.mockReturnValueOnce(lingeringModel);
      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };
      await modelManager.get(testTab);
      expect(lingeringModel.dispose).toHaveBeenCalled();
      expect(mockMonaco.editor.createModel).toHaveBeenCalled();
    });
  });

  describe("content synchronization", () => {
    const testTab: Tab = {
      id: "test-tab",
      title: "Test Tab",
      content: "initial content",
      language: "javascript",
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      isTablet: false,
      tabletState: "",
      workspaceId: "default",
    };

    it("should set up content change listener", async () => {
      await modelManager.get(testTab);

      expect(mockModel.onDidChangeContent).toHaveBeenCalled();
    });

    it("should sync content changes to store", async () => {
      const updateTabContent = jest.fn();
      (
        require("../../stores/tabsStore").useTabsStore.getState as jest.Mock
      ).mockReturnValue({
        updateTabContent,
      });

      let capturedListener: (() => void) | undefined;
      (mockModel.onDidChangeContent as any).mockImplementation(
        (listener: () => void) => {
          capturedListener = listener;
          return mockListener;
        },
      );

      await modelManager.get(testTab);

      // Simulate content change
      expect(capturedListener).toBeDefined();
      capturedListener!();

      expect(updateTabContent).toHaveBeenCalledWith("test-tab", "test content");
    });

    it("should handle content sync errors gracefully", async () => {
      const updateTabContent = jest.fn().mockImplementation(() => {
        throw new Error("Store update failed");
      });
      (
        require("../../stores/tabsStore").useTabsStore.getState as jest.Mock
      ).mockReturnValue({
        updateTabContent,
      });

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      let capturedListener: (() => void) | undefined;
      (mockModel.onDidChangeContent as any).mockImplementation(
        (listener: () => void) => {
          capturedListener = listener;
          return mockListener;
        },
      );

      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };

      await modelManager.get(testTab);

      // Simulate content change
      expect(capturedListener).toBeDefined();
      capturedListener!();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[ModelManager] Failed to update content for tab test-tab:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("model disposal", () => {
    const testTab: Tab = {
      id: "test-tab",
      title: "Test Tab",
      content: "initial content",
      language: "javascript",
      languageLocked: false,
      cursorPosition: { lineNumber: 1, column: 1 },
      dateCreated: Date.now(),
      lastModified: Date.now(),
      isTablet: false,
      tabletState: "",
      workspaceId: "default",
    };

    it("should dispose individual models", async () => {
      await modelManager.get(testTab);
      modelManager.dispose("test-tab");

      expect(mockModel.dispose).toHaveBeenCalled();
      expect(mockListener.dispose).toHaveBeenCalled();
    });

    it("should dispose all models", async () => {
      const testTab2 = { ...testTab, id: "test-tab-2" };
      await modelManager.get(testTab);
      await modelManager.get(testTab2);

      modelManager.disposeAll();

      expect(mockModel.dispose).toHaveBeenCalledTimes(2);
      expect(mockListener.dispose).toHaveBeenCalledTimes(2);
    });

    it("should handle disposal of non-existent models", () => {
      expect(() => modelManager.dispose("non-existent")).not.toThrow();
    });

    it("should save final content before disposal", async () => {
      const updateTabContent = jest.fn();
      (
        require("../../stores/tabsStore").useTabsStore.getState as jest.Mock
      ).mockReturnValue({
        updateTabContent,
      });

      await modelManager.get(testTab);
      modelManager.dispose("test-tab");

      expect(updateTabContent).toHaveBeenCalledWith("test-tab", "test content");
    });
  });

  describe("language updates", () => {
    it("should update model language", async () => {
      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };

      await modelManager.get(testTab);
      modelManager.updateModelLanguage("test-tab", "typescript");

      expect(mockMonaco.editor.setModelLanguage).toHaveBeenCalledWith(
        mockModel,
        "typescript",
      );
    });

    it("should handle language update for non-existent model", () => {
      // Non-existent models don't throw errors, they just don't do anything
      expect(() =>
        modelManager.updateModelLanguage("non-existent", "typescript"),
      ).not.toThrow();
    });

    it("should handle language update for disposed model", async () => {
      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };

      await modelManager.get(testTab);
      mockModel.isDisposed.mockReturnValue(true);

      // Disposed models don't throw errors, they just don't do anything
      expect(() =>
        modelManager.updateModelLanguage("test-tab", "typescript"),
      ).not.toThrow();
    });
  });

  describe("content updates", () => {
    it("should update model content", async () => {
      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };

      await modelManager.get(testTab);
      modelManager.updateModelContent("test-tab", "new content");

      expect(mockModel.setValue).toHaveBeenCalledWith("new content");
    });

    it("should handle content update for non-existent model", () => {
      // Non-existent models don't throw errors, they just don't do anything
      expect(() =>
        modelManager.updateModelContent("non-existent", "new content"),
      ).not.toThrow();
    });
  });

  describe("content retrieval", () => {
    it("should get content from cached model", async () => {
      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };

      await modelManager.get(testTab);
      const content = modelManager.getContent("test-tab");

      expect(content).toBe("test content");
    });

    it("should return undefined for non-existent model", () => {
      const content = modelManager.getContent("non-existent");
      expect(content).toBeUndefined();
    });

    it("should return undefined for disposed model", async () => {
      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };

      await modelManager.get(testTab);
      mockModel.isDisposed.mockReturnValue(true);

      const content = modelManager.getContent("test-tab");
      expect(content).toBeUndefined();
    });
  });

  describe("debug information", () => {
    it("should provide debug information", () => {
      const debugInfo = modelManager.getDebugInfo();

      expect(debugInfo).toHaveProperty("modelCount");
      expect(debugInfo).toHaveProperty("maxModels");
      expect(debugInfo).toHaveProperty("cachedTabs");
      expect(debugInfo).toHaveProperty("lruOrder");
    });
  });

  describe("error handling", () => {
    it("should handle model creation errors gracefully", async () => {
      mockMonaco.editor.createModel.mockImplementation(() => {
        throw new Error("Model creation failed");
      });
      const testTab: Tab = {
        id: "test-tab",
        title: "Test Tab",
        content: "initial content",
        language: "javascript",
        languageLocked: false,
        cursorPosition: { lineNumber: 1, column: 1 },
        dateCreated: Date.now(),
        lastModified: Date.now(),
        isTablet: false,
        tabletState: "",
        workspaceId: "default",
      };
      // Should throw when createModel fails
      await expect(modelManager.get(testTab)).rejects.toThrow(
        "Model creation failed",
      );
    });
  });
});
