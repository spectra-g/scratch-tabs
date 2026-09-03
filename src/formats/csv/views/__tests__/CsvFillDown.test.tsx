import * as React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CsvTableViewer } from "../components/CsvTableViewer";

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

const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;

const mockOnContentChange = jest.fn();
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("CSV Copy Down (Fill Down) context menu", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
    jest.clearAllMocks();
  });

  it("shows Copy down with row count when right-clicking a non-last cell", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    fireEvent.contextMenu(screen.getByText("John Doe"));

    const button = await screen.findByTestId("fill-down-button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Copy down (2 rows)");
    expect(button).toBeEnabled();
  });

  it("shows singular row label when one row is below", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    fireEvent.contextMenu(screen.getByText("Jane Smith"));

    const button = await screen.findByTestId("fill-down-button");
    expect(button).toHaveTextContent("Copy down (1 row)");
    expect(button).toBeEnabled();
  });

  it("disables Copy down on the last row with no-rows tooltip", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    fireEvent.contextMenu(screen.getByText("Bob Johnson"));

    const button = await screen.findByTestId("fill-down-button");
    expect(button).toHaveTextContent("Copy down");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "No rows below to fill");
  });

  it("does not show Copy down for column header right-click", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    const ageHeaderCell = screen
      .getAllByTestId("column-header")
      .find((header) => header.textContent?.includes("Age"));
    expect(ageHeaderCell).toBeDefined();
    fireEvent.contextMenu(ageHeaderCell!);

    // Column menu appears (Copy columns) but no fill-down button
    expect(await screen.findByText("Copy columns")).toBeInTheDocument();
    expect(screen.queryByTestId("fill-down-button")).not.toBeInTheDocument();
  });

  it("fills the value down and closes the menu on click", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    fireEvent.contextMenu(screen.getByText("John Doe"));
    const button = await screen.findByTestId("fill-down-button");

    await act(async () => {
      fireEvent.click(button);
      await delay(50);
    });

    // Menu closes
    expect(screen.queryByTestId("fill-down-button")).not.toBeInTheDocument();

    // All Name cells now "John Doe" (3 occurrences: source + 2 filled)
    await waitFor(() => {
      expect(screen.getAllByText("John Doe").length).toBeGreaterThanOrEqual(3);
    });

    // Content sync fired with filled rows
    await waitFor(() => {
      expect(mockOnContentChange).toHaveBeenCalled();
    });
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    const lines = lastCall.split("\n");
    expect(lines[2].startsWith("John Doe")).toBe(true);
    expect(lines[3].startsWith("John Doe")).toBe(true);
  });

  it("overwrites differing values below in the same column only", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    // Right-click "28" (Age of first row) and fill down
    fireEvent.contextMenu(screen.getByText("28"));
    const button = await screen.findByTestId("fill-down-button");

    await act(async () => {
      fireEvent.click(button);
      await delay(50);
    });

    await waitFor(() => {
      expect(mockOnContentChange).toHaveBeenCalled();
    });
    const lastCall: string =
      mockOnContentChange.mock.calls[
        mockOnContentChange.mock.calls.length - 1
      ][0];
    // Ages all 28, names preserved
    expect(lastCall).toContain("Jane Smith,28,San Francisco");
    expect(lastCall).toContain("Bob Johnson,28,Chicago");
    expect(lastCall).toContain("John Doe,28,New York");
  });

  it("does nothing when clicking disabled Copy down on last row", async () => {
    render(
      <CsvTableViewer
        content={sampleCsv}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />,
    );

    fireEvent.contextMenu(screen.getByText("Bob Johnson"));
    const button = await screen.findByTestId("fill-down-button");
    expect(button).toBeDisabled();

    // Disabled buttons do not fire click handlers in the browser; jsdom +
    // React still suppress onClick for disabled <button>, so content stays.
    fireEvent.click(button);
    await act(async () => {
      await delay(400);
    });

    expect(mockOnContentChange).not.toHaveBeenCalled();
  });
});
