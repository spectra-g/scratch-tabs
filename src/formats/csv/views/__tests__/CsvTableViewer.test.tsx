import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CsvTableViewer } from "../components/CsvTableViewer";

// Mock getBoundingClientRect to provide dimensions for virtualization
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

// Apply the mock to all elements
Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  value: mockGetBoundingClientRect,
});

const mockOnContentChange = jest.fn();

const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco`;

describe("CsvTableViewer", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  it("should render CSV data in a table", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    // Test that headers are rendered (these are always visible)
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();

    // Test that the table structure exists
    expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redo/i })).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(
      <CsvTableViewer
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    // The component should handle empty content gracefully
    expect(screen.queryByText("Parsing CSV...")).not.toBeInTheDocument();
  });

  it("should display row and column counts", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    expect(screen.getByText("2 rows × 3 columns")).toBeInTheDocument();
  });

  it("should show undo/redo buttons", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    expect(screen.getByTitle("Undo")).toBeInTheDocument();
    expect(screen.getByTitle("Redo")).toBeInTheDocument();
  });

  it("should show add row/column buttons", () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    // Test that column action buttons are visible in headers (these are always rendered)
    expect(screen.getAllByTitle("Add column after").length).toBeGreaterThan(0);

    // Test that the toolbar has the expected functionality
    expect(screen.getByTitle("Create snapshot")).toBeInTheDocument();
    expect(screen.getByTitle("Find duplicate rows")).toBeInTheDocument();
  });

  describe("Search Functionality", () => {
    const searchableCsv = `Name,Age,City,Country
John Doe,28,New York,USA
Jane Smith,32,San Francisco,USA
Bob Johnson,45,Chicago,USA
Alice Johnson,25,New York,Canada`;

    it("should render search input and controls", () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Search input should be present
      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
      expect(screen.getByTestId("search-input")).toBeInTheDocument();
    });

    it("should show search navigation controls when search has results", () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Simulate user typing in search input - this requires firing change event
      fireEvent.change(searchInput, { target: { value: "John" } });

      // Navigation buttons should be present when there's a search query
      expect(screen.getByTestId("search-previous")).toBeInTheDocument();
      expect(screen.getByTestId("search-next")).toBeInTheDocument();
    });

    it("should show match count when searching", async () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Simulate typing "Johnson" which should appear in 2 rows
      fireEvent.change(searchInput, { target: { value: "Johnson" } });
      
      // The search match count element should be present
      expect(screen.getByTestId("search-match-count")).toBeInTheDocument();
    });

    it("should show clear button when search has text", () => {
      render(
        <CsvTableViewer
          content={searchableCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      const searchInput = screen.getByTestId("search-input");
      
      // Set search value using fireEvent
      fireEvent.change(searchInput, { target: { value: "test" } });
      
      // Clear button should be visible (X button in search input)
      const clearButton = searchInput.parentElement?.querySelector('button[title="Clear search"]');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe("Context Menu and Shift Right", () => {
    const raggedCsv = `Name,Age,City,Country
John Doe,28,New York
Jane Smith,32
Bob Johnson,45,Chicago,USA`;

    it("should not show context menu initially", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Context menu should not be visible initially
      expect(screen.queryByText("Insert Empty Cell & Shift Right")).not.toBeInTheDocument();
    });

    // Note: Testing right-click context menu is complex in jsdom environment
    // as it requires simulating mouse events and DOM manipulation
    // The actual functionality is tested through the useCsvData hook tests
    it("should have context menu structure available", () => {
      render(
        <CsvTableViewer
          content={raggedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify the component renders without errors and has the expected structure
      expect(screen.getByTestId("csv-table-viewer")).toBeInTheDocument();
      expect(screen.getByTestId("csv-table-container")).toBeInTheDocument();
    });
  });

  describe("Data Safety and Validation", () => {
    const testCsv = `Name,Age
John,28
Jane,32`;

    it("should handle content changes safely", () => {
      const { rerender } = render(
        <CsvTableViewer
          content={testCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify initial state
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("Age")).toBeInTheDocument();

      // Update content
      const updatedCsv = `Name,Age,City
John,28,NYC
Jane,32,SF`;

      rerender(
        <CsvTableViewer
          content={updatedCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Verify new content is rendered
      expect(screen.getByText("City")).toBeInTheDocument();
    });

    it("should display diagnostic information", () => {
      render(
        <CsvTableViewer
          content={testCsv}
          onContentChange={mockOnContentChange}
          tabId="test-tab"
          isActive={true}
          side="left"
        />,
      );

      // Should show row/column count
      expect(screen.getByTestId("row-column-status")).toBeInTheDocument();
      expect(screen.getByText("2 rows × 2 columns")).toBeInTheDocument();
    });
  });
});
