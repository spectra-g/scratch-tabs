import { create } from 'zustand';
import { StorageProviderFactory, db } from '../db';
import { Workspace, Tab, SplitViewState, SplitViewRecord } from '../types';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { usePersistenceStore } from './persistenceStore';
import { useCacheStore } from './cacheStore';
import { incrementSetting } from '../db';
import { WELCOME_TAB_CONTENT, NEW_TAB_PREFIX } from '../constants';
import { modelManager } from '../services/modelManager';

// Helper function to safely convert activeSide string to union type
const parseActiveSide = (side: string | null): 'left' | 'right' | null => {
  if (side === 'left' || side === 'right') {
    return side;
  }
  return null;
};

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;

  loadWorkspaces: (clearExistingTabs?: boolean) => Promise<void>;
  ensureWorkspace: () => Promise<string | null>;
  createWorkspace: (name: string) => Promise<string | null>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  updateWorkspaceNotes: (workspaceId: string, notes: string) => Promise<void>;
  addWorkspaceLink: (workspaceId: string, url: string, title?: string) => Promise<void>;
  removeWorkspaceLink: (workspaceId: string, linkId: string) => Promise<void>;
  getActiveWorkspace: () => Workspace | undefined;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const storage = StorageProviderFactory.getProvider();

  return {
    workspaces: [],
    activeWorkspaceId: null,
    isLoading: false,
    error: null,

    loadWorkspaces: async (clearExistingTabs: boolean = false) => {
      set({ isLoading: true, error: null });
      try {
        // CRITICAL FIX: Clear model cache when loading workspaces to prevent memory leaks
        modelManager.disposeAll();

        const workspacesFromDB = await storage.getWorkspaces();
        let newActiveWorkspaceId: string | null = null;
        let tabsToLoad: Tab[] = [];
        let workspaceSplitView: SplitViewState | null = null;

        if (workspacesFromDB && workspacesFromDB.length > 0) {
          const sortedWorkspaces = [...workspacesFromDB].sort((a, b) => b.lastAccessed - a.lastAccessed); // Sort by lastAccessed first
          newActiveWorkspaceId = sortedWorkspaces[0].id; // Most recently accessed is the default active
          
          // *** CRITICAL FIX: Load METADATA ONLY ***
          const [tabsMetadata, fetchedRecord] = await Promise.all([
            storage.getTabsMetadataByWorkspace(newActiveWorkspaceId), // <-- Use new method
            storage.getSplitViewByWorkspace(newActiveWorkspaceId)
          ]);
          
          // `tabsMetadata` now contains an array of Tab objects WITHOUT the `content` property.
          // This is lightweight and safe to put in Zustand.
          tabsToLoad = tabsMetadata as Tab[]; // Cast to Tab[] since we'll add content later when needed

          if (fetchedRecord) {
            workspaceSplitView = { // Convert Record to State
              id: fetchedRecord.id,
              isSplit: fetchedRecord.isSplit,
              leftTabs: fetchedRecord.leftTabs,
              rightTabs: fetchedRecord.rightTabs,
              activeLeftTabId: fetchedRecord.activeLeftTabId,
              activeRightTabId: fetchedRecord.activeRightTabId,
              activeSide: parseActiveSide(fetchedRecord.activeSide),
              splitRatio: fetchedRecord.splitRatio,
              workspaceId: fetchedRecord.workspaceId,
              leftTabHistory: fetchedRecord.leftTabHistory || [], // Use persisted history
              rightTabHistory: fetchedRecord.rightTabHistory || [] // Use persisted history
            };
          } else {
            // If no split view record, create a default one for this workspace
            workspaceSplitView = useSplitViewStore.getState().createDefaultSplitViewState(newActiveWorkspaceId);
            await storage.saveSplitViewNow({ ...workspaceSplitView, lastModified: Date.now() });
          }

          // Update lastAccessed for the determined active workspace
          const activeWsIndex = sortedWorkspaces.findIndex(ws => ws.id === newActiveWorkspaceId);
          if (activeWsIndex > -1) {
            const updatedActiveWs = { ...sortedWorkspaces[activeWsIndex], lastAccessed: Date.now() };
            await storage.saveWorkspace(updatedActiveWs); // Save update to DB
            sortedWorkspaces[activeWsIndex] = updatedActiveWs;
          }
          set({ workspaces: sortedWorkspaces.sort((a, b) => a.name.localeCompare(b.name)), activeWorkspaceId: newActiveWorkspaceId });
          
          // Check if there are existing tabs that should be preserved (e.g., created by URL handler)
          // But only if we're not clearing existing tabs (e.g., during workspace deletion)
          const currentTabs = useTabsStore.getState().tabs;
          const currentSplitView = useSplitViewStore.getState().splitView;
          const currentActiveLeftTabId = currentSplitView?.activeLeftTabId;
          
          let newTabsToPreserve: Tab[] = [];
          
          if (!clearExistingTabs) {
            const existingTabIds = new Set(tabsToLoad.map(tab => tab.id));
            newTabsToPreserve = currentTabs.filter(tab => !existingTabIds.has(tab.id));
          }
          if (newTabsToPreserve.length > 0) {
            // Merge loaded tabs with newly created tabs
            const mergedTabs = [...tabsToLoad, ...newTabsToPreserve];
            useTabsStore.setState({ tabs: mergedTabs });
            
            // Update split view to include the new tabs in the left pane
            const newTabIds = newTabsToPreserve.map(tab => tab.id);
            workspaceSplitView.leftTabs = [...workspaceSplitView.leftTabs, ...newTabIds];
          } else {
            if (clearExistingTabs) {
              // When clearing existing tabs, set the activeTabId from the splitView
              useTabsStore.setState({ 
                tabs: tabsToLoad,
                activeTabId: workspaceSplitView?.activeLeftTabId || tabsToLoad[0]?.id || null
              });
            } else {
              useTabsStore.setState({ tabs: tabsToLoad });
            }
          }
          
          // Always check if we should preserve the current active tab (for both new and existing tabs)
          // But only if we're not clearing existing tabs (during workspace deletion)
          if (!clearExistingTabs && currentActiveLeftTabId && currentActiveLeftTabId !== workspaceSplitView?.activeLeftTabId) {
            // Check if the current active tab exists in our final tab list
            const finalTabs = newTabsToPreserve.length > 0 ? [...tabsToLoad, ...newTabsToPreserve] : tabsToLoad;
            const activeTabExists = finalTabs.some(tab => tab.id === currentActiveLeftTabId);

            if (activeTabExists && workspaceSplitView) {
              workspaceSplitView.activeLeftTabId = currentActiveLeftTabId;
              
              // Also ensure the active tab is in the left pane
              if (!workspaceSplitView.leftTabs.includes(currentActiveLeftTabId)) {
                workspaceSplitView.leftTabs = [...workspaceSplitView.leftTabs, currentActiveLeftTabId];
              }
            }
          }
          
          useSplitViewStore.setState({ splitView: workspaceSplitView });
        } else {
          set({ workspaces: [], activeWorkspaceId: null });
          useTabsStore.setState({ tabs: [] });
          useSplitViewStore.setState({ splitView: undefined });
        }
      } catch (error) {
        console.error("Error during workspace load:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to load workspaces' });
      } finally {
        set({ isLoading: false });
      }
    },

    ensureWorkspace: async (): Promise<string | null> => {
      try {
        const currentWorkspaces = get().workspaces;
        const currentActiveId = get().activeWorkspaceId;

        if (currentWorkspaces.length === 0 || !currentActiveId) {
          const defaultWorkspace: Workspace = {
            id: crypto.randomUUID(),
            name: 'Default Workspace',
            links: [],
            createdAt: Date.now(),
            lastAccessed: Date.now(),
          };

          // Create a comprehensive Welcome tab for new users
          const welcomeTab: Tab = {
            id: crypto.randomUUID(),
            title: 'Welcome to Scratch Tabs',
            content: WELCOME_TAB_CONTENT,
            language: 'markdown',
            languageLocked: true,
            workspaceId: defaultWorkspace.id,
            dateCreated: Date.now(),
            lastModified: Date.now(),
            cursorPosition: { lineNumber: 1, column: 1 },
            previewMode: true, // Show markdown preview by default
          };

          const initialSplitViewState = useSplitViewStore.getState().createDefaultSplitViewState(defaultWorkspace.id);
          initialSplitViewState.leftTabs = [welcomeTab.id];
          initialSplitViewState.activeLeftTabId = welcomeTab.id;
          initialSplitViewState.leftTabHistory = [welcomeTab.id];

          const initialSplitViewRecord: SplitViewRecord = {
            id: initialSplitViewState.id,
            isSplit: initialSplitViewState.isSplit,
            leftTabs: initialSplitViewState.leftTabs,
            rightTabs: initialSplitViewState.rightTabs,
            activeLeftTabId: initialSplitViewState.activeLeftTabId,
            activeRightTabId: initialSplitViewState.activeRightTabId,
            activeSide: parseActiveSide(initialSplitViewState.activeSide),
            splitRatio: initialSplitViewState.splitRatio,
            workspaceId: initialSplitViewState.workspaceId,
            lastModified: Date.now(),
            leftTabHistory: initialSplitViewState.leftTabHistory,
            rightTabHistory: initialSplitViewState.rightTabHistory
          };

          await db.transaction('rw', db.workspaces, db.tabs, db.splitView, async () => {
            await storage.saveWorkspace(defaultWorkspace);
            await storage.saveTabNow(welcomeTab);
            await storage.saveSplitViewNow(initialSplitViewRecord);
          });

          // Increment the total tabs created counter
          incrementSetting('tabs.created.total').catch(err => 
            console.error("Failed to increment tab counter:", err)
          );

          set({ workspaces: [defaultWorkspace], activeWorkspaceId: defaultWorkspace.id });
          useTabsStore.setState({ tabs: [welcomeTab], activeTabId: welcomeTab.id });
          useSplitViewStore.setState({ splitView: initialSplitViewState });
          return defaultWorkspace.id;
        }
        return currentActiveId;
      } catch (error) {
        console.error("[ensureWorkspace] Error:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to ensure workspace' });
        return null;
      }
    },

    switchWorkspace: async (workspaceId: string) => {
      const { workspaces, activeWorkspaceId: currentActiveWsId, isLoading } = get();
      const { saveState: persistCurrentState } = usePersistenceStore.getState();

      if (workspaceId === currentActiveWsId || isLoading) {
        return;
      }

      const targetWorkspace = workspaces.find(w => w.id === workspaceId);
      if (!targetWorkspace) {
        console.error(`[WorkspaceStore] Target workspace ${workspaceId} not found.`);
        set({ error: `Workspace with ID ${workspaceId} not found.` });
        return;
      }

      set({ isLoading: true, error: null });

      try {
        // 1. Persist the state of the current workspace before switching
        if (currentActiveWsId) {
          await persistCurrentState();
        }

        // 2. CRITICAL FIX: Clear model cache when switching workspaces to prevent memory leaks
        modelManager.disposeAll();

        // 3. Load data for the target workspace
        const cachedData = useCacheStore.getState().cachedSplitView;
        let splitViewToLoad: SplitViewRecord | null = null;

        if (cachedData && cachedData.workspaceId === workspaceId) {
          splitViewToLoad = cachedData.splitView;
          useCacheStore.getState().clearCachedSplitView();
        } else {
          splitViewToLoad = await storage.getSplitViewByWorkspace(workspaceId);
        }

        const tabsToLoad = await storage.getTabsByWorkspace(workspaceId);

        if (!splitViewToLoad) {
          console.error(`[switchWorkspace] No split view for ${workspaceId}.`);
          return;
        }

        // 4. Update lastAccessed timestamp for the target workspace
        const updatedTargetWorkspace = { ...targetWorkspace, lastAccessed: Date.now() };
        await storage.saveWorkspace(updatedTargetWorkspace);

        // 5. Update Zustand stores
        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId ? updatedTargetWorkspace : w
          ).sort((a, b) => a.name.localeCompare(b.name)), // Keep sorted
          activeWorkspaceId: workspaceId,
        }));

        useTabsStore.setState({ tabs: tabsToLoad });
        const finalSplitViewState: SplitViewState = { // Convert record to state
          id: splitViewToLoad.id,
          isSplit: splitViewToLoad.isSplit,
          leftTabs: splitViewToLoad.leftTabs || [],
          rightTabs: splitViewToLoad.rightTabs || [],
          activeLeftTabId: splitViewToLoad.activeLeftTabId,
          activeRightTabId: splitViewToLoad.activeRightTabId,
          activeSide: parseActiveSide(splitViewToLoad.activeSide),
          splitRatio: splitViewToLoad.splitRatio,
          workspaceId: splitViewToLoad.workspaceId,
          leftTabHistory: splitViewToLoad.leftTabHistory || [], // Use persisted history
          rightTabHistory: splitViewToLoad.rightTabHistory || [] // Use persisted history
        };
        useSplitViewStore.setState({ splitView: finalSplitViewState });

      } catch (error) {
        console.error("Error switching workspace:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to switch workspace' });
      } finally {
        set({ isLoading: false });
      }
    },

    createWorkspace: async (name: string): Promise<string | null> => {
      try {
        // CRITICAL FIX: Clear model cache when creating new workspace
        modelManager.disposeAll();

        const newWorkspace: Workspace = {
          id: crypto.randomUUID(),
          name,
          links: [],
          createdAt: Date.now(),
          lastAccessed: Date.now()
        };

        const initialTab: Tab = {
          id: crypto.randomUUID(),
          title: 'Welcome to Scratch Tabs',
          content: WELCOME_TAB_CONTENT,
          language: 'markdown',
          languageLocked: true,
          workspaceId: newWorkspace.id,
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
          previewMode: true, // Show markdown preview by default
        };

        // Create a "new 1" tab as well
        const newTab: Tab = {
          id: crypto.randomUUID(),
          title: `${NEW_TAB_PREFIX} 1`,
          content: '',
          language: 'plaintext',
          languageLocked: false,
          workspaceId: newWorkspace.id,
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 },
          previewMode: false,
        };

        const initialSplitViewState = useSplitViewStore.getState().createDefaultSplitViewState(newWorkspace.id);
        initialSplitViewState.leftTabs = [initialTab.id, newTab.id];
        initialSplitViewState.activeLeftTabId = newTab.id; // Make the new tab active
        initialSplitViewState.leftTabHistory = [initialTab.id, newTab.id];

        const initialSplitViewRecord: SplitViewRecord = {
          ...initialSplitViewState,
          lastModified: Date.now(),
          leftTabHistory: initialSplitViewState.leftTabHistory,
          rightTabHistory: initialSplitViewState.rightTabHistory
        };

        // Use a Dexie transaction for atomicity
        await db.transaction('rw', db.workspaces, db.tabs, db.splitView, async () => {
          await storage.saveWorkspace(newWorkspace);
          await storage.saveTabNow(initialTab);
          await storage.saveTabNow(newTab);
          await storage.saveSplitViewNow(initialSplitViewRecord);
        });

        // Increment the total tabs created counter
        incrementSetting('tabs.created.total').catch(err => 
          console.error("Failed to increment tab counter:", err)
        );

        // Update Zustand state AFTER successful DB transaction
        set(state => ({
          workspaces: [...state.workspaces, newWorkspace].sort((a, b) => a.name.localeCompare(b.name)),
          activeWorkspaceId: newWorkspace.id, 
          isLoading: false
        }));

        // Directly update other stores with the new workspace's initial state
        useTabsStore.setState({ tabs: [initialTab, newTab], activeTabId: newTab.id });
        useSplitViewStore.setState({ splitView: initialSplitViewState });

        return newWorkspace.id;
      } catch (error) {
        console.error("Error creating workspace:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to create workspace' });
        return null;
      }
    },

    deleteWorkspace: async (workspaceId: string) => {
      const { workspaces, activeWorkspaceId: currentActiveId, loadWorkspaces } = get();
      try {
        await storage.deleteWorkspace(workspaceId);

        const remainingWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);

        if (workspaceId === currentActiveId) {
          // If the active workspace was deleted, load remaining workspaces
          await loadWorkspaces(true);
        } else {
          // Just update the list of workspaces if a non-active one was deleted
          set({ workspaces: remainingWorkspaces.sort((a, b) => a.name.localeCompare(b.name)) });
        }
      } catch (error) {
        console.error("Error deleting workspace:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to delete workspace' });
      }
    },

    renameWorkspace: async (workspaceId: string, newName: string) => {
      try {
        const workspace = get().workspaces.find(w => w.id === workspaceId);
        if (!workspace) {
          set({ error: 'Workspace not found' });
          return;
        }

        const updatedWorkspace = { ...workspace, name: newName };
        await storage.saveWorkspace(updatedWorkspace);

        set(state => ({
          workspaces: state.workspaces.map(w => 
            w.id === workspaceId ? updatedWorkspace : w
          ).sort((a, b) => a.name.localeCompare(b.name))
        }));
      } catch (error) {
        console.error("Error renaming workspace:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to rename workspace' });
      }
    },

    getActiveWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find(w => w.id === activeWorkspaceId);
    },

    // updateWorkspaceNotes, addWorkspaceLink, removeWorkspaceLink can remain similar,
    // consider if they need locking if they trigger complex UI updates that might race with saveState.
    // For now, assuming they are simple enough.
    updateWorkspaceNotes: async (workspaceId: string, notes: string) => {
      const { workspaces } = get();
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (!workspace) return;
      try {
        const updatedWorkspace = { ...workspace, notes };
        await storage.saveWorkspace(updatedWorkspace);
        set(state => ({
          workspaces: state.workspaces.map(w => w.id === workspaceId ? updatedWorkspace : w)
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update notes' });
      }
    },
    addWorkspaceLink: async (workspaceId: string, url: string, title?: string) => {
      const { workspaces } = get();
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (!workspace) return;
      try {
        const newLink = { id: crypto.randomUUID(), url, title };
        const updatedWorkspace = { ...workspace, links: [...(workspace.links || []), newLink] };
        await storage.saveWorkspace(updatedWorkspace);
        set(state => ({
          workspaces: state.workspaces.map(w => w.id === workspaceId ? updatedWorkspace : w)
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to add link' });
      }
    },
    removeWorkspaceLink: async (workspaceId: string, linkId: string) => {
      const { workspaces } = get();
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (!workspace || !workspace.links) return;
      try {
        const updatedWorkspace = { ...workspace, links: workspace.links.filter(link => link.id !== linkId) };
        await storage.saveWorkspace(updatedWorkspace);
        set(state => ({
          workspaces: state.workspaces.map(w => w.id === workspaceId ? updatedWorkspace : w)
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to remove link' });
      }
    },
  };
});