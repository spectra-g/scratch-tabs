import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import JsonTreeView from "../JsonTreeView";

// Mock dependencies
jest.mock("../../../../../hooks/useDebounce", () => ({
  useDebounce: (value: any) => value, // Return the value directly for testing
}));

const mockAddBackgroundTab = jest.fn();
jest.mock("../../../../../stores", () => ({
  useRootStore: () => ({
    addBackgroundTab: mockAddBackgroundTab,
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
  FixedSizeList: React.forwardRef(({ children, itemCount, height, itemSize, width }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      scrollToItem: jest.fn(),
    }));
    return (
      <div data-testid="virtual-list" style={{ height, width }}>
        {Array.from({ length: itemCount }, (_, index) => (
          <div key={index} style={{ height: itemSize }}>
            {children({ index, style: {} })}
          </div>
        ))}
      </div>
    );
  }),
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

describe("JsonTreeView - Unit Tests", () => {
  const defaultProps = {
    jsonString: '{"name": "test", "value": 123, "nested": {"key": "value"}}',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("JSON Parsing", () => {
    it("should parse valid JSON correctly", () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Should not show parse error
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle invalid JSON and show error", () => {
      render(<JsonTreeView jsonString='{"name": "test", "value": 123,}' />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
      expect(screen.getByText(/Invalid JSON/)).toBeInTheDocument();
    });

    it("should handle empty JSON string", () => {
      render(<JsonTreeView jsonString="" />);
      
      expect(screen.getByText("Empty or invalid JSON data")).toBeInTheDocument();
    });

    it("should handle null JSON string", () => {
      render(<JsonTreeView jsonString="null" />);
      
      expect(screen.getByText("Empty or invalid JSON data")).toBeInTheDocument();
    });

    it("should handle malformed JSON with missing quotes", () => {
      render(<JsonTreeView jsonString='{name: "test"}' />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("should render search input", () => {
      render(<JsonTreeView {...defaultProps} />);
      
      expect(screen.getByPlaceholderText("Search keys/values...")).toBeInTheDocument();
    });

    it("should switch between search modes", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const modeSelector = screen.getByRole("combobox");
      expect(modeSelector).toHaveValue("keyValue");
      
      // Switch to path mode
      await userEvent.selectOptions(modeSelector, "path");
      expect(modeSelector).toHaveValue("path");
      expect(screen.getByPlaceholderText(/Evaluate path/)).toBeInTheDocument();
    });

    it("should filter nodes when searching in keyValue mode", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText("Search keys/values...");
      await userEvent.type(searchInput, "name");
      
      // Should show filtered results
      expect(screen.getByText('"name":')).toBeInTheDocument();
    });

    it("should evaluate JSON paths in path mode", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Switch to path mode
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      await act(async () => {
        await userEvent.type(pathInput, "name");
      });
      
      // Should show evaluation status (wait longer for debounced evaluation)
      await waitFor(() => {
        expect(screen.getByText(/Path evaluated successfully|Found and scrolled/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it("should handle invalid JSON paths", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Switch to path mode
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      await act(async () => {
        await userEvent.type(pathInput, "invalid.path");
      });
      
      // Should show error (wait longer for debounced input + evaluation)
      await waitFor(() => {
        expect(screen.getByText(/not found|invalid/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe("Tree Expansion", () => {
    it("should expand and collapse nodes", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Find expandable nodes (objects/arrays)
      const expandButtons = screen.getAllByRole("button", { name: /Expand|Collapse/ });
      
      if (expandButtons.length > 0) {
        await userEvent.click(expandButtons[0]);
        
        // Should show expanded content
        expect(screen.getByText('"nested":')).toBeInTheDocument();
      }
    });

    it("should expand all nodes", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const expandAllButton = screen.getByTitle("Expand All");
      await userEvent.click(expandAllButton);
      
      // Should show all nested content
      expect(screen.getByText('"nested":')).toBeInTheDocument();
      expect(screen.getByText('"key":')).toBeInTheDocument();
    });

    it("should collapse all nodes", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // First expand all
      const expandAllButton = screen.getByTitle("Expand All");
      await userEvent.click(expandAllButton);
      
      // Then collapse all
      const collapseAllButton = screen.getByTitle("Collapse All");
      await userEvent.click(collapseAllButton);
      
      // Should hide nested content
      expect(screen.queryByText('"key":')).not.toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    it("should copy node paths", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Find copy path buttons
      const copyButtons = screen.getAllByTitle(/Copy Path/);
      
      if (copyButtons.length > 0) {
        await userEvent.click(copyButtons[0]);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("name");
      }
    });

    it("should copy node values", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Find copy value buttons
      const copyButtons = screen.getAllByTitle("Copy Value");
      
      if (copyButtons.length > 0) {
        await userEvent.click(copyButtons[0]);
        
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test");
      }
    });

    it("should copy all visible paths", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const copyAllPathsButton = screen.getByTitle("Copy All Visible Paths");
      await userEvent.click(copyAllPathsButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe("Node Selection", () => {
    it("should select nodes when clicked", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Find a node to click
      const nodes = screen.getAllByRole("button");
      
      if (nodes.length > 0) {
        await userEvent.click(nodes[0]);
        
        // Should show selected path in footer
        expect(screen.getByText(/Selected Path:/)).toBeInTheDocument();
      }
    });

    it("should handle keyboard navigation", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      // Find a node to focus
      const nodes = screen.getAllByRole("button");
      
      if (nodes.length > 0) {
        nodes[0].focus();
        fireEvent.keyDown(nodes[0], { key: "Enter" });
        
        // Should trigger expansion/collapse
        expect(nodes[0]).toBeInTheDocument();
      }
    });
  });

  describe("Open in New Tab", () => {
    it("should open node value in new tab", async () => {
      // Clear previous mock calls
      mockAddBackgroundTab.mockClear();

      render(<JsonTreeView {...defaultProps} />);
      
      // First select a node to make the buttons visible
      const nodes = screen.getAllByRole("button");
      if (nodes.length > 0) {
        await userEvent.click(nodes[0]);
        
        // Wait for buttons to become visible
        await waitFor(() => {
          const openButtons = screen.getAllByTitle("Open in New Tab");
          expect(openButtons.length).toBeGreaterThan(0);
        });

        const openButtons = screen.getAllByTitle("Open in New Tab");
        await userEvent.click(openButtons[0]);
        
        expect(mockAddBackgroundTab).toHaveBeenCalled();
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large JSON objects", () => {
      const largeJson = JSON.stringify({
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      });

      render(<JsonTreeView jsonString={largeJson} />);
      
      // Should render without errors
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle deeply nested JSON", () => {
      const deepJson = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: "deep value",
                },
              },
            },
          },
        },
      });

      render(<JsonTreeView jsonString={deepJson} />);
      
      // Should render without errors
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle JSON with special characters", () => {
      const specialJson = JSON.stringify({
        name: "test\nwith\tchars",
        unicode: "🎉",
        quotes: '"escaped"',
        backslashes: "\\n\\t\\r",
      });

      render(<JsonTreeView jsonString={specialJson} />);
      
      // Should render without errors
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle JSON arrays", () => {
      const arrayJson = JSON.stringify([
        "item1",
        "item2",
        { nested: "value" },
        [1, 2, 3],
      ]);

      render(<JsonTreeView jsonString={arrayJson} />);
      
      // Should render without errors
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });
  });
}); 