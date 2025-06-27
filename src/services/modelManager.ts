import * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Tab } from '../types';

// The maximum number of models to keep in memory. Adjust as needed.
const MAX_MODELS = 5;

interface ModelMetadata {
  model: Monaco.editor.ITextModel;
  lastAccessed: number;
  lastEdited: number;
  hasBeenEdited: boolean;
}

class ModelManager {
  private models: Map<string, ModelMetadata> = new Map();
  private monaco: typeof Monaco | null = null;
  private visibleTabIds: Set<string> = new Set();
  
  // Callback functions to be provided by the store or component
  private onModelCreated: ((model: Monaco.editor.ITextModel, tabId: string) => void) | null = null;

  public initialize(monacoInstance: typeof Monaco, onModelCreatedCallback: (model: Monaco.editor.ITextModel, tabId: string) => void) {
    this.monaco = monacoInstance;
    this.onModelCreated = onModelCreatedCallback;
  }

  /**
   * Sets the currently visible tab IDs to prevent them from being evicted
   */
  public setVisibleTabIds(visibleTabIds: string[]) {
    this.visibleTabIds = new Set(visibleTabIds);
  }

  /**
   * Gets a model from the cache or creates it if it doesn't exist.
   * Manages the Modified LRU cache eviction policy.
   */
  public get(tab: Tab, visibleTabIds?: string[]): Monaco.editor.ITextModel {
    if (!this.monaco) {
      throw new Error("ModelManager not initialized. Call initialize() first.");
    }

    // Update visible tab IDs if provided
    if (visibleTabIds) {
      this.setVisibleTabIds(visibleTabIds);
    }
    
    const now = Date.now();
    
    // 1. Check if model is already in the cache
    if (this.models.has(tab.id)) {
      const metadata = this.models.get(tab.id)!;
      const model = metadata.model;
      
      // If the model is disposed, remove it and create a new one
      if (model.isDisposed()) {
        this.models.delete(tab.id);
        // Proceed to create a new model below
      } else {
        // Update last accessed time
        metadata.lastAccessed = now;
        
        // Move it to the end to mark it as most recently used
        this.models.delete(tab.id);
        this.models.set(tab.id, metadata);

        // Ensure content and language are up-to-date
        if (model.getValue() !== tab.content) {
          model.setValue(tab.content);
        }
        if (model.getLanguageId() !== tab.language) {
          this.monaco.editor.setModelLanguage(model, tab.language);
        }

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
    
    // Create metadata with initial state
    const metadata: ModelMetadata = {
      model: newModel,
      lastAccessed: now,
      lastEdited: tab.lastModified, // Use tab's lastModified as initial edit time
      hasBeenEdited: tab.lastModified > tab.dateCreated, // Check if tab was modified after creation
    };
    
    this.models.set(tab.id, metadata);

    // Attach listeners or other setup via the callback
    this.onModelCreated?.(newModel, tab.id);

    return newModel;
  }

  /**
   * Marks a model as having been edited
   */
  public markAsEdited(tabId: string) {
    const metadata = this.models.get(tabId);
    if (metadata) {
      metadata.lastEdited = Date.now();
      metadata.hasBeenEdited = true;
    }
  }
  
  /**
   * Evicts the least recently used model from the cache.
   * Uses Modified LRU: prioritizes keeping edited tabs over viewed-only tabs.
   */
  private evict() {
    let candidateForEviction: string | undefined;
    let candidateScore = -1; // Lower score = higher priority for eviction
    
    for (const [tabId, metadata] of this.models) {
      // Skip if this tab is currently visible
      if (this.visibleTabIds.has(tabId)) {
        continue;
      }
      
      // Calculate eviction score
      // Priority order:
      // 1. Non-edited tabs (score: 0)
      // 2. Edited tabs (score: 1 + time factor)
      let score = 0;
      
      if (metadata.hasBeenEdited) {
        // For edited tabs, score based on how long ago they were edited
        // More recent edits = higher score = lower priority for eviction
        const hoursSinceEdit = (Date.now() - metadata.lastEdited) / (1000 * 60 * 60);
        score = 1 + Math.max(0, 24 - hoursSinceEdit); // Max 24 hours of "protection"
      }
      
      // If this candidate has a lower score (higher eviction priority), select it
      if (score < candidateScore || candidateScore === -1) {
        candidateScore = score;
        candidateForEviction = tabId;
      }
    }
    
    // If all models are visible, we have to evict the oldest one anyway
    if (!candidateForEviction) {
      candidateForEviction = this.models.keys().next().value;
    }
    
    if (candidateForEviction) {
      const metadata = this.models.get(candidateForEviction);
      if (metadata) {
        metadata.model.dispose(); // This is the crucial memory-freeing step!
        this.models.delete(candidateForEviction);
      }
    }
  }

  /**
   * Explicitly disposes a model, e.g., when a tab is closed or converted to tablet.
   */
  public dispose(tabId: string) {
    if (this.models.has(tabId)) {
      const metadata = this.models.get(tabId);
      if (metadata && !metadata.model.isDisposed()) {
        metadata.model.dispose();
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
    this.models.forEach((metadata) => {
      if (!metadata.model.isDisposed()) {
        metadata.model.dispose();
      }
    });
    this.models.clear();
    this.visibleTabIds.clear();
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
   * Gets debug information about the cache state
   */
  public getDebugInfo() {
    const info = Array.from(this.models.entries()).map(([tabId, metadata]) => ({
      tabId,
      hasBeenEdited: metadata.hasBeenEdited,
      lastEdited: new Date(metadata.lastEdited).toISOString(),
      lastAccessed: new Date(metadata.lastAccessed).toISOString(),
      isVisible: this.visibleTabIds.has(tabId),
    }));
    
    return {
      cacheSize: this.models.size,
      maxSize: MAX_MODELS,
      models: info,
    };
  }
}

// Export a singleton instance
export const modelManager = new ModelManager(); 