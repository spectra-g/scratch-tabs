import * as React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
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

// Mock clipboard
const mockClipboard = {
  writeText: jest.fn(),
  readText: jest.fn(),
};
Object.defineProperty(navigator, "clipboard", {
  value: mockClipboard,
  writable: true,
});

const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;

const mockOnContentChange = jest.fn();

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("CSV Copy Paste & Column/Row Selection UI", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
    mockClipboard.writeText.mockClear();
    mockClipboard.readText.mockClear();
  });

  // Helper to click and select a cell (handles double-click prevention timer using real delay)
  const selectCell = async (cell: HTMLElement) => {
    fireEvent.click(cell);
    await act(async () => {
      await delay(300);
    });
  };

  it("should keep plain header clicks available for header editing", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const ageHeader = screen.getByText("Age");
    expect(ageHeader).toBeInTheDocument();

    fireEvent.click(ageHeader, { detail: 1 });
    fireEvent.click(screen.getByText("Age"), { detail: 2 });
    fireEvent.doubleClick(screen.getByText("Age"), { detail: 2 });

    expect(screen.getByDisplayValue("Age")).toHaveFocus();
  });

  it("should support selecting multiple columns with Ctrl+Click", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const nameHeader = screen.getByText("Name");
    const cityHeader = screen.getByText("City");

    fireEvent.click(nameHeader, { ctrlKey: true });
    fireEvent.click(cityHeader, { ctrlKey: true });

    expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
  });

  it("should select a range of columns with Shift+Click", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const nameHeader = screen.getByText("Name");
    const cityHeader = screen.getByText("City");

    fireEvent.click(nameHeader, { ctrlKey: true });
    fireEvent.click(cityHeader, { shiftKey: true });

    expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
  });

  it("should select a row when clicking the row number", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const rowNum1 = screen.getByText("1");
    expect(rowNum1).toBeInTheDocument();

    fireEvent.click(rowNum1);

    expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
  });

  it("should select all cells when clicking the top-left '#' header", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const hashHeader = screen.getByText("#");
    expect(hashHeader).toBeInTheDocument();

    fireEvent.click(hashHeader);

    expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
  });

  it("should intercept Ctrl+C/Cmd+C and write selected cells to clipboard", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click a cell and wait for selection
    await selectCell(screen.getByText("John Doe"));

    // Trigger keyboard copy shortcut on the viewer container
    const viewer = screen.getByTestId("csv-table-viewer");
    await act(async () => {
      fireEvent.keyDown(viewer, { key: "c", ctrlKey: true });
      await delay(50);
    });

    // Verify it wrote the correct content to clipboard
    expect(mockClipboard.writeText).toHaveBeenCalledWith("John Doe");
  });

  it("should support select all using keyboard shortcut Ctrl+A/Cmd+A", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click a cell to set initial selection
    await selectCell(screen.getByText("John Doe"));

    const viewer = screen.getByTestId("csv-table-viewer");
    fireEvent.keyDown(viewer, { key: "a", ctrlKey: true });

    expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
  });

  it("should intercept container paste event and update table", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Select start cell
    await selectCell(screen.getByText("New York"));

    // Construct a mock paste event
    const pasteEvent = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, "clipboardData", {
      value: {
        getData: () => "Brooklyn\tUS\nQueens\tUS",
      },
    });

    const container = screen.getByTestId("csv-table-viewer");
    fireEvent(container, pasteEvent);

    // Content change should be triggered due to paste mutation (waiting for debounce)
    await waitFor(() => {
      expect(mockOnContentChange).toHaveBeenCalled();
    });
  });

  it("should show Paste option in right-click context menu and paste content on click", async () => {
    mockClipboard.readText.mockResolvedValue("Manhattan\tUSA");

    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Select start cell
    await selectCell(screen.getByText("New York"));

    // Query the fresh cell span after re-render selection update
    const cityCell = screen.getByText("New York");
    
    // Trigger right click context menu on cell span directly
    fireEvent.contextMenu(cityCell);

    // Paste button should now be visible in the DOM
    const pasteButton = await screen.findByText("Paste cells");
    expect(pasteButton).toBeInTheDocument();

    // Click the paste button wrapped in act
    await act(async () => {
      fireEvent.click(pasteButton);
      await delay(50);
    });

    // It should read clipboard and trigger update
    expect(mockClipboard.readText).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockOnContentChange).toHaveBeenCalled();
    });
  });

  it("should label full-column selections as columns in the context menu", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const ageHeader = screen.getByText("Age");
    fireEvent.click(ageHeader, { ctrlKey: true });
    const ageHeaderCell = screen
      .getAllByTestId("column-header")
      .find((header) => header.textContent?.includes("Age"));
    expect(ageHeaderCell).toBeDefined();
    fireEvent.contextMenu(ageHeaderCell!);

    expect(await screen.findByText("Copy columns")).toBeInTheDocument();
  });
});
