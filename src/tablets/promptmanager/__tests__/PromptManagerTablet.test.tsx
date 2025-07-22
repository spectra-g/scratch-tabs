import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PromptManagerTablet } from "../PromptManagerTablet";
import { Prompt, Template, Snippet, Tag, Workflow } from "../types";

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9)
  }
});

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
      
      expect(initialState.data.tags.length).toBe(7); // 7 default tags
      expect(initialState.data.tags[0].name).toBe("Development");
      expect(initialState.data.tags[1].name).toBe("Product");
    });
  });

  describe("State Serialization", () => {
    it("should serialize state correctly", () => {
      const state = PromptManagerTablet.createInitialState();
      const serialized = PromptManagerTablet.serializeState(state);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.type).toBe("promptmanager");
      expect(parsed.data).toBeDefined();
    });

    it("should deserialize state correctly", () => {
      const state = PromptManagerTablet.createInitialState();
      const serialized = PromptManagerTablet.serializeState(state);
      const deserialized = PromptManagerTablet.deserializeState(serialized);
      
      expect(deserialized.type).toBe("promptmanager");
      expect(deserialized.data.prompts).toEqual([]);
      expect(deserialized.data.tags.length).toBe(7);
    });

    it("should handle malformed JSON gracefully", () => {
      const deserialized = PromptManagerTablet.deserializeState("invalid json");
      
      // Should return a valid default state
      expect(deserialized.type).toBe("promptmanager");
      expect(deserialized.data).toBeDefined();
    });

    it("should handle missing data properties", () => {
      const incompleteState = {
        type: "promptmanager",
        data: {
          prompts: [1, 2, 3], // Invalid prompts
          templates: null,
          snippets: undefined,
          workflows: "invalid",
          tags: [],
          settings: {},
          ui: {}
        }
      };
      
      const serialized = JSON.stringify(incompleteState);
      const deserialized = PromptManagerTablet.deserializeState(serialized);
      
      expect(deserialized.type).toBe("promptmanager");
      expect(Array.isArray(deserialized.data.prompts)).toBe(true);
      expect(Array.isArray(deserialized.data.templates)).toBe(true);
      expect(Array.isArray(deserialized.data.snippets)).toBe(true);
      expect(Array.isArray(deserialized.data.workflows)).toBe(true);
      expect(Array.isArray(deserialized.data.tags)).toBe(true);
    });

    it("should ensure history exists for prompts", () => {
      const stateWithPrompts = PromptManagerTablet.createInitialState();
      stateWithPrompts.data.prompts.push({
        id: "test-prompt",
        title: "Test Prompt",
        content: "Test content",
        tags: [],
        isFavorite: false,
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 0
        // Missing history
      });
      
      const serialized = PromptManagerTablet.serializeState(stateWithPrompts);
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
      expect(screen.getByTestId("tags-count")).toHaveTextContent("7");
      expect(screen.getByTestId("active-tab")).toHaveTextContent("prompts");
    });
  });

  describe("CRUD Operations", () => {
    describe("Prompt Operations", () => {
      it("should create a new prompt", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const createPrompt = (prompt: any) => {
          const newPrompt: Prompt = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            lastModified: Date.now(),
            usageCount: 0,
            history: [],
            ...prompt
          };
          state.data.prompts.push(newPrompt);
        };

        createPrompt({
          title: "Test Prompt",
          content: "Test content",
          tags: [],
          isFavorite: false
        });

        expect(state.data.prompts.length).toBe(1);
        expect(state.data.prompts[0].title).toBe("Test Prompt");
        expect(state.data.prompts[0].content).toBe("Test content");
      });

      it("should delete a prompt", () => {
        const state = PromptManagerTablet.createInitialState();
        
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

        const deletePrompt = (id: string) => {
          state.data.prompts = state.data.prompts.filter((p: Prompt) => p.id !== id);
        };

        deletePrompt("test-prompt");

        expect(state.data.prompts.length).toBe(0);
      });

      it("should clone a prompt", () => {
        const state = PromptManagerTablet.createInitialState();
        
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

                  const clonePrompt = (id: string) => {
            const original = state.data.prompts.find((p: Prompt) => p.id === id);
            if (original) {
              const cloned: Prompt = {
                ...original,
                id: crypto.randomUUID(),
                title: `${original.title} (Copy)`,
                createdAt: Date.now(),
                lastModified: Date.now(),
                usageCount: 0,
                history: []
              };
              state.data.prompts.push(cloned);
              return cloned;
            }
          };

        const cloned = clonePrompt("test-prompt");

        expect(state.data.prompts.length).toBe(2);
        expect(cloned?.title).toBe("Test Prompt (Copy)");
      });

      it("should increment usage count", () => {
        const state = PromptManagerTablet.createInitialState();
        
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

                  const incrementPromptUsage = (id: string) => {
            const prompt = state.data.prompts.find((p: Prompt) => p.id === id);
            if (prompt) {
              prompt.usageCount++;
            }
          };

        incrementPromptUsage("test-prompt");

        expect(state.data.prompts[0].usageCount).toBe(1);
      });

      it("should toggle favorite status", () => {
        const state = PromptManagerTablet.createInitialState();
        
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

        const toggleFavorite = (id: string) => {
          const prompt = state.data.prompts.find(p => p.id === id);
          if (prompt) {
            prompt.isFavorite = !prompt.isFavorite;
          }
        };

        toggleFavorite("test-prompt");

        expect(state.data.prompts[0].isFavorite).toBe(true);
      });
    });

    describe("Template Operations", () => {
      it("should create a new template", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const createTemplate = (template: any) => {
          const newTemplate: Template = {
            id: crypto.randomUUID(),
            ...template
          };
          state.data.templates.push(newTemplate);
        };

        createTemplate({
          title: "Test Template",
          description: "Test description",
          content: "Test template content",
          category: "test"
        });

        expect(state.data.templates.length).toBe(1);
        expect(state.data.templates[0].title).toBe("Test Template");
      });

      it("should delete a template", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const template: Template = {
          id: "test-template",
          title: "Test Template",
          description: "Test description",
          content: "Test template content",
          category: "test"
        };

        state.data.templates.push(template);

        const deleteTemplate = (id: string) => {
          state.data.templates = state.data.templates.filter(t => t.id !== id);
        };

        deleteTemplate("test-template");

        expect(state.data.templates.length).toBe(0);
      });
    });

    describe("Snippet Operations", () => {
      it("should create a new snippet", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const createSnippet = (snippet: any) => {
          const newSnippet: Snippet = {
            id: crypto.randomUUID(),
            ...snippet
          };
          state.data.snippets.push(newSnippet);
        };

        createSnippet({
          title: "Test Snippet",
          content: "Test snippet content",
          category: "test"
        });

        expect(state.data.snippets.length).toBe(1);
        expect(state.data.snippets[0].title).toBe("Test Snippet");
      });

      it("should delete a snippet", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const snippet: Snippet = {
          id: "test-snippet",
          title: "Test Snippet",
          content: "Test snippet content",
          category: "test"
        };

        state.data.snippets.push(snippet);

        const deleteSnippet = (id: string) => {
          state.data.snippets = state.data.snippets.filter(s => s.id !== id);
        };

        deleteSnippet("test-snippet");

        expect(state.data.snippets.length).toBe(0);
      });
    });

    describe("Workflow Operations", () => {
      it("should create a new workflow", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const createWorkflow = (workflow: any) => {
          const newWorkflow: Workflow = {
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            lastModified: Date.now(),
            ...workflow
          };
          state.data.workflows.push(newWorkflow);
        };

        createWorkflow({
          title: "Test Workflow",
          description: "Test workflow description",
          steps: [],
          tags: [],
          isFavorite: false
        });

        expect(state.data.workflows.length).toBe(1);
        expect(state.data.workflows[0].title).toBe("Test Workflow");
      });

      it("should delete a workflow", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const workflow: Workflow = {
          id: "test-workflow",
          title: "Test Workflow",
          description: "Test workflow description",
          steps: [],
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        state.data.workflows.push(workflow);

        const deleteWorkflow = (id: string) => {
          state.data.workflows = state.data.workflows.filter(w => w.id !== id);
        };

        deleteWorkflow("test-workflow");

        expect(state.data.workflows.length).toBe(0);
      });

      it("should clone a workflow", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const workflow: Workflow = {
          id: "test-workflow",
          title: "Test Workflow",
          description: "Test workflow description",
          steps: [],
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        state.data.workflows.push(workflow);

        const cloneWorkflow = (id: string) => {
          const original = state.data.workflows.find(w => w.id === id);
          if (original) {
            const cloned: Workflow = {
              ...original,
              id: crypto.randomUUID(),
              title: `${original.title} (Copy)`,
              createdAt: Date.now(),
              lastModified: Date.now()
            };
            state.data.workflows.push(cloned);
            return cloned;
          }
        };

        const cloned = cloneWorkflow("test-workflow");

        expect(state.data.workflows.length).toBe(2);
        expect(cloned?.title).toBe("Test Workflow (Copy)");
      });

      it("should toggle workflow favorite status", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const workflow: Workflow = {
          id: "test-workflow",
          title: "Test Workflow",
          description: "Test workflow description",
          steps: [],
          tags: [],
          isFavorite: false,
          createdAt: Date.now(),
          lastModified: Date.now()
        };

        state.data.workflows.push(workflow);

        const toggleWorkflowFavorite = (id: string) => {
          const workflow = state.data.workflows.find(w => w.id === id);
          if (workflow) {
            workflow.isFavorite = !workflow.isFavorite;
          }
        };

        toggleWorkflowFavorite("test-workflow");

        expect(state.data.workflows[0].isFavorite).toBe(true);
      });
    });

    describe("Tag Operations", () => {
      it("should create a new tag", () => {
        const state = PromptManagerTablet.createInitialState();
        const initialTagCount = state.data.tags.length;
        
        const createTag = (tag: any) => {
          const newTag: Tag = {
            id: crypto.randomUUID(),
            ...tag
          };
          state.data.tags.push(newTag);
        };

        createTag({
          name: "Test Tag",
          color: "#ff0000"
        });

        expect(state.data.tags.length).toBe(initialTagCount + 1);
        expect(state.data.tags[state.data.tags.length - 1].name).toBe("Test Tag");
      });

      it("should delete a tag", () => {
        const state = PromptManagerTablet.createInitialState();
        
        const tag: Tag = {
          id: "test-tag",
          name: "Test Tag",
          color: "#ff0000"
        };

        state.data.tags.push(tag);
        const tagCountAfterAdd = state.data.tags.length;

        const deleteTag = (id: string) => {
          state.data.tags = state.data.tags.filter((t: Tag) => t.id !== id);
        };

        deleteTag("test-tag");

        expect(state.data.tags.length).toBe(tagCountAfterAdd - 1);
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
      const state = PromptManagerTablet.createInitialState();
      
      const template: Template = {
        id: "test-template",
        title: "Test Template",
        description: "Test description",
        content: "Hello {{name}}, you are {{age}} years old.",
        category: "test"
      };

      state.data.templates.push(template);

      const createPromptFromTemplate = (templateId: string, variableValues?: Record<string, string>) => {
        const template = state.data.templates.find(t => t.id === templateId);
        if (template) {
          let content = template.content;
          if (variableValues) {
            Object.entries(variableValues).forEach(([key, value]) => {
              content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
            });
          }
          
          const prompt: Prompt = {
            id: crypto.randomUUID(),
            title: `${template.title} Prompt`,
            content,
            tags: [],
            isFavorite: false,
            createdAt: Date.now(),
            lastModified: Date.now(),
            usageCount: 0,
            history: []
          };
          
          state.data.prompts.push(prompt);
          return prompt;
        }
      };

      const prompt = createPromptFromTemplate("test-template", { name: "John", age: "25" });

      expect(prompt).toBeDefined();
      expect(prompt?.content).toBe("Hello John, you are 25 years old.");
    });

    it("should get template variables", () => {
      const state = PromptManagerTablet.createInitialState();
      
      const template: Template = {
        id: "test-template",
        title: "Test Template",
        description: "Test description",
        content: "Hello {{name}}, you are {{age}} years old. Welcome to {{company}}!",
        category: "test"
      };

      state.data.templates.push(template);

      const getTemplateVariables = (templateId: string) => {
        const template = state.data.templates.find(t => t.id === templateId);
        if (template) {
          const matches = template.content.match(/{{([^}]+)}}/g);
          return matches ? matches.map(match => match.slice(2, -2)) : [];
        }
        return [];
      };

      const variables = getTemplateVariables("test-template");

      expect(variables).toEqual(["name", "age", "company"]);
    });
  });
}); 