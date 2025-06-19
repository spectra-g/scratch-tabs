export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[]; // Array of tag IDs
  isFavorite: boolean;
  createdAt: number;
  lastModified: number;
  usageCount: number;
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
  activeTab: 'prompts' | 'templates' | 'snippets';
  selectedPromptId: string | null;
  selectedTemplateId: string | null;
  selectedSnippetId: string | null;
  searchQuery: string;
  selectedTags: string[];
  showFavoritesOnly: boolean;
}

export interface PromptManagerData {
  prompts: Prompt[];
  templates: Template[];
  snippets: Snippet[];
  tags: Tag[];
  settings: PromptManagerSettings;
  ui: PromptManagerUI;
}