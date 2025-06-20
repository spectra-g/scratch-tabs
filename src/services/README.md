# ModelManager Service

## Overview

The `ModelManager` service implements a Least Recently Used (LRU) cache for Monaco editor models to solve memory consumption issues. Instead of keeping a full Monaco model in memory for every single tab, this service maintains only a limited number of models (default: 5) and automatically evicts the least recently used ones.

## Problem Solved

Monaco models are memory-intensive because they contain:
- Full text content
- Tokenized representation
- Abstract Syntax Tree (AST) for the language
- Complete undo/redo history

Keeping models for all tabs can lead to high RAM consumption, especially with many tabs open.

## Solution

The ModelManager implements an LRU cache that:
1. **Limits memory usage** by keeping only the most recently used models
2. **Preserves undo/redo history** for active tabs
3. **Automatically evicts** old models when the cache is full
4. **Recreates models** from tab content when needed

## Usage

### Basic Usage

```typescript
import { modelManager } from '../services/modelManager';

// Initialize with Monaco instance and callback
modelManager.initialize(monaco, (model, tabId) => {
  // Set up model event listeners
  model.onDidChangeContent(() => {
    // Handle content changes
  });
});

// Get a model for a tab (creates or retrieves from cache)
const model = modelManager.get(tab);

// Dispose a model when tab is closed
modelManager.dispose(tabId);

// Clean up all models on app shutdown
modelManager.disposeAll();
```

### Integration with EditorInstance

The `EditorInstance` component has been refactored to use the ModelManager:

```typescript
// Old approach (keeps all models in memory)
const tabModels = new Map<string, Monaco.editor.ITextModel>();

// New approach (uses LRU cache)
const model = modelManager.get(activeTab);
```

### Integration with Root Store

The root store automatically disposes models when tabs are closed:

```typescript
removeTab: (id: string) => {
  // Dispose the model to free memory immediately
  modelManager.dispose(id);
  
  // ... rest of tab removal logic
}
```

## Configuration

### Cache Size

The maximum number of models to keep in memory can be adjusted:

```typescript
// In modelManager.ts
const MAX_MODELS = 5; // Adjust this value as needed
```

### Recommended Settings

- **Development**: 3-5 models (for debugging)
- **Production**: 5-10 models (balance between memory and UX)
- **Memory-constrained**: 2-3 models (minimal memory usage)

## Trade-offs

### Benefits
- ✅ **Low memory usage** regardless of tab count
- ✅ **Preserves undo/redo** for active tabs
- ✅ **Seamless UX** for recently used tabs
- ✅ **Automatic cleanup** prevents memory leaks

### Trade-offs
- ⚠️ **Lost undo/redo history** for evicted tabs
- ⚠️ **Slight delay** when switching to evicted tabs (model recreation)

## Monitoring

The ModelManager includes debug logging to monitor cache behavior:

```typescript
// Log current cache status
modelManager.logCacheStatus();

// Get cache statistics
const currentSize = modelManager.getCacheSize();
const maxSize = modelManager.getMaxCacheSize();
```

## Performance Impact

- **Memory**: Dramatically reduced memory usage
- **CPU**: Minimal overhead for cache management
- **UX**: Seamless for active tabs, slight delay for evicted tabs

## Best Practices

1. **Always dispose models** when tabs are closed
2. **Monitor cache size** in development
3. **Adjust MAX_MODELS** based on your use case
4. **Test with many tabs** to ensure smooth operation 