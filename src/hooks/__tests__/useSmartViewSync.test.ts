import { renderHook } from "@testing-library/react";
import { useSmartViewSync } from "../useSmartViewSync";
import { SmartViewSyncConfig } from "../../views/registry";

// Mock Monaco editor
type SyncEditor = Parameters<typeof useSmartViewSync>[0]["editor"];

/** Narrows the mock to the editor surface the hook actually uses. */
const asEditor = (editor: ReturnType<typeof createMockEditor>): SyncEditor =>
  editor as unknown as SyncEditor;

const createMockEditor = () => {
  const scrollCallbacks: Array<(e: unknown) => void> = [];

  return {
    onDidScrollChange: jest.fn((callback) => {
      scrollCallbacks.push(callback);
      return { dispose: jest.fn() };
    }),
    getScrollHeight: jest.fn(() => 1000),
    getLayoutInfo: jest.fn(() => ({ height: 500 })),
    setScrollTop: jest.fn(),
    revealLineInCenter: jest.fn(),
    revealLineInCenterIfOutsideViewport: jest.fn(),
    setPosition: jest.fn(),
    focus: jest.fn(),
    getVisibleRanges: jest.fn(() => [
      { startLineNumber: 1, endLineNumber: 20 }
    ]),
    getModel: jest.fn(() => ({
      getLineCount: jest.fn(() => 100)
    })),
    getTopForLineNumber: jest.fn((line: number) => (line - 1) * 20),
    // The hook reads this to work out how far *into* the top line the viewport
    // is scrolled. 0 clamps that fraction to zero, so the top line is whatever
    // getVisibleRanges reports.
    getScrollTop: jest.fn(() => 0),
    _triggerScroll: (e: unknown) => scrollCallbacks.forEach(cb => cb(e)),
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
        editor: asEditor(mockEditor),
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
        editor: asEditor(mockEditor),
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
        editor: asEditor(mockEditor),
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
        editor: asEditor(mockEditor),
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
        editor: asEditor(mockEditor),
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

    // 50% through content = line 50.5 out of 100
    // contentPercentage = 0.5, so line = 0.5 * (100 - 1) + 1 = 50.5
    // The target line is no longer rounded to a whole line: half of the way
    // between getTopForLineNumber(50) = 980 and (51) = 1000 is 990.
    expect(mockEditor.setScrollTop).toHaveBeenCalledWith(990);
  });

  it("should handle click on preview when click sync enabled", () => {
    const mockGetLineFromElement = jest.fn(() => 42);
    const syncConfig: SmartViewSyncConfig = {
      enableClickSync: true,
      getLineFromElement: mockGetLineFromElement,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: asEditor(mockEditor),
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
    expect(mockEditor.revealLineInCenterIfOutsideViewport).toHaveBeenCalledWith(42, 1);
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
        editor: asEditor(mockEditor),
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
    expect(mockEditor.revealLineInCenterIfOutsideViewport).not.toHaveBeenCalled();
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
        editor: asEditor(mockEditor),
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
        editor: asEditor(mockEditor),
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
        editor: asEditor(mockEditor),
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

  describe("anchor-based mapping", () => {
    /** Adds annotated children with fixed geometry to the preview container. */
    const addAnchors = (
      container: HTMLElement,
      pairs: Array<[line: number, top: number]>,
    ) => {
      container.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;
      pairs.forEach(([line, top]) => {
        const child = document.createElement("p");
        child.setAttribute("data-source-line", String(line));
        // Children move up the viewport as the container scrolls, so the rect
        // has to be read against the container's current scrollTop - offsets
        // in `pairs` are scroll-space positions.
        child.getBoundingClientRect = () =>
          ({ top: top - container.scrollTop }) as DOMRect;
        container.appendChild(child);
      });
    };

    it("maps editor to preview through anchors, not proportionally", async () => {
      // Lines 1-20 render in 200px, lines 20-100 in the remaining 1200px.
      // Proportional mapping would send line 20 to (19/99) * 1400 = 269px.
      addAnchors(mockPreviewContainer, [
        [1, 0],
        [20, 200],
        [100, 1400],
      ]);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableScrollSync: true },
          content: "",
          enabled: true,
        })
      );

      (mockEditor.getVisibleRanges as jest.Mock).mockReturnValue([
        { startLineNumber: 20, endLineNumber: 40 }
      ]);
      mockEditor._triggerScroll({});
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPreviewContainer.scrollTop).toBe(200);
    });

    it("interpolates between anchors", async () => {
      addAnchors(mockPreviewContainer, [
        [1, 0],
        [21, 400],
      ]);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableScrollSync: true },
          content: "",
          enabled: true,
        })
      );

      // Line 11 is halfway between the anchors, so 200px of the 400px span
      (mockEditor.getVisibleRanges as jest.Mock).mockReturnValue([
        { startLineNumber: 11, endLineNumber: 30 }
      ]);
      mockEditor._triggerScroll({});
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPreviewContainer.scrollTop).toBeCloseTo(200);
    });

    it("maps preview back to the editor through the same anchors", async () => {
      addAnchors(mockPreviewContainer, [
        [1, 0],
        [20, 200],
        [100, 1400],
      ]);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableScrollSync: true },
          content: "",
          enabled: true,
        })
      );

      mockPreviewContainer.scrollTop = 200;
      mockPreviewContainer.dispatchEvent(new Event("scroll"));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Line 20 => getTopForLineNumber(20) = 380
      expect(mockEditor.setScrollTop).toHaveBeenCalledWith(380);
    });
  });

  describe("click sync and text selection", () => {
    const clickPreview = (container: HTMLElement, target: HTMLElement) => {
      const event = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(event, "target", { value: target, writable: false });
      container.dispatchEvent(event);
    };

    afterEach(() => {
      (window.getSelection as jest.Mock | undefined)?.mockRestore?.();
    });

    /** Stubs a non-empty document selection. */
    const withSelection = (isCollapsed: boolean) => {
      jest
        .spyOn(window, "getSelection")
        .mockReturnValue({ isCollapsed } as Selection);
    };

    it("does not jump the editor when a click completes a selection", () => {
      withSelection(false);
      const getLineFromElement = jest.fn(() => 42);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableClickSync: true, getLineFromElement },
          content: "# Test",
          enabled: true,
        })
      );

      clickPreview(mockPreviewContainer, mockPreviewContainer);

      expect(getLineFromElement).not.toHaveBeenCalled();
      expect(mockEditor.revealLineInCenterIfOutsideViewport).not.toHaveBeenCalled();
      expect(mockEditor.focus).not.toHaveBeenCalled();
    });

    it("still jumps on a plain click with no selection", () => {
      withSelection(true);
      const getLineFromElement = jest.fn(() => 42);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableClickSync: true, getLineFromElement },
          content: "# Test",
          enabled: true,
        })
      );

      clickPreview(mockPreviewContainer, mockPreviewContainer);

      expect(mockEditor.revealLineInCenterIfOutsideViewport).toHaveBeenCalledWith(42, 1);
    });

    it.each([
      ["a", "a link"],
      ["button", "the copy button"],
      ["input", "a task list checkbox"],
    ])("leaves %s alone - %s owns its own click", (tagName) => {
      withSelection(true);
      const getLineFromElement = jest.fn(() => 42);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableClickSync: true, getLineFromElement },
          content: "# Test",
          enabled: true,
        })
      );

      const control = document.createElement(tagName);
      mockPreviewContainer.appendChild(control);
      clickPreview(mockPreviewContainer, control);

      expect(getLineFromElement).not.toHaveBeenCalled();
      expect(mockEditor.revealLineInCenterIfOutsideViewport).not.toHaveBeenCalled();
    });

    it("does not re-centre the editor on a line that is already visible", () => {
      withSelection(true);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableClickSync: true, getLineFromElement: () => 42 },
          content: "# Test",
          enabled: true,
        })
      );

      clickPreview(mockPreviewContainer, mockPreviewContainer);

      // revealLineInCenter would scroll unconditionally; the "IfOutsideViewport"
      // variant leaves a visible line where it is.
      expect(mockEditor.revealLineInCenter).not.toHaveBeenCalled();
      expect(mockEditor.revealLineInCenterIfOutsideViewport).toHaveBeenCalledWith(
        42,
        1,
      );
    });

    it("does not drag the preview when the click scrolls the editor", async () => {
      withSelection(true);
      mockPreviewContainer.scrollTop = 800;

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: {
            enableScrollSync: true,
            enableClickSync: true,
            getLineFromElement: () => 42,
          },
          content: "# Test",
          enabled: true,
        })
      );

      clickPreview(mockPreviewContainer, mockPreviewContainer);

      // Clicking moves the editor, which fires its scroll listener. That must
      // not feed back into the preview - the block under the pointer has to
      // stay under the pointer.
      (mockEditor.getVisibleRanges as jest.Mock).mockReturnValue([
        { startLineNumber: 30, endLineNumber: 50 },
      ]);
      mockEditor._triggerScroll({});

      expect(mockPreviewContainer.scrollTop).toBe(800);

      // ...and the guard lifts afterwards, so ordinary scrolling still syncs
      await new Promise((resolve) => setTimeout(resolve, 100));
      mockEditor._triggerScroll({});
      expect(mockPreviewContainer.scrollTop).not.toBe(800);
    });

    it("leaves a click on content nested inside a link alone", () => {
      withSelection(true);
      const getLineFromElement = jest.fn(() => 42);

      renderHook(() =>
        useSmartViewSync({
          editor: asEditor(mockEditor),
          previewContainer: mockPreviewContainer,
          syncConfig: { enableClickSync: true, getLineFromElement },
          content: "# Test",
          enabled: true,
        })
      );

      const link = document.createElement("a");
      const inner = document.createElement("code");
      link.appendChild(inner);
      mockPreviewContainer.appendChild(link);
      clickPreview(mockPreviewContainer, inner);

      expect(mockEditor.revealLineInCenterIfOutsideViewport).not.toHaveBeenCalled();
    });
  });

  it("should handle scrollBeyondLastLine - preview at bottom syncs to editor last line", async () => {
    const syncConfig: SmartViewSyncConfig = {
      enableScrollSync: true,
    };

    renderHook(() =>
      useSmartViewSync({
        editor: asEditor(mockEditor),
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
