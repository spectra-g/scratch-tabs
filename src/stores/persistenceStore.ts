import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { useWorkspaceStore } from './workspaceStore';
import { useTabsStore } from './tabsStore'; // Import necessary stores
import { useSplitViewStore } from './splitViewStore'; // Import necessary stores

interface PersistenceStore {
  isInitialized: boolean; // Keep track if initial load happened
  // isLoading and error might be less relevant here now
  // initialize: () => Promise<void>; // Removed, handled by workspaceStore
  saveState: () => Promise<void>; // Keep save function
}

export const usePersistenceStore = create<PersistenceStore>((set, get) => {
  const storage = StorageProviderFactory.getProvider();

  return {
    isInitialized: false, // Set to true after initial load in workspaceStore

    // initialize: async () => { /* Removed */ },

    saveState: async () => {
      // Get current state directly from stores
      const { tabs } = useTabsStore.getState();
      const { splitView } = useSplitViewStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();

      if (!activeWorkspaceId) {
         console.warn("[saveState] No active workspace ID found. Skipping save.");
         return; // Cannot save without an active workspace context
      }

      try {
        // Filter tabs belonging to the active workspace
        const workspaceTabs = tabs.filter(tab => tab.workspaceId === activeWorkspaceId);
        await storage.saveTabs(workspaceTabs);

        // Save the split view state associated with the active workspace
        if (splitView && splitView.workspaceId === activeWorkspaceId) {
          await storage.saveSplitView({
            ...splitView,
            id: splitView.id || crypto.randomUUID(), // Ensure ID exists
            lastModified: Date.now()
          });
        } else if (splitView && !splitView.workspaceId) {
            // If splitView somehow lost its workspaceId, assign the active one
             console.warn("[saveState] SplitView was missing workspaceId. Assigning active one.");
             await storage.saveSplitView({
               ...splitView,
               id: splitView.id || crypto.randomUUID(),
               workspaceId: activeWorkspaceId, // Assign current active ID
               lastModified: Date.now()
             });
        }
         // console.log(`[saveState] Saved state for workspace ${activeWorkspaceId}`);

      } catch (error) {
        console.error('[saveState] Failed to save state:', error);
        // Optionally set an error state in persistenceStore if needed
        // set({ error: error instanceof Error ? error.message : 'Failed to save state' });
      }
    }
  };
});