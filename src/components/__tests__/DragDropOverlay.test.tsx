import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import DragDropOverlay from "../DragDropOverlay";

const handleNewPopulatedTab = jest.fn();

jest.mock("../../stores", () => ({
  useRootStore: jest.fn(() => ({
    handleNewPopulatedTab,
  })),
}));

jest.mock("../../stores/splitViewStore", () => ({
  useSplitViewStore: jest.fn(() => ({
    splitView: {
      activeSide: "left",
    },
  })),
}));

jest.mock("../../stores/modalStore", () => ({
  useModalStore: jest.fn(() => ({
    isImportModalActive: false,
    isGlobalDragDropSuppressed: false,
  })),
}));

jest.mock("../../features/import-export/ImportExportService", () => ({
  ImportExportService: jest.fn().mockImplementation(() => ({
    importWorkspaces: jest.fn(),
  })),
}));

class MockFileReader {
  onload: ((event: { target: { result: string } }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;

  readAsText(_file: File) {
    this.onload?.({ target: { result: 'title = "demo"' } });
  }
}

Object.defineProperty(global, "FileReader", {
  writable: true,
  value: MockFileReader,
});

Object.defineProperty(globalThis, "crypto", {
  value: {
    randomUUID: jest.fn(() => "toml-tab-id"),
  },
});

describe("DragDropOverlay", () => {
  beforeEach(() => {
    handleNewPopulatedTab.mockReset();
  });

  it("resolves .toml files to the toml format id when dropped", async () => {
    render(<DragDropOverlay />);

    const file = new File(['title = "demo"'], "config.toml", {
      type: "text/plain",
    });
    const event = new Event("drop", { bubbles: true, cancelable: true });

    Object.defineProperty(event, "dataTransfer", {
      value: {
        items: [
          {
            kind: "file",
            webkitGetAsEntry: () => ({
              isFile: true,
              isDirectory: false,
              file: (successCallback: (value: File) => void) =>
                successCallback(file),
            }),
          },
        ],
      },
    });

    await act(async () => {
      document.dispatchEvent(event);
    });

    await waitFor(() => {
      expect(handleNewPopulatedTab).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "config",
          language: "toml",
          languageLocked: true,
        }),
        false,
      );
    });
  });
});
