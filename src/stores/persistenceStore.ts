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
      if (get().isTransactionLocked) {
        return;
      }
      const { tabs } = useTabsStore.getState();
      const { splitView } = useSplitViewStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();

      if (!activeWorkspaceId) {
        return; // Cannot save without an active workspace context
      }

      try {
        // Filter tabs belonging to the active workspace
        const workspaceTabs = tabs.filter(tab => tab.workspaceId === activeWorkspaceId);
        // Only save if there's actually data for the current workspace
        if (workspaceTabs.length > 0 || (splitView && splitView.workspaceId === activeWorkspaceId)) {
          await storage.saveTabs(workspaceTabs);
          if (splitView && splitView.workspaceId === activeWorkspaceId) {
            await storage.saveSplitView({
              ...splitView,
              id: splitView.id || crypto.randomUUID(),
              lastModified: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('[saveState] Failed to save state:', error);
      }
    }
  };
});