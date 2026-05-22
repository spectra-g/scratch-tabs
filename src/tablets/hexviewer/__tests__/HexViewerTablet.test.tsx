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

  describe("undo/redo inputText sync", () => {
    it("undo restores inputText alongside bytesHex", () => {
      // "Heloo" with one edit: offset 3 changed from 0x6c ('l') to 0x6f ('o')
      const mockState = createMockState({
        inputFormat: "raw",
        inputText: "Heloo",
        bytesHex: "48656c6f6f",
        editHistory: [{ offset: 3, oldValue: 0x6c, newValue: 0x6f }],
        editHistoryIndex: 0,
      });
      render(HexViewerTablet.render(mockState, mockOnChange) as React.ReactElement);
      fireEvent.click(screen.getByTitle("Undo (Ctrl+Z)"));
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bytesHex: "48656c6c6f",
            inputText: "Hello",
          }),
        })
      );
    });

    it("redo re-applies inputText alongside bytesHex", () => {
      // "Hello" with one undone edit: offset 4 would change from 0x6f ('o') to 0x41 ('A')
      const mockState = createMockState({
        inputFormat: "raw",
        inputText: "Hello",
        bytesHex: "48656c6c6f",
        editHistory: [{ offset: 4, oldValue: 0x6f, newValue: 0x41 }],
        editHistoryIndex: -1,
      });
      render(HexViewerTablet.render(mockState, mockOnChange) as React.ReactElement);
      fireEvent.click(screen.getByTitle("Redo (Ctrl+Y)"));
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bytesHex: "48656c6c41",
            inputText: "HellA",
          }),
        })
      );
    });
  });

  describe("replace all", () => {
    it("syncs inputText with updated bytesHex", () => {
      const mockState = createMockState({
        inputFormat: "raw",
        inputText: "aaa",
        bytesHex: "616161",
        searchQuery: "a",
        searchType: "text",
        searchMatches: [0, 1, 2],
        replaceQuery: "b",
      });
      render(HexViewerTablet.render(mockState, mockOnChange) as React.ReactElement);
      fireEvent.click(screen.getByTitle("Toggle find & replace"));
      fireEvent.click(screen.getByText("Replace All"));
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bytesHex: "626262",
            inputText: "bbb",
          }),
        })
      );
    });

    it("skips overlapping matches to avoid buffer corruption", () => {
      // bytes: [0x61, 0x61, 0x61]; search [0x61, 0x61] matches at offsets 0 AND 1 (overlapping)
      // fix: only offset 0 is replaced → [0x58, 0x61]; bug: both replaced → [0x58, 0x58]
      const mockState = createMockState({
        inputFormat: "hex",
        inputText: "61 61 61",
        bytesHex: "616161",
        searchQuery: "6161",
        searchType: "hex",
        searchMatches: [0, 1],
        replaceQuery: "58",
      });
      render(HexViewerTablet.render(mockState, mockOnChange) as React.ReactElement);
      fireEvent.click(screen.getByTitle("Toggle find & replace"));
      fireEvent.click(screen.getByText("Replace All"));
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bytesHex: "5861",
          }),
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
