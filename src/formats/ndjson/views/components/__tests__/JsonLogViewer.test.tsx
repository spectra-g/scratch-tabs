import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { JsonLogViewer } from "../JsonLogViewer";

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

// JsonTreeView is already mocked globally in src/__mocks__/JsonTreeView.js

const mockOnContentChange = jest.fn();

const sampleNdjson = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server", "metadata": {"key": "value"}}`;

describe("JsonLogViewer", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  it("should render log data in a table", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByTestId("json-log-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("json-log-table")).toBeInTheDocument();
  });

  it("should display column headers", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("timestamp")).toBeInTheDocument();
    expect(screen.getByText("level")).toBeInTheDocument();
    expect(screen.getByText("message")).toBeInTheDocument();
    expect(screen.getByText("service")).toBeInTheDocument();
  });

  it("should show line numbers", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("#")).toBeInTheDocument(); // Line number header
  });

  it("should handle nested objects with expand button", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Look for the Object button in the metadata column
    const objectButtons = screen.getAllByText("Object");
    expect(objectButtons.length).toBeGreaterThan(0);
  });

  it("should open nested object popover on click", async () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const objectButton = screen.getAllByText("Object")[0];
    fireEvent.click(objectButton);

    await waitFor(() => {
      expect(screen.getByTestId("json-tree-view")).toBeInTheDocument();
    });
  });

  it("should filter entries based on toolbar filters", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Initially should show all entries
    expect(screen.getByText("Showing 3 of 3 entries")).toBeInTheDocument();

    // Click on Error level filter to hide error entries
    const errorButton = screen.getByText("Error");
    fireEvent.click(errorButton);

    // Should now show 2 entries (info and debug, excluding error)
    expect(screen.getByText("Showing 2 of 3 entries")).toBeInTheDocument();
  });

  it("should handle text search", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const searchInput = screen.getByPlaceholderText("Search logs...");
    fireEvent.change(searchInput, { target: { value: "api-gateway" } });

    // Should filter to show only the api-gateway entry
    expect(screen.getByText("Showing 1 of 3 entries")).toBeInTheDocument();
  });

  it("should open column stats modal", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const statsButton = screen.getByText("Column Stats");
    fireEvent.click(statsButton);

    expect(screen.getByText("Column Statistics")).toBeInTheDocument();
  });

  it("should handle column visibility toggle", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Open column manager - sample data has 5 columns: timestamp, level, message, service, metadata
    const columnsButton = screen.getByText("Columns (5/5)");
    fireEvent.click(columnsButton);

    // Toggle off the service column
    const serviceCheckbox = screen.getByRole("checkbox", { name: /service/ });
    fireEvent.click(serviceCheckbox);

    // Column should be hidden
    expect(screen.getByText("Columns (4/5)")).toBeInTheDocument();
  });

  it("should handle export functionality", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const exportButton = screen.getByText("Export");
    fireEvent.click(exportButton);

    expect(screen.getByText("NDJSON")).toBeInTheDocument();
    expect(screen.getByText("JSON Array")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("should handle empty content gracefully", () => {
    render(
      <JsonLogViewer
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("Showing 0 of 0 entries")).toBeInTheDocument();
  });

  it("should handle invalid JSON content", () => {
    const invalidContent = `{"valid": "json"}
{invalid json}
{"another": "valid"}`;

    render(
      <JsonLogViewer
        content={invalidContent}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show 2 valid entries out of 3 total
    expect(screen.getByText("Showing 2 of 3 entries")).toBeInTheDocument();
    expect(screen.getByText("1 invalid")).toBeInTheDocument();
  });

  it("should sort columns correctly", () => {
    render(
      <JsonLogViewer
        content={sampleNdjson}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click on level column header to sort
    const levelHeader = screen.getByText("level");
    fireEvent.click(levelHeader);

    // Should show sort indicator
    expect(screen.getByText("↑")).toBeInTheDocument();
  });
});