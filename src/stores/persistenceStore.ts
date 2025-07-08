import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { useWorkspaceStore } from './workspaceStore';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';

interface PersistenceStore {
  saveState: () => Promise<void>;
  saveStateInterval: () => Promise<void>;
  startPeriodicSave: () => void;
  stopPeriodicSave: () => void;
  saveTimer: NodeJS.Timeout | null;
}

export const usePersistenceStore = create<PersistenceStore>((set, get) => {
  const storage = StorageProviderFactory.getProvider();

  return {
    saveTimer: null,

    saveState: async () => {
      try {
        const { activeWorkspaceId } = useWorkspaceStore.getState();
        if (!activeWorkspaceId) {
          return;
        }

        // Get the LATEST state from the stores
        const { tabs } = useTabsStore.getState();
        const { splitView } = useSplitViewStore.getState();

        // The tabs in tabsStore are the source of truth for persistence.
        // The ModelManager's listeners have already updated them.
        const workspaceTabs = tabs.filter(tab => tab.workspaceId === activeWorkspaceId);
        
        if (workspaceTabs.length > 0) {
          await storage.saveTabsInterval(workspaceTabs);
        }
        
        if (splitView && splitView.workspaceId === activeWorkspaceId) {
          await storage.saveSplitViewNow({
            ...splitView,
            lastModified: Date.now()
          });
        }
      } catch (error) {
        console.error('[Persistence] Failed to save state:', error);
      }
    },

    saveStateInterval: async () => {
      // Use the same logic as saveState for consistency
      await get().saveState();
    },

    startPeriodicSave: () => {
      const { saveTimer } = get();
      if (saveTimer) {
        clearInterval(saveTimer);
      }
      
      const newTimer = setInterval(async () => {
        try {
          await get().saveStateInterval();
        } catch (error) {
          console.error('[Persistence] Periodic save failed:', error);
        }
      }, 30000); // Save every 30 seconds
      
      set({ saveTimer: newTimer });
    },

    stopPeriodicSave: () => {
      const { saveTimer } = get();
      if (saveTimer) {
        clearInterval(saveTimer);
        set({ saveTimer: null });
      }
    },
  };
});