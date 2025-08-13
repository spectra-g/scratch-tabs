import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PropertiesSmartView } from "../components/PropertiesSmartView";

// Mock the root store
jest.mock("../../../../stores/rootStore", () => ({
  useRootStore: () => ({
    addBackgroundTab: jest.fn(),
  }),
}));

// Mock the tab utils
jest.mock("../../../../utils/tabUtils", () => ({
  createTab: jest.fn((options) => ({
    id: "mock-tab-id",
    ...options,
  })),
}));

const mockOnContentChange = jest.fn();

const sampleProperties = `# Application Configuration
app.name = My Application
app.version = 1.0.0
app.debug = false

# Database settings
database.host = localhost
database.port = 5432
database.user = admin
database.password = secret

server.port = 8080`;

describe("PropertiesSmartView", () => {
  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  it("should render the properties smart view", () => {
    render(
      <PropertiesSmartView
        content={sampleProperties}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByTestId("properties-smart-view")).toBeInTheDocument();
    expect(screen.getByText("Property Hierarchy")).toBeInTheDocument();
    expect(screen.getAllByText("All Properties")).toHaveLength(2); // Appears in tree and header
  });

  it("should display tree structure", () => {
    render(
      <PropertiesSmartView
        content={sampleProperties}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.getByText("database")).toBeInTheDocument();
    expect(screen.getByText("server")).toBeInTheDocument();
  });

  it("should show toolbox with transformation options", () => {
    render(
      <PropertiesSmartView
        content={sampleProperties}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("Sort Keys")).toBeInTheDocument();
    expect(screen.getByText("Group by Prefix")).toBeInTheDocument();
    expect(screen.getByText("Strip Comments")).toBeInTheDocument();
    expect(screen.getByText("To JSON")).toBeInTheDocument();
    expect(screen.getByText("To YAML")).toBeInTheDocument();
  });

  it("should handle tree node selection", async () => {
    render(
      <PropertiesSmartView
        content={sampleProperties}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click on the 'app' node
    const appNode = screen.getByText("app");
    fireEvent.click(appNode);

    // Should filter to show only app properties
    await waitFor(() => {
      expect(screen.getByText("Properties: app")).toBeInTheDocument();
    });
  });

  it("should show validation issues", () => {
    const contentWithIssues = `app.name = Valid
app.name = Duplicate
empty.value = 
invalid key = value`;

    render(
      <PropertiesSmartView
        content={contentWithIssues}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Should show validation issues button
    expect(screen.getAllByText(/Issues/)).toHaveLength(2); // Appears in button and status area
  });

  it("should handle add property form", async () => {
    render(
      <PropertiesSmartView
        content={sampleProperties}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click add property button
    const addButton = screen.getByText("Add Property");
    fireEvent.click(addButton);

    // Should show the add form
    expect(screen.getByPlaceholderText("Key")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Value")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Comment (optional)")).toBeInTheDocument();

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText("Key"), {
      target: { value: "new.key" },
    });
    fireEvent.change(screen.getByPlaceholderText("Value"), {
      target: { value: "new value" },
    });

    // Submit the form
    const submitButton = screen.getByText("Add");
    fireEvent.click(submitButton);

    // Wait for debounced call
    await new Promise(resolve => setTimeout(resolve, 350));

    expect(mockOnContentChange).toHaveBeenCalled();
  });

  it("should handle empty content gracefully", () => {
    render(
      <PropertiesSmartView
        content=""
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    expect(screen.getByText("No properties found")).toBeInTheDocument();
  });

  it("should handle transformation actions", async () => {
    render(
      <PropertiesSmartView
        content={sampleProperties}
        onContentChange={mockOnContentChange}
        tabId="test-tab"
        isActive={true}
        side="left"
      />
    );

    // Click sort keys
    const sortButton = screen.getByText("Sort Keys");
    fireEvent.click(sortButton);

    // Wait for debounced call
    await new Promise(resolve => setTimeout(resolve, 350));

    expect(mockOnContentChange).toHaveBeenCalled();
  });
});