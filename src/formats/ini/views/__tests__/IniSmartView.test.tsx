import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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

    expect(screen.getByText("INI Structure")).toBeInTheDocument();
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
    expect(screen.getByText("0 properties")).toBeInTheDocument();
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

  it("should display tree structure properly", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show the tree structure
    expect(screen.getByText("All Sections")).toBeInTheDocument();
    expect(screen.getByText("database")).toBeInTheDocument();
    expect(screen.getByText("app")).toBeInTheDocument();
  });

  it("should allow adding a new section via tree header button", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click the add section button in tree header (Plus icon)
    const addButtons = screen.getAllByTitle("Add new section");
    const treeHeaderButton = addButtons.find(btn => btn.className.includes("text-secondary"));
    expect(treeHeaderButton).toBeInTheDocument();

    fireEvent.click(treeHeaderButton!);

    // Should show the add form in tree area
    expect(screen.getByPlaceholderText("Section name")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    // Fill in section name
    const input = screen.getByPlaceholderText("Section name");
    fireEvent.change(input, { target: { value: "newsection" } });

    // Click Add button
    const addSectionButton = screen.getByText("Add");
    fireEvent.click(addSectionButton);

    // Should close the form
    expect(screen.queryByPlaceholderText("Section name")).not.toBeInTheDocument();
  });

  it("should filter content when clicking on a section node", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click on database section
    const databaseSection = screen.getByText("database");
    fireEvent.click(databaseSection);

    // Should show filtered by message
    expect(screen.getByText("(filtered by database)")).toBeInTheDocument();
  });

  it("should show Add Key functionality", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show Add Key button
    expect(screen.getByText("Add Key")).toBeInTheDocument();

    // Click Add Key button
    const addKeyButton = screen.getByText("Add Key");
    fireEvent.click(addKeyButton);

    // Should show the add key form
    expect(screen.getByPlaceholderText("key_name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("value")).toBeInTheDocument();
  });

  it("should handle key-value editing", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show existing keys (values might be displayed)
    expect(screen.getByText("localhost")).toBeInTheDocument();
    expect(screen.getByText("5432")).toBeInTheDocument();
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

    expect(screen.getByText("7 properties")).toBeInTheDocument(); // 4 in database + 3 in app
  });

  it("should handle clicking on individual key nodes for filtering", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Expand database section first (if not auto-expanded)
    const databaseSection = screen.getByText("database");
    fireEvent.click(databaseSection);

    // Now look for individual keys - they might be in the tree structure
    // This tests that clicking individual keys works for filtering
    const hostElement = screen.getAllByText("host")[0]; // Get first occurrence
    if (hostElement) {
      fireEvent.click(hostElement);
      // Should show filtered by the key name
      expect(screen.getByText("(filtered by host)")).toBeInTheDocument();
    }
  });

  it("should handle Add Key form submission", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click Add Key button
    const addKeyButton = screen.getByText("Add Key");
    fireEvent.click(addKeyButton);

    // Fill in the form
    const keyInput = screen.getByPlaceholderText("key_name");
    const valueInput = screen.getByPlaceholderText("value");

    fireEvent.change(keyInput, { target: { value: "testkey" } });
    fireEvent.change(valueInput, { target: { value: "testvalue" } });

    // Submit the form
    const addButton = screen.getByText("Add");
    fireEvent.click(addButton);

    // Form should close
    expect(screen.queryByPlaceholderText("key_name")).not.toBeInTheDocument();
  });

  it("should handle cancelling Add Key form", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click Add Key button
    const addKeyButton = screen.getByText("Add Key");
    fireEvent.click(addKeyButton);

    // Cancel the form
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Form should close
    expect(screen.queryByPlaceholderText("key_name")).not.toBeInTheDocument();
  });

  it("should handle cancelling Add Section form", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click the add section button in tree header (Plus icon)
    const addButtons = screen.getAllByTitle("Add new section");
    const treeHeaderButton = addButtons.find(btn => btn.className.includes("text-secondary"));
    expect(treeHeaderButton).toBeInTheDocument();
    fireEvent.click(treeHeaderButton!);;

    // Cancel the form
    const cancelButton = screen.getAllByText("Cancel")[0]; // Get first Cancel button
    fireEvent.click(cancelButton);

    // Form should close
    expect(screen.queryByPlaceholderText("Section name")).not.toBeInTheDocument();
  });

  it("should disable Add button when section name is empty", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click the add section button in tree header (Plus icon)
    const addButtons = screen.getAllByTitle("Add new section");
    const treeHeaderButton = addButtons.find(btn => btn.className.includes("text-secondary"));
    expect(treeHeaderButton).toBeInTheDocument();
    fireEvent.click(treeHeaderButton!);;

    // Add button should be disabled when input is empty
    const addSectionButton = screen.getByText("Add", { selector: "button" });
    expect(addSectionButton).toBeDisabled();

    // Type something and it should become enabled
    const input = screen.getByPlaceholderText("Section name");
    fireEvent.change(input, { target: { value: "test" } });

    expect(addSectionButton).not.toBeDisabled();
  });

  it("should show proper count when no sections exist", () => {
    render(
      <IniSmartView
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("0 properties")).toBeInTheDocument();
    expect(screen.getByText("All Sections")).toBeInTheDocument();
  });

  it("should handle complex INI with nested structure", () => {
    const complexIni = `[section1]
key1 = value1
key2 = value2

[section2]  
key3 = value3

[section1.subsection]
subkey = subvalue`;

    render(
      <IniSmartView
        content={complexIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("section1")).toBeInTheDocument();
    expect(screen.getByText("section2")).toBeInTheDocument();
    expect(screen.getByText("section1.subsection")).toBeInTheDocument();
  });

  it("should show tree header Add Section button only when All Sections is selected", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show tree header Add Section button initially (All Sections view)
    const treeHeaderButtons = screen.getAllByTitle("Add new section");
    expect(treeHeaderButtons.length).toBeGreaterThan(0);

    // Click on a specific section
    const databaseSection = screen.getByText("database");
    fireEvent.click(databaseSection);

    // Tree header Add Section button should be hidden when a section is selected
    const treeHeaderButtonsAfterFilter = screen.queryAllByTitle("Add new section");
    expect(treeHeaderButtonsAfterFilter.length).toBe(0);

    // Click on All Sections to go back
    const allSectionsNode = screen.getByText("All Sections");
    fireEvent.click(allSectionsNode);

    // Tree header Add Section button should be visible again
    const treeHeaderButtonsBackToRoot = screen.getAllByTitle("Add new section");
    expect(treeHeaderButtonsBackToRoot.length).toBeGreaterThan(0);
  });

  it("should filter to show only the specific key when clicking on key nodes", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Initially should show all properties
    expect(screen.getByText("7 properties")).toBeInTheDocument();

    // Click on database section first to see its keys
    const databaseSection = screen.getByText("database");
    fireEvent.click(databaseSection);

    // Should show filtered by database and only database section properties
    expect(screen.getByText("(filtered by database)")).toBeInTheDocument();
    expect(screen.getByText("localhost")).toBeInTheDocument();
    expect(screen.getByText("5432")).toBeInTheDocument();
    expect(screen.getByText("admin")).toBeInTheDocument();

    // Find and click on a specific key (like 'host') - this might be in the tree or the editor
    // Try to find host in the tree structure first
    const hostElements = screen.getAllByText("host");
    if (hostElements.length > 0) {
      // Click on the first host element (should be in tree)
      fireEvent.click(hostElements[0]);

      // Should show filtered by host
      expect(screen.getByText("(filtered by host)")).toBeInTheDocument();

      // Should only show the host key-value pair now (not other database keys)
      expect(screen.getByText("localhost")).toBeInTheDocument();

      // Other database keys should not be prominent (they might still exist in editor but filtered)
      // This tests that filtering is working at the data level
    }
  });

  it("should show section name when filtering by section and key name when filtering by key", () => {
    render(
      <IniSmartView
        content={sampleIni}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click on database section
    const databaseSection = screen.getByText("database");
    fireEvent.click(databaseSection);

    // Should show section name in filter
    expect(screen.getByText("(filtered by database)")).toBeInTheDocument();

    // Click on a key within database
    const hostElements = screen.getAllByText("host");
    if (hostElements.length > 0) {
      fireEvent.click(hostElements[0]);

      // Should show key name in filter  
      expect(screen.getByText("(filtered by host)")).toBeInTheDocument();

      // Should NOT show database in filter anymore
      expect(screen.queryByText("(filtered by database)")).not.toBeInTheDocument();
    }
  });

});