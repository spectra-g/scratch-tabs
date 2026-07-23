import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DragDropOverlay from "../DragDropOverlay";

const mockHandleNewPopulatedTab = jest.fn();

jest.mock("../../stores", () => ({
  useRootStore: () => ({ handleNewPopulatedTab: mockHandleNewPopulatedTab }),
}));

jest.mock("../../stores/splitViewStore", () => ({
  useSplitViewStore: () => ({ splitView: null }),
}));

jest.mock("../../stores/modalStore", () => ({
  useModalStore: () => ({
    isImportModalActive: false,
    isGlobalDragDropSuppressed: false,
  }),
}));

jest.mock("../../formats", () => ({
  formatRegistry: { getAll: () => [] },
}));

jest.mock("../../features/import-export/ImportExportService", () => ({
  ImportExportService: jest.fn(),
}));

const mockReadAsText = jest.fn();
const mockReadAsDataURL = jest.fn();

class MockFileReader {
  result: string | null = null;
  onload: ((e: { target: { result: string } }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  readAsText(file: File) {
    mockReadAsText(file);
    Promise.resolve().then(() => {
      this.result = "plain text content";
      this.onload?.({ target: { result: this.result! } });
    });
  }

  readAsDataURL(file: File) {
    mockReadAsDataURL(file);
    Promise.resolve().then(() => {
      this.result = `data:${file.type};base64,abc123`;
      this.onload?.({ target: { result: this.result! } });
    });
  }
}

beforeAll(() => {
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: MockFileReader,
  });
  // jsdom defines crypto but omits randomUUID — polyfill it for the component
  if (!global.crypto.randomUUID) {
    Object.defineProperty(global.crypto, "randomUUID", {
      value: () => "test-uuid",
      writable: true,
      configurable: true,
    });
  }
});

const dropFile = (file: File) => {
  const entry = {
    isFile: true,
    isDirectory: false,
    name: file.name,
    fullPath: `/${file.name}`,
    file: (success: (f: File) => void) => success(file),
    createReader: () => ({ readEntries: () => {} }),
  };

  const event = new Event("drop");
  Object.defineProperty(event, "dataTransfer", {
    value: {
      items: [{ kind: "file", webkitGetAsEntry: () => entry }],
    },
  });

  document.dispatchEvent(event);
};

describe("DragDropOverlay file reading", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reads image files as a data URL", async () => {
    render(<DragDropOverlay />);

    const file = new File(["(binary)"], "photo.png", { type: "image/png" });
    await act(async () => {
      dropFile(file);
    });

    await waitFor(() => expect(mockHandleNewPopulatedTab).toHaveBeenCalled());

    expect(mockReadAsDataURL).toHaveBeenCalledWith(file);
    expect(mockReadAsText).not.toHaveBeenCalled();
    expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
      expect.objectContaining({ content: "data:image/png;base64,abc123" }),
      false,
    );
  });

  it("reads non-image files as text", async () => {
    render(<DragDropOverlay />);

    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await act(async () => {
      dropFile(file);
    });

    await waitFor(() => expect(mockHandleNewPopulatedTab).toHaveBeenCalled());

    expect(mockReadAsText).toHaveBeenCalledWith(file);
    expect(mockReadAsDataURL).not.toHaveBeenCalled();
    expect(mockHandleNewPopulatedTab).toHaveBeenCalledWith(
      expect.objectContaining({ content: "plain text content" }),
      false,
    );
  });

  it("ignores drops whose event path contains a Canvas drop zone", async () => {
    render(<DragDropOverlay />);
    const dropZone = document.createElement("div");
    dropZone.dataset.canvasDropZone = "true";
    document.body.appendChild(dropZone);
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const event = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", {
      value: {
        items: [{ kind: "file", webkitGetAsEntry: () => null }],
        files: [file],
      },
    });

    await act(async () => {
      dropZone.dispatchEvent(event);
      await Promise.resolve();
    });

    expect(mockHandleNewPopulatedTab).not.toHaveBeenCalled();
    expect(mockReadAsText).not.toHaveBeenCalled();
    dropZone.remove();
  });
});
