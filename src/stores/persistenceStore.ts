import { create } from 'zustand';
import { StorageProviderFactory } from '../db';

interface PersistenceStore {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  saveState: () => Promise<void>;
}

export const usePersistenceStore = create<PersistenceStore>((set, get) => {
  // Get storage provider
  const storage = StorageProviderFactory.getProvider();
  
  return {
    isInitialized: false,
    isLoading: false,
    error: null,
    
    initialize: async () => {
      if (get().isInitialized) return;
      
      set({ isLoading: true, error: null });
      
      try {
        // Load tabs from storage
        const tabs = await storage.getTabs();
        const splitView = await storage.getSplitView();
        
        // Update stores with loaded data
        if (tabs.length > 0) {
          window.dispatchEvent(new CustomEvent('loadPersistedTabs', { detail: tabs }));

          if (splitView) {
            const rightTabIds = splitView.rightTabs || [];
            const leftTabIds = splitView.leftTabs || [];

            // Set activeLeftTabId if missing
            if (!splitView.activeLeftTabId) {
              const firstLeftTab = tabs.find(tab => !rightTabIds.includes(tab.id));
              if (firstLeftTab) {
                splitView.activeLeftTabId = firstLeftTab.id;
              }
            }

            // Ensure leftTabs array is initialized
            if (!splitView.leftTabs) {
              splitView.leftTabs = [];
            }

            // Add tabs that are not in either leftTabs or rightTabs to leftTabs
            const allExistingTabIds = new Set([...leftTabIds, ...rightTabIds]);
            tabs.forEach(tab => {
              if (!allExistingTabIds.has(tab.id)) {
                splitView.leftTabs.push(tab.id);
              }
            });

            // Set activeRightTabId if missing
            if (!splitView.activeRightTabId && rightTabIds.length > 0) {
              const validRightTab = tabs.find(tab => tab.id === rightTabIds[0]);
              if (validRightTab) {
                splitView.activeRightTabId = validRightTab.id;
              }
            }
          }
        }

        if (splitView) {
          window.dispatchEvent(new CustomEvent('loadPersistedSplitView', { detail: splitView }));
        }
        
        set({ isInitialized: true, isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to initialize persistence',
          isLoading: false 
        });
      }
    },
    
    saveState: async () => {
      if (!get().isInitialized) return;
      
      try {
        // Get current state from stores via custom events
        const saveStateEvent = new CustomEvent('requestSaveState', {
          detail: { callback: async (tabs: any[], splitView: any) => {
            await storage.saveTabs(tabs);
            if (splitView) {
              await storage.saveSplitView({
                id: 'default',
                ...splitView,
                lastModified: Date.now()
              });
            }
          }}
        });
        
        window.dispatchEvent(saveStateEvent);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to save state'
        });
      }
    }
  };
});