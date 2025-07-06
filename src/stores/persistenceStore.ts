import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { useWorkspaceStore } from './workspaceStore';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';

interface PersistenceStore {
  saveState: () => Promise<void>;
  isTransactionLocked: boolean;
  lockTransactions: () => void;
  unlockTransactions: () => void;
}

export const usePersistenceStore = create<PersistenceStore>((set, get) => {
  const storage = StorageProviderFactory.getProvider();

  return {
    isTransactionLocked: false,

    lockTransactions: () => {
      set({ isTransactionLocked: true });
    },
    unlockTransactions: () => {
      set({ isTransactionLocked: false });
    },

    saveState: async () => {
      console.time('[Persistence] saveState');
      console.log('[Persistence] Starting saveState operation');
      if (get().isTransactionLocked) {
        console.log('[Persistence] Transaction locked, skipping save');
        console.timeEnd('[Persistence] saveState');
        return;
      }
      
      console.time('[Persistence] Getting store states');
      console.log('[Persistence] Getting tabs from tabsStore');
      const { tabs } = useTabsStore.getState();
      console.log('[Persistence] Getting splitView from splitViewStore');
      const { splitView } = useSplitViewStore.getState();
      console.log('[Persistence] Getting activeWorkspaceId from workspaceStore');
      const { activeWorkspaceId } = useWorkspaceStore.getState();
      console.timeEnd('[Persistence] Getting store states');

      if (!activeWorkspaceId) {
        console.log('[Persistence] No active workspace, skipping save');
        console.timeEnd('[Persistence] saveState');
        return; // Cannot save without an active workspace context
      }

      try {
        // Filter tabs belonging to the active workspace
        console.time('[Persistence] Filtering workspace tabs');
        const workspaceTabs = tabs.filter(tab => tab.workspaceId === activeWorkspaceId);
        console.timeEnd('[Persistence] Filtering workspace tabs');
        console.log(`[Persistence] Saving ${workspaceTabs.length} tabs for workspace ${activeWorkspaceId}`);
        
        // Only save if there's actually data for the current workspace
        if (workspaceTabs.length > 0 || (splitView && splitView.workspaceId === activeWorkspaceId)) {
          console.time('[Persistence] saveTabsInterval call');
          console.log('[Persistence] Calling storage.saveTabsInterval');
          await storage.saveTabsInterval(workspaceTabs);
          console.timeEnd('[Persistence] saveTabsInterval call');
          
          if (splitView && splitView.workspaceId === activeWorkspaceId) {
            console.time('[Persistence] saveSplitViewInterval call');
            console.log('[Persistence] Calling storage.saveSplitViewInterval');
            await storage.saveSplitViewInterval({
              ...splitView,
              id: splitView.id || crypto.randomUUID(),
              lastModified: Date.now()
            });
            console.timeEnd('[Persistence] saveSplitViewInterval call');
          }
        }
        console.log('[Persistence] Save completed successfully');
      } catch (error) {
        console.error('[saveState] Failed to save state:', error);
      }
      console.timeEnd('[Persistence] saveState');
    }
  };
});