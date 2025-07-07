import { modelManager } from '../modelManager';

// Mock the dependencies
jest.mock('../../db', () => ({
  StorageProviderFactory: {
    getProvider: jest.fn(() => ({
      getTabContent: jest.fn(() => Promise.resolve('test content')),
    })),
  },
}));

jest.mock('../../stores/tabsStore', () => ({
  useTabsStore: {
    getState: jest.fn(() => ({
      updateTabContent: jest.fn(),
    })),
  },
}));

describe('ModelManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateModelLanguage', () => {
    it('should handle case when model does not exist', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      modelManager.updateModelLanguage('non-existent-tab', 'json');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ModelManager] No active model for tab non-existent-tab, language will be updated when model is created'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle case when Monaco is not initialized', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Reset the modelManager to simulate uninitialized state
      const originalModels = (modelManager as any).models;
      (modelManager as any).models = new Map();
      (modelManager as any).monaco = null;
      
      modelManager.updateModelLanguage('test-tab', 'json');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ModelManager] No active model for tab test-tab, language will be updated when model is created'
      );
      
      // Restore the original state
      (modelManager as any).models = originalModels;
      consoleSpy.mockRestore();
    });
  });
}); 