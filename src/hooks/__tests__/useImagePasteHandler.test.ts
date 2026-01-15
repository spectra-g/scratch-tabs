import { renderHook } from "@testing-library/react";
import { useImagePasteHandler } from "../useImagePasteHandler";
import type { Tab } from "../../types";

describe("useImagePasteHandler", () => {
  let mockContainer: HTMLDivElement;
  let mockSetPendingImageData: jest.Mock;
  let mockSetPendingImageCursorPosition: jest.Mock;
  let mockOnShowUpgradeModal: jest.Mock;
  let mockEditorRef: { current: any };
  let mockContainerRef: { current: HTMLDivElement | null };

  const createMockTab = (overrides = {}): Tab => ({
    id: "tab-1",
    title: "Test Tab",
    content: "test content",
    language: "javascript",
    languageLocked: false,
    isTablet: false,
    isRich: false,
    workspaceId: "workspace-1",
    dateCreated: Date.now(),
    lastModified: Date.now(),
    cursorPosition: { lineNumber: 1, column: 1 },
    ...overrides,
  });

  beforeEach(() => {
    mockContainer = document.createElement("div");
    mockSetPendingImageData = jest.fn();
    mockSetPendingImageCursorPosition = jest.fn();
    mockOnShowUpgradeModal = jest.fn();
    mockEditorRef = {
      current: {
        getPosition: jest.fn(() => ({ lineNumber: 5, column: 10 })),
      },
    };
    mockContainerRef = { current: mockContainer };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should attach paste listener to container on mount", () => {
    const addEventListenerSpy = jest.spyOn(mockContainer, "addEventListener");

    renderHook(() =>
      useImagePasteHandler({
        containerRef: mockContainerRef,
        editorRef: mockEditorRef,
        activeTab: createMockTab(),
        setPendingImageData: mockSetPendingImageData,
        setPendingImageCursorPosition: mockSetPendingImageCursorPosition,
        onShowUpgradeModal: mockOnShowUpgradeModal,
      })
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "paste",
      expect.any(Function),
      true
    );
  });

  it("should remove paste listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(
      mockContainer,
      "removeEventListener"
    );

    const { unmount } = renderHook(() =>
      useImagePasteHandler({
        containerRef: mockContainerRef,
        editorRef: mockEditorRef,
        activeTab: createMockTab(),
        setPendingImageData: mockSetPendingImageData,
        setPendingImageCursorPosition: mockSetPendingImageCursorPosition,
        onShowUpgradeModal: mockOnShowUpgradeModal,
      })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "paste",
      expect.any(Function),
      true
    );
  });

  it("should not attach listener when activeTab is null", () => {
    const addEventListenerSpy = jest.spyOn(mockContainer, "addEventListener");

    renderHook(() =>
      useImagePasteHandler({
        containerRef: mockContainerRef,
        editorRef: mockEditorRef,
        activeTab: null,
        setPendingImageData: mockSetPendingImageData,
        setPendingImageCursorPosition: mockSetPendingImageCursorPosition,
        onShowUpgradeModal: mockOnShowUpgradeModal,
      })
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("should not attach listener when activeTab is rich text", () => {
    const addEventListenerSpy = jest.spyOn(mockContainer, "addEventListener");

    renderHook(() =>
      useImagePasteHandler({
        containerRef: mockContainerRef,
        editorRef: mockEditorRef,
        activeTab: createMockTab({ isRich: true }),
        setPendingImageData: mockSetPendingImageData,
        setPendingImageCursorPosition: mockSetPendingImageCursorPosition,
        onShowUpgradeModal: mockOnShowUpgradeModal,
      })
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("should not attach listener when container is null", () => {
    mockContainerRef.current = null;

    // This should not throw
    const { unmount } = renderHook(() =>
      useImagePasteHandler({
        containerRef: mockContainerRef,
        editorRef: mockEditorRef,
        activeTab: createMockTab(),
        setPendingImageData: mockSetPendingImageData,
        setPendingImageCursorPosition: mockSetPendingImageCursorPosition,
        onShowUpgradeModal: mockOnShowUpgradeModal,
      })
    );

    // Should complete without errors
    unmount();
  });

  it("should handle image paste and call setPendingImageData", async () => {
    // Mock FileReader
    const mockDataUrl = "data:image/png;base64,abc123";
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onload: null as ((e: any) => void) | null,
      result: mockDataUrl,
    };
    jest.spyOn(global, "FileReader").mockImplementation(
      () => mockFileReader as any
    );

    renderHook(() =>
      useImagePasteHandler({
        containerRef: mockContainerRef,
        editorRef: mockEditorRef,
        activeTab: createMockTab(),
        setPendingImageData: mockSetPendingImageData,
        setPendingImageCursorPosition: mockSetPendingImageCursorPosition,
        onShowUpgradeModal: mockOnShowUpgradeModal,
      })
    );

    // Create a mock paste event with image data (using custom event for jsdom)
    const mockFile = new File(["image data"], "test.png", { type: "image/png" });
    const mockDataTransferItem: DataTransferItem = {
      kind: "file",
      type: "image/png",
      getAsFile: () => mockFile,
      getAsString: jest.fn(),
      webkitGetAsEntry: jest.fn(),
    };
    const mockDataTransfer = {
      items: [mockDataTransferItem],
    };

    // Create custom paste event (ClipboardEvent not available in jsdom)
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: mockDataTransfer,
      writable: false,
    });

    // Dispatch the paste event
    mockContainer.dispatchEvent(pasteEvent);

    // Verify FileReader was called
    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile);

    // Simulate FileReader onload
    mockFileReader.onload?.({ target: { result: mockDataUrl } });

    // Verify callbacks were called
    expect(mockSetPendingImageData).toHaveBeenCalledWith(mockDataUrl);
    expect(mockSetPendingImageCursorPosition).toHaveBeenCalledWith({
      lineNumber: 5,
      column: 10,
    });
    expect(mockOnShowUpgradeModal).toHaveBeenCalled();
  });

  it("should ignore non-image paste events", () => {
    renderHook(() =>
      useImagePasteHandler({
        containerRef: mockContainerRef,
        editorRef: mockEditorRef,
        activeTab: createMockTab(),
        setPendingImageData: mockSetPendingImageData,
        setPendingImageCursorPosition: mockSetPendingImageCursorPosition,
        onShowUpgradeModal: mockOnShowUpgradeModal,
      })
    );

    // Create a mock paste event with text data
    const mockDataTransferItem: DataTransferItem = {
      kind: "string",
      type: "text/plain",
      getAsFile: () => null,
      getAsString: jest.fn(),
      webkitGetAsEntry: jest.fn(),
    };
    const mockDataTransfer = {
      items: [mockDataTransferItem],
    };

    // Create custom paste event (ClipboardEvent not available in jsdom)
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: mockDataTransfer,
      writable: false,
    });

    mockContainer.dispatchEvent(pasteEvent);

    // Callbacks should not be called for text paste
    expect(mockSetPendingImageData).not.toHaveBeenCalled();
    expect(mockOnShowUpgradeModal).not.toHaveBeenCalled();
  });
});
