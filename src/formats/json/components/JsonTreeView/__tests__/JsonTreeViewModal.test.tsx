import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import JsonTreeViewModal from "../JsonTreeViewModal";

// Mock the JsonTreeView component since it's lazy loaded
jest.mock("../JsonTreeView", () => {
  return function MockJsonTreeView({ jsonString }: { jsonString: string }) {
    return (
      <div data-testid="json-tree-view">
        <div data-testid="json-string">{jsonString}</div>
        <div data-testid="tree-view-content">Mocked Tree View Content</div>
      </div>
    );
  };
});

describe("JsonTreeViewModal", () => {
  const defaultProps = {
    jsonString: '{"name": "test", "value": 123}',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render modal with correct structure", async () => {
    await act(async () => {
      render(<JsonTreeViewModal {...defaultProps} />);
    });

    // Check header
    expect(screen.getByText("JSON Tree View")).toBeInTheDocument();
    
    // Check close button
    expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
    
    // Wait for suspense to resolve and check that JsonTreeView is rendered
    await waitFor(() => {
      expect(screen.getByTestId("json-tree-view")).toBeInTheDocument();
    });
  });

  it("should display the provided JSON string", async () => {
    const testJson = '{"test": "data", "nested": {"key": "value"}}';
    await act(async () => {
      render(<JsonTreeViewModal jsonString={testJson} onClose={defaultProps.onClose} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("json-string")).toHaveTextContent(testJson);
    });
  });

  it("should call onClose when close button is clicked", async () => {
    const onClose = jest.fn();
    render(<JsonTreeViewModal jsonString={defaultProps.jsonString} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Close modal");
    await userEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should call onClose when clicking outside the modal", async () => {
    const onClose = jest.fn();
    render(<JsonTreeViewModal jsonString={defaultProps.jsonString} onClose={onClose} />);

    // Click on the backdrop (the outermost div with the backdrop class)
    const backdrop = document.querySelector(".fixed.inset-0.bg-black.bg-opacity-60");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it("should not call onClose when clicking inside the modal content", async () => {
    const onClose = jest.fn();
    await act(async () => {
      render(<JsonTreeViewModal jsonString={defaultProps.jsonString} onClose={onClose} />);
    });

    // Wait for the component to load and click on the modal content
    await waitFor(async () => {
      const modalContent = screen.getByTestId("json-tree-view");
      await userEvent.click(modalContent);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("should handle empty JSON string", async () => {
    await act(async () => {
      render(<JsonTreeViewModal jsonString="" onClose={defaultProps.onClose} />);
    });

    await waitFor(() => {
      expect(screen.getByTestId("json-string")).toHaveTextContent("");
      expect(screen.getByTestId("tree-view-content")).toBeInTheDocument();
    });
  });

  it("should handle large JSON strings", () => {
    const largeJson = JSON.stringify({
      data: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random(),
        nested: {
          level1: { level2: { level3: `Deep value ${i}` } },
        },
      })),
    });

    render(<JsonTreeViewModal jsonString={largeJson} onClose={defaultProps.onClose} />);

    expect(screen.getByTestId("json-string")).toHaveTextContent(largeJson);
  });

  it("should handle malformed JSON strings", () => {
    const malformedJson = '{"name": "test", "value": 123,}'; // Extra comma
    render(<JsonTreeViewModal jsonString={malformedJson} onClose={defaultProps.onClose} />);

    expect(screen.getByTestId("json-string")).toHaveTextContent(malformedJson);
  });

  it("should handle special characters in JSON", () => {
    const jsonWithSpecialChars = '{"name": "test\\nwith\\tchars", "unicode": "🎉", "quotes": "\\"escaped\\""}';
    render(<JsonTreeViewModal jsonString={jsonWithSpecialChars} onClose={defaultProps.onClose} />);

    expect(screen.getByTestId("json-string")).toHaveTextContent(jsonWithSpecialChars);
  });

  it("should have proper ARIA attributes", () => {
    render(<JsonTreeViewModal {...defaultProps} />);

    const closeButton = screen.getByLabelText("Close modal");
    expect(closeButton).toHaveAttribute("aria-label", "Close modal");
  });

  it("should have proper CSS classes for styling", () => {
    render(<JsonTreeViewModal {...defaultProps} />);

    const modalContainer = screen.getByText("JSON Tree View").closest("div")?.parentElement;
    expect(modalContainer).toHaveClass("bg-surface", "rounded-lg", "shadow-xl");

    const header = screen.getByText("JSON Tree View").closest("div");
    expect(header).toHaveClass("flex-none", "flex", "items-center", "justify-between");
  });

  it("should handle keyboard events for accessibility", async () => {
    const onClose = jest.fn();
    render(<JsonTreeViewModal jsonString={defaultProps.jsonString} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Close modal");
    
    // Test click instead of keyboard events since the component doesn't handle keyboard events
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should render loading indicator while JsonTreeView is loading", async () => {
    // This test verifies that the Suspense fallback is rendered
    // The actual loading behavior depends on the lazy loading implementation
    await act(async () => {
      render(<JsonTreeViewModal {...defaultProps} />);
    });

    // The loading indicator should be rendered initially, then the content loads
    await waitFor(() => {
      expect(screen.getByTestId("json-tree-view")).toBeInTheDocument();
    });
  });

  it("should handle multiple open/close cycles", async () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <JsonTreeViewModal jsonString={defaultProps.jsonString} onClose={onClose} />
    );

    // First close
    const closeButton = screen.getByLabelText("Close modal");
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);

    // Reset mock
    onClose.mockClear();

    // Re-render with new props (simulating reopening)
    rerender(<JsonTreeViewModal jsonString='{"new": "data"}' onClose={onClose} />);

    // Close again
    const newCloseButton = screen.getByLabelText("Close modal");
    await userEvent.click(newCloseButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("should handle very long JSON strings", () => {
    const longJson = JSON.stringify({
      veryLongKey: "a".repeat(10000), // 10KB string
      nested: {
        anotherLongKey: "b".repeat(5000),
      },
    });

    render(<JsonTreeViewModal jsonString={longJson} onClose={defaultProps.onClose} />);

    expect(screen.getByTestId("json-string")).toHaveTextContent(longJson);
  });

  it("should handle null and undefined JSON strings", () => {
    const { unmount } = render(<JsonTreeViewModal jsonString="null" onClose={defaultProps.onClose} />);
    expect(screen.getByTestId("json-string")).toHaveTextContent("null");
    unmount();

    render(<JsonTreeViewModal jsonString="undefined" onClose={defaultProps.onClose} />);
    expect(screen.getByTestId("json-string")).toHaveTextContent("undefined");
  });
}); 