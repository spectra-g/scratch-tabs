export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[]; // Array of tag IDs
  isFavorite: boolean;
  createdAt: number;
  lastModified: number;
  usageCount: number;
  // History for the prompt's CONTENT
  history?: Array<{
    content: string;
    timestamp: number;
  }>;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  isBuiltIn?: boolean;
}

export interface Snippet {
  id: string;
  title: string;
  content: string;
  category: string;
  isBuiltIn?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  isBuiltIn?: boolean;
}

export interface PromptManagerSettings {
  sortBy: 'title' | 'createdAt' | 'lastModified' | 'usageCount';
  sortDirection: 'asc' | 'desc';
  viewMode: 'list' | 'grid';
  showPreview: boolean;
}

export interface PromptManagerUI {
  activeTab: 'prompts' | 'templates' | 'snippets' | 'workflows';
  selectedPromptId: string | null;
  selectedTemplateId: string | null;
  selectedSnippetId: string | null;
  selectedWorkflowId: string | null;
  searchQuery: string;
  selectedTags: string[];
  showFavoritesOnly: boolean;
  showFiltersPanel: boolean;
}

export interface PromptManagerData {
  prompts: Prompt[];
  templates: Template[];
  snippets: Snippet[];
  workflows: Workflow[];
  tags: Tag[];
  settings: PromptManagerSettings;
  ui: PromptManagerUI;
}

export interface WorkflowStep {
  id: string; // A unique ID for this instance of the step within the workflow
  promptId: string; // The ID of the Prompt being used for this step
  stepTitle?: string; // Optional override title for this specific step
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  steps: WorkflowStep[]; // The current, active sequence of steps
  tags: string[]; // Array of tag IDs, just like prompts
  isFavorite: boolean;
  createdAt: number;
  lastModified: number;
}