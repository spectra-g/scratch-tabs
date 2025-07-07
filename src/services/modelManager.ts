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
    console.log('[ModelManager] Initialized with Monaco instance');
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
      console.log(`[ModelManager] Using existing fetch promise for tab ${tabId}`);
      return existingPromise;
    }

    // Create new fetch promise
    const fetchPromise = this.storage.getTabContent(tabId)
      .then(content => {
        console.log(`[ModelManager] ✅ Fetched content from DB for tab ${tabId} (${content?.length || 0} chars)`);
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

    console.log(`[ModelManager] Tab ${tab.id} missing content, fetching from database...`);
    
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
      console.log(`[ModelManager] Cache full, evicting tab: ${lruTabId}`);
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
      
      // CRITICAL FIX: Check if the model is still valid
      if (!model.isDisposed()) {
        // Update LRU order
        this.lru.delete(tab.id);
        this.lru.add(tab.id);
        
        console.log(`[ModelManager] Cache hit for tab ${tab.id}`);
        return model;
      } else {
        // Model is disposed, remove it from our tracking
        console.warn(`[ModelManager] Found disposed model for tab ${tab.id}, removing from cache`);
        this.models.delete(tab.id);
        this.lru.delete(tab.id);
        this.listeners.get(tab.id)?.dispose();
        this.listeners.delete(tab.id);
        // Fall through to create a new model
      }
    }

    // ENHANCED: Ensure tab has content (fetch from database if needed)
    const tabWithContent = await this.ensureTabContent(tab);
    
    console.log(`[ModelManager] Creating new model for tab ${tab.id}`);
    console.log(`[ModelManager] Tab content length: ${tabWithContent.content?.length || 0}`);
    console.log(`[ModelManager] Content source: ${this.isContentAvailable(tab) ? 'store' : 'database'}`);

    // Create a new model with consistent URI scheme
    const modelUri = this.monaco.Uri.parse(`inmemory://model/${tab.id}`);
    
    // Monaco might have a lingering model. If so, dispose it before creating a new one.
    const existingModel = this.monaco.editor.getModel(modelUri);
    if (existingModel) {
      console.log(`[ModelManager] Disposing existing model for tab ${tab.id}`);
      existingModel.dispose();
    }
    
    // Use the actual tab language (removing large content guard)
    const language = tab.language;
    const contentLength = tabWithContent.content?.length || 0;

    const model = this.monaco.editor.createModel(
      tabWithContent.content || '',  // Use content from database if needed
      language,
      modelUri
    );

    console.log(`[ModelManager] ✅ Created model for tab ${tab.id} (${contentLength} chars)`);

    // Remove any old listener before adding a new one
    this.listeners.get(tab.id)?.dispose();

    // Set up content sync listener
    const listener = model.onDidChangeContent(() => {
      try {
        const newContent = model.getValue();
        useTabsStore.getState().updateTabContent(tab.id, newContent);
        console.log(`[ModelManager] Content synced for tab ${tab.id} (${newContent.length} chars)`);
      } catch (error) {
        console.warn(`[ModelManager] Failed to update content for tab ${tab.id}:`, error);
      }
    });

    // Store the model and listener
    this.models.set(tab.id, model);
    this.listeners.set(tab.id, listener);
    this.lru.add(tab.id);

    // Check if we need to evict old models
    if (this.models.size > MAX_MODELS) {
      this.evict();
    }

    console.log(`[ModelManager] Created model for tab ${tab.id}, cache size: ${this.models.size}`);
    return model;
  }

  public dispose(tabId: string) {
    const model = this.models.get(tabId);
    if (model) {
      console.log(`[ModelManager] ⚠️  DISPOSING model for tab: ${tabId}`);
      console.trace(`[ModelManager] Dispose called from:`);
      
      // Before disposing, ensure the store has the latest content
      try {
        if (!model.isDisposed()) {
          const finalContent = model.getValue();
          useTabsStore.getState().updateTabContent(tabId, finalContent);
        }
      } catch (error) {
        console.warn(`[ModelManager] Failed to get final content for tab ${tabId}:`, error);
      }

      // Clean up listener
      this.listeners.get(tabId)?.dispose();
      this.listeners.delete(tabId);
      
      // Dispose the model
      try {
        model.dispose();
      } catch (error) {
        console.warn(`[ModelManager] Failed to dispose model for tab ${tabId}:`, error);
      }
      
      // Remove from cache
      this.models.delete(tabId);
      this.lru.delete(tabId);
    } else {
      console.log(`[ModelManager] ⚠️  Attempted to dispose non-existent model for tab: ${tabId}`);
    }
  }

  public disposeAll() {
    console.log('[ModelManager] ⚠️  DISPOSING ALL MODELS');
    console.trace('[ModelManager] disposeAll called from:');
    
    // Convert to array to avoid modification during iteration
    const tabIds = Array.from(this.models.keys());
    console.log(`[ModelManager] Disposing ${tabIds.length} models: ${tabIds.join(', ')}`);
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
        console.log(`[ModelManager] Updating model content for tab ${tabId} (${content.length} chars)`);
        model.setValue(content);
        // The onDidChangeContent listener will automatically sync this back to the store
      } catch (error) {
        console.warn(`[ModelManager] Failed to update model content for tab ${tabId}:`, error);
      }
    } else {
      console.log(`[ModelManager] No active model for tab ${tabId}, content will be updated when model is created`);
    }
  }

  public updateModelLanguage(tabId: string, language: string): void {
    const model = this.models.get(tabId);
    if (model && !model.isDisposed() && this.monaco) {
      try {
        console.log(`[ModelManager] Updating model language for tab ${tabId} to ${language}`);
        this.monaco.editor.setModelLanguage(model, language);
      } catch (error) {
        console.warn(`[ModelManager] Failed to update model language for tab ${tabId}:`, error);
      }
    } else {
      console.log(`[ModelManager] No active model for tab ${tabId}, language will be set when model is created`);
    }
  }
}

export const modelManager = new ModelManager(); 