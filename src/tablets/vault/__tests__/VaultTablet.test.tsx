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
        'cheat sheet',
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
    expect(state.data).toHaveProperty('viewMode', 'canvas');
    expect(state.data).toHaveProperty('categories');
    expect(state.data).toHaveProperty('scratchpadContent');
    expect(state.data).toHaveProperty('isScratchpadOpen');
    expect(state.data).toHaveProperty('isSpotlightOpen');
    expect(state.data).toHaveProperty('selectedCategory');
    expect(state.data).toHaveProperty('scratchpadSourceItemId');

    // Should have default "General" category
    expect(state.data.categories).toContain('General');
    expect(state.data.selectedCategory).toBe('General');
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
    expect(result.data).toHaveProperty('viewMode', 'canvas');
    expect(result.data).toHaveProperty('categories');
    expect(result.data).toHaveProperty('scratchpadContent', '');
    expect(result.data).toHaveProperty('isScratchpadOpen', false);
    expect(result.data).toHaveProperty('isSpotlightOpen', false);
    expect(result.data).toHaveProperty('selectedCategory');
    expect(result.data.items).toHaveLength(1);

    // Should ensure "General" category exists
    expect(result.data.categories).toContain('General');

    // Should have order field on items
    expect(result.data.items[0]).toHaveProperty('order');
  });
}); 