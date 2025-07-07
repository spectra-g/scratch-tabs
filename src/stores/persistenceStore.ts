import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { useWorkspaceStore } from './workspaceStore';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { Tab } from '../types';
import { modelManager } from '../services/modelManager';

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

        const { tabs } = useTabsStore.getState();
        const debugInfo = modelManager.getDebugInfo();
        
        // Update store with latest content from cached models
        for (const tabId of debugInfo.cachedTabs) {
          const liveContent = modelManager.getContent(tabId);
          if (liveContent !== undefined) {
            const tab = tabs.find(t => t.id === tabId);
            if (tab && tab.content !== liveContent) {
              useTabsStore.getState().updateTabContent(tabId, liveContent);
            }
          }
        }

        // Get the updated tabs (after syncing)
        const updatedTabs = useTabsStore.getState().tabs;
        
        // Filter tabs for the active workspace
        const workspaceTabs = updatedTabs.filter(tab => tab.workspaceId === activeWorkspaceId);
               
        // Save tabs to database
        await storage.saveTabsInterval(workspaceTabs);
        
        // Save split view state
        const { splitView } = useSplitViewStore.getState();
        if (splitView) {
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