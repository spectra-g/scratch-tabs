import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Tab } from '../types';

// The maximum number of models to keep in memory. Adjust as needed.
const MAX_MODELS = 5;

class ModelManager {
  private models: Map<string, Monaco.editor.ITextModel> = new Map();
  private monaco: typeof Monaco | null = null;
  
  // Callback functions to be provided by the store or component
  private onModelCreated: ((model: Monaco.editor.ITextModel, tabId: string) => void) | null = null;

  public initialize(monacoInstance: typeof Monaco, onModelCreatedCallback: (model: Monaco.editor.ITextModel, tabId: string) => void) {
    this.monaco = monacoInstance;
    this.onModelCreated = onModelCreatedCallback;
    console.log(`[ModelManager] Initialized with max cache size: ${MAX_MODELS}`);
  }

  /**
   * Gets a model from the cache or creates it if it doesn't exist.
   * Manages the LRU cache eviction policy.
   */
  public get(tab: Tab): Monaco.editor.ITextModel {
    if (!this.monaco) {
      throw new Error("ModelManager not initialized. Call initialize() first.");
    }
    
    // 1. Check if model is already in the cache
    if (this.models.has(tab.id)) {
      const model = this.models.get(tab.id)!;
      // If the model is disposed, remove it and create a new one
      if (model.isDisposed()) {
        console.warn(`[ModelManager] Model for tab ${tab.id} was disposed, recreating.`);
        this.models.delete(tab.id);
        // Proceed to create a new model below
      } else {
        // Move it to the end to mark it as most recently used
        this.models.delete(tab.id);
        this.models.set(tab.id, model);

        // Ensure content and language are up-to-date
        if (model.getValue() !== tab.content) {
          model.setValue(tab.content);
        }
        if (model.getLanguageId() !== tab.language) {
          this.monaco.editor.setModelLanguage(model, tab.language);
        }

        console.log(`[ModelManager] Retrieved cached model for tab: ${tab.id} (cache size: ${this.models.size})`);
        return model;
      }
    }

    // 2. If not in cache, create it
    // Check if we need to evict the least recently used model
    if (this.models.size >= MAX_MODELS) {
      this.evict();
    }
    
    // Create new model
    const newModel = this.monaco.editor.createModel(tab.content, tab.language);
    this.models.set(tab.id, newModel);
    
    // Attach listeners or other setup via the callback
    this.onModelCreated?.(newModel, tab.id);

    console.log(`[ModelManager] Created new model for tab: ${tab.id} (cache size: ${this.models.size})`);
    return newModel;
  }
  
  /**
   * Evicts the least recently used model from the cache.
   */
  private evict() {
    // A Map iterates in insertion order, so the first key is the oldest.
    const lruKey = this.models.keys().next().value;
    if (lruKey) {
      const modelToDispose = this.models.get(lruKey);
      console.log(`[ModelManager] Evicting model for tab: ${lruKey} (cache size: ${this.models.size})`);
      modelToDispose?.dispose(); // This is the crucial memory-freeing step!
      this.models.delete(lruKey);
    }
  }

  /**
   * Explicitly disposes a model, e.g., when a tab is closed or converted to tablet.
   */
  public dispose(tabId: string) {
    if (this.models.has(tabId)) {
      const model = this.models.get(tabId);
      if (model && !model.isDisposed()) {
        console.log(`[ModelManager] Disposing model for tab: ${tabId} (cache size: ${this.models.size - 1})`);
        model.dispose();
      }
      this.models.delete(tabId);
    }
  }

  /**
   * Handles cleanup when a tab is converted to a tablet.
   * This is a convenience method that does the same as dispose.
   */
  public handleTabletConversion(tabId: string) {
    this.dispose(tabId);
  }

  /**
   * Disposes all models. Called on application shutdown.
   */
  public disposeAll() {
    console.log(`[ModelManager] Disposing all ${this.models.size} models`);
    this.models.forEach((model) => {
      if (!model.isDisposed()) {
        model.dispose();
      }
    });
    this.models.clear();
  }

  /**
   * Gets the current number of models in the cache.
   */
  public getCacheSize(): number {
    return this.models.size;
  }

  /**
   * Gets the maximum number of models allowed in the cache.
   */
  public getMaxCacheSize(): number {
    return MAX_MODELS;
  }

  /**
   * Debug method to log cache status
   */
  public logCacheStatus() {
    console.log(`[ModelManager] Cache status: ${this.models.size}/${MAX_MODELS} models`);
    this.models.forEach((model, tabId) => {
      console.log(`  - Tab ${tabId}: ${model.isDisposed() ? 'DISPOSED' : 'ACTIVE'}`);
    });
  }
}

// Export a singleton instance
export const modelManager = new ModelManager(); 