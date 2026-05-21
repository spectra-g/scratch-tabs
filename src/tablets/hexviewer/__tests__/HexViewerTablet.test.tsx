import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HexViewerTablet } from "../HexViewerTablet";
import { HexViewerTabletState } from "../types";

jest.mock("../../../services/tabletActionService", () => ({
  tabletActionService: {
    handleAction: jest.fn().mockResolvedValue(undefined),
  },
}));

describe("HexViewerTablet", () => {
  const createMockState = (overrides: Partial<HexViewerTabletState["data"]> = {}): HexViewerTabletState => ({
    type: "hexviewer",
    data: {
      inputFormat: "raw",
      inputText: "",
      bytesHex: "",
      fileInfo: null,
      detectedFileType: null,
      bytesPerRow: 16,
      pageSize: 512,
      currentPage: 0,
      selectedOffset: null,
      selectionStart: null,
      selectionEnd: null,
      hoveredOffset: null,
      searchQuery: "",
      searchType: "text",
      searchMatches: [],
      currentSearchMatchIndex: 0,
      replaceQuery: "",
      endianness: "le",
      activeSidebarTab: "inspector",
      editHistory: [],
      editHistoryIndex: -1,
      ...overrides,
    },
  });

  const mockOnChange = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  describe("rendering", () => {
    it("renders empty state when no data is loaded", () => {
      render(HexViewerTablet.render(createMockState(), mockOnChange) as React.ReactElement);
      expect(screen.getByText("Ready for binary input")).toBeInTheDocument();
    });

    it("renders file dropzone when input format is file", () => {
      render(HexViewerTablet.render(createMockState({ inputFormat: "file" }), mockOnChange) as React.ReactElement);
      expect(screen.getByText("Upload or drag binary file")).toBeInTheDocument();
    });

    it("renders hex grid and sidebar when data is present", () => {
      render(
        HexViewerTablet.render(
          createMockState({ inputText: "Hello", bytesHex: "48656c6c6f" }),
          mockOnChange
        ) as React.ReactElement
      );
      expect(screen.getByText(/Buffer/)).toBeInTheDocument();
      expect(screen.getByText("Selection")).toBeInTheDocument();
      expect(screen.getByText("Shannon Entropy")).toBeInTheDocument();
    });
  });

  describe("data display", () => {
    it("displays correct hex offsets and byte values", () => {
      render(
        HexViewerTablet.render(
          createMockState({ inputText: "Helo", bytesHex: "48656c6f" }),
          mockOnChange
        ) as React.ReactElement
      );
      expect(screen.getByText("00000000")).toBeInTheDocument();
      expect(screen.getByText("48")).toBeInTheDocument();
      expect(screen.getByText("65")).toBeInTheDocument();
    });

    it("shows file type banner when detectedFileType is set", () => {
      render(
        HexViewerTablet.render(
          createMockState({
            bytesHex: "89504e47",
            detectedFileType: { type: "PNG Image", mime: "image/png", extension: "png" },
          }),
          mockOnChange
        ) as React.ReactElement
      );
      expect(screen.getByText("PNG Image")).toBeInTheDocument();
    });
  });

  describe("sidebar inspector", () => {
    it("decodes byte values at the selected offset", () => {
      render(
        HexViewerTablet.render(
          createMockState({ inputText: "A", bytesHex: "41", selectedOffset: 0 }),
          mockOnChange
        ) as React.ReactElement
      );
      expect(screen.getByText("Binary (8-bit)")).toBeInTheDocument();
      expect(screen.getByText("01000001")).toBeInTheDocument();
      expect(screen.getByText("'A'")).toBeInTheDocument();
    });

    it("switches endianness when BE button is clicked", () => {
      render(
        HexViewerTablet.render(
          createMockState({ inputText: "\x01\x02", bytesHex: "0102", selectedOffset: 0, endianness: "le" }),
          mockOnChange
        ) as React.ReactElement
      );
      fireEvent.click(screen.getByText("BE"));
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ endianness: "be" }) })
      );
    });
  });

  describe("sidebar tabs", () => {
    it("renders sidebar tab buttons", () => {
      render(
        HexViewerTablet.render(createMockState({ bytesHex: "48656c6c6f" }), mockOnChange) as React.ReactElement
      );
      expect(screen.getByText("Inspect")).toBeInTheDocument();
      expect(screen.getByText("Strings")).toBeInTheDocument();
      expect(screen.getByText("Histogram")).toBeInTheDocument();
      expect(screen.getByText("Checksums")).toBeInTheDocument();
    });

    it("switches sidebar tab on click", () => {
      render(
        HexViewerTablet.render(createMockState(), mockOnChange) as React.ReactElement
      );
      fireEvent.click(screen.getByText("Strings"));
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ activeSidebarTab: "strings" }) })
      );
    });
  });

  describe("Shannon entropy", () => {
    it("shows 0.0000 entropy for uniform zero bytes", () => {
      render(
        HexViewerTablet.render(
          createMockState({ bytesHex: "0000000000000000" }),
          mockOnChange
        ) as React.ReactElement
      );
      expect(screen.getByText("0.0000")).toBeInTheDocument();
      expect(screen.getByText("Low Entropy (Structured)")).toBeInTheDocument();
    });
  });

  describe("search", () => {
    it("dispatches search matches for a text query", () => {
      render(
        HexViewerTablet.render(
          createMockState({
            inputText: "Hello world!",
            bytesHex: "48656c6c6f20776f726c6421",
            searchQuery: "world",
            searchType: "text",
          }),
          mockOnChange
        ) as React.ReactElement
      );
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ searchMatches: [6] }),
        })
      );
    });
  });

  describe("createInitialState", () => {
    it("creates state with all required fields", () => {
      const state = HexViewerTablet.createInitialState();
      expect(state.type).toBe("hexviewer");
      expect(state.data.replaceQuery).toBe("");
      expect(state.data.activeSidebarTab).toBe("inspector");
      expect(state.data.editHistory).toEqual([]);
      expect(state.data.editHistoryIndex).toBe(-1);
      expect(state.data.detectedFileType).toBeNull();
    });
  });

  describe("deserializeState", () => {
    it("migrates old state missing new fields", () => {
      const oldState = {
        type: "hexviewer",
        data: {
          inputFormat: "raw", inputText: "", bytesHex: "", fileInfo: null,
          bytesPerRow: 16, pageSize: 512, currentPage: 0,
          selectedOffset: null, selectionStart: null, selectionEnd: null, hoveredOffset: null,
          searchQuery: "", searchType: "text", searchMatches: [], currentSearchMatchIndex: 0,
          endianness: "le",
        },
      };
      const state = HexViewerTablet.deserializeState(JSON.stringify(oldState)) as HexViewerTabletState;
      expect(state.data.replaceQuery).toBe("");
      expect(state.data.activeSidebarTab).toBe("inspector");
      expect(state.data.editHistory).toEqual([]);
    });

    it("falls back to initial state for invalid JSON", () => {
      const state = HexViewerTablet.deserializeState("not-json");
      expect(state.type).toBe("hexviewer");
    });
  });
});
