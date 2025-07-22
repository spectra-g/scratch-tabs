import React, { useState, useEffect } from "react";
import { Tabs } from "./Tabs";
import { Sidebar } from "./Sidebar";
import { PromptList } from "./PromptList";
import { PromptEditor } from "./PromptEditor";
import { TemplateList } from "./TemplateList";
import { SnippetList } from "./SnippetList";
import { WorkflowList } from "./WorkflowList";
import { WorkflowEditor } from "./WorkflowEditor";
import { SelectTemplateModal } from "./SelectTemplateModal";
import { PromptManagerData, Prompt, Template, Snippet, Tag, Workflow } from "../types";
import { defaultTemplates } from "../data/defaultTemplates";
import { defaultSnippets } from "../data/defaultSnippets";

interface PromptManagerUIProps {
  data: PromptManagerData;
  updateData: (newData: Partial<PromptManagerData>) => void;
  updateUI: (newUI: Partial<PromptManagerData["ui"]>) => void;
  updateSettings: (newSettings: Partial<PromptManagerData["settings"]>) => void;
  createPrompt: (prompt: Omit<Prompt, "id" | "createdAt" | "lastModified" | "usageCount">) => Prompt;
  updatePrompt: (id: string, updates: Partial<Omit<Prompt, "id" | "createdAt">>) => void;
  deletePrompt: (id: string) => void;
  clonePrompt: (id: string) => Prompt | undefined;
  incrementPromptUsage: (id: string) => void;
  toggleFavorite: (id: string) => void;
  createWorkflow: (workflow: Omit<Workflow, "id" | "createdAt" | "lastModified">) => Workflow;
  updateWorkflow: (id: string, updates: Partial<Omit<Workflow, "id" | "createdAt">>) => void;
  deleteWorkflow: (id: string) => void;
  cloneWorkflow: (id: string) => Workflow | undefined;
  toggleWorkflowFavorite: (id: string) => void;
  createTemplate: (template: Omit<Template, "id">) => Template;
  updateTemplate: (id: string, updates: Partial<Omit<Template, "id">>) => void;
  deleteTemplate: (id: string) => void;
  createSnippet: (snippet: Omit<Snippet, "id">) => Snippet;
  updateSnippet: (id: string, updates: Partial<Omit<Snippet, "id">>) => void;
  deleteSnippet: (id: string) => void;
  createTag: (tag: Omit<Tag, "id">) => Tag;
  updateTag: (id: string, updates: Partial<Omit<Tag, "id">>) => void;
  deleteTag: (id: string) => void;
  importData: (importedData: Partial<PromptManagerData>) => void;
  exportData: () => void;
  createPromptFromTemplate: (templateId: string, variableValues?: Record<string, string>) => void;
  getTemplateVariables: (templateId: string) => string[];
}

export const PromptManagerUI: React.FC<PromptManagerUIProps> = ({
  data,
  updateUI,
  updateSettings,
  createPrompt,
  updatePrompt,
  deletePrompt,
  clonePrompt,
  incrementPromptUsage,
  toggleFavorite,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  cloneWorkflow,
  toggleWorkflowFavorite,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  createTag,
  updateTag,
  deleteTag,
  createPromptFromTemplate,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showImportExport, setShowImportExport] = useState<"import" | "export" | null>(null);
  const [showTemplateSelection, setShowTemplateSelection] = useState(false);

  // Combine default and user templates
  const allTemplates = [...defaultTemplates, ...(data.templates || [])];

  // Combine default and user snippets
  const allSnippets = [...defaultSnippets, ...(data.snippets || [])];

  // Get the selected item based on active tab
  const selectedPrompt = data.ui.selectedPromptId
    ? data.prompts.find((p) => p.id === data.ui.selectedPromptId)
    : null;

  const selectedWorkflow = data.ui.selectedWorkflowId
    ? (data.workflows || []).find((w) => w.id === data.ui.selectedWorkflowId)
    : null;

  // Filter prompts based on search, tags, and favorites
  const filteredPrompts = (data.prompts || []).filter((prompt) => {
    // Filter by search query
    if (
      data.ui.searchQuery &&
      !prompt.title.toLowerCase().includes(data.ui.searchQuery.toLowerCase()) &&
      !prompt.content.toLowerCase().includes(data.ui.searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Filter by selected tags
    if (
      data.ui.selectedTags.length > 0 &&
      !data.ui.selectedTags.some((tagId) => prompt.tags.includes(tagId))
    ) {
      return false;
    }

    // Filter by favorites
    if (data.ui.showFavoritesOnly && !prompt.isFavorite) {
      return false;
    }

    return true;
  });

  // Sort prompts based on settings
  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    const { sortBy, sortDirection } = data.settings;
    let comparison = 0;

    switch (sortBy) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "createdAt":
        comparison = a.createdAt - b.createdAt;
        break;
      case "lastModified":
        comparison = a.lastModified - b.lastModified;
        break;
      case "usageCount":
        comparison = a.usageCount - b.usageCount;
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Combine default and user templates, then filter based on search
  const filteredTemplates = allTemplates.filter((template) => {
    if (!data.ui.searchQuery) return true;

    return (
      template.title
        .toLowerCase()
        .includes(data.ui.searchQuery.toLowerCase()) ||
      template.description
        .toLowerCase()
        .includes(data.ui.searchQuery.toLowerCase()) ||
      template.content
        .toLowerCase()
        .includes(data.ui.searchQuery.toLowerCase())
    );
  });

  // Combine default and user snippets, then filter based on search
  const filteredSnippets = allSnippets.filter((snippet) => {
    if (!data.ui.searchQuery) return true;

    return (
      snippet.title.toLowerCase().includes(data.ui.searchQuery.toLowerCase()) ||
      snippet.content.toLowerCase().includes(data.ui.searchQuery.toLowerCase())
    );
  });

  // Filter workflows based on search, tags, and favorites
  const filteredWorkflows = (data.workflows || []).filter((workflow) => {
    // Filter by search query
    if (
      data.ui.searchQuery &&
      !workflow.title
        .toLowerCase()
        .includes(data.ui.searchQuery.toLowerCase()) &&
      !workflow.description
        .toLowerCase()
        .includes(data.ui.searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Filter by selected tags
    if (
      data.ui.selectedTags.length > 0 &&
      !data.ui.selectedTags.some((tagId) => workflow.tags.includes(tagId))
    ) {
      return false;
    }

    // Filter by favorites
    if (data.ui.showFavoritesOnly && !workflow.isFavorite) {
      return false;
    }

    return true;
  });

  // Sort workflows based on settings
  const sortedWorkflows = [...filteredWorkflows].sort((a, b) => {
    const { sortBy, sortDirection } = data.settings;
    let comparison = 0;

    switch (sortBy) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "createdAt":
        comparison = a.createdAt - b.createdAt;
        break;
      case "lastModified":
        comparison = a.lastModified - b.lastModified;
        break;
      default:
        comparison = 0;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  // Handle tab change
  const handleTabChange = (tab: PromptManagerData["ui"]["activeTab"]) => {
    updateUI({ activeTab: tab });
  };

  // Handle search
  const handleSearch = (query: string) => {
    updateUI({ searchQuery: query });
  };

  // Handle tag selection
  const handleTagSelect = (tagId: string) => {
    const selectedTags = data.ui.selectedTags.includes(tagId)
      ? data.ui.selectedTags.filter((id) => id !== tagId)
      : [...data.ui.selectedTags, tagId];

    updateUI({ selectedTags });
  };

  // Handle favorites toggle
  const handleFavoritesToggle = () => {
    updateUI({ showFavoritesOnly: !data.ui.showFavoritesOnly });
  };

  // Handle filters panel toggle
  const handleFiltersToggle = () => {
    updateUI({ showFiltersPanel: !data.ui.showFiltersPanel });
  };

  // Handle sort change
  const handleSortChange = (sortBy: PromptManagerData["settings"]["sortBy"]) => {
    updateSettings({ sortBy });
  };

  // Handle sort direction change
  const handleSortDirectionChange = () => {
    updateSettings({
      sortDirection: data.settings.sortDirection === "asc" ? "desc" : "asc",
    });
  };

  // Handle view mode change
  const handleViewModeChange = () => {
    updateSettings({
      viewMode: data.settings.viewMode === "list" ? "grid" : "list",
    });
  };

  // Handle start from template
  const handleStartFromTemplate = () => {
    setShowTemplateSelection(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    createPromptFromTemplate(templateId);
    setShowTemplateSelection(false);
  };

  const handleTemplateSelectionClose = () => {
    setShowTemplateSelection(false);
  };

  // Close mobile menu when changing tabs
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [data.ui.activeTab]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-gray-200">
      {/* Top Navigation */}
      <div className="flex-none border-b border-gray-700/50">
        <Tabs
          activeTab={data.ui.activeTab}
          onTabChange={handleTabChange}
          onSearch={handleSearch}
          searchQuery={data.ui.searchQuery}
          onImportExport={() => setShowImportExport("import")}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          showFiltersPanel={data.ui.showFiltersPanel}
          onToggleFiltersPanel={handleFiltersToggle}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          tags={data.tags}
          selectedTags={data.ui.selectedTags}
          onTagSelect={handleTagSelect}
          showFavoritesOnly={data.ui.showFavoritesOnly}
          onFavoritesToggle={handleFavoritesToggle}
          onCreateTag={createTag}
          onUpdateTag={updateTag}
          onDeleteTag={deleteTag}
          isVisible={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          showFiltersPanel={data.ui.showFiltersPanel}
        />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {data.ui.activeTab === "prompts" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Prompt List */}
              <PromptList
                prompts={sortedPrompts}
                selectedPromptId={data.ui.selectedPromptId}
                onSelectPrompt={(id) => updateUI({ selectedPromptId: id })}
                onCreatePrompt={createPrompt}
                onDeletePrompt={deletePrompt}
                onClonePrompt={clonePrompt}
                onToggleFavorite={toggleFavorite}
                onStartFromTemplate={handleStartFromTemplate}
                viewMode={data.settings.viewMode}
                onViewModeChange={handleViewModeChange}
                sortBy={data.settings.sortBy}
                sortDirection={data.settings.sortDirection}
                onSortChange={handleSortChange}
                onSortDirectionChange={handleSortDirectionChange}
                tags={data.tags}
              />

              {/* Prompt Editor */}
              {selectedPrompt && (
                <PromptEditor
                  prompt={selectedPrompt}
                  onUpdatePrompt={updatePrompt}
                  onIncrementUsage={incrementPromptUsage}
                  templates={allTemplates}
                  snippets={allSnippets}
                  tags={data.tags}
                />
              )}
            </div>
          )}

          {data.ui.activeTab === "templates" && (
            <TemplateList
              templates={filteredTemplates}
              selectedTemplateId={data.ui.selectedTemplateId}
              onSelectTemplate={(id) => updateUI({ selectedTemplateId: id })}
              onCreateTemplate={createTemplate}
              onUpdateTemplate={updateTemplate}
              onDeleteTemplate={deleteTemplate}
              onCreatePromptFromTemplate={createPromptFromTemplate}
            />
          )}

          {data.ui.activeTab === "snippets" && (
            <SnippetList
              snippets={filteredSnippets}
              selectedSnippetId={data.ui.selectedSnippetId}
              onSelectSnippet={(id) => updateUI({ selectedSnippetId: id })}
              onCreateSnippet={createSnippet}
              onUpdateSnippet={updateSnippet}
              onDeleteSnippet={deleteSnippet}
            />
          )}

          {data.ui.activeTab === "workflows" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Workflow List */}
              <WorkflowList
                workflows={sortedWorkflows}
                selectedWorkflowId={data.ui.selectedWorkflowId}
                onSelectWorkflow={(id) => updateUI({ selectedWorkflowId: id })}
                onCreateWorkflow={createWorkflow}
                onDeleteWorkflow={deleteWorkflow}
                onCloneWorkflow={cloneWorkflow}
                onToggleFavorite={toggleWorkflowFavorite}
                viewMode={data.settings.viewMode}
                onViewModeChange={handleViewModeChange}
                sortBy={data.settings.sortBy === "usageCount" ? "lastModified" : data.settings.sortBy}
                sortDirection={data.settings.sortDirection}
                onSortChange={handleSortChange}
                onSortDirectionChange={handleSortDirectionChange}
                tags={data.tags}
              />

              {/* Workflow Editor */}
              {selectedWorkflow && (
                <WorkflowEditor
                  workflow={selectedWorkflow}
                  onUpdateWorkflow={updateWorkflow}
                  prompts={data.prompts}
                  tags={data.tags}
                />
              )}
            </div>
          )}
        </div>
      </div>
      {showTemplateSelection && (
        <SelectTemplateModal
          templates={allTemplates}
          onSelect={handleTemplateSelect}
          onClose={handleTemplateSelectionClose}
        />
      )}
    </div>
  );
};
