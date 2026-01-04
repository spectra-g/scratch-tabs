import { renderHook } from "@testing-library/react";
import { useSmartViewSync } from "../useSmartViewSync";
import { SmartViewSyncConfig } from "../../views/registry";

// Mock Monaco editor
const createMockEditor = () => {
  const scrollCallbacks: Array<(e: any) => void> = [];

  return {
    onDidScrollChange: jest.fn((callback) => {
      scrollCallbacks.push(callback);
      return { dispose: jest.fn() };
    }),
    getScrollHeight: jest.fn(() => 1000),
    getLayoutInfo: jest.fn(() => ({ height: 500 })),
    setScrollTop: jest.fn(),
    revealLineInCenter: jest.fn(),
    setPosition: jest.fn(),
    focus: jest.fn(),
    getVisibleRanges: jest.fn(() => [
      { startLineNumber: 1, endLineNumber: 20 }
    ]),
    getModel: jest.fn(() => ({
      getLineCount: jest.fn(() => 100)
    })),
    getTopForLineNumber: jest.fn((line: number) => (line - 1) * 20),
    _triggerScroll: (e: any) => scrollCallbacks.forEach(cb => cb(e)),
  };
};

// Mock preview container
const createMockPreviewContainer = () => {
  const element = document.createElement("div");
  Object.defineProperties(element, {
    scrollHeight: { value: 2000, writable: true },
    clientHeight: { value: 600, writable: true },
    scrollTop: { value: 0, writable: true },
  });
  return element;
};

describe("useSmartViewSync", () => {
  let mockEditor: ReturnType<typeof createMockEditor>;
  let mockPreviewContainer: HTMLDivElement;

  beforeEach(() => {
    mockEditor = createMockEditor();
    mockPreviewContainer = createMockPreviewContainer();
    jest.clearAllMocks();
  });

  it("should not set up sync when disabled", () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
      enableClickSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: false,
      })
    );

    expect(mockEditor.onDidScrollChange).not.toHaveBeenCalled();
  });

  it("should not set up sync when editor is null", () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
      enableClickSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: null,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    expect(mockEditor.onDidScrollChange).not.toHaveBeenCalled();
  });

  it("should not set up sync when previewContainer is null", () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
      enableClickSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: null,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    expect(mockEditor.onDidScrollChange).not.toHaveBeenCalled();
  });

  it("should set up editor scroll listener when scroll sync enabled", () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    expect(mockEditor.onDidScrollChange).toHaveBeenCalled();
  });

  it("should sync scroll from editor to preview", async () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    // Simulate editor showing line 50 at top (50% of 100 lines)
    (mockEditor.getVisibleRanges as jest.Mock).mockReturnValue([
      { startLineNumber: 50, endLineNumber: 70 }
    ]);

    mockEditor._triggerScroll({});

    // Wait for setTimeout in sync logic
    await new Promise(resolve => setTimeout(resolve, 100));

    // Line 50 out of 100 = 49.5% through content (line 50 is index 49)
    // (50 - 1) / (100 - 1) = 49 / 99 ≈ 0.494949
    // Preview maxScroll = 2000 - 600 = 1400
    // 0.494949 * 1400 ≈ 693
    expect(mockPreviewContainer.scrollTop).toBeCloseTo(693, 0);
  });

  it("should sync scroll from preview to editor", async () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    // Simulate preview scroll to 50%
    // Preview: scrollTop = 700, maxScroll = 2000 - 600 = 1400
    // 700 / 1400 = 0.5 (50%)
    mockPreviewContainer.scrollTop = 700;
    mockPreviewContainer.dispatchEvent(new Event("scroll"));

    // Wait for setTimeout
    await new Promise(resolve => setTimeout(resolve, 100));

    // 50% through content = line 50 out of 100
    // contentPercentage = 0.5
    // targetLine = round(0.5 * (100 - 1)) + 1 = round(49.5) + 1 = 50 + 1 = 51
    // getTopForLineNumber(51) = (51 - 1) * 20 = 1000
    expect(mockEditor.setScrollTop).toHaveBeenCalledWith(1000);
  });

  it("should handle click on preview when click sync enabled", () => {
    const mockGetLineFromElement = jest.fn(() => 42);
    const syncConfig: SmartViewSyncConfig = {
      enableClickSync: true,
      getLineFromElement: mockGetLineFromElement,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "# Test",
        enabled: true,
      })
    );

    // Simulate click on preview
    const clickEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvent, "target", {
      value: mockPreviewContainer,
      writable: false,
    });
    mockPreviewContainer.dispatchEvent(clickEvent);

    // Should call getLineFromElement
    expect(mockGetLineFromElement).toHaveBeenCalledWith(
      mockPreviewContainer,
      "# Test"
    );

    // Should navigate editor to line 42
    expect(mockEditor.revealLineInCenter).toHaveBeenCalledWith(42);
    expect(mockEditor.setPosition).toHaveBeenCalledWith({
      lineNumber: 42,
      column: 1,
    });
    expect(mockEditor.focus).toHaveBeenCalled();
  });

  it("should not navigate when click returns null line", () => {
    const mockGetLineFromElement = jest.fn(() => null);
    const syncConfig: SmartViewSyncConfig = {
      enableClickSync: true,
      getLineFromElement: mockGetLineFromElement,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "# Test",
        enabled: true,
      })
    );

    // Simulate click
    const clickEvent = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvent, "target", {
      value: mockPreviewContainer,
      writable: false,
    });
    mockPreviewContainer.dispatchEvent(clickEvent);

    // Should not navigate
    expect(mockEditor.revealLineInCenter).not.toHaveBeenCalled();
  });

  it("should cleanup listeners on unmount", () => {
    const disposeSpy = jest.fn();
    (mockEditor.onDidScrollChange as jest.Mock).mockReturnValue({
      dispose: disposeSpy,
    });

    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
      enableClickSync: true,
      getLineFromElement: jest.fn(() => 1),
    };

    const { unmount } = renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    // Verify listener was set up
    expect(mockEditor.onDidScrollChange).toHaveBeenCalled();

    // Unmount should cleanup
    unmount();

    // Verify dispose was called to cleanup editor scroll listener
    expect(disposeSpy).toHaveBeenCalled();
  });

  it("should not sync when syncInProgress to prevent loops", async () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    // Clear any previous calls
    jest.clearAllMocks();

    // Trigger editor scroll
    (mockEditor.getVisibleRanges as jest.Mock).mockReturnValue([
      { startLineNumber: 25, endLineNumber: 45 }
    ]);
    mockEditor._triggerScroll({});

    // Immediately trigger preview scroll (before timeout)
    mockPreviewContainer.scrollTop = 100;
    mockPreviewContainer.dispatchEvent(new Event("scroll"));

    // The preview->editor sync should be blocked
    // because editor->preview sync is in progress
    expect(mockEditor.setScrollTop).not.toHaveBeenCalled();
  });

  it("should handle scrollBeyondLastLine - editor at last line syncs to preview bottom", async () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    // Simulate editor scrolled to show last line at top (line 100 out of 100)
    // This is possible in Monaco due to scrollBeyondLastLine
    (mockEditor.getVisibleRanges as jest.Mock).mockReturnValue([
      { startLineNumber: 100, endLineNumber: 100 }
    ]);

    mockEditor._triggerScroll({});

    // Wait for setTimeout
    await new Promise(resolve => setTimeout(resolve, 100));

    // Line 100 out of 100 = 100% through content
    // (100 - 1) / (100 - 1) = 99 / 99 = 1.0
    // Preview should scroll to bottom: 1.0 * 1400 = 1400
    expect(mockPreviewContainer.scrollTop).toBe(1400);
  });

  it("should handle scrollBeyondLastLine - preview at bottom syncs to editor last line", async () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: mockEditor as any,
        previewContainer: mockPreviewContainer,
        syncConfig,
        content: "",
        enabled: true,
      })
    );

    // Simulate preview scrolled to bottom
    mockPreviewContainer.scrollTop = 1400; // maxScroll = 2000 - 600 = 1400
    mockPreviewContainer.dispatchEvent(new Event("scroll"));

    // Wait for setTimeout
    await new Promise(resolve => setTimeout(resolve, 100));

    // 100% through content = last line
    // contentPercentage = 1400 / 1400 = 1.0
    // targetLine = round(1.0 * 99) + 1 = 99 + 1 = 100
    // getTopForLineNumber(100) = (100 - 1) * 20 = 1980
    expect(mockEditor.setScrollTop).toHaveBeenCalledWith(1980);
  });
});
