import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { IniSmartView } from "../components/IniSmartView";

// Mock the useRootStore hook
jest.mock("../../../../stores/rootStore", () => ({
  useRootStore: () => ({
    addBackgroundTab: jest.fn(),
  }),
}));

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

const sampleIni = `# Database configuration
[database]
host = localhost
port = 5432
user = admin
password = secret123

# Application settings
[app]
name = My Application
version = 1.0.0
debug = false`;

describe("IniSmartView", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  it("should render INI data with sections", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByTestId("ini-smart-view")).toBeInTheDocument();
    expect(screen.getByText("database")).toBeInTheDocument();
    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("should display section navigation", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("Sections")).toBeInTheDocument();
    expect(screen.getByText("database")).toBeInTheDocument();
    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("should show toolbox with transformation options", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("Sort")).toBeInTheDocument();
    expect(screen.getByText("Clean")).toBeInTheDocument();
    expect(screen.getByText("Convert")).toBeInTheDocument();
  });

  it("should handle section selection", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const databaseSection = screen.getByText("database");
    fireEvent.click(databaseSection);

    // Should show the section editor for database
    expect(screen.getByText("[database]")).toBeInTheDocument();
  });

  it("should show validation status", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show valid status for well-formed INI
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });

  it("should handle empty content gracefully", () => {
    render(
      <IniSmartView
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("All Sections")).toBeInTheDocument();
    expect(screen.getByText("0 sections")).toBeInTheDocument();
  });

  it("should detect and show validation issues", () => {
    const invalidIni = `[database]
host = localhost

[database]
port = 5432`;

    render(
      <IniSmartView
        content={invalidIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show validation errors
    expect(screen.getByText(/1 errors, 0 warnings/)).toBeInTheDocument();
  });

  it("should open sorting menu", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const sortButton = screen.getByText("Sort");
    fireEvent.click(sortButton);

    expect(screen.getByText("Sort All Sections")).toBeInTheDocument();
  });

  it("should open cleaning menu", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const cleanButton = screen.getByText("Clean");
    fireEvent.click(cleanButton);

    expect(screen.getByText("Strip All Comments")).toBeInTheDocument();
    expect(screen.getByText("Normalize Spacing")).toBeInTheDocument();
    expect(screen.getByText("Trim Whitespace")).toBeInTheDocument();
  });

  it("should open converters menu", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    const convertButton = screen.getByText("Convert");
    fireEvent.click(convertButton);

    expect(screen.getByText("Convert to JSON")).toBeInTheDocument();
    expect(screen.getByText("Convert to YAML")).toBeInTheDocument();
  });

  it("should handle add section form", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click the add section button (Plus icon)
    const addButton = screen.getByTitle("Add new section");
    fireEvent.click(addButton);

    // Should show the add form
    expect(screen.getByPlaceholderText("Section name")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("should show section statistics", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("2 sections")).toBeInTheDocument();
    expect(screen.getByText("7 keys")).toBeInTheDocument(); // 4 in database + 3 in app
  });
});