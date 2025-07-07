import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Tab } from '../types';
import { useTabsStore } from '../stores/tabsStore';
import { StorageProviderFactory } from '../db';

// The maximum number of models to keep in memory
const MAX_MODELS = 10;

class ModelManager {
  private monaco: typeof Monaco | null = null;
  private models = new Map<string, Monaco.editor.ITextModel>();
  private lru = new Set<string>(); // Simple Set acts as LRU list
  private listeners = new Map<string, Monaco.IDisposable>();
  private storage = StorageProviderFactory.getProvider();
  private contentFetchPromises = new Map<string, Promise<string>>(); // Prevent duplicate fetches

  public initialize(monacoInstance: typeof Monaco) {
    if (this.monaco) return;
    this.monaco = monacoInstance;
  }

  /**
   * Checks if tab content is available and valid for model creation
   */
  private isContentAvailable(tab: Tab): boolean {
    return tab.content !== undefined && tab.content !== null;
  }

  /**
   * Fetches tab content from database with deduplication
   */
  private async fetchContentFromDatabase(tabId: string): Promise<string> {
    // Check if we're already fetching this content
    const existingPromise = this.contentFetchPromises.get(tabId);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new fetch promise
    const fetchPromise = this.storage.getTabContent(tabId)
      .then(content => {
        return content || '';
      })
      .catch(error => {
        console.error(`[ModelManager] ❌ Failed to fetch content from DB for tab ${tabId}:`, error);
        return ''; // Return empty string as fallback
      })
      .finally(() => {
        // Clean up the promise from cache
        this.contentFetchPromises.delete(tabId);
      });

    // Cache the promise to prevent duplicate requests
    this.contentFetchPromises.set(tabId, fetchPromise);
    
    return fetchPromise;
  }

  /**
   * Ensures tab has content, fetching from database if necessary
   */
  private async ensureTabContent(tab: Tab): Promise<Tab> {
    if (this.isContentAvailable(tab)) {
      return tab; // Content already available
    }

    try {
      const fetchedContent = await this.fetchContentFromDatabase(tab.id);
      
      // Update the store with fetched content to maintain consistency
      useTabsStore.getState().updateTabContent(tab.id, fetchedContent);
      
      // Return updated tab object
      return {
        ...tab,
        content: fetchedContent
      };
    } catch (error) {
      console.error(`[ModelManager] Failed to ensure content for tab ${tab.id}:`, error);
      
      // Return tab with empty content as fallback
      return {
        ...tab,
        content: ''
      };
    }
  }

  private evict() {
    if (this.models.size < MAX_MODELS) return;

    // The first item in a Set (when iterated) is the oldest one added
    const lruTabId = this.lru.values().next().value;
    if (lruTabId) {
      this.dispose(lruTabId);
    }
  }

  public async get(tab: Tab): Promise<Monaco.editor.ITextModel> {
    if (!this.monaco) {
      throw new Error('ModelManager not initialized');
    }

    // Check if we have a cached model
    if (this.models.has(tab.id)) {
      const model = this.models.get(tab.id)!;
      if (!model.isDisposed()) {
        this.lru.delete(tab.id);
        this.lru.add(tab.id);
        return model;
      } else {
        this.models.delete(tab.id);
        this.lru.delete(tab.id);
        this.listeners.get(tab.id)?.dispose();
        this.listeners.delete(tab.id);
      }
    }

    const tabWithContent = await this.ensureTabContent(tab);
    const modelUri = this.monaco.Uri.parse(`inmemory://model/${tab.id}`);
    const existingModel = this.monaco.editor.getModel(modelUri);
    if (existingModel) {
      existingModel.dispose();
    }
    const model = this.monaco.editor.createModel(
      tabWithContent.content || '',
      tab.language,
      modelUri
    );
    this.listeners.get(tab.id)?.dispose();
    const listener = model.onDidChangeContent(() => {
      try {
        const newContent = model.getValue();
        useTabsStore.getState().updateTabContent(tab.id, newContent);
      } catch (error) {
        console.warn(`[ModelManager] Failed to update content for tab ${tab.id}:`, error);
      }
    });
    this.models.set(tab.id, model);
    this.listeners.set(tab.id, listener);
    this.lru.add(tab.id);
    if (this.models.size > MAX_MODELS) {
      this.evict();
    }
    return model;
  }

  public dispose(tabId: string) {
    const model = this.models.get(tabId);
    if (model) {
      try {
        if (!model.isDisposed()) {
          const finalContent = model.getValue();
          useTabsStore.getState().updateTabContent(tabId, finalContent);
        }
      } catch (error) {
        console.warn(`[ModelManager] Failed to get final content for tab ${tabId}:`, error);
      }
      this.listeners.get(tabId)?.dispose();
      this.listeners.delete(tabId);
      try {
        model.dispose();
      } catch (error) {
        console.warn(`[ModelManager] Failed to dispose model for tab ${tabId}:`, error);
      }
      this.models.delete(tabId);
      this.lru.delete(tabId);
    }
  }

  public disposeAll() {
    // Convert to array to avoid modification during iteration
    const tabIds = Array.from(this.models.keys());
    tabIds.forEach(tabId => this.dispose(tabId));
  }

  // Helper methods for debugging
  public getDebugInfo() {
    return {
      modelCount: this.models.size,
      maxModels: MAX_MODELS,
      cachedTabs: Array.from(this.models.keys()),
      lruOrder: Array.from(this.lru)
    };
  }

  public getContent(tabId: string): string | undefined {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed()) {
      try {
        return model.getValue();
      } catch (error) {
        console.warn(`[ModelManager] Failed to get content for tab ${tabId}:`, error);
        return undefined;
      }
    }
    return undefined;
  }

  public updateModelContent(tabId: string, content: string): void {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed()) {
      try {
        model.setValue(content);
        // The onDidChangeContent listener will automatically sync this back to the store
      } catch (error) {
        console.warn(`[ModelManager] Failed to update model content for tab ${tabId}:`, error);
      }
    }
  }

  public updateModelLanguage(tabId: string, language: string): void {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed() && this.monaco) {
      try {
        this.monaco.editor.setModelLanguage(model, language);
      } catch (error) {
        console.warn(`[ModelManager] Failed to update model language for tab ${tabId}:`, error);
      }
    }
  }

}

export const modelManager = new ModelManager(); 