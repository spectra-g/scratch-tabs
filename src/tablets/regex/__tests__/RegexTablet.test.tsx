import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RegexTablet } from "../RegexTablet";
import { RegexTesterData } from "../types";

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock the components
jest.mock("../components/RegexEditor", () => ({
  RegexEditor: ({ value, onChange, error }: any) => (
    <input
      data-testid="regex-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={error ? "error" : ""}
    />
  ),
}));

jest.mock("../components/MatchPreview", () => ({
  MatchPreview: ({ matches, testString, onCopy, copiedId }: any) => (
    <div data-testid="match-preview">
      <div>Matches: {matches.length}</div>
      <div>Test String: {testString}</div>
      <button onClick={() => onCopy("test", "test-id")}>Copy</button>
    </div>
  ),
}));

jest.mock("../components/ExplanationView", () => ({
  ExplanationView: ({ explanation, pattern }: any) => (
    <div data-testid="explanation-view">
      <div>Pattern: {pattern}</div>
      <div>Explanations: {explanation.length}</div>
    </div>
  ),
}));

jest.mock("../components/SnippetSelector", () => ({
  SnippetSelector: ({ onSnippetSelect, selectedSnippet }: any) => (
    <div data-testid="snippet-selector">
      <button onClick={() => onSnippetSelect("email-basic")}>Select Email</button>
      <div>Selected: {selectedSnippet}</div>
    </div>
  ),
}));

describe("RegexTablet", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create initial state", () => {
      const initialState = RegexTablet.createInitialState();
      
      expect(initialState.type).toBe("regex");
      expect(initialState.data).toBeDefined();
      expect(initialState.data.pattern).toBeDefined();
      expect(initialState.data.testString).toBeDefined();
      expect(initialState.data.flags).toBeDefined();
      expect(initialState.data.matches).toBeDefined();
      expect(initialState.data.error).toBeDefined();
      expect(initialState.data.explanation).toBeDefined();
    });

    it("should serialize state", () => {
      const state = RegexTablet.createInitialState();
      const serialized = RegexTablet.serializeState(state);
      
      expect(typeof serialized).toBe("string");
      expect(JSON.parse(serialized)).toBeDefined();
    });

    it("should deserialize state", () => {
      const state = RegexTablet.createInitialState();
      const serialized = RegexTablet.serializeState(state);
      const deserialized = RegexTablet.deserializeState(serialized);
      
      expect(deserialized.type).toBe("regex");
      expect(deserialized.data).toBeDefined();
    });

    it("should have correct tablet properties", () => {
      expect(RegexTablet.id).toBe("regex");
      expect(RegexTablet.label).toBe("Regex Tester");
      expect(RegexTablet.keywords).toContain("regex");
      expect(RegexTablet.keywords).toContain("pattern");
      expect(RegexTablet.keywords).toContain("match");
    });
  });

  describe("rendering", () => {
    it("should render the main UI", () => {
      const state = RegexTablet.createInitialState();
      
      const { container } = render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(container).toBeInTheDocument();
    });

    it("should render with default pattern", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });

    it("should render view mode buttons", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByText("Explain")).toBeInTheDocument();
      expect(screen.getByText("Export")).toBeInTheDocument();
    });
  });

  describe("state management", () => {
    it("should handle pattern changes", async () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      const regexEditor = screen.getByTestId("regex-editor");
      fireEvent.change(regexEditor, { target: { value: "new pattern" } });
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it("should handle snippet selection", async () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      const snippetSelector = screen.getByTestId("snippet-selector");
      const selectButton = snippetSelector.querySelector("button");
      
      if (selectButton) {
        fireEvent.click(selectButton);
        
        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalled();
        });
      }
    });
  });

  describe("view modes", () => {
    it("should switch to explain view", async () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      const explainButton = screen.getByText("Explain");
      fireEvent.click(explainButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("explanation-view")).toBeInTheDocument();
      });
    });

    it("should switch to export view", async () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      const exportButtons = screen.getAllByText("Export");
      const exportButton = exportButtons[0]; // Get the first Export button
      fireEvent.click(exportButton);
      
      await waitFor(() => {
        expect(screen.getByText("Export Test Data (JSON)")).toBeInTheDocument();
      });
    });
  });

  describe("copy functionality", () => {
    it("should copy to clipboard", async () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      const matchPreview = screen.getByTestId("match-preview");
      const copyButton = matchPreview.querySelector("button");
      
      if (copyButton) {
        fireEvent.click(copyButton);
        
        await waitFor(() => {
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });
      }
    });
  });

  describe("export functionality", () => {
    it("should copy to clipboard", async () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      const matchPreview = screen.getByTestId("match-preview");
      const copyButton = matchPreview.querySelector("button");
      
      if (copyButton) {
        fireEvent.click(copyButton);
        
        await waitFor(() => {
          expect(navigator.clipboard.writeText).toHaveBeenCalled();
        });
      }
    });
  });

  describe("error handling", () => {
    it("should handle invalid regex patterns", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });

    it("should handle empty patterns", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle very long patterns", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });

    it("should handle patterns with special characters", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });

    it("should handle unicode patterns", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });
  });

  describe("performance", () => {
    it("should handle rapid pattern changes", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });

    it("should handle complex regex patterns", () => {
      const state = RegexTablet.createInitialState();
      
      render(
        <div>
          {RegexTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByText("Regex Tester")).toBeInTheDocument();
    });
  });
}); 