import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { HexViewerTablet } from "../HexViewerTablet";
import { HexViewerTabletState } from "../types";

// Mock the tablet action service
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
      endianness: "le",
      ...overrides,
    },
  });

  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render empty state when no data is loaded", () => {
      const state = createMockState();
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      expect(screen.getByText("Ready for binary input")).toBeInTheDocument();
      expect(screen.getByText("Select input format 'RAW' above and type or paste content in the Left Editor to view visual byte layout.")).toBeInTheDocument();
    });

    it("should render hex grid and inspector when raw data is present", () => {
      const state = createMockState({
        inputText: "Hello",
        bytesHex: "48656c6c6f", // Hex representation for "Hello"
      });
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      expect(screen.getByText("Buffer payload (5 bytes)")).toBeInTheDocument();
      expect(screen.getByText("Selection Summary")).toBeInTheDocument();
      expect(screen.getByText("Shannon Entropy")).toBeInTheDocument();
      expect(screen.getByText("Byte Distribution")).toBeInTheDocument();
    });

    it("should render file dropzone when input format is file", () => {
      const state = createMockState({
        inputFormat: "file",
      });
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      expect(screen.getByText("Upload or drag binary file")).toBeInTheDocument();
    });
  });

  describe("data conversion and inputs", () => {
    it("should display correct offsets and hex bytes", () => {
      const state = createMockState({
        inputText: "Helo",
        bytesHex: "48656c6f", // H e l o
      });
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      // Verify Hex address starts at 00000000
      expect(screen.getByText("00000000")).toBeInTheDocument();
      
      // Verify hex byte representations in upper-case
      expect(screen.getByText("48")).toBeInTheDocument(); // 'H'
      expect(screen.getByText("65")).toBeInTheDocument(); // 'e'
      expect(screen.getByText("6C")).toHaveTextContent("6C"); // 'l'
      expect(screen.getByText("6F")).toBeInTheDocument(); // 'o'
    });
  });

  describe("sidebar inspector and decoding", () => {
    it("should decode byte values at selected offset", () => {
      const state = createMockState({
        inputText: "A",
        bytesHex: "41", // 'A' (65 in dec, 01000001 in bin)
        selectedOffset: 0,
      });
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      expect(screen.getByText("Binary (8-bit)")).toBeInTheDocument();
      expect(screen.getByText("01000001")).toBeInTheDocument(); // Decoded 65 as binary string
      expect(screen.getByText("Uint8 (Unsigned)")).toBeInTheDocument();
      expect(screen.getAllByText("65").length).toBeGreaterThan(0); // Decoded dec
      expect(screen.getByText("'A'")).toBeInTheDocument(); // Decoded ASCII character
    });

    it("should swap endianness representation on LE/BE toggle click", () => {
      const state = createMockState({
        // Byte 0x01, 0x02 at offset 0
        inputText: "\x01\x02",
        bytesHex: "0102",
        selectedOffset: 0,
        endianness: "le",
      });
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      // LE uint16 for 0x01, 0x02 is 0x0201 = 513
      expect(screen.getByText("Int16")).toBeInTheDocument();
      expect(screen.getAllByText("513").length).toBeGreaterThan(0);

      // Click BE button
      const beButton = screen.getByText("BE");
      fireEvent.click(beButton);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endianness: "be",
          }),
        })
      );
    });
  });

  describe("Shannon Entropy calculations", () => {
    it("should calculate entropy correctly", () => {
      // 8 zero bytes has an entropy of 0.0 (totally predictable)
      const state = createMockState({
        inputText: "\x00\x00\x00\x00\x00\x00\x00\x00",
        bytesHex: "0000000000000000",
      });
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      expect(screen.getByText("0.0000")).toBeInTheDocument();
      expect(screen.getByText("Low Entropy (Structured)")).toBeInTheDocument();
    });
  });

  describe("search functionality", () => {
    it("should locate matching text query within bytes", () => {
      const state = createMockState({
        inputText: "Hello world!",
        bytesHex: "48656c6c6f20776f726c6421",
        searchQuery: "world",
        searchType: "text",
      });
      const element = HexViewerTablet.render(state, mockOnChange);
      render(element as React.ReactElement);

      // Match 'world' at index 6
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            searchMatches: [6],
          }),
        })
      );
    });
  });
});
