import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import JsonTreeView from "../JsonTreeView";

// Mock dependencies
jest.mock("../../../../../hooks/useDebounce", () => ({
  useDebounce: (value: any) => value,
}));

jest.mock("../../../../../stores", () => ({
  useRootStore: () => ({
    addBackgroundTab: jest.fn(),
  }),
}));

jest.mock("../../../../../stores/workspaceStore", () => ({
  useWorkspaceStore: () => ({
    activeWorkspaceId: "test-workspace",
  }),
}));

jest.mock("../../../../../stores/splitViewStore", () => ({
  useSplitViewStore: () => ({
    splitView: { isSplit: false },
  }),
}));

jest.mock("../../../../../languages", () => ({
  detectLanguage: () => "json",
}));

// Mock react-window with forwardRef and scrollToItem method
jest.mock("react-window", () => ({
  FixedSizeList: React.forwardRef(({ children, itemCount }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollToItem: jest.fn(),
    }));
    return (
      <div data-testid="virtual-list">
        {Array.from({ length: itemCount }, (_, index) => (
          <div key={index}>{children({ index, style: {} })}</div>
        ))}
      </div>
    );
  }),
}));

// Mock clipboard API with error handling
const mockClipboard = {
  writeText: jest.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe("JsonTreeView - Error Handling and Edge Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
  });

  describe("JSON Parsing Errors", () => {
    it("should handle malformed JSON with missing quotes", () => {
      render(<JsonTreeView jsonString='{name: "test"}' />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
      expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    });

    it("should handle malformed JSON with extra commas", () => {
      render(<JsonTreeView jsonString='{"name": "test", "value": 123,}' />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
    });

    it("should handle malformed JSON with unclosed brackets", () => {
      render(<JsonTreeView jsonString='{"name": "test"' />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
    });

    it("should handle malformed JSON with unclosed quotes", () => {
      render(<JsonTreeView jsonString='{"name": "test}' />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
    });

    it("should handle malformed JSON with invalid escape sequences", () => {
      // Use a truly malformed JSON string - unterminated escape sequence
      render(<JsonTreeView jsonString='{"name": "test\\' />);
      
      // Use getAllByText and check the first match to handle multiple matching elements
      expect(screen.getAllByText(/Error Parsing JSON|Invalid JSON/)[0]).toBeInTheDocument();
    });

    it("should handle completely invalid input", () => {
      render(<JsonTreeView jsonString="not json at all" />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
    });

    it("should handle null input", () => {
      render(<JsonTreeView jsonString="null" />);
      
      expect(screen.getByText("Empty or invalid JSON data")).toBeInTheDocument();
    });

    it("should handle undefined input", () => {
      render(<JsonTreeView jsonString="undefined" />);
      
      // "undefined" as a string is invalid JSON, so it shows a JSON parse error
      // Use getAllByText and check the first match to handle multiple matching elements
      expect(screen.getAllByText(/Error Parsing JSON|Invalid JSON/)[0]).toBeInTheDocument();
    });

    it("should handle empty string", () => {
      render(<JsonTreeView jsonString="" />);
      
      expect(screen.getByText("Empty or invalid JSON data")).toBeInTheDocument();
    });

    it("should handle whitespace-only string", () => {
      render(<JsonTreeView jsonString="   " />);
      
      expect(screen.getByText("Empty or invalid JSON data")).toBeInTheDocument();
    });
  });

  describe("Path Evaluation Errors", () => {
    it("should handle invalid path syntax", async () => {
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      fireEvent.change(pathInput, { target: { value: "invalid[path" } });
      
      await waitFor(() => {
        expect(screen.getByText(/not found|invalid/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should handle non-existent paths", async () => {
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      fireEvent.change(pathInput, { target: { value: "nonexistent" } });
      
      await waitFor(() => {
        expect(screen.getByText(/not found|invalid/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should handle array index out of bounds", async () => {
      render(<JsonTreeView jsonString='{"array": ["item1", "item2"]}' />);
      
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      // Use fireEvent.change to set the full path at once to avoid timing issues
      fireEvent.change(pathInput, { target: { value: "array[10]" } });
      
      await waitFor(() => {
        expect(screen.getByText(/out of bounds|not found|invalid/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should handle negative array indices", async () => {
      render(<JsonTreeView jsonString='{"array": ["item1", "item2"]}' />);
      
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      // Use fireEvent.change to avoid userEvent parsing issues with negative numbers
      fireEvent.change(pathInput, { target: { value: "array[-1]" } });
      
      await waitFor(() => {
        expect(screen.getByText(/not found|invalid|out of bounds/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should handle invalid array indices", async () => {
      render(<JsonTreeView jsonString='{"array": ["item1", "item2"]}' />);
      
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      // Use fireEvent.change for reliability with special characters
      fireEvent.change(pathInput, { target: { value: "array[abc]" } });
      
      // Wait for debounced evaluation
      await waitFor(() => {
        expect(screen.getByText(/not found|invalid/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it("should handle deeply nested invalid paths", async () => {
      render(<JsonTreeView jsonString='{"level1": {"level2": {"level3": "value"}}}' />);
      
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      // Use fireEvent.change for more reliable input
      fireEvent.change(pathInput, { target: { value: "level1.level2.nonexistent" } });
      
      await waitFor(() => {
        expect(screen.getByText(/not found|invalid/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe("Clipboard Error Handling", () => {
    it("should handle clipboard write errors", async () => {
      mockClipboard.writeText.mockRejectedValue(new Error("Clipboard error"));
      
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const copyButtons = screen.getAllByTitle(/Copy Path/);
      
      if (copyButtons.length > 0) {
        await userEvent.click(copyButtons[0]);
        
        // Should show error status
        await waitFor(() => {
          expect(screen.getByText(/Error copying/)).toBeInTheDocument();
        });
      }
    });

    it("should handle clipboard permission denied", async () => {
      mockClipboard.writeText.mockRejectedValue(new Error("Permission denied"));
      
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const copyButtons = screen.getAllByTitle(/Copy Path/);
      
      if (copyButtons.length > 0) {
        await userEvent.click(copyButtons[0]);
        
        await waitFor(() => {
          expect(screen.getByText(/Error copying/)).toBeInTheDocument();
        });
      }
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should handle extremely large JSON objects", () => {
      const largeJson = JSON.stringify({
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
          nested: {
            level1: { level2: { level3: `Deep value ${i}` } },
          },
        })),
      });

      const startTime = performance.now();
      render(<JsonTreeView jsonString={largeJson} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should render in under 5 seconds
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle deeply nested JSON structures", () => {
      let deepJson: any = { value: "deep" };
      for (let i = 0; i < 100; i++) {
        deepJson = { nested: deepJson };
      }

      render(<JsonTreeView jsonString={JSON.stringify(deepJson)} />);
      
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle JSON with many special characters", () => {
      const specialJson = JSON.stringify({
        unicode: "🎉🎊🎈🎁",
        newlines: "line1\nline2\nline3",
        tabs: "tab1\ttab2\ttab3",
        quotes: '"nested"quotes"',
        backslashes: "\\n\\t\\r\\b\\f",
        nullBytes: "null\0byte",
        controlChars: "\x00\x01\x02\x03",
      });

      render(<JsonTreeView jsonString={specialJson} />);
      
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });
  });

  describe("Search Edge Cases", () => {
    it("should handle empty search terms", async () => {
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const searchInput = screen.getByPlaceholderText("Search keys/values...");
      // Clear the input instead of typing empty string
      await userEvent.clear(searchInput);
      
      // Should show all nodes when search is empty
      expect(screen.getByText('"name":')).toBeInTheDocument();
    });

    it("should handle search terms with special characters", async () => {
      render(<JsonTreeView jsonString='{"name": "test", "special": "test[value]", "regex": "test.*value"}' />);
      
      const searchInput = screen.getByPlaceholderText("Search keys/values...");
      // Use fireEvent.change to avoid userEvent parsing issues with special characters
      fireEvent.change(searchInput, { target: { value: "test[" } });
      
      // Wait for debounced search to complete
      await waitFor(() => {
        // Should find matches with special characters
        expect(screen.getByText('"special":')).toBeInTheDocument();
      });
    });

    it("should handle very long search terms", async () => {
      const longSearchTerm = "a".repeat(1000);
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const searchInput = screen.getByPlaceholderText("Search keys/values...");
      // Use fireEvent.change instead of userEvent.type for performance with long strings
      fireEvent.change(searchInput, { target: { value: longSearchTerm } });
      
      // Should not crash with long search terms
      expect(screen.getByPlaceholderText("Search keys/values...")).toBeInTheDocument();
      expect(searchInput).toHaveValue(longSearchTerm);
    }, 10000);
  });

  describe("Component State Edge Cases", () => {
    it("should handle rapid state changes", async () => {
      const { rerender } = render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      // Rapidly change the JSON string
      for (let i = 0; i < 10; i++) {
        rerender(<JsonTreeView jsonString={`{"name": "test${i}"}`} />);
      }
      
      // Should not crash
      expect(screen.getByText('"name":')).toBeInTheDocument();
    });

    it("should handle concurrent operations", async () => {
      render(<JsonTreeView jsonString='{"name": "test", "nested": {"key": "value"}}' />);
      
      // First expand all to ensure nested content is visible
      const expandAllButton = screen.getByTitle("Expand All");
      await userEvent.click(expandAllButton);
      
      // Verify expansion worked first
      await waitFor(() => {
        expect(screen.getByText('"key":')).toBeInTheDocument();
      });
      
      // Then perform search using fireEvent for reliability
      const searchInput = screen.getByPlaceholderText("Search keys/values...");
      fireEvent.change(searchInput, { target: { value: "name" } });
      
      // Wait for debounced search to complete and verify name is still visible
      await waitFor(() => {
        expect(screen.getByText('"name":')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe("Accessibility Error Handling", () => {
    it("should handle keyboard navigation errors", async () => {
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const nodes = screen.getAllByRole("button");
      
      if (nodes.length > 0) {
        // Test various keyboard events
        fireEvent.keyDown(nodes[0], { key: "Enter" });
        fireEvent.keyDown(nodes[0], { key: " " });
        fireEvent.keyDown(nodes[0], { key: "Tab" });
        fireEvent.keyDown(nodes[0], { key: "Escape" });
        
        // Should not crash
        expect(nodes[0]).toBeInTheDocument();
      }
    });

    it("should handle focus management errors", async () => {
      render(<JsonTreeView jsonString='{"name": "test"}' />);
      
      const searchInput = screen.getByPlaceholderText("Search keys/values...");
      
      // Test focus events
      fireEvent.focus(searchInput);
      fireEvent.blur(searchInput);
      fireEvent.focusIn(searchInput);
      fireEvent.focusOut(searchInput);
      
      // Should not crash
      expect(searchInput).toBeInTheDocument();
    });
  });
}); 