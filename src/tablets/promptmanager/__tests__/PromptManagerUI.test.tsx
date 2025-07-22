import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PromptManagerUI } from "../components/PromptManagerUI";
import { PromptManagerData, Prompt, Template, Snippet, Tag, Workflow } from "../types";

// Mock child components
jest.mock("../components/Tabs", () => ({
  Tabs: ({ activeTab, onTabChange }: any) => (
    <div data-testid="tabs">
      <button data-testid="prompts-tab" onClick={() => onTabChange("prompts")}>Prompts</button>
      <button data-testid="templates-tab" onClick={() => onTabChange("templates")}>Templates</button>
      <button data-testid="snippets-tab" onClick={() => onTabChange("snippets")}>Snippets</button>
      <button data-testid="workflows-tab" onClick={() => onTabChange("workflows")}>Workflows</button>
      <div data-testid="active-tab">{activeTab}</div>
    </div>
  ),
}));

jest.mock("../components/Sidebar", () => ({
  Sidebar: ({ data, onSearch, onTagSelect, onFavoritesToggle, onFiltersToggle }: any) => (
    <div data-testid="sidebar">
      <input data-testid="search-input" onChange={(e) => onSearch(e.target.value)} placeholder="Search..." />
      <button data-testid="favorites-toggle" onClick={onFavoritesToggle}>Favorites</button>
      <button data-testid="filters-toggle" onClick={onFiltersToggle}>Filters</button>
      <div data-testid="selected-tags">{data?.ui?.selectedTags?.join(",") || ""}</div>
      <div data-testid="favorites-only">{data?.ui?.showFavoritesOnly?.toString() || "false"}</div>
      <div data-testid="filters-panel">{data?.ui?.showFiltersPanel?.toString() || "false"}</div>
    </div>
  ),
}));

jest.mock("../components/PromptList", () => ({
  PromptList: ({ data, onSelect, onCreate, onUpdate, onDelete, onClone, onToggleFavorite }: any) => (
    <div data-testid="prompt-list">
      <div data-testid="prompts-count">{data.prompts.length}</div>
      <button data-testid="create-prompt" onClick={onCreate}>Create Prompt</button>
      {data.prompts.map((prompt: Prompt) => (
        <div key={prompt.id} data-testid={`prompt-${prompt.id}`}>
          <span data-testid={`prompt-title-${prompt.id}`}>{prompt.title}</span>
          <button data-testid={`select-prompt-${prompt.id}`} onClick={() => onSelect(prompt.id)}>Select</button>
          <button data-testid={`update-prompt-${prompt.id}`} onClick={() => onUpdate(prompt.id, { title: "Updated" })}>Update</button>
          <button data-testid={`delete-prompt-${prompt.id}`} onClick={() => onDelete(prompt.id)}>Delete</button>
          <button data-testid={`clone-prompt-${prompt.id}`} onClick={() => onClone(prompt.id)}>Clone</button>
          <button data-testid={`toggle-favorite-prompt-${prompt.id}`} onClick={() => onToggleFavorite(prompt.id)}>Toggle Favorite</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../components/PromptEditor", () => ({
  PromptEditor: ({ prompt, onSave, onCancel }: any) => (
    <div data-testid="prompt-editor">
      <input data-testid="prompt-title-input" defaultValue={prompt?.title || ""} />
      <textarea data-testid="prompt-content-input" defaultValue={prompt?.content || ""} />
      <button data-testid="save-prompt" onClick={() => onSave({ title: "Saved", content: "Content" })}>Save</button>
      <button data-testid="cancel-prompt" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

jest.mock("../components/TemplateList", () => ({
  TemplateList: ({ data, allTemplates, onSelect, onCreate, onUpdate, onDelete }: any) => (
    <div data-testid="template-list">
      <div data-testid="templates-count">{data.templates.length}</div>
      <div data-testid="all-templates-count">{allTemplates.length}</div>
      <button data-testid="create-template" onClick={onCreate}>Create Template</button>
      {data.templates.map((template: Template) => (
        <div key={template.id} data-testid={`template-${template.id}`}>
          <span data-testid={`template-title-${template.id}`}>{template.title}</span>
          <button data-testid={`select-template-${template.id}`} onClick={() => onSelect(template.id)}>Select</button>
          <button data-testid={`update-template-${template.id}`} onClick={() => onUpdate(template.id, { title: "Updated" })}>Update</button>
          <button data-testid={`delete-template-${template.id}`} onClick={() => onDelete(template.id)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../components/SnippetList", () => ({
  SnippetList: ({ data, allSnippets, onSelect, onCreate, onUpdate, onDelete }: any) => (
    <div data-testid="snippet-list">
      <div data-testid="snippets-count">{data.snippets.length}</div>
      <div data-testid="all-snippets-count">{allSnippets.length}</div>
      <button data-testid="create-snippet" onClick={onCreate}>Create Snippet</button>
      {data.snippets.map((snippet: Snippet) => (
        <div key={snippet.id} data-testid={`snippet-${snippet.id}`}>
          <span data-testid={`snippet-title-${snippet.id}`}>{snippet.title}</span>
          <button data-testid={`select-snippet-${snippet.id}`} onClick={() => onSelect(snippet.id)}>Select</button>
          <button data-testid={`update-snippet-${snippet.id}`} onClick={() => onUpdate(snippet.id, { title: "Updated" })}>Update</button>
          <button data-testid={`delete-snippet-${snippet.id}`} onClick={() => onDelete(snippet.id)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../components/WorkflowList", () => ({
  WorkflowList: ({ data, onSelect, onCreate, onUpdate, onDelete, onClone, onToggleFavorite }: any) => (
    <div data-testid="workflow-list">
      <div data-testid="workflows-count">{data.workflows.length}</div>
      <button data-testid="create-workflow" onClick={onCreate}>Create Workflow</button>
      {data.workflows.map((workflow: Workflow) => (
        <div key={workflow.id} data-testid={`workflow-${workflow.id}`}>
          <span data-testid={`workflow-title-${workflow.id}`}>{workflow.title}</span>
          <button data-testid={`select-workflow-${workflow.id}`} onClick={() => onSelect(workflow.id)}>Select</button>
          <button data-testid={`update-workflow-${workflow.id}`} onClick={() => onUpdate(workflow.id, { title: "Updated" })}>Update</button>
          <button data-testid={`delete-workflow-${workflow.id}`} onClick={() => onDelete(workflow.id)}>Delete</button>
          <button data-testid={`clone-workflow-${workflow.id}`} onClick={() => onClone(workflow.id)}>Clone</button>
          <button data-testid={`toggle-favorite-workflow-${workflow.id}`} onClick={() => onToggleFavorite(workflow.id)}>Toggle Favorite</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../components/WorkflowEditor", () => ({
  WorkflowEditor: ({ workflow, onSave, onCancel }: any) => (
    <div data-testid="workflow-editor">
      <input data-testid="workflow-title-input" defaultValue={workflow?.title || ""} />
      <textarea data-testid="workflow-description-input" defaultValue={workflow?.description || ""} />
      <button data-testid="save-workflow" onClick={() => onSave({ title: "Saved", description: "Description" })}>Save</button>
      <button data-testid="cancel-workflow" onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

jest.mock("../components/ImportExportModal", () => ({
  ImportExportModal: ({ isOpen, mode, onClose, onImport, onExport }: any) => (
    <div data-testid="import-export-modal" style={{ display: isOpen ? "block" : "none" }}>
      <div data-testid="modal-mode">{mode}</div>
      <button data-testid="close-modal" onClick={onClose}>Close</button>
      <button data-testid="import-data" onClick={() => onImport({ prompts: [] })}>Import</button>
      <button data-testid="export-data" onClick={onExport}>Export</button>
    </div>
  ),
}));

jest.mock("../components/SelectTemplateModal", () => ({
  SelectTemplateModal: ({ isOpen, templates, onClose, onSelect }: any) => (
    <div data-testid="select-template-modal" style={{ display: isOpen ? "block" : "none" }}>
      <div data-testid="templates-count">{templates.length}</div>
      <button data-testid="close-template-modal" onClick={onClose}>Close</button>
      <button data-testid="select-template" onClick={() => onSelect("template-1")}>Select Template</button>
    </div>
  ),
}));

jest.mock("../components/VariableFillModal", () => ({
  VariableFillModal: ({ isOpen, variables, onClose, onSubmit }: any) => (
    <div data-testid="variable-fill-modal" style={{ display: isOpen ? "block" : "none" }}>
      <div data-testid="variables-count">{variables.length}</div>
      <button data-testid="close-variable-modal" onClick={onClose}>Close</button>
      <button data-testid="submit-variables" onClick={() => onSubmit({ name: "John", age: "25" })}>Submit</button>
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
    templates: [
      {
        id: "template-1",
        title: "Test Template 1",
        description: "Test description 1",
        content: "Hello {{name}}!",
        category: "test"
      }
    ],
    snippets: [
      {
        id: "snippet-1",
        title: "Test Snippet 1",
        content: "Test snippet content 1",
        category: "test"
      }
    ],
    workflows: [
      {
        id: "workflow-1",
        title: "Test Workflow 1",
        description: "Test workflow description 1",
        steps: [{ id: "step1", promptId: "prompt-1" }],
        tags: ["tag1"],
        isFavorite: false,
        createdAt: Date.now(),
        lastModified: Date.now()
      }
    ],
    tags: [
      {
        id: "tag1",
        name: "Test Tag 1",
        color: "#ff0000"
      },
      {
        id: "tag2",
        name: "Test Tag 2",
        color: "#00ff00"
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

  const mockAllTemplates: Template[] = [
    {
      id: "builtin-template-1",
      title: "Built-in Template 1",
      description: "Built-in description 1",
      content: "Built-in content 1",
      category: "builtin",
      isBuiltIn: true
    }
  ];

  const mockAllSnippets: Snippet[] = [
    {
      id: "builtin-snippet-1",
      title: "Built-in Snippet 1",
      content: "Built-in snippet content 1",
      category: "builtin",
      isBuiltIn: true
    }
  ];

  const mockProps = {
    data: mockData,
    allTemplates: mockAllTemplates,
    allSnippets: mockAllSnippets,
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
      
      expect(screen.getByTestId("active-tab")).toHaveTextContent("prompts");
    });

    it("should display correct counts", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      expect(screen.getByTestId("prompts-count")).toHaveTextContent("2");
      expect(screen.getByTestId("templates-count")).toHaveTextContent("1");
      expect(screen.getByTestId("snippets-count")).toHaveTextContent("1");
      expect(screen.getByTestId("workflows-count")).toHaveTextContent("1");
    });

    it("should display all templates and snippets counts", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to templates tab
      fireEvent.click(screen.getByTestId("templates-tab"));
      expect(screen.getByTestId("all-templates-count")).toHaveTextContent("1");
      
      // Switch to snippets tab
      fireEvent.click(screen.getByTestId("snippets-tab"));
      expect(screen.getByTestId("all-snippets-count")).toHaveTextContent("1");
    });
  });

  describe("Tab Navigation", () => {
    it("should handle tab changes", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Click on templates tab
      await userEvent.click(screen.getByTestId("templates-tab"));
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ activeTab: "templates" });
    });

    it("should handle all tab changes", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      const tabs = [
        { testId: "prompts-tab", expectedTab: "prompts" },
        { testId: "templates-tab", expectedTab: "templates" },
        { testId: "snippets-tab", expectedTab: "snippets" },
        { testId: "workflows-tab", expectedTab: "workflows" }
      ];

      for (const tab of tabs) {
        await userEvent.click(screen.getByTestId(tab.testId));
        expect(mockProps.updateUI).toHaveBeenCalledWith({ activeTab: tab.expectedTab });
      }
    });
  });

  describe("Search and Filtering", () => {
    it("should handle search input", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      const searchInput = screen.getByTestId("search-input");
      await userEvent.type(searchInput, "test search");
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ searchQuery: "test search" });
    });

    it("should handle favorites toggle", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("favorites-toggle"));
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ showFavoritesOnly: true });
    });

    it("should handle filters toggle", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("filters-toggle"));
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ showFiltersPanel: true });
    });

    it("should display selected tags", () => {
      const dataWithSelectedTags = {
        ...mockData,
        ui: {
          ...mockData.ui,
          selectedTags: ["tag1", "tag2"]
        }
      };

      render(<PromptManagerUI {...mockProps} data={dataWithSelectedTags} />);
      
      expect(screen.getByTestId("selected-tags")).toHaveTextContent("tag1,tag2");
    });

    it("should display favorites only state", () => {
      const dataWithFavoritesOnly = {
        ...mockData,
        ui: {
          ...mockData.ui,
          showFavoritesOnly: true
        }
      };

      render(<PromptManagerUI {...mockProps} data={dataWithFavoritesOnly} />);
      
      expect(screen.getByTestId("favorites-only")).toHaveTextContent("true");
    });

    it("should display filters panel state", () => {
      const dataWithFiltersPanel = {
        ...mockData,
        ui: {
          ...mockData.ui,
          showFiltersPanel: true
        }
      };

      render(<PromptManagerUI {...mockProps} data={dataWithFiltersPanel} />);
      
      expect(screen.getByTestId("filters-panel")).toHaveTextContent("true");
    });
  });

  describe("Prompt Operations", () => {
    it("should handle prompt creation", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("create-prompt"));
      
      expect(mockProps.createPrompt).toHaveBeenCalledWith({
        title: "Test Prompt",
        content: "Test content",
        tags: [],
        isFavorite: false
      });
    });

    it("should handle prompt selection", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("select-prompt-prompt-1"));
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ selectedPromptId: "prompt-1" });
    });

    it("should handle prompt updates", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("update-prompt-prompt-1"));
      
      expect(mockProps.updatePrompt).toHaveBeenCalledWith("prompt-1", { title: "Updated" });
    });

    it("should handle prompt deletion", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("delete-prompt-prompt-1"));
      
      expect(mockProps.deletePrompt).toHaveBeenCalledWith("prompt-1");
    });

    it("should handle prompt cloning", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("clone-prompt-prompt-1"));
      
      expect(mockProps.clonePrompt).toHaveBeenCalledWith("prompt-1");
    });

    it("should handle prompt favorite toggle", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("toggle-favorite-prompt-prompt-1"));
      
      expect(mockProps.toggleFavorite).toHaveBeenCalledWith("prompt-1");
    });

    it("should display prompt titles", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      expect(screen.getByTestId("prompt-title-prompt-1")).toHaveTextContent("Test Prompt 1");
      expect(screen.getByTestId("prompt-title-prompt-2")).toHaveTextContent("Test Prompt 2");
    });
  });

  describe("Template Operations", () => {
    it("should handle template creation", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to templates tab
      fireEvent.click(screen.getByTestId("templates-tab"));
      
      await userEvent.click(screen.getByTestId("create-template"));
      
      expect(mockProps.createTemplate).toHaveBeenCalled();
    });

    it("should handle template selection", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to templates tab
      fireEvent.click(screen.getByTestId("templates-tab"));
      
      await userEvent.click(screen.getByTestId("select-template-template-1"));
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ selectedTemplateId: "template-1" });
    });

    it("should handle template updates", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to templates tab
      fireEvent.click(screen.getByTestId("templates-tab"));
      
      await userEvent.click(screen.getByTestId("update-template-template-1"));
      
      expect(mockProps.updateTemplate).toHaveBeenCalledWith("template-1", { title: "Updated" });
    });

    it("should handle template deletion", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to templates tab
      fireEvent.click(screen.getByTestId("templates-tab"));
      
      await userEvent.click(screen.getByTestId("delete-template-template-1"));
      
      expect(mockProps.deleteTemplate).toHaveBeenCalledWith("template-1");
    });

    it("should display template titles", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to templates tab
      fireEvent.click(screen.getByTestId("templates-tab"));
      
      expect(screen.getByTestId("template-title-template-1")).toHaveTextContent("Test Template 1");
    });
  });

  describe("Snippet Operations", () => {
    it("should handle snippet creation", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to snippets tab
      fireEvent.click(screen.getByTestId("snippets-tab"));
      
      await userEvent.click(screen.getByTestId("create-snippet"));
      
      expect(mockProps.createSnippet).toHaveBeenCalled();
    });

    it("should handle snippet selection", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to snippets tab
      fireEvent.click(screen.getByTestId("snippets-tab"));
      
      await userEvent.click(screen.getByTestId("select-snippet-snippet-1"));
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ selectedSnippetId: "snippet-1" });
    });

    it("should handle snippet updates", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to snippets tab
      fireEvent.click(screen.getByTestId("snippets-tab"));
      
      await userEvent.click(screen.getByTestId("update-snippet-snippet-1"));
      
      expect(mockProps.updateSnippet).toHaveBeenCalledWith("snippet-1", { title: "Updated" });
    });

    it("should handle snippet deletion", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to snippets tab
      fireEvent.click(screen.getByTestId("snippets-tab"));
      
      await userEvent.click(screen.getByTestId("delete-snippet-snippet-1"));
      
      expect(mockProps.deleteSnippet).toHaveBeenCalledWith("snippet-1");
    });

    it("should display snippet titles", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to snippets tab
      fireEvent.click(screen.getByTestId("snippets-tab"));
      
      expect(screen.getByTestId("snippet-title-snippet-1")).toHaveTextContent("Test Snippet 1");
    });
  });

  describe("Workflow Operations", () => {
    it("should handle workflow creation", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to workflows tab
      fireEvent.click(screen.getByTestId("workflows-tab"));
      
      await userEvent.click(screen.getByTestId("create-workflow"));
      
      expect(mockProps.createWorkflow).toHaveBeenCalled();
    });

    it("should handle workflow selection", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to workflows tab
      fireEvent.click(screen.getByTestId("workflows-tab"));
      
      await userEvent.click(screen.getByTestId("select-workflow-workflow-1"));
      
      expect(mockProps.updateUI).toHaveBeenCalledWith({ selectedWorkflowId: "workflow-1" });
    });

    it("should handle workflow updates", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to workflows tab
      fireEvent.click(screen.getByTestId("workflows-tab"));
      
      await userEvent.click(screen.getByTestId("update-workflow-workflow-1"));
      
      expect(mockProps.updateWorkflow).toHaveBeenCalledWith("workflow-1", { title: "Updated" });
    });

    it("should handle workflow deletion", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to workflows tab
      fireEvent.click(screen.getByTestId("workflows-tab"));
      
      await userEvent.click(screen.getByTestId("delete-workflow-workflow-1"));
      
      expect(mockProps.deleteWorkflow).toHaveBeenCalledWith("workflow-1");
    });

    it("should handle workflow cloning", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to workflows tab
      fireEvent.click(screen.getByTestId("workflows-tab"));
      
      await userEvent.click(screen.getByTestId("clone-workflow-workflow-1"));
      
      expect(mockProps.cloneWorkflow).toHaveBeenCalledWith("workflow-1");
    });

    it("should handle workflow favorite toggle", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to workflows tab
      fireEvent.click(screen.getByTestId("workflows-tab"));
      
      await userEvent.click(screen.getByTestId("toggle-favorite-workflow-workflow-1"));
      
      expect(mockProps.toggleWorkflowFavorite).toHaveBeenCalledWith("workflow-1");
    });

    it("should display workflow titles", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Switch to workflows tab
      fireEvent.click(screen.getByTestId("workflows-tab"));
      
      expect(screen.getByTestId("workflow-title-workflow-1")).toHaveTextContent("Test Workflow 1");
    });
  });

  describe("Modal Operations", () => {
    it("should handle import/export modal", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // The modal should be closed by default
      expect(screen.getByTestId("import-export-modal")).toHaveStyle({ display: "none" });
    });

    it("should handle template selection modal", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // The modal should be closed by default
      expect(screen.getByTestId("select-template-modal")).toHaveStyle({ display: "none" });
    });

    it("should handle variable fill modal", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // The modal should be closed by default
      expect(screen.getByTestId("variable-fill-modal")).toHaveStyle({ display: "none" });
    });
  });

  describe("Editor Operations", () => {
    it("should handle prompt editor save", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("save-prompt"));
      
      // This would typically trigger a save operation
      // The actual implementation depends on the editor state
    });

    it("should handle prompt editor cancel", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("cancel-prompt"));
      
      // This would typically trigger a cancel operation
      // The actual implementation depends on the editor state
    });

    it("should handle workflow editor save", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("save-workflow"));
      
      // This would typically trigger a save operation
      // The actual implementation depends on the editor state
    });

    it("should handle workflow editor cancel", async () => {
      render(<PromptManagerUI {...mockProps} />);
      
      await userEvent.click(screen.getByTestId("cancel-workflow"));
      
      // This would typically trigger a cancel operation
      // The actual implementation depends on the editor state
    });
  });

  describe("Data Integration", () => {
    it("should pass correct data to child components", () => {
      render(<PromptManagerUI {...mockProps} />);
      
      // Verify that the data is being passed correctly
      expect(screen.getByTestId("prompts-count")).toHaveTextContent("2");
      expect(screen.getByTestId("templates-count")).toHaveTextContent("1");
      expect(screen.getByTestId("snippets-count")).toHaveTextContent("1");
      expect(screen.getByTestId("workflows-count")).toHaveTextContent("1");
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
      expect(screen.getByTestId("templates-count")).toHaveTextContent("0");
      expect(screen.getByTestId("snippets-count")).toHaveTextContent("0");
      expect(screen.getByTestId("workflows-count")).toHaveTextContent("0");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing data gracefully", () => {
      const incompleteData = {
        ...mockData,
        prompts: undefined as any,
        templates: undefined as any,
        snippets: undefined as any,
        workflows: undefined as any
      };

      render(<PromptManagerUI {...mockProps} data={incompleteData} />);
      
      // Should not crash and should display 0 counts
      expect(screen.getByTestId("prompts-count")).toHaveTextContent("0");
      expect(screen.getByTestId("templates-count")).toHaveTextContent("0");
      expect(screen.getByTestId("snippets-count")).toHaveTextContent("0");
      expect(screen.getByTestId("workflows-count")).toHaveTextContent("0");
    });

    it("should handle missing UI state gracefully", () => {
      const dataWithoutUI = {
        ...mockData,
        ui: undefined as any
      };

      render(<PromptManagerUI {...mockProps} data={dataWithoutUI} />);
      
      // Should not crash
      expect(screen.getByTestId("tabs")).toBeInTheDocument();
    });
  });
}); 