import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PromptManagerUI } from "../components/PromptManagerUI";
import { PromptManagerData } from "../types";

// Mock child components
jest.mock("../components/Tabs", () => ({
  Tabs: ({ activeTab, onTabChange, searchQuery, showFiltersPanel }: any) => (
    <div data-testid="tabs">
      <button data-testid="prompts-tab" onClick={() => onTabChange("prompts")}>Prompts</button>
      <button data-testid="templates-tab" onClick={() => onTabChange("templates")}>Templates</button>
      <button data-testid="snippets-tab" onClick={() => onTabChange("snippets")}>Snippets</button>
      <button data-testid="workflows-tab" onClick={() => onTabChange("workflows")}>Workflows</button>
      <span data-testid="search-query-display">{searchQuery}</span>
      <span data-testid="active-tab-display">{activeTab}</span>
      <span data-testid="filters-panel-display">{showFiltersPanel ? "visible" : "hidden"}</span>
    </div>
  ),
}));

jest.mock("../components/Sidebar", () => ({
  Sidebar: ({ tags, selectedTags, showFavoritesOnly, showFiltersPanel }: any) => (
    <div data-testid="sidebar">
      <div data-testid="tags-count">{tags?.length || 0}</div>
      <div data-testid="selected-tags">{selectedTags?.join(",") || ""}</div>
      <div data-testid="favorites-only">{showFavoritesOnly?.toString() || "false"}</div>
      <div data-testid="filters-panel">{showFiltersPanel?.toString() || "false"}</div>
    </div>
  ),
}));

jest.mock("../components/PromptList", () => ({
  PromptList: ({ prompts, selectedPromptId }: any) => (
    <div data-testid="prompt-list">
      <div data-testid="prompts-count">{prompts?.length || 0}</div>
      <div data-testid="selected-prompt-id">{selectedPromptId || "none"}</div>
    </div>
  ),
}));

jest.mock("../components/PromptEditor", () => ({
  PromptEditor: ({ prompt }: any) => (
    <div data-testid="prompt-editor">
      <div data-testid="prompt-title">{prompt?.title || ""}</div>
      <div data-testid="prompt-content">{prompt?.content || ""}</div>
    </div>
  ),
}));

jest.mock("../components/TemplateList", () => ({
  TemplateList: ({ templates, selectedTemplateId }: any) => (
    <div data-testid="template-list">
      <div data-testid="templates-count">{templates?.length || 0}</div>
      <div data-testid="selected-template-id">{selectedTemplateId || "none"}</div>
    </div>
  ),
}));

jest.mock("../components/SnippetList", () => ({
  SnippetList: ({ snippets, selectedSnippetId }: any) => (
    <div data-testid="snippet-list">
      <div data-testid="snippets-count">{snippets?.length || 0}</div>
      <div data-testid="selected-snippet-id">{selectedSnippetId || "none"}</div>
    </div>
  ),
}));

jest.mock("../components/WorkflowList", () => ({
  WorkflowList: ({ workflows, selectedWorkflowId }: any) => (
    <div data-testid="workflow-list">
      <div data-testid="workflows-count">{workflows?.length || 0}</div>
      <div data-testid="selected-workflow-id">{selectedWorkflowId || "none"}</div>
    </div>
  ),
}));

jest.mock("../components/WorkflowEditor", () => ({
  WorkflowEditor: ({ workflow }: any) => (
    <div data-testid="workflow-editor">
      <div data-testid="workflow-title">{workflow?.title || ""}</div>
      <div data-testid="workflow-description">{workflow?.description || ""}</div>
    </div>
  ),
}));

describe("PromptManagerUI", () => {
  const mockData: PromptManagerData = {
    prompts: [
      {
        id: "prompt-1",
        title: "Test Prompt 1",
        content: "Test content 1",
        tags: ["tag1"],
        isFavorite: false,
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 0,
        history: []
      },
      {
        id: "prompt-2",
        title: "Test Prompt 2",
        content: "Test content 2",
        tags: ["tag2"],
        isFavorite: true,
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 5,
        history: []
      }
    ],
    templates: [],
    snippets: [],
    workflows: [],
    tags: [
      {
        id: "tag1",
        name: "Tag 1",
        color: "#ff0000",
        isBuiltIn: false
      },
      {
        id: "tag2",
        name: "Tag 2",
        color: "#00ff00",
        isBuiltIn: false
      }
    ],
    settings: {
      sortBy: "lastModified",
      sortDirection: "desc",
      viewMode: "list"
    },
    ui: {
      activeTab: "prompts",
      selectedPromptId: null,
      selectedTemplateId: null,
      selectedSnippetId: null,
      selectedWorkflowId: null,
      searchQuery: "",
      selectedTags: [],
      showFavoritesOnly: false,
      showFiltersPanel: false
    }
  };

  const mockProps = {
    data: mockData,
    updateData: jest.fn(),
    updateUI: jest.fn(),
    updateSettings: jest.fn(),
    createPrompt: jest.fn(),
    updatePrompt: jest.fn(),
    deletePrompt: jest.fn(),
    clonePrompt: jest.fn(),
    incrementPromptUsage: jest.fn(),
    toggleFavorite: jest.fn(),
    createWorkflow: jest.fn(),
    updateWorkflow: jest.fn(),
    deleteWorkflow: jest.fn(),
    cloneWorkflow: jest.fn(),
    toggleWorkflowFavorite: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    createSnippet: jest.fn(),
    updateSnippet: jest.fn(),
    deleteSnippet: jest.fn(),
    createTag: jest.fn(),
    updateTag: jest.fn(),
    deleteTag: jest.fn(),
    importData: jest.fn(),
    exportData: jest.fn(),
    createPromptFromTemplate: jest.fn(),
    getTemplateVariables: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the main UI structure", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      expect(screen.getByTestId("tabs")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("prompt-list")).toBeInTheDocument();
    });

    it("should display correct active tab", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      expect(screen.getByTestId("active-tab-display")).toHaveTextContent("prompts");
    });

    it("should display correct counts", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      expect(screen.getByTestId("prompts-count")).toHaveTextContent("2");
      expect(screen.getByTestId("tags-count")).toHaveTextContent("2");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing data gracefully", () => {
      const incompleteData = {
        ...mockData,
        prompts: undefined as any,
        templates: undefined as any,
        snippets: undefined as any,
        workflows: undefined as any,
        tags: undefined as any
      };

      render(<PromptManagerUI {...mockProps} data={incompleteData} />);
      
      // Should not crash and should display 0 counts
      expect(screen.getByTestId("prompts-count")).toHaveTextContent("0");
      expect(screen.getByTestId("tags-count")).toHaveTextContent("0");
    });

    it("should handle empty data gracefully", () => {
      const emptyData: PromptManagerData = {
        prompts: [],
        templates: [],
        snippets: [],
        workflows: [],
        tags: [],
        settings: {
          sortBy: "lastModified",
          sortDirection: "desc",
          viewMode: "list"
        },
        ui: {
          activeTab: "prompts",
          selectedPromptId: null,
          selectedTemplateId: null,
          selectedSnippetId: null,
          selectedWorkflowId: null,
          searchQuery: "",
          selectedTags: [],
          showFavoritesOnly: false,
          showFiltersPanel: false
        }
      };

      render(<PromptManagerUI {...mockProps} data={emptyData} />);
      
      expect(screen.getByTestId("prompts-count")).toHaveTextContent("0");
      expect(screen.getByTestId("tags-count")).toHaveTextContent("0");
    });
  });
}); 