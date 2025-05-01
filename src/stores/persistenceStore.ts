import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { useWorkspaceStore } from './workspaceStore';

interface PersistenceStore {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  saveState: () => Promise<void>;
}

export const usePersistenceStore = create<PersistenceStore>((set, get) => {
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
        const tabs = await storage.getTabs();
        let splitView = await storage.getSplitView();

        if (splitView && tabs && tabs.length > 0) {
          const validTabIds = new Set(tabs.map(tab => tab.id));

          const cleanTabIdArray = (tabIdArray) => {
            return Array.isArray(tabIdArray)
              ? tabIdArray.filter(id => validTabIds.has(id))
              : [];
          };

          if (!splitView.activeSide) splitView.activeSide = 'left';

          splitView.leftTabHistory = cleanTabIdArray(splitView.leftTabHistory);
          splitView.rightTabHistory = cleanTabIdArray(splitView.rightTabHistory);
          splitView.leftTabs = cleanTabIdArray(splitView.leftTabs);
          splitView.rightTabs = cleanTabIdArray(splitView.rightTabs);

          if (splitView.activeLeftTabId && !validTabIds.has(splitView.activeLeftTabId)) {
            console.warn(`Invalid activeLeftTabId (${splitView.activeLeftTabId}) found during init cleanup. Resetting.`);
            splitView.activeLeftTabId = undefined;
          }
          if (splitView.activeRightTabId && !validTabIds.has(splitView.activeRightTabId)) {
            console.warn(`Invalid activeRightTabId (${splitView.activeRightTabId}) found during init cleanup. Resetting.`);
            splitView.activeRightTabId = undefined;
          }
        }

        if (tabs.length > 0) {
          window.dispatchEvent(new CustomEvent('loadPersistedTabs', { detail: tabs }));

          if (splitView) {
            const rightTabIds = splitView.rightTabs;
            const leftTabIds = splitView.leftTabs;

            if (!splitView.activeLeftTabId) {
              const firstLeftTabId = leftTabIds[0];
              if (firstLeftTabId) {
                splitView.activeLeftTabId = firstLeftTabId;
              } else {
                const firstValidLeftFallback = tabs.find(tab => !rightTabIds.includes(tab.id));
                if (firstValidLeftFallback) {
                  splitView.activeLeftTabId = firstValidLeftFallback.id;
                }
              }
            }

            const allExistingTabIds = new Set([...leftTabIds, ...rightTabIds]);
            tabs.forEach(tab => {
              if (!allExistingTabIds.has(tab.id)) {
                if (!splitView.leftTabs) splitView.leftTabs = [];
                splitView.leftTabs.push(tab.id);
                if (!splitView.activeLeftTabId) {
                  splitView.activeLeftTabId = tab.id;
                }
              }
            });

            if (!splitView.activeRightTabId && rightTabIds.length > 0) {
              splitView.activeRightTabId = rightTabIds[0];
            }
          }
        } else if (splitView) {
          splitView = {
            leftTabs: [],
            rightTabs: [],
            leftTabHistory: [],
            rightTabHistory: [],
            activeLeftTabId: undefined,
            activeRightTabId: undefined,
          };
        }

        if (splitView) {
          window.dispatchEvent(new CustomEvent('loadPersistedSplitView', { detail: splitView }));
        }

        set({ isInitialized: true, isLoading: false });

      } catch (error) {
        console.error("Persistence initialization failed:", error);
        set({
          error: error instanceof Error ? error.message : 'Failed to initialize persistence',
          isLoading: false
        });
      }
    },

    saveState: async () => {
      if (!get().isInitialized) return;
      
      try {
        const saveStateEvent = new CustomEvent('requestSaveState', {
          detail: {
            callback: async (tabs: any[], splitView: any) => {
              try {
                const { activeWorkspaceId } = useWorkspaceStore.getState();
                if (!activeWorkspaceId) return;
    
                const workspaceTabs = tabs.filter(tab => tab.workspaceId === activeWorkspaceId);
                await storage.saveTabs(workspaceTabs);
    
                if (splitView && splitView.workspaceId === activeWorkspaceId) {
                  await storage.saveSplitView({
                    ...splitView,
                    id: splitView.id || crypto.randomUUID(),
                    lastModified: Date.now()
                  });
                }
              } catch (error) {
                console.error('Failed to save state:', error);
                set({ 
                  error: error instanceof Error ? error.message : 'Failed to save state'
                });
              }
            }
          }
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