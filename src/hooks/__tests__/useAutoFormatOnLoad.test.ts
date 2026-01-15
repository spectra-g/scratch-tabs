import { renderHook, act } from "@testing-library/react";
import { useAutoFormatOnLoad } from "../useAutoFormatOnLoad";
import type { Tab } from "../../types";

describe("useAutoFormatOnLoad", () => {
  let mockEditor: any;
  let mockFormatAction: any;

  const createMockTab = (overrides = {}): Tab => ({
    id: "tab-1",
    title: "Test Tab",
    content: "a".repeat(100), // Substantial content
    language: "javascript",
    languageLocked: false,
    isTablet: false,
    isRich: false,
    workspaceId: "workspace-1",
    dateCreated: Date.now(), // Just created
    lastModified: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    mockFormatAction = {
      run: jest.fn(),
    };
    mockEditor = {
      getAction: jest.fn((actionId: string) => {
        if (actionId === "editor.action.formatDocument") {
          return mockFormatAction;
        }
        return null;
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it("should auto-format a newly created tab with substantial content", () => {
    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: createMockTab(),
      })
    );

    // Fast-forward past the delay
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockEditor.getAction).toHaveBeenCalledWith(
      "editor.action.formatDocument"
    );
    expect(mockFormatAction.run).toHaveBeenCalled();
  });

  it("should NOT format when editor is null", () => {
    renderHook(() =>
      useAutoFormatOnLoad({
        editor: null,
        activeTab: createMockTab(),
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format when activeTab is null", () => {
    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: null,
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format old tabs (created > 500ms ago)", () => {
    const oldTab = createMockTab({
      dateCreated: Date.now() - 1000, // Created 1 second ago
    });

    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: oldTab,
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format tabs with insufficient content", () => {
    const smallContentTab = createMockTab({
      content: "short", // Less than 50 chars
    });

    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: smallContentTab,
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format plaintext tabs", () => {
    const plaintextTab = createMockTab({
      language: "plaintext",
    });

    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: plaintextTab,
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format tablet tabs", () => {
    const tabletTab = createMockTab({
      isTablet: true,
    });

    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: tabletTab,
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format duplicate tabs (title contains 'copy')", () => {
    const copyTab = createMockTab({
      title: "Test Tab (copy)",
    });

    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: copyTab,
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format duplicate tabs (title contains 'Copy of')", () => {
    const copyTab = createMockTab({
      title: "Copy of Test Tab",
    });

    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: copyTab,
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should NOT format the same tab twice", () => {
    const tab = createMockTab();

    const { rerender } = renderHook(
      ({ activeTab }) =>
        useAutoFormatOnLoad({
          editor: mockEditor,
          activeTab,
        }),
      { initialProps: { activeTab: tab } }
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(mockFormatAction.run).toHaveBeenCalledTimes(1);

    // Trigger a re-render with the same tab
    rerender({ activeTab: { ...tab } });

    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Should still only be called once
    expect(mockFormatAction.run).toHaveBeenCalledTimes(1);
  });

  it("should clear timeout on unmount (no memory leak)", () => {
    const { unmount } = renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: createMockTab(),
      })
    );

    // Unmount before timer fires
    unmount();

    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Format should not have been called
    expect(mockFormatAction.run).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully during formatting", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockFormatAction.run.mockImplementation(() => {
      throw new Error("Format failed");
    });

    renderHook(() =>
      useAutoFormatOnLoad({
        editor: mockEditor,
        activeTab: createMockTab(),
      })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "[useAutoFormatOnLoad] Failed to auto-format document:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
