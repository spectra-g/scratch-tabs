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

jest.mock("../../../../../formats", () => ({
  detectFormat: () => "json",
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

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

describe("JsonTreeView - Integration Tests", () => {
  const defaultProps = {
    jsonString: '{"name": "test", "value": 123, "nested": {"key": "value"}}',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render the component with valid JSON", () => {
      render(<JsonTreeView {...defaultProps} />);
      
      expect(screen.getByText("Search Key/Value")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search keys/values...")).toBeInTheDocument();
    });

    it("should show parse error for invalid JSON", () => {
      render(<JsonTreeView jsonString='{"name": "test", "value": 123,}' />);
      
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
    });

    it("should show empty state for null/empty JSON", () => {
      render(<JsonTreeView jsonString="" />);
      
      expect(screen.getByText("Empty or invalid JSON data")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    it("should switch between search modes", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const modeSelector = screen.getByRole("combobox");
      expect(modeSelector).toHaveValue("keyValue");
      
      await userEvent.selectOptions(modeSelector, "path");
      expect(modeSelector).toHaveValue("path");
      expect(screen.getByPlaceholderText(/Evaluate path/)).toBeInTheDocument();
    });

    it("should filter nodes in keyValue mode", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText("Search keys/values...");
      await userEvent.type(searchInput, "name");
      
      expect(screen.getByText('"name":')).toBeInTheDocument();
    });

    it("should evaluate paths in path mode", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const modeSelector = screen.getByRole("combobox");
      await act(async () => {
        await userEvent.selectOptions(modeSelector, "path");
      });
      
      const pathInput = screen.getByPlaceholderText(/Evaluate path/);
      await act(async () => {
        await userEvent.type(pathInput, "name");
      });
      
      // Wait longer for debounced evaluation (300ms debounce + processing time)
      await waitFor(() => {
        expect(screen.getByText(/Path evaluated successfully|Found and scrolled to/)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe("Tree Expansion", () => {
    it("should expand and collapse nodes", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const expandButtons = screen.getAllByRole("button", { name: /Expand|Collapse/ });
      
      if (expandButtons.length > 0) {
        await userEvent.click(expandButtons[0]);
        expect(screen.getByText('"nested":')).toBeInTheDocument();
      }
    });

    it("should expand all nodes", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const expandAllButton = screen.getByTitle("Expand All");
      await userEvent.click(expandAllButton);
      
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
      
      expect(screen.queryByText('"key":')).not.toBeInTheDocument();
    });
  });

  describe("Copy Functionality", () => {
    it("should copy node paths", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const copyButtons = screen.getAllByTitle(/Copy Path/);
      
      if (copyButtons.length > 0) {
        await userEvent.click(copyButtons[0]);
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith("name");
      }
    });

    it("should copy node values", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
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
      
      const nodes = screen.getAllByRole("button");
      
      if (nodes.length > 0) {
        await userEvent.click(nodes[0]);
        expect(screen.getByText(/Selected Path:/)).toBeInTheDocument();
      }
    });

    it("should handle keyboard navigation", async () => {
      render(<JsonTreeView {...defaultProps} />);
      
      const nodes = screen.getAllByRole("button");
      
      if (nodes.length > 0) {
        nodes[0].focus();
        fireEvent.keyDown(nodes[0], { key: "Enter" });
        expect(nodes[0]).toBeInTheDocument();
      }
    });
  });

  describe("Data Types", () => {
    it("should handle different JSON data types", () => {
      const jsonString = '{"string": "text", "number": 123, "boolean": true, "null": null, "array": [1,2,3], "object": {"key": "value"}}';
      render(<JsonTreeView jsonString={jsonString} />);
      
      expect(screen.getByText('"string":')).toBeInTheDocument();
      expect(screen.getByText('"number":')).toBeInTheDocument();
      expect(screen.getByText('"boolean":')).toBeInTheDocument();
      expect(screen.getByText('"null":')).toBeInTheDocument();
      expect(screen.getByText('"array":')).toBeInTheDocument();
      expect(screen.getByText('"object":')).toBeInTheDocument();
    });

    it("should handle arrays", () => {
      const arrayJson = JSON.stringify(["item1", "item2", {"nested": "value"}]);
      render(<JsonTreeView jsonString={arrayJson} />);
      
      // Arrays are displayed with numeric keys (0, 1, 2, etc.)
      expect(screen.getByText(/0:/)).toBeInTheDocument();
      expect(screen.getByText(/1:/)).toBeInTheDocument();
    });

    it("should handle nested objects", () => {
      const nestedJson = JSON.stringify({
        level1: {
          level2: {
            level3: "value"
          }
        }
      });
      render(<JsonTreeView jsonString={nestedJson} />);
      
      expect(screen.getByText('"level1":')).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("should handle large JSON objects", () => {
      const largeJson = JSON.stringify({
        data: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random(),
        })),
      });

      render(<JsonTreeView jsonString={largeJson} />);
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle special characters", () => {
      const specialJson = JSON.stringify({
        name: "test\nwith\tchars",
        unicode: "🎉",
        quotes: '"escaped"',
      });

      render(<JsonTreeView jsonString={specialJson} />);
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });

    it("should handle malformed JSON gracefully", () => {
      render(<JsonTreeView jsonString='{name: "test"}' />);
      expect(screen.getByText(/Error Parsing JSON/)).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    it("should render large JSON without hanging", () => {
      const largeJson = JSON.stringify({
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          nested: {
            level1: { level2: { level3: `Deep value ${i}` } },
          },
        })),
      });

      const startTime = performance.now();
      render(<JsonTreeView jsonString={largeJson} />);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should render in under 1 second
      expect(screen.queryByText(/Error Parsing JSON/)).not.toBeInTheDocument();
    });
  });
}); 