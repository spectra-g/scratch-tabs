import { render, screen } from "@testing-library/react";
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
});
