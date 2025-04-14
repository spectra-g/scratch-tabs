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
      // Prevent re-initialization
      if (get().isInitialized) return;

      set({ isLoading: true, error: null });

      try {
        // Load tabs and splitView state from storage
        const tabs = await storage.getTabs();
        let splitView = await storage.getSplitView(); // Use 'let' as we will modify it

        // --- Data Integrity Cleanup Step ---
        if (splitView && tabs && tabs.length > 0) {
          // Create a set of valid tab IDs from the loaded tabs for quick lookup
          const validTabIds = new Set(tabs.map(tab => tab.id));

          // Helper function to clean an array of tab IDs
          const cleanTabIdArray = (tabIdArray) => {
            // If the array exists, filter it, otherwise return an empty array
            return Array.isArray(tabIdArray)
              ? tabIdArray.filter(id => validTabIds.has(id))
              : [];
          };

          // Clean the tab ID arrays within splitView
          splitView.leftTabHistory = cleanTabIdArray(splitView.leftTabHistory);
          splitView.rightTabHistory = cleanTabIdArray(splitView.rightTabHistory);
          splitView.leftTabs = cleanTabIdArray(splitView.leftTabs);
          splitView.rightTabs = cleanTabIdArray(splitView.rightTabs);

          // (Optional but recommended) Validate active tab IDs
          if (splitView.activeLeftTabId && !validTabIds.has(splitView.activeLeftTabId)) {
            console.warn(`Invalid activeLeftTabId (${splitView.activeLeftTabId}) found during init cleanup. Resetting.`);
            splitView.activeLeftTabId = undefined; // Reset if invalid
          }
          if (splitView.activeRightTabId && !validTabIds.has(splitView.activeRightTabId)) {
            console.warn(`Invalid activeRightTabId (${splitView.activeRightTabId}) found during init cleanup. Resetting.`);
            splitView.activeRightTabId = undefined; // Reset if invalid
          }
        }
        // --- End Data Integrity Cleanup Step ---


        // Update stores with loaded (and potentially cleaned) data
        if (tabs.length > 0) {
          // Dispatch loaded tabs event
          window.dispatchEvent(new CustomEvent('loadPersistedTabs', { detail: tabs }));

          if (splitView) {
            // Use the cleaned arrays
            const rightTabIds = splitView.rightTabs; // Already cleaned
            const leftTabIds = splitView.leftTabs;   // Already cleaned

            // Set activeLeftTabId if it's missing (or was reset during cleanup)
            if (!splitView.activeLeftTabId) {
              // Try the first ID from the cleaned leftTabs list
              const firstLeftTabId = leftTabIds[0];
              if (firstLeftTabId) {
                splitView.activeLeftTabId = firstLeftTabId;
              } else {
                // Fallback: find the first tab overall that isn't a right tab
                const firstValidLeftFallback = tabs.find(tab => !rightTabIds.includes(tab.id));
                if (firstValidLeftFallback) {
                  splitView.activeLeftTabId = firstValidLeftFallback.id;
                }
                // If still no activeLeftTabId, it implies no suitable tabs exist.
              }
            }

            // Add tabs that are not in either leftTabs or rightTabs (after cleanup) to leftTabs
            const allExistingTabIds = new Set([...leftTabIds, ...rightTabIds]);
            tabs.forEach(tab => {
              if (!allExistingTabIds.has(tab.id)) {
                // Ensure leftTabs exists before pushing ( belt-and-suspenders check)
                 if (!splitView.leftTabs) splitView.leftTabs = [];
                splitView.leftTabs.push(tab.id);
                // If we just added the *only* left tab and active is still missing, set it.
                if (!splitView.activeLeftTabId) {
                   splitView.activeLeftTabId = tab.id;
                }
              }
            });

            // Set activeRightTabId if it's missing (or was reset during cleanup) and there are right tabs
            if (!splitView.activeRightTabId && rightTabIds.length > 0) {
              // The first ID in the cleaned rightTabIds is guaranteed to be valid
              splitView.activeRightTabId = rightTabIds[0];
            }
          }
        } else if (splitView) {
            // Handle case where there are no tabs, but splitView state exists
            // Clear out splitView references as tabs are gone
            splitView = { // Resetting splitView might be the safest option
                leftTabs: [],
                rightTabs: [],
                leftTabHistory: [],
                rightTabHistory: [],
                activeLeftTabId: undefined,
                activeRightTabId: undefined,
                // Keep other splitView properties if necessary, or reset completely
            };
        }

        // Dispatch the cleaned and potentially updated splitView state
        if (splitView) {
          window.dispatchEvent(new CustomEvent('loadPersistedSplitView', { detail: splitView }));
        }

        set({ isInitialized: true, isLoading: false });

      } catch (error) {
        console.error("Persistence initialization failed:", error); // Log the actual error
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