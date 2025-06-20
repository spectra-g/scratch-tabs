import React from 'react';
import { Tablet, TabletState } from '../types';
import { PromptManagerData, Prompt, Template, Snippet, Tag } from './types';
import { PromptManagerUI } from './components/PromptManagerUI';
import { defaultTemplates } from './data/defaultTemplates';
import { defaultSnippets } from './data/defaultSnippets';
import { defaultTags } from './data/defaultTags';

interface PromptManagerTabletState extends TabletState {
  type: 'promptmanager';
  data: PromptManagerData;
}

export const PromptManagerTablet: Tablet = {
  id: 'promptmanager',
  label: 'Prompt Manager',
  keywords: ['prompt', 'ai', 'chatgpt', 'llm', 'templates', 'prompts', 'snippets'],

  createInitialState(): PromptManagerTabletState {
    return {
      type: 'promptmanager',
      data: {
        prompts: [],
        templates: defaultTemplates,
        snippets: defaultSnippets,
        tags: defaultTags,
        settings: {
          sortBy: 'lastModified',
          sortDirection: 'desc',
          viewMode: 'grid',
          showPreview: true,
        },
        ui: {
          activeTab: 'prompts',
          selectedPromptId: null,
          selectedTemplateId: null,
          selectedSnippetId: null,
          searchQuery: '',
          selectedTags: [],
          showFavoritesOnly: false,
        }
      }
    };
  },

  serializeState(state: TabletState): string {
    return JSON.stringify(state);
  },

  deserializeState(json: string): TabletState {
    try {
      const parsed = JSON.parse(json);
      if (parsed.type === 'promptmanager' && parsed.data) {
        // Ensure all required properties exist
        const data = parsed.data as PromptManagerData;
        
        // Ensure arrays exist
        data.prompts = Array.isArray(data.prompts) ? data.prompts : [];
        data.templates = Array.isArray(data.templates) ? data.templates : [...defaultTemplates];
        data.snippets = Array.isArray(data.snippets) ? data.snippets : [...defaultSnippets];
        data.tags = Array.isArray(data.tags) ? data.tags : [...defaultTags];
        
        // Ensure settings exist
        data.settings = {
          sortBy: data.settings?.sortBy || 'lastModified',
          sortDirection: data.settings?.sortDirection || 'desc',
          viewMode: data.settings?.viewMode || 'grid',
          showPreview: data.settings?.showPreview ?? true,
        };
        
        // Ensure UI state exists
        data.ui = {
          activeTab: data.ui?.activeTab || 'prompts',
          selectedPromptId: data.ui?.selectedPromptId || null,
          selectedTemplateId: data.ui?.selectedTemplateId || null,
          selectedSnippetId: data.ui?.selectedSnippetId || null,
          searchQuery: data.ui?.searchQuery || '',
          selectedTags: Array.isArray(data.ui?.selectedTags) ? data.ui.selectedTags : [],
          showFavoritesOnly: data.ui?.showFavoritesOnly || false,
        };
        
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse Prompt Manager state:', e);
    }
    
    // Return default state if parsing fails
    return this.createInitialState();
  },

  render(state: PromptManagerTabletState, onChange) {
    const { data } = state;
    
    // Helper to update state immutably
    const updateData = (newData: Partial<PromptManagerData>) => {
      onChange({
        ...state,
        data: {
          ...data,
          ...newData
        }
      });
    };
    
    // Helper to update UI state immutably
    const updateUI = (newUI: Partial<PromptManagerData['ui']>) => {
      onChange({
        ...state,
        data: {
          ...data,
          ui: {
            ...data.ui,
            ...newUI
          }
        }
      });
    };
    
    // Helper to update settings immutably
    const updateSettings = (newSettings: Partial<PromptManagerData['settings']>) => {
      onChange({
        ...state,
        data: {
          ...data,
          settings: {
            ...data.settings,
            ...newSettings
          }
        }
      });
    };
    
    // Prompt CRUD operations
    const createPrompt = (prompt: Omit<Prompt, 'id' | 'createdAt' | 'lastModified' | 'usageCount'>) => {
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 0,
        ...prompt
      };
      
      updateData({
        prompts: [...data.prompts, newPrompt],
        ui: {
          ...data.ui,
          selectedPromptId: newPrompt.id
        }
      });
      
      return newPrompt;
    };
    
    const updatePrompt = (id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>) => {
      const updatedPrompts = data.prompts.map(prompt => 
        prompt.id === id 
          ? { 
              ...prompt, 
              ...updates, 
              lastModified: Date.now() 
            } 
          : prompt
      );
      
      updateData({ prompts: updatedPrompts });
    };
    
    const deletePrompt = (id: string) => {
      const updatedPrompts = data.prompts.filter(prompt => prompt.id !== id);
      
      // If the deleted prompt was selected, clear selection
      const newUI = data.ui.selectedPromptId === id 
        ? { selectedPromptId: updatedPrompts.length > 0 ? updatedPrompts[0].id : null }
        : {};
      
      updateData({ 
        prompts: updatedPrompts,
        ui: {
          ...data.ui,
          ...newUI
        }
      });
    };
    
    const clonePrompt = (id: string) => {
      const promptToClone = data.prompts.find(p => p.id === id);
      if (!promptToClone) return;
      
      const newPrompt: Prompt = {
        ...promptToClone,
        id: crypto.randomUUID(),
        title: `${promptToClone.title} (Copy)`,
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 0
      };
      
      updateData({
        prompts: [...data.prompts, newPrompt],
        ui: {
          ...data.ui,
          selectedPromptId: newPrompt.id
        }
      });
      
      return newPrompt;
    };
    
    const incrementPromptUsage = (id: string) => {
      const updatedPrompts = data.prompts.map(prompt => 
        prompt.id === id 
          ? { ...prompt, usageCount: prompt.usageCount + 1 } 
          : prompt
      );
      
      updateData({ prompts: updatedPrompts });
    };
    
    const toggleFavorite = (id: string) => {
      const updatedPrompts = data.prompts.map(prompt => 
        prompt.id === id 
          ? { ...prompt, isFavorite: !prompt.isFavorite } 
          : prompt
      );
      
      updateData({ prompts: updatedPrompts });
    };
    
    // Template operations
    const createTemplate = (template: Omit<Template, 'id'>) => {
      const newTemplate: Template = {
        id: crypto.randomUUID(),
        ...template
      };
      
      updateData({
        templates: [...data.templates, newTemplate],
        ui: {
          ...data.ui,
          selectedTemplateId: newTemplate.id
        }
      });
      
      return newTemplate;
    };
    
    const updateTemplate = (id: string, updates: Partial<Omit<Template, 'id'>>) => {
      const updatedTemplates = data.templates.map(template => 
        template.id === id 
          ? { ...template, ...updates } 
          : template
      );
      
      updateData({ templates: updatedTemplates });
    };
    
    const deleteTemplate = (id: string) => {
      // Don't allow deleting built-in templates
      const templateToDelete = data.templates.find(t => t.id === id);
      if (templateToDelete?.isBuiltIn) return;
      
      const updatedTemplates = data.templates.filter(template => template.id !== id);
      
      // If the deleted template was selected, clear selection
      const newUI = data.ui.selectedTemplateId === id 
        ? { selectedTemplateId: updatedTemplates.length > 0 ? updatedTemplates[0].id : null }
        : {};
      
      updateData({ 
        templates: updatedTemplates,
        ui: {
          ...data.ui,
          ...newUI
        }
      });
    };
    
    // Snippet operations
    const createSnippet = (snippet: Omit<Snippet, 'id'>) => {
      const newSnippet: Snippet = {
        id: crypto.randomUUID(),
        ...snippet
      };
      
      updateData({
        snippets: [...data.snippets, newSnippet],
        ui: {
          ...data.ui,
          selectedSnippetId: newSnippet.id
        }
      });
      
      return newSnippet;
    };
    
    const updateSnippet = (id: string, updates: Partial<Omit<Snippet, 'id'>>) => {
      const updatedSnippets = data.snippets.map(snippet => 
        snippet.id === id 
          ? { ...snippet, ...updates } 
          : snippet
      );
      
      updateData({ snippets: updatedSnippets });
    };
    
    const deleteSnippet = (id: string) => {
      // Don't allow deleting built-in snippets
      const snippetToDelete = data.snippets.find(s => s.id === id);
      if (snippetToDelete?.isBuiltIn) return;
      
      const updatedSnippets = data.snippets.filter(snippet => snippet.id !== id);
      
      // If the deleted snippet was selected, clear selection
      const newUI = data.ui.selectedSnippetId === id 
        ? { selectedSnippetId: updatedSnippets.length > 0 ? updatedSnippets[0].id : null }
        : {};
      
      updateData({ 
        snippets: updatedSnippets,
        ui: {
          ...data.ui,
          ...newUI
        }
      });
    };
    
    // Tag operations
    const createTag = (tag: Omit<Tag, 'id'>) => {
      const newTag: Tag = {
        id: crypto.randomUUID(),
        ...tag
      };
      
      updateData({ tags: [...data.tags, newTag] });
      return newTag;
    };
    
    const updateTag = (id: string, updates: Partial<Omit<Tag, 'id'>>) => {
      const updatedTags = data.tags.map(tag => 
        tag.id === id 
          ? { ...tag, ...updates } 
          : tag
      );
      
      // Also update tag references in prompts
      const updatedPrompts = data.prompts.map(prompt => {
        if (prompt.tags.includes(id)) {
          return prompt;
        }
        return prompt;
      });
      
      updateData({ 
        tags: updatedTags,
        prompts: updatedPrompts
      });
    };
    
    const deleteTag = (id: string) => {
      // Don't allow deleting built-in tags
      const tagToDelete = data.tags.find(t => t.id === id);
      if (tagToDelete?.isBuiltIn) return;
      
      const updatedTags = data.tags.filter(tag => tag.id !== id);
      
      // Remove tag from prompts
      const updatedPrompts = data.prompts.map(prompt => ({
        ...prompt,
        tags: prompt.tags.filter(tagId => tagId !== id)
      }));
      
      // Remove tag from selected tags if present
      const updatedSelectedTags = data.ui.selectedTags.filter(tagId => tagId !== id);
      
      updateData({ 
        tags: updatedTags,
        prompts: updatedPrompts,
        ui: {
          ...data.ui,
          selectedTags: updatedSelectedTags
        }
      });
    };
    
    // Import/Export
    const importData = (importedData: Partial<PromptManagerData>) => {
      // Merge imported data with existing data
      const mergedData: PromptManagerData = {
        prompts: [...(importedData.prompts || []), ...data.prompts],
        templates: [...(importedData.templates || []), ...data.templates],
        snippets: [...(importedData.snippets || []), ...data.snippets],
        tags: [...(importedData.tags || []), ...data.tags],
        settings: data.settings,
        ui: data.ui
      };
      
      // Deduplicate by ID
      const uniquePrompts = Array.from(
        new Map(mergedData.prompts.map(item => [item.id, item])).values()
      );
      
      const uniqueTemplates = Array.from(
        new Map(mergedData.templates.map(item => [item.id, item])).values()
      );
      
      const uniqueSnippets = Array.from(
        new Map(mergedData.snippets.map(item => [item.id, item])).values()
      );
      
      const uniqueTags = Array.from(
        new Map(mergedData.tags.map(item => [item.id, item])).values()
      );
      
      updateData({
        prompts: uniquePrompts,
        templates: uniqueTemplates,
        snippets: uniqueSnippets,
        tags: uniqueTags
      });
    };
    
    const exportData = () => {
      const exportData: Partial<PromptManagerData> = {
        prompts: data.prompts,
        templates: data.templates.filter(t => !t.isBuiltIn), // Only export user templates
        snippets: data.snippets.filter(s => !s.isBuiltIn), // Only export user snippets
        tags: data.tags.filter(t => !t.isBuiltIn) // Only export user tags
      };
      
      return exportData;
    };
    
    // Create prompt from template
    const createPromptFromTemplate = (templateId: string) => {
      const template = data.templates.find(t => t.id === templateId);
      if (!template) return;
      
      const newPrompt: Prompt = {
        id: crypto.randomUUID(),
        title: template.title,
        content: template.content,
        tags: [],
        isFavorite: false,
        createdAt: Date.now(),
        lastModified: Date.now(),
        usageCount: 0
      };
      
      updateData({
        prompts: [...data.prompts, newPrompt],
        ui: {
          ...data.ui,
          activeTab: 'prompts',
          selectedPromptId: newPrompt.id
        }
      });
      
      return newPrompt;
    };
    
    return (
      <PromptManagerUI
        data={data}
        updateUI={updateUI}
        updateSettings={updateSettings}
        createPrompt={createPrompt}
        updatePrompt={updatePrompt}
        deletePrompt={deletePrompt}
        clonePrompt={clonePrompt}
        incrementPromptUsage={incrementPromptUsage}
        toggleFavorite={toggleFavorite}
        createTemplate={createTemplate}
        updateTemplate={updateTemplate}
        deleteTemplate={deleteTemplate}
        createSnippet={createSnippet}
        updateSnippet={updateSnippet}
        deleteSnippet={deleteSnippet}
        createTag={createTag}
        updateTag={updateTag}
        deleteTag={deleteTag}
        importData={importData}
        exportData={exportData}
        createPromptFromTemplate={createPromptFromTemplate}
      />
    );
  }
};