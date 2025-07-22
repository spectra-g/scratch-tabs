import React from "react";
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PromptManagerTablet } from "../PromptManagerTablet";
import { Prompt, Template, Snippet, Tag, Workflow } from "../types";

// Mock the UI component
jest.mock("../components/PromptManagerUI", () => ({
  PromptManagerUI: ({ data, ...props }: any) => (
    <div data-testid="prompt-manager-ui">
      <div data-testid="prompts-count">{data.prompts.length}</div>
      <div data-testid="templates-count">{data.templates.length}</div>
      <div data-testid="snippets-count">{data.snippets.length}</div>
      <div data-testid="workflows-count">{data.workflows.length}</div>
      <div data-testid="tags-count">{data.tags.length}</div>
      <div data-testid="active-tab">{data.ui.activeTab}</div>
      <div data-testid="search-query">{data.ui.searchQuery}</div>
      <button data-testid="create-prompt" onClick={() => props.createPrompt({
        title: "Test Prompt",
        content: "Test content",
        tags: [],
        isFavorite: false
      })}>
        Create Prompt
      </button>
      <button data-testid="create-template" onClick={() => props.createTemplate({
        title: "Test Template",
        description: "Test description",
        content: "Test template content",
        category: "test"
      })}>
        Create Template
      </button>
      <button data-testid="create-snippet" onClick={() => props.createSnippet({
        title: "Test Snippet",
        content: "Test snippet content",
        category: "test"
      })}>
        Create Snippet
      </button>
      <button data-testid="create-workflow" onClick={() => props.createWorkflow({
        title: "Test Workflow",
        description: "Test workflow description",
        steps: [],
        tags: [],
        isFavorite: false
      })}>
        Create Workflow
      </button>
      <button data-testid="create-tag" onClick={() => props.createTag({
        name: "Test Tag",
        color: "#ff0000"
      })}>
        Create Tag
      </button>
    </div>
  ),
}));

describe("PromptManagerTablet", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should create initial state with correct structure", () => {
      const initialState = PromptManagerTablet.createInitialState();
      
      expect(initialState.type).toBe("promptmanager");
      expect(initialState.data).toBeDefined();
      expect(initialState.data.prompts).toEqual([]);
      expect(initialState.data.templates).toEqual([]);
      expect(initialState.data.snippets).toEqual([]);
      expect(initialState.data.workflows).toEqual([]);
      expect(initialState.data.tags).toBeDefined();
      expect(initialState.data.settings).toBeDefined();
      expect(initialState.data.ui).toBeDefined();
    });

    it("should have correct default settings", () => {
      const initialState = PromptManagerTablet.createInitialState();
      
      expect(initialState.data.settings.sortBy).toBe("lastModified");
      expect(initialState.data.settings.sortDirection).toBe("desc");
      expect(initialState.data.settings.viewMode).toBe("list");
    });

    it("should have correct default UI state", () => {
      const initialState = PromptManagerTablet.createInitialState();
      
      expect(initialState.data.ui.activeTab).toBe("prompts");
      expect(initialState.data.ui.selectedPromptId).toBeNull();
      expect(initialState.data.ui.selectedTemplateId).toBeNull();
      expect(initialState.data.ui.selectedSnippetId).toBeNull();
      expect(initialState.data.ui.selectedWorkflowId).toBeNull();
      expect(initialState.data.ui.searchQuery).toBe("");
      expect(initialState.data.ui.selectedTags).toEqual([]);
      expect(initialState.data.ui.showFavoritesOnly).toBe(false);
      expect(initialState.data.ui.showFiltersPanel).toBe(false);
    });

    it("should include default tags", () => {
      const initialState = PromptManagerTablet.createInitialState();
      
      expect(initialState.data.tags.length).toBeGreaterThan(0);
      expect(initialState.data.tags.every((tag: Tag) => tag.isBuiltIn)).toBe(true);
    });
  });

  describe("State Serialization", () => {
    it("should serialize state correctly", () => {
      const state = PromptManagerTablet.createInitialState();
      const serialized = PromptManagerTablet.serializeState(state);
      
      expect(typeof serialized).toBe("string");
      expect(() => JSON.parse(serialized)).not.toThrow();
    });

    it("should deserialize state correctly", () => {
      const originalState = PromptManagerTablet.createInitialState();
      const serialized = PromptManagerTablet.serializeState(originalState);
      const deserialized = PromptManagerTablet.deserializeState(serialized);
      
      expect(deserialized.type).toBe("promptmanager");
      expect(deserialized.data).toBeDefined();
    });

    it("should handle malformed JSON gracefully", () => {
      expect(() => {
        PromptManagerTablet.deserializeState("invalid json");
      }).toThrow();
    });

    it("should handle missing data properties", () => {
      const incompleteState = {
        type: "promptmanager",
        data: {
          prompts: [1, 2, 3], // Invalid format
        }
      };
      
      const serialized = JSON.stringify(incompleteState);
      const deserialized = PromptManagerTablet.deserializeState(serialized);
      
      expect(deserialized.data.prompts).toEqual([]);
      expect(deserialized.data.templates).toEqual([]);
      expect(deserialized.data.snippets).toEqual([]);
      expect(deserialized.data.workflows).toEqual([]);
    });

    it("should ensure history exists for prompts", () => {
      const stateWithPrompt = PromptManagerTablet.createInitialState();
      stateWithPrompt.data.prompts.push({
        id: "test-prompt",
        title: "Test",
        content: "Content",
        tags: [],
        isFavorite: false,
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 0
      });
      
      const serialized = PromptManagerTablet.serializeState(stateWithPrompt);
      const deserialized = PromptManagerTablet.deserializeState(serialized);
      
      expect(deserialized.data.prompts[0].history).toBeDefined();
      expect(Array.isArray(deserialized.data.prompts[0].history)).toBe(true);
    });
  });

  describe("Rendering", () => {
    it("should render the UI component", () => {
      const state = PromptManagerTablet.createInitialState();
      
      render(
        <div>
          {PromptManagerTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByTestId("prompt-manager-ui")).toBeInTheDocument();
    });

    it("should pass correct props to UI component", () => {
      const state = PromptManagerTablet.createInitialState();
      
      render(
        <div>
          {PromptManagerTablet.render(state, mockOnChange)}
        </div>
      );
      
      expect(screen.getByTestId("prompts-count")).toHaveTextContent("0");
      expect(screen.getByTestId("templates-count")).toHaveTextContent("0");
      expect(screen.getByTestId("snippets-count")).toHaveTextContent("0");
      expect(screen.getByTestId("workflows-count")).toHaveTextContent("0");
      expect(screen.getByTestId("active-tab")).toHaveTextContent("prompts");
      expect(screen.getByTestId("search-query")).toHaveTextContent("");
    });

    it("should handle state updates through onChange", async () => {
      const state = PromptManagerTablet.createInitialState();
      
      render(
        <div>
          {PromptManagerTablet.render(state, mockOnChange)}
        </div>
      );
      
      const createPromptButton = screen.getByTestId("create-prompt");
      await userEvent.click(createPromptButton);
      
      expect(mockOnChange).toHaveBeenCalled();
      const newState = mockOnChange.mock.calls[0][0];
      expect(newState.data.prompts.length).toBe(1);
    });
  });

  describe("CRUD Operations", () => {
    let state: any;

    beforeEach(() => {
      state = PromptManagerTablet.createInitialState();
    });

    describe("Prompt Operations", () => {
      it("should create a new prompt", async () => {
        const { result } = renderHook(() => {
          const [currentState, setState] = React.useState(state);
          const updateData = (newData: any) => {
            setState({ ...currentState, data: { ...currentState.data, ...newData } });
          };
          
          const createPrompt = (prompt: any) => {
            const newPrompt: Prompt = {
              id: `prompt-${Date.now()}`,
              title: prompt.title,
              content: prompt.content,
              tags: prompt.tags,
              isFavorite: prompt.isFavorite,
              createdAt: Date.now(),
              lastModified: Date.now(),
              usageCount: 0,
              history: []
            };
            
            updateData({
              prompts: [...currentState.data.prompts, newPrompt]
            });
            
            return newPrompt;
          };
          
          return { currentState, createPrompt };
        });

        const newPrompt = result.current.createPrompt({
          title: "Test Prompt",
          content: "Test content",
          tags: [],
          isFavorite: false
        });

        expect(newPrompt.title).toBe("Test Prompt");
        expect(newPrompt.content).toBe("Test content");
        expect(newPrompt.id).toBeDefined();
        expect(newPrompt.createdAt).toBeDefined();
        expect(newPrompt.lastModified).toBeDefined();
        expect(newPrompt.usageCount).toBe(0);
        expect(newPrompt.history).toEqual([]);
      });

      it("should update an existing prompt", () => {
        const prompt: Prompt = {
          id: "test-prompt",
          title: "Original Title",
          content: "Original content",
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 0,
          history: []
        };

        state.data.prompts.push(prompt);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const updatePrompt = (id: string, updates: any) => {
          const promptIndex = state.data.prompts.findIndex((p: Prompt) => p.id === id);
          if (promptIndex !== -1) {
            const updatedPrompt = {
              ...state.data.prompts[promptIndex],
              ...updates,
              lastModified: Date.now()
            };
            
            const newPrompts = [...state.data.prompts];
            newPrompts[promptIndex] = updatedPrompt;
            
            updateData({ prompts: newPrompts });
          }
        };

        updatePrompt("test-prompt", { title: "Updated Title", content: "Updated content" });

        expect(state.data.prompts[0].title).toBe("Updated Title");
        expect(state.data.prompts[0].content).toBe("Updated content");
        expect(state.data.prompts[0].lastModified).toBeGreaterThan(prompt.lastModified);
      });

      it("should delete a prompt", () => {
        const prompt: Prompt = {
          id: "test-prompt",
          title: "Test Prompt",
          content: "Test content",
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 0,
          history: []
        };

        state.data.prompts.push(prompt);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const deletePrompt = (id: string) => {
          updateData({
            prompts: state.data.prompts.filter((p: Prompt) => p.id !== id)
          });
        };

        deletePrompt("test-prompt");

        expect(state.data.prompts.length).toBe(0);
      });

      it("should clone a prompt", () => {
        const originalPrompt: Prompt = {
          id: "original-prompt",
          title: "Original Prompt",
          content: "Original content",
          tags: ["tag1"],
          isFavorite: true,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 5,
          history: [{ content: "old content", timestamp: Date.now() }]
        };

        state.data.prompts.push(originalPrompt);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const clonePrompt = (id: string) => {
          const original = state.data.prompts.find((p: Prompt) => p.id === id);
          if (original) {
            const cloned: Prompt = {
              ...original,
              id: `prompt-${Date.now()}`,
              title: `${original.title} (Copy)`,
              createdAt: Date.now(),
              lastModified: Date.now(),
              usageCount: 0,
              history: []
            };
            
            updateData({
              prompts: [...state.data.prompts, cloned]
            });
            
            return cloned;
          }
          return undefined;
        };

        const cloned = clonePrompt("original-prompt");

        expect(cloned).toBeDefined();
        expect(cloned!.title).toBe("Original Prompt (Copy)");
        expect(cloned!.id).not.toBe("original-prompt");
        expect(cloned!.usageCount).toBe(0);
        expect(cloned!.history).toEqual([]);
        expect(state.data.prompts.length).toBe(2);
      });

      it("should increment usage count", () => {
        const prompt: Prompt = {
          id: "test-prompt",
          title: "Test Prompt",
          content: "Test content",
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 0,
          history: []
        };

        state.data.prompts.push(prompt);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const incrementPromptUsage = (id: string) => {
          const promptIndex = state.data.prompts.findIndex((p: Prompt) => p.id === id);
          if (promptIndex !== -1) {
            const updatedPrompt = {
              ...state.data.prompts[promptIndex],
              usageCount: state.data.prompts[promptIndex].usageCount + 1
            };
            
            const newPrompts = [...state.data.prompts];
            newPrompts[promptIndex] = updatedPrompt;
            
            updateData({ prompts: newPrompts });
          }
        };

        incrementPromptUsage("test-prompt");

        expect(state.data.prompts[0].usageCount).toBe(1);
      });

      it("should toggle favorite status", () => {
        const prompt: Prompt = {
          id: "test-prompt",
          title: "Test Prompt",
          content: "Test content",
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 0,
          history: []
        };

        state.data.prompts.push(prompt);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const toggleFavorite = (id: string) => {
          const promptIndex = state.data.prompts.findIndex((p: Prompt) => p.id === id);
          if (promptIndex !== -1) {
            const updatedPrompt = {
              ...state.data.prompts[promptIndex],
              isFavorite: !state.data.prompts[promptIndex].isFavorite
            };
            
            const newPrompts = [...state.data.prompts];
            newPrompts[promptIndex] = updatedPrompt;
            
            updateData({ prompts: newPrompts });
          }
        };

        toggleFavorite("test-prompt");

        expect(state.data.prompts[0].isFavorite).toBe(true);

        toggleFavorite("test-prompt");

        expect(state.data.prompts[0].isFavorite).toBe(false);
      });
    });

    describe("Template Operations", () => {
      it("should create a new template", () => {
        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const createTemplate = (template: any) => {
          const newTemplate: Template = {
            id: `template-${Date.now()}`,
            title: template.title,
            description: template.description,
            content: template.content,
            category: template.category
          };
          
          updateData({
            templates: [...state.data.templates, newTemplate]
          });
          
          return newTemplate;
        };

        const newTemplate = createTemplate({
          title: "Test Template",
          description: "Test description",
          content: "Test template content",
          category: "test"
        });

        expect(newTemplate.title).toBe("Test Template");
        expect(newTemplate.description).toBe("Test description");
        expect(newTemplate.content).toBe("Test template content");
        expect(newTemplate.category).toBe("test");
        expect(newTemplate.id).toBeDefined();
      });

      it("should update an existing template", () => {
        const template: Template = {
          id: "test-template",
          title: "Original Template",
          description: "Original description",
          content: "Original content",
          category: "original"
        };

        state.data.templates.push(template);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const updateTemplate = (id: string, updates: any) => {
          const templateIndex = state.data.templates.findIndex((t: Template) => t.id === id);
          if (templateIndex !== -1) {
            const updatedTemplate = {
              ...state.data.templates[templateIndex],
              ...updates
            };
            
            const newTemplates = [...state.data.templates];
            newTemplates[templateIndex] = updatedTemplate;
            
            updateData({ templates: newTemplates });
          }
        };

        updateTemplate("test-template", { title: "Updated Template", description: "Updated description" });

        expect(state.data.templates[0].title).toBe("Updated Template");
        expect(state.data.templates[0].description).toBe("Updated description");
      });

      it("should delete a template", () => {
        const template: Template = {
          id: "test-template",
          title: "Test Template",
          description: "Test description",
          content: "Test content",
          category: "test"
        };

        state.data.templates.push(template);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const deleteTemplate = (id: string) => {
          updateData({
            templates: state.data.templates.filter((t: Template) => t.id !== id)
          });
        };

        deleteTemplate("test-template");

        expect(state.data.templates.length).toBe(0);
      });
    });

    describe("Snippet Operations", () => {
      it("should create a new snippet", () => {
        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const createSnippet = (snippet: any) => {
          const newSnippet: Snippet = {
            id: `snippet-${Date.now()}`,
            title: snippet.title,
            content: snippet.content,
            category: snippet.category
          };
          
          updateData({
            snippets: [...state.data.snippets, newSnippet]
          });
          
          return newSnippet;
        };

        const newSnippet = createSnippet({
          title: "Test Snippet",
          content: "Test snippet content",
          category: "test"
        });

        expect(newSnippet.title).toBe("Test Snippet");
        expect(newSnippet.content).toBe("Test snippet content");
        expect(newSnippet.category).toBe("test");
        expect(newSnippet.id).toBeDefined();
      });

      it("should update an existing snippet", () => {
        const snippet: Snippet = {
          id: "test-snippet",
          title: "Original Snippet",
          content: "Original content",
          category: "original"
        };

        state.data.snippets.push(snippet);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const updateSnippet = (id: string, updates: any) => {
          const snippetIndex = state.data.snippets.findIndex((s: Snippet) => s.id === id);
          if (snippetIndex !== -1) {
            const updatedSnippet = {
              ...state.data.snippets[snippetIndex],
              ...updates
            };
            
            const newSnippets = [...state.data.snippets];
            newSnippets[snippetIndex] = updatedSnippet;
            
            updateData({ snippets: newSnippets });
          }
        };

        updateSnippet("test-snippet", { title: "Updated Snippet", content: "Updated content" });

        expect(state.data.snippets[0].title).toBe("Updated Snippet");
        expect(state.data.snippets[0].content).toBe("Updated content");
      });

      it("should delete a snippet", () => {
        const snippet: Snippet = {
          id: "test-snippet",
          title: "Test Snippet",
          content: "Test content",
          category: "test"
        };

        state.data.snippets.push(snippet);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const deleteSnippet = (id: string) => {
          updateData({
            snippets: state.data.snippets.filter((s: Snippet) => s.id !== id)
          });
        };

        deleteSnippet("test-snippet");

        expect(state.data.snippets.length).toBe(0);
      });
    });

    describe("Workflow Operations", () => {
      it("should create a new workflow", () => {
        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const createWorkflow = (workflow: any) => {
          const newWorkflow: Workflow = {
            id: `workflow-${Date.now()}`,
            title: workflow.title,
            description: workflow.description,
            steps: workflow.steps,
            tags: workflow.tags,
            isFavorite: workflow.isFavorite,
            createdAt: Date.now(),
            lastModified: Date.now()
          };
          
          updateData({
            workflows: [...state.data.workflows, newWorkflow]
          });
          
          return newWorkflow;
        };

        const newWorkflow = createWorkflow({
          title: "Test Workflow",
          description: "Test workflow description",
          steps: [],
          tags: [],
          isFavorite: false
        });

        expect(newWorkflow.title).toBe("Test Workflow");
        expect(newWorkflow.description).toBe("Test workflow description");
        expect(newWorkflow.steps).toEqual([]);
        expect(newWorkflow.tags).toEqual([]);
        expect(newWorkflow.isFavorite).toBe(false);
        expect(newWorkflow.id).toBeDefined();
        expect(newWorkflow.createdAt).toBeDefined();
        expect(newWorkflow.lastModified).toBeDefined();
      });

      it("should update an existing workflow", () => {
        const workflow: Workflow = {
          id: "test-workflow",
          title: "Original Workflow",
          description: "Original description",
          steps: [],
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        state.data.workflows.push(workflow);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const updateWorkflow = (id: string, updates: any) => {
          const workflowIndex = state.data.workflows.findIndex((w: Workflow) => w.id === id);
          if (workflowIndex !== -1) {
            const updatedWorkflow = {
              ...state.data.workflows[workflowIndex],
              ...updates,
              lastModified: Date.now()
            };
            
            const newWorkflows = [...state.data.workflows];
            newWorkflows[workflowIndex] = updatedWorkflow;
            
            updateData({ workflows: newWorkflows });
          }
        };

        updateWorkflow("test-workflow", { title: "Updated Workflow", description: "Updated description" });

        expect(state.data.workflows[0].title).toBe("Updated Workflow");
        expect(state.data.workflows[0].description).toBe("Updated description");
        expect(state.data.workflows[0].lastModified).toBeGreaterThan(workflow.lastModified);
      });

      it("should delete a workflow", () => {
        const workflow: Workflow = {
          id: "test-workflow",
          title: "Test Workflow",
          description: "Test description",
          steps: [],
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        state.data.workflows.push(workflow);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const deleteWorkflow = (id: string) => {
          updateData({
            workflows: state.data.workflows.filter((w: Workflow) => w.id !== id)
          });
        };

        deleteWorkflow("test-workflow");

        expect(state.data.workflows.length).toBe(0);
      });

      it("should clone a workflow", () => {
        const originalWorkflow: Workflow = {
          id: "original-workflow",
          title: "Original Workflow",
          description: "Original description",
          steps: [{ id: "step1", promptId: "prompt1" }],
          tags: ["tag1"],
          isFavorite: true,
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        state.data.workflows.push(originalWorkflow);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const cloneWorkflow = (id: string) => {
          const original = state.data.workflows.find((w: Workflow) => w.id === id);
          if (original) {
            const cloned: Workflow = {
              ...original,
              id: `workflow-${Date.now()}`,
              title: `${original.title} (Copy)`,
              createdAt: Date.now(),
              lastModified: Date.now()
            };
            
            updateData({
              workflows: [...state.data.workflows, cloned]
            });
            
            return cloned;
          }
          return undefined;
        };

        const cloned = cloneWorkflow("original-workflow");

        expect(cloned).toBeDefined();
        expect(cloned!.title).toBe("Original Workflow (Copy)");
        expect(cloned!.id).not.toBe("original-workflow");
        expect(cloned!.steps).toEqual(originalWorkflow.steps);
        expect(cloned!.tags).toEqual(originalWorkflow.tags);
        expect(state.data.workflows.length).toBe(2);
      });

      it("should toggle workflow favorite status", () => {
        const workflow: Workflow = {
          id: "test-workflow",
          title: "Test Workflow",
          description: "Test description",
          steps: [],
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        state.data.workflows.push(workflow);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const toggleWorkflowFavorite = (id: string) => {
          const workflowIndex = state.data.workflows.findIndex((w: Workflow) => w.id === id);
          if (workflowIndex !== -1) {
            const updatedWorkflow = {
              ...state.data.workflows[workflowIndex],
              isFavorite: !state.data.workflows[workflowIndex].isFavorite
            };
            
            const newWorkflows = [...state.data.workflows];
            newWorkflows[workflowIndex] = updatedWorkflow;
            
            updateData({ workflows: newWorkflows });
          }
        };

        toggleWorkflowFavorite("test-workflow");

        expect(state.data.workflows[0].isFavorite).toBe(true);

        toggleWorkflowFavorite("test-workflow");

        expect(state.data.workflows[0].isFavorite).toBe(false);
      });
    });

    describe("Tag Operations", () => {
      it("should create a new tag", () => {
        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const createTag = (tag: any) => {
          const newTag: Tag = {
            id: `tag-${Date.now()}`,
            name: tag.name,
            color: tag.color
          };
          
          updateData({
            tags: [...state.data.tags, newTag]
          });
          
          return newTag;
        };

        const newTag = createTag({
          name: "Test Tag",
          color: "#ff0000"
        });

        expect(newTag.name).toBe("Test Tag");
        expect(newTag.color).toBe("#ff0000");
        expect(newTag.id).toBeDefined();
      });

      it("should update an existing tag", () => {
        const tag: Tag = {
          id: "test-tag",
          name: "Original Tag",
          color: "#000000"
        };

        state.data.tags.push(tag);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const updateTag = (id: string, updates: any) => {
          const tagIndex = state.data.tags.findIndex((t: Tag) => t.id === id);
          if (tagIndex !== -1) {
            const updatedTag = {
              ...state.data.tags[tagIndex],
              ...updates
            };
            
            const newTags = [...state.data.tags];
            newTags[tagIndex] = updatedTag;
            
            updateData({ tags: newTags });
          }
        };

        updateTag("test-tag", { name: "Updated Tag", color: "#ff0000" });

        expect(state.data.tags[0].name).toBe("Updated Tag");
        expect(state.data.tags[0].color).toBe("#ff0000");
      });

      it("should delete a tag", () => {
        const tag: Tag = {
          id: "test-tag",
          name: "Test Tag",
          color: "#ff0000"
        };

        state.data.tags.push(tag);

        const updateData = (newData: any) => {
          state.data = { ...state.data, ...newData };
        };

        const deleteTag = (id: string) => {
          updateData({
            tags: state.data.tags.filter((t: Tag) => t.id !== id)
          });
        };

        deleteTag("test-tag");

        expect(state.data.tags.length).toBe(0);
      });
    });
  });

  describe("Import/Export", () => {
    it("should export data correctly", () => {
      const state = PromptManagerTablet.createInitialState();
      
      // Add some test data
      state.data.prompts.push({
        id: "test-prompt",
        title: "Test Prompt",
        content: "Test content",
        tags: [],
        isFavorite: false,
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 0,
        history: []
      });

      const exportData = () => {
        return {
          prompts: state.data.prompts,
          templates: state.data.templates,
          snippets: state.data.snippets,
          workflows: state.data.workflows,
          tags: state.data.tags,
          settings: state.data.settings
        };
      };

      const exported = exportData();

      expect(exported.prompts).toEqual(state.data.prompts);
      expect(exported.templates).toEqual(state.data.templates);
      expect(exported.snippets).toEqual(state.data.snippets);
      expect(exported.workflows).toEqual(state.data.workflows);
      expect(exported.tags).toEqual(state.data.tags);
      expect(exported.settings).toEqual(state.data.settings);
    });

    it("should import data correctly", () => {
      const state = PromptManagerTablet.createInitialState();
      
      const importData = (importedData: any) => {
        state.data = {
          ...state.data,
          prompts: [...state.data.prompts, ...(importedData.prompts || [])],
          templates: [...state.data.templates, ...(importedData.templates || [])],
          snippets: [...state.data.snippets, ...(importedData.snippets || [])],
          workflows: [...state.data.workflows, ...(importedData.workflows || [])],
          tags: [...state.data.tags, ...(importedData.tags || [])]
        };
      };

      const importedData = {
        prompts: [{
          id: "imported-prompt",
          title: "Imported Prompt",
          content: "Imported content",
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 0,
          history: []
        }],
        templates: [{
          id: "imported-template",
          title: "Imported Template",
          description: "Imported description",
          content: "Imported template content",
          category: "imported"
        }]
      };

      importData(importedData);

      expect(state.data.prompts.length).toBe(1);
      expect(state.data.templates.length).toBe(1);
      expect(state.data.prompts[0].title).toBe("Imported Prompt");
      expect(state.data.templates[0].title).toBe("Imported Template");
    });
  });

  describe("Template Variable Functions", () => {
    it("should create prompt from template with variables", () => {
      const template: Template = {
        id: "test-template",
        title: "Test Template",
        description: "Test description",
        content: "Hello {{name}}, you are {{age}} years old.",
        category: "test"
      };

      const state = PromptManagerTablet.createInitialState();
      state.data.templates.push(template);

      const createPromptFromTemplate = (templateId: string, variableValues?: Record<string, string>) => {
        const template = state.data.templates.find((t: Template) => t.id === templateId);
        if (!template) return undefined;

        const { substituteVariables } = require("../utils/variables");
        const content = substituteVariables(template.content, variableValues || {});

        const newPrompt: Prompt = {
          id: `prompt-${Date.now()}`,
          title: template.title,
          content,
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now(),
          usageCount: 0,
          history: []
        };

        state.data.prompts.push(newPrompt);
        return newPrompt;
      };

      const prompt = createPromptFromTemplate("test-template", { name: "John", age: "25" });

      expect(prompt).toBeDefined();
      expect(prompt!.content).toBe("Hello John, you are 25 years old.");
    });

    it("should get template variables", () => {
      const template: Template = {
        id: "test-template",
        title: "Test Template",
        description: "Test description",
        content: "Hello {{name}}, you are {{age}} years old and live in {{city}}.",
        category: "test"
      };

      const state = PromptManagerTablet.createInitialState();
      state.data.templates.push(template);

      const getTemplateVariables = (templateId: string) => {
        const template = state.data.templates.find((t: Template) => t.id === templateId);
        if (!template) return [];

        const { parseVariables } = require("../utils/variables");
        return parseVariables(template.content);
      };

      const variables = getTemplateVariables("test-template");

      expect(variables).toEqual(["age", "city", "name"]);
    });
  });
}); 