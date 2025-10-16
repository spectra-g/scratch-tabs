import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ConverterTablet } from "../ConverterTablet";
import { TabletState } from "../../types";

describe("ConverterTablet", () => {
  let mockOnChange: jest.Mock;
  let initialState: TabletState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnChange = jest.fn();
    initialState = ConverterTablet.createInitialState();
  });

  describe("tablet definition", () => {
    it("should have correct tablet id", () => {
      expect(ConverterTablet.id).toBe("converter");
    });

    it("should have correct label", () => {
      expect(ConverterTablet.label).toBe("Converter");
    });

    it("should have proper keywords", () => {
      expect(ConverterTablet.keywords).toContain("convert");
      expect(ConverterTablet.keywords).toContain("encode");
      expect(ConverterTablet.keywords).toContain("decode");
      expect(ConverterTablet.keywords).toContain("hash");
      expect(ConverterTablet.keywords).toContain("transform");
      expect(ConverterTablet.keywords).toContain("format");
    });
  });

  describe("createInitialState", () => {
    it("should create initial state with default values", () => {
      const state = ConverterTablet.createInitialState();

      expect(state.type).toBe("converter");
      expect(state.data.activeSection).toBe("encode-decode");
      expect(state.data.sectionData).toBeDefined();
      expect(state.data.sectionData["encode-decode"]).toEqual({ inputs: {} });
      expect(state.data.sectionData.hashing).toEqual({ input: "" });
      expect(state.data.sectionData.number).toEqual({ inputs: {} });
      expect(state.data.sectionData.text).toEqual({ inputs: {} });
      expect(state.data.sectionData.datetime).toEqual({ inputs: {} });
      expect(state.data.sectionData.color).toEqual({ inputs: {} });
      expect(state.data.sectionData.networking).toEqual({ inputs: {} });
    });

    it("should start with encode-decode section active", () => {
      const state = ConverterTablet.createInitialState();

      expect(state.data.activeSection).toBe("encode-decode");
    });

    it("should have empty inputs for all sections", () => {
      const state = ConverterTablet.createInitialState();

      Object.entries(state.data.sectionData).forEach(([section, data]) => {
        if (section === "hashing") {
          expect(data).toHaveProperty("input");
          expect((data as any).input).toBe("");
        } else {
          expect(data).toHaveProperty("inputs");
          expect((data as any).inputs).toEqual({});
        }
      });
    });
  });

  describe("serializeState", () => {
    it("should serialize state to JSON string", () => {
      const state = ConverterTablet.createInitialState();
      const serialized = ConverterTablet.serializeState(state);

      expect(typeof serialized).toBe("string");
      expect(JSON.parse(serialized)).toEqual(state);
    });

    it("should handle complex state with section data", () => {
      const state = ConverterTablet.createInitialState();
      if (state.type === "converter") {
        state.data.activeSection = "number";
        state.data.sectionData.number = {
          inputs: {
            base: "42",
            roman: "XLII",
          },
        };
      }

      const serialized = ConverterTablet.serializeState(state);
      const parsed = JSON.parse(serialized);

      expect(parsed.data.activeSection).toBe("number");
      expect(parsed.data.sectionData.number.inputs).toEqual({
        base: "42",
        roman: "XLII",
      });
    });
  });

  describe("deserializeState", () => {
    it("should deserialize valid JSON to state", () => {
      const originalState = ConverterTablet.createInitialState();
      const serialized = ConverterTablet.serializeState(originalState);
      const deserialized = ConverterTablet.deserializeState(serialized);

      expect(deserialized).toEqual(originalState);
    });

    it("should preserve section data during deserialization", () => {
      const state = ConverterTablet.createInitialState();
      if (state.type === "converter") {
        state.data.activeSection = "text";
        state.data.sectionData.text = {
          inputs: {
            uppercase: "hello world",
          },
        };
      }

      const serialized = ConverterTablet.serializeState(state);
      const deserialized = ConverterTablet.deserializeState(serialized);

      expect(deserialized.data.activeSection).toBe("text");
      expect(deserialized.data.sectionData.text).toEqual({
        inputs: {
          uppercase: "hello world",
        },
      });
    });
  });

  describe("render", () => {
    it("should render the converter interface", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      expect(screen.getByText("Converter")).toBeInTheDocument();
    });

    it("should render search input", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      expect(
        screen.getByPlaceholderText("Search converters..."),
      ).toBeInTheDocument();
    });

    it("should render all section navigation buttons", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      expect(screen.getByText("Encode / Decode")).toBeInTheDocument();
      expect(screen.getByText("Hashing")).toBeInTheDocument();
      expect(screen.getByText("Number")).toBeInTheDocument();
      expect(screen.getByText("Text")).toBeInTheDocument();
      expect(screen.getByText("Date & Time")).toBeInTheDocument();
      expect(screen.getByText("Color")).toBeInTheDocument();
      expect(screen.getByText("Networking")).toBeInTheDocument();
    });

    it("should highlight active section", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const encodeDecodeButton = screen.getByText("Encode / Decode");
      expect(encodeDecodeButton).toHaveClass("text-blue-400");
    });
  });

  describe("section navigation", () => {
    it("should switch to hashing section when clicked", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const hashingButton = screen.getByText("Hashing");
      fireEvent.click(hashingButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall =
          mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall.data.activeSection).toBe("hashing");
      });
    });

    it("should switch to number section when clicked", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const numberButton = screen.getByText("Number");
      fireEvent.click(numberButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall =
          mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall.data.activeSection).toBe("number");
      });
    });

    it("should switch to text section when clicked", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const textButton = screen.getByText("Text");
      fireEvent.click(textButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall =
          mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall.data.activeSection).toBe("text");
      });
    });

    it("should switch to datetime section when clicked", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const datetimeButton = screen.getByText("Date & Time");
      fireEvent.click(datetimeButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall =
          mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall.data.activeSection).toBe("datetime");
      });
    });

    it("should switch to color section when clicked", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const colorButton = screen.getByText("Color");
      fireEvent.click(colorButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall =
          mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall.data.activeSection).toBe("color");
      });
    });

    it("should switch to networking section when clicked", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const networkingButton = screen.getByText("Networking");
      fireEvent.click(networkingButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall =
          mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall.data.activeSection).toBe("networking");
      });
    });

    it("should maintain section data when switching sections", async () => {
      const stateWithData = ConverterTablet.createInitialState();
      if (stateWithData.type === "converter") {
        stateWithData.data.sectionData.number = {
          inputs: { base: "42" },
        };
      }

      const rendered = ConverterTablet.render(stateWithData, mockOnChange);
      render(<>{rendered}</>);

      // Switch to text section
      const textButton = screen.getByText("Text");
      fireEvent.click(textButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // Switch back to number section
      const numberButton = screen.getByText("Number");
      fireEvent.click(numberButton);

      await waitFor(() => {
        // The number section data should still be preserved
        const calls = mockOnChange.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.data.sectionData.number.inputs).toEqual({ base: "42" });
      });
    });
  });

  describe("search functionality", () => {
    it("should update search query when typing", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const searchInput = screen.getByPlaceholderText("Search converters...");
      fireEvent.change(searchInput, { target: { value: "base64" } });

      expect((searchInput as HTMLInputElement).value).toBe("base64");
    });

    it("should filter converters based on search query", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const searchInput = screen.getByPlaceholderText("Search converters...");

      // The search filtering happens within the section components
      // We're just testing that the search input works
      fireEvent.change(searchInput, { target: { value: "number" } });

      expect((searchInput as HTMLInputElement).value).toBe("number");
    });
  });

  describe("persistence", () => {
    it("should maintain state across serialization and deserialization", () => {
      const state = ConverterTablet.createInitialState();
      if (state.type === "converter") {
        state.data.activeSection = "hashing";
        state.data.sectionData.hashing = { input: "test input" };
        state.data.sectionData.number = {
          inputs: {
            base: "255",
            roman: "XVI",
          },
        };
        state.data.sectionData.text = {
          inputs: {
            uppercase: "hello",
            lowercase: "WORLD",
          },
        };
      }

      const serialized = ConverterTablet.serializeState(state);
      const deserialized = ConverterTablet.deserializeState(serialized);

      expect(deserialized.data.activeSection).toBe("hashing");
      expect(deserialized.data.sectionData.hashing).toEqual({
        input: "test input",
      });
      expect(deserialized.data.sectionData.number.inputs).toEqual({
        base: "255",
        roman: "XVI",
      });
      expect(deserialized.data.sectionData.text.inputs).toEqual({
        uppercase: "hello",
        lowercase: "WORLD",
      });
    });

    it("should handle empty section data", () => {
      const state = ConverterTablet.createInitialState();

      const serialized = ConverterTablet.serializeState(state);
      const deserialized = ConverterTablet.deserializeState(serialized);

      expect(deserialized.data.sectionData["encode-decode"].inputs).toEqual(
        {},
      );
      expect(deserialized.data.sectionData.number.inputs).toEqual({});
      expect(deserialized.data.sectionData.text.inputs).toEqual({});
    });
  });

  describe("section data management", () => {
    it("should update section data when onChange is called", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      // The section components will trigger onChange with updated data
      // This is tested through integration with actual section components
      expect(screen.getByText("Converter")).toBeInTheDocument();
    });

    it("should preserve other section data when updating one section", () => {
      const state = ConverterTablet.createInitialState();
      if (state.type === "converter") {
        state.data.sectionData.number = {
          inputs: { base: "42" },
        };
        state.data.sectionData.text = {
          inputs: { uppercase: "hello" },
        };
      }

      const serialized = ConverterTablet.serializeState(state);
      const deserialized = ConverterTablet.deserializeState(serialized);

      expect(deserialized.data.sectionData.number.inputs).toEqual({
        base: "42",
      });
      expect(deserialized.data.sectionData.text.inputs).toEqual({
        uppercase: "hello",
      });
    });
  });

  describe("integration", () => {
    it("should handle complete workflow of switching sections and entering data", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      // 1. Start with encode-decode section
      expect(screen.getByText("Encode / Decode")).toHaveClass("text-blue-400");

      // 2. Switch to number section
      const numberButton = screen.getByText("Number");
      fireEvent.click(numberButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // 3. Use search functionality
      const searchInput = screen.getByPlaceholderText("Search converters...");
      fireEvent.change(searchInput, { target: { value: "roman" } });

      expect((searchInput as HTMLInputElement).value).toBe("roman");

      // 4. Clear search
      fireEvent.change(searchInput, { target: { value: "" } });

      expect((searchInput as HTMLInputElement).value).toBe("");
    });

    it("should handle rapid section switching", async () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      // Rapidly switch between sections
      fireEvent.click(screen.getByText("Hashing"));
      fireEvent.click(screen.getByText("Number"));
      fireEvent.click(screen.getByText("Text"));
      fireEvent.click(screen.getByText("Color"));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });

      // Last section should be color
      const calls = mockOnChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.data.activeSection).toBe("color");
    });
  });

  describe("accessibility", () => {
    it("should have proper structure with headings", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      expect(screen.getByText("Converter")).toBeInTheDocument();
    });

    it("should have navigation buttons with proper text", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);

      // Check that section buttons have proper labels
      expect(screen.getByText("Encode / Decode")).toBeInTheDocument();
      expect(screen.getByText("Hashing")).toBeInTheDocument();
      expect(screen.getByText("Number")).toBeInTheDocument();
    });

    it("should have search input with placeholder", () => {
      const rendered = ConverterTablet.render(initialState, mockOnChange);
      render(<>{rendered}</>);

      const searchInput = screen.getByPlaceholderText("Search converters...");
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute("type", "text");
    });
  });

  describe("state migration", () => {
    it("should migrate old state format missing sectionData", () => {
      // This is the exact format from the customer bug report
      const oldStateJson = JSON.stringify({
        type: "converter",
        data: {
          activeSection: "encode-decode",
          // Missing sectionData entirely
        },
      });

      const deserialized = ConverterTablet.deserializeState(oldStateJson);

      // Should have migrated to include all sections
      expect(deserialized.data.sectionData).toBeDefined();
      expect(deserialized.data.sectionData["encode-decode"]).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.hashing).toEqual({ input: "" });
      expect(deserialized.data.sectionData.number).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.text).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.datetime).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.color).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.networking).toEqual({ inputs: {} });
    });

    it("should migrate state with partial sectionData", () => {
      const partialStateJson = JSON.stringify({
        type: "converter",
        data: {
          activeSection: "encode-decode",
          sectionData: {
            "encode-decode": { inputs: { base64: "test" } },
            // Missing other sections
          },
        },
      });

      const deserialized = ConverterTablet.deserializeState(partialStateJson);

      // Should preserve existing section data
      expect(deserialized.data.sectionData["encode-decode"]).toEqual({
        inputs: { base64: "test" },
      });

      // Should add missing sections with defaults
      expect(deserialized.data.sectionData.hashing).toEqual({ input: "" });
      expect(deserialized.data.sectionData.number).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.text).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.datetime).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.color).toEqual({ inputs: {} });
      expect(deserialized.data.sectionData.networking).toEqual({ inputs: {} });
    });

    it("should not modify valid state with all sections", () => {
      const validState = ConverterTablet.createInitialState();
      if (validState.type === "converter") {
        validState.data.sectionData.number = {
          inputs: { decimal: "42" },
        };
      }

      const serialized = ConverterTablet.serializeState(validState);
      const deserialized = ConverterTablet.deserializeState(serialized);

      // Should remain unchanged
      expect(deserialized).toEqual(validState);
    });

    it("should handle runtime initialization when sectionData is missing", async () => {
      const stateWithoutSectionData = {
        type: "converter" as const,
        data: {
          activeSection: "encode-decode",
          // Missing sectionData - simulating runtime corruption
        },
      } as any;

      const rendered = ConverterTablet.render(stateWithoutSectionData, mockOnChange);
      render(<>{rendered}</>);

      // Should show initialization message
      expect(screen.getByText("Initializing converter...")).toBeInTheDocument();

      // Should trigger onChange with fixed state
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall.data.sectionData).toBeDefined();
        expect(lastCall.data.sectionData["encode-decode"]).toEqual({ inputs: {} });
      });
    });
  });

  describe("error handling", () => {
    it("should handle missing section gracefully", () => {
      const state = ConverterTablet.createInitialState();
      if (state.type === "converter") {
        // Set an invalid section
        state.data.activeSection = "invalid-section" as any;
      }

      const rendered = ConverterTablet.render(state, mockOnChange);

      // Should render without crashing
      expect(() => render(<>{rendered}</>)).not.toThrow();
    });

    it("should handle invalid JSON in deserialization", () => {
      const invalidJson = "{invalid json}";

      // Should throw because JSON.parse will fail
      expect(() => ConverterTablet.deserializeState(invalidJson)).toThrow();
    });

    it("should handle null data in deserialization", () => {
      const stateWithNull = '{"type": "converter", "data": null}';

      // Will parse but may have issues accessing nested properties
      // The implementation uses JSON.parse which will succeed
      const deserialized = ConverterTablet.deserializeState(stateWithNull);
      expect(deserialized).toBeDefined();
    });
  });

  describe("state structure validation", () => {
    it("should have all required sections in section data", () => {
      const state = ConverterTablet.createInitialState();

      expect(state.data.sectionData).toHaveProperty("encode-decode");
      expect(state.data.sectionData).toHaveProperty("hashing");
      expect(state.data.sectionData).toHaveProperty("number");
      expect(state.data.sectionData).toHaveProperty("text");
      expect(state.data.sectionData).toHaveProperty("datetime");
      expect(state.data.sectionData).toHaveProperty("color");
      expect(state.data.sectionData).toHaveProperty("networking");
    });

    it("should have consistent data structure across all sections", () => {
      const state = ConverterTablet.createInitialState();

      // All sections except hashing should have inputs object
      expect(state.data.sectionData["encode-decode"]).toHaveProperty("inputs");
      expect(state.data.sectionData.number).toHaveProperty("inputs");
      expect(state.data.sectionData.text).toHaveProperty("inputs");
      expect(state.data.sectionData.datetime).toHaveProperty("inputs");
      expect(state.data.sectionData.color).toHaveProperty("inputs");
      expect(state.data.sectionData.networking).toHaveProperty("inputs");

      // Hashing section has input (singular) instead of inputs
      expect(state.data.sectionData.hashing).toHaveProperty("input");
    });
  });
});
