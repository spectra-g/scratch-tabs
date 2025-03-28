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