import { VaultTablet } from '../VaultTablet';

describe('VaultTablet', () => {
  describe('tablet interface', () => {
    it('should have correct tablet properties', () => {
      expect(VaultTablet.id).toBe('vault');
      expect(VaultTablet.label).toBe('Knowledge Vault');
      expect(VaultTablet.keywords).toEqual([
        'vault',
        'snippets',
        'knowledge base',
        'code',
        'notes',
        'commands',
      ]);
    });

    it('should have a render function', () => {
      expect(typeof VaultTablet.render).toBe('function');
    });

    it('should have state management functions', () => {
      expect(typeof VaultTablet.createInitialState).toBe('function');
      expect(typeof VaultTablet.serializeState).toBe('function');
      expect(typeof VaultTablet.deserializeState).toBe('function');
    });
  });

  it('should serialize and deserialize state correctly', () => {
    const initialState = VaultTablet.createInitialState();
    const serialized = VaultTablet.serializeState(initialState);
    const deserialized = VaultTablet.deserializeState(serialized);
    
    expect(deserialized).toEqual(initialState);
  });

  it('should create initial state with correct structure', () => {
    const state = VaultTablet.createInitialState();
    
    expect(state).toHaveProperty('type', 'vault');
    expect(state).toHaveProperty('data');
    expect(state.data).toHaveProperty('items');
    expect(state.data).toHaveProperty('searchQuery');
    expect(state.data).toHaveProperty('activeFilters');
    expect(state.data).toHaveProperty('sortOrder');
    expect(state.data).toHaveProperty('viewMode');
  });

  it('should handle deserialization of malformed data gracefully', () => {
    const malformedJson = '{"invalid": "data"}';
    const result = VaultTablet.deserializeState(malformedJson);
    
    // Should return a valid initial state
    expect(result).toHaveProperty('type', 'vault');
    expect(result).toHaveProperty('data');
  });

  it('should handle deserialization of valid data with missing properties', () => {
    const partialData = JSON.stringify({
      type: 'vault',
      data: {
        items: [
          {
            id: 'test-id',
            title: 'Test Item',
            content: 'Test content',
            contentType: 'plaintext',
            labels: [],
            createdTimestamp: Date.now(),
            modifiedTimestamp: Date.now(),
            isPinned: false,
            usageCount: 0,
            lastUsedTimestamp: Date.now(),
          }
        ]
      }
    });
    
    const result = VaultTablet.deserializeState(partialData);
    
    // Should have all required properties with defaults
    expect(result).toHaveProperty('type', 'vault');
    expect(result.data).toHaveProperty('searchQuery', '');
    expect(result.data).toHaveProperty('activeFilters');
    expect(result.data).toHaveProperty('sortOrder', 'lastUsed');
    expect(result.data).toHaveProperty('viewMode', 'card');
    expect(result.data.items).toHaveLength(1);
  });
}); 