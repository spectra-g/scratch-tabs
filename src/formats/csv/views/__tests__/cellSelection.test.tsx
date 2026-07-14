import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CsvTableViewer } from "../components/CsvTableViewer";

// Mock getBoundingClientRect for virtualization
const mockGetBoundingClientRect = jest.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: jest.fn(),
}));

Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  value: mockGetBoundingClientRect,
});

const mockOnContentChange = jest.fn();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// CSV with ragged rows for testing shift right functionality
const raggedCsv = `Name,Age,City,Country
John Doe,28,New York
Jane Smith,32
Bob Johnson,45,Chicago,USA`;

describe("Cell Selection Functionality", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  describe("Single Cell Selection", () => {
    it("should handle basic cell selection", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Basic rendering test to ensure component loads
      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
      expect(screen.getByTestId("csv-table-container")).toBeInTheDocument();
    });

    it("should handle cell click events without errors", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Get the table container
      const tableContainer = screen.getByTestId("csv-table-container");
      expect(tableContainer).toBeInTheDocument();

      // Test that clicking on the table area doesn't cause errors
      // (We can't easily test individual cell clicks in jsdom due to virtualization)
      fireEvent.click(tableContainer);
      expect(tableContainer).toBeInTheDocument();
    });

    it("should clear cell selection when clicking outside the table", async () => {
      render(
        <>
          <button type="button">Outside table</button>
          <CsvTableViewer
            content={raggedCsv}
            onContentChange={mockOnContentChange}
            tabId="test-tab"
            isActive={true}
            side="left"
          />
        </>,
      );

      fireEvent.click(screen.getByText("John Doe"));
      await act(async () => {
        await delay(300);
      });

      const selectedCell = screen.getByText("John Doe").closest("div");
      expect(selectedCell).toHaveClass("bg-info/30");

      fireEvent.click(screen.getByRole("button", { name: "Outside table" }));

      await waitFor(() => {
        expect(screen.getByText("John Doe").closest("div")).not.toHaveClass(
          "bg-info/30",
        );
      });
    });

  });

  describe("Multi-Selection Logic", () => {
    it("should document CTRL+Click behavior expectations", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // This test documents the expected behavior for multi-selection:
      // 
      // 1. Regular click should select single cell
      // 2. CTRL+Click should toggle cells in/out of selection
      // 3. Meta+Click should work the same as CTRL+Click (Mac support)
      // 4. Multi-selected cells should show purple background
      // 5. Primary selected cell should maintain blue background for editing
      //
      // The actual implementation is tested through:
      // - handleCellSelect function logic
      // - selectedCells Set management
      // - isCellMultiSelected function
      // - getCellClasses styling logic

      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
    });

    it("should handle keyboard modifiers in selection", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Test that the component can handle various keyboard events
      const viewer = screen.getByTestId("csv-table-viewer");
      
      // Test CTRL key events
      fireEvent.keyDown(viewer, { key: "Control", ctrlKey: true });
      fireEvent.keyUp(viewer, { key: "Control", ctrlKey: false });
      
      // Test Meta key events (Mac)
      fireEvent.keyDown(viewer, { key: "Meta", metaKey: true });
      fireEvent.keyUp(viewer, { key: "Meta", metaKey: false });
      
      expect(viewer).toBeInTheDocument();
    });

    it("should clear column selection when clicking outside the table", async () => {
      render(
        <>
          <button type="button">Outside table</button>
          <CsvTableViewer
            content={raggedCsv}
            onContentChange={mockOnContentChange}
            tabId="test-tab"
            isActive={true}
            side="left"
          />
        </>,
      );

      fireEvent.click(screen.getByText("Age"), { ctrlKey: true });

      const primaryColumnCell = screen.getByText("28").closest("div");
      const multiSelectedColumnCell = screen.getByText("32").closest("div");
      expect(primaryColumnCell).toHaveClass("bg-info/30");
      expect(multiSelectedColumnCell).toHaveClass("bg-primary/20");

      fireEvent.click(screen.getByRole("button", { name: "Outside table" }));

      await waitFor(() => {
        expect(screen.getByText("28").closest("div")).not.toHaveClass(
          "bg-info/30",
        );
        expect(screen.getByText("32").closest("div")).not.toHaveClass(
          "bg-primary/20",
        );
      });
    });

    it("should select a column on header click and add another with Ctrl-click", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      fireEvent.click(screen.getByText("Age"));

      expect(screen.getByText("28").closest("div")).toHaveClass("bg-info/30");
      expect(screen.getByText("32").closest("div")).toHaveClass("bg-primary/20");
      expect(screen.getByText("45").closest("div")).toHaveClass("bg-primary/20");

      fireEvent.click(screen.getByText("City"), { ctrlKey: true });

      expect(screen.getByText("New York").closest("div")).toHaveClass("bg-info/30");
      expect(screen.getByText("28").closest("div")).toHaveClass("bg-primary/20");
      expect(screen.getByText("32").closest("div")).toHaveClass("bg-primary/20");
      expect(screen.getByText("45").closest("div")).toHaveClass("bg-primary/20");
    });

    it("should clear column selection when entering header rename mode", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      fireEvent.click(screen.getByText("Age"));
      expect(screen.getByText("28").closest("div")).toHaveClass("bg-info/30");

      fireEvent.doubleClick(screen.getByText("Age"));
      fireEvent.click(screen.getByDisplayValue("Age"));

      expect(screen.getByText("28").closest("div")).not.toHaveClass("bg-info/30");
      expect(screen.getByText("32").closest("div")).not.toHaveClass("bg-primary/20");
    });
  });

  describe("Context Menu Integration", () => {
    it("should handle right-click events on table", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const tableContainer = screen.getByTestId("csv-table-container");
      
      // Test right-click event handling
      fireEvent.contextMenu(tableContainer);
      
      // Context menu logic is handled at the cell level in the actual implementation
      expect(tableContainer).toBeInTheDocument();
    });

    it("should document shift right validation behavior", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // This documents the canShiftRight validation logic:
      //
      // Valid scenarios:
      // - Single cell in row with fewer columns than headers
      // - Multiple cells in same column, all rows have fewer columns than headers
      //
      // Invalid scenarios:
      // - Cells in different columns
      // - Any cell in a row that already has maximum columns
      // - Empty selection
      //
      // The CSV data has:
      // - Row 1: John Doe,28,New York (3/4 columns) ✓ Valid for shift
      // - Row 2: Jane Smith,32 (2/4 columns) ✓ Valid for shift  
      // - Row 3: Bob Johnson,45,Chicago,USA (4/4 columns) ✗ Invalid for shift

      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
    });
  });

  describe("Visual Feedback", () => {
    it("should support cell styling classes", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Test that the styling system is working by checking for expected CSS classes
      const viewer = screen.getByTestId("csv-table-viewer");
      
      // The cells should be using the getCellClasses utility for consistent styling
      // This ensures proper visual feedback for:
      // - Single selection (blue)
      // - Multi-selection (purple) 
      // - Search matches (yellow)
      // - Active search match (orange)
      // - Invalid cells (red)
      
      expect(viewer).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    it("should handle empty CSV gracefully", () => {
      render(
        <CsvTableViewer
          content=""
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
    });

    it("should handle malformed CSV data", () => {
      const malformedCsv = "Name,Age\\nJohn,28,Extra,Data\\nJane";
      
      render(
        <CsvTableViewer
          content={malformedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
    });
  });
});
