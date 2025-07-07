import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { useWorkspaceStore } from './workspaceStore';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { Tab } from '../types';

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
      
      const { tabs } = useTabsStore.getState();
      const { splitView } = useSplitViewStore.getState();
      const { activeWorkspaceId } = useWorkspaceStore.getState();

      console.log(`[Persistence] Found ${tabs.length} total tabs, active workspace: ${activeWorkspaceId}`);

      try {
        // Filter tabs belonging to the active workspace
        console.time('[Persistence] Filtering workspace tabs');
        const workspaceTabs = tabs.filter((tab: Tab) => tab.workspaceId === activeWorkspaceId);
        console.timeEnd('[Persistence] Filtering workspace tabs');
        console.log(`[Persistence] Saving ${workspaceTabs.length} tabs for workspace ${activeWorkspaceId}`);
        
        // *** FIXED: Use store content as source of truth, not ModelManager ***
        console.time('[Persistence] Preparing tabs for saving');
        const tabsToSave = await Promise.all(workspaceTabs.map(async (tab: Tab) => {
          console.log(`[Persistence] Tab ${tab.id}: storeContent=${tab.content ? `length ${tab.content.length}` : 'undefined'}`);
          if (tab.content) {
            console.log(`[Persistence] Tab ${tab.id} content preview: "${tab.content.substring(0, 100)}${tab.content.length > 100 ? '...' : ''}"`);
          }
          
          let finalContent = tab.content;
          
          // If store has no content, try to get from database as fallback
          if (finalContent === undefined || finalContent === null) {
            console.log(`[Persistence] Tab ${tab.id} has no store content, trying database...`);
            try {
              const dbContent = await storage.getTabContent(tab.id);
              if (dbContent !== undefined) {
                finalContent = dbContent;
                console.log(`[Persistence] Retrieved content from database for tab ${tab.id}, length: ${dbContent.length}`);
              } else {
                console.log(`[Persistence] No content found in database for tab ${tab.id}`);
              }
            } catch (error) {
              console.warn(`[Persistence] Failed to get content from database for tab ${tab.id}:`, error);
            }
          }
          
          console.log(`[Persistence] Tab ${tab.id}: final content length=${finalContent?.length || 0}`);
          
          return { ...tab, content: finalContent };
        }));
        console.timeEnd('[Persistence] Preparing tabs for saving');
        
        // Only save if there's actually data for the current workspace
        if (workspaceTabs.length > 0 || (splitView && splitView.workspaceId === activeWorkspaceId)) {
          console.time('[Persistence] saveTabsInterval call');
          console.log('[Persistence] Calling storage.saveTabsInterval');
          await storage.saveTabsInterval(tabsToSave); // Use the updated tabs array
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