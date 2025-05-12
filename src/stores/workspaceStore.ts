import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { Workspace, Tab, SplitViewState } from '../types'; // Added Tab, SplitViewState
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore'; // Removed createDefaultSplitViewState here, will get from store
import { usePersistenceStore } from './persistenceStore';

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;

  loadWorkspaces: (options?: { preventAutoSwitch?: boolean }) => Promise<void>;
  ensureWorkspace: () => Promise<string | null>; // Returns the active/created workspace ID
  createWorkspace: (name: string) => Promise<string>;
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

    loadWorkspaces: async (options?: { preventAutoSwitch?: boolean }) => {
      set({ isLoading: true, error: null });
      try {
        const workspacesFromDB = await storage.getWorkspaces();
        let newActiveWorkspaceId: string | null = null;
        let tabsToLoad: Tab[] = [];
        let splitViewToLoad: SplitViewState | null = null;

        if (workspacesFromDB && workspacesFromDB.length > 0) {
          const sortedWorkspaces = [...workspacesFromDB].sort((a, b) => b.lastAccessed - a.lastAccessed);
          newActiveWorkspaceId = sortedWorkspaces[0].id;

          [tabsToLoad, splitViewToLoad] = await Promise.all([
            storage.getTabsByWorkspace(newActiveWorkspaceId),
            storage.getSplitViewByWorkspace(newActiveWorkspaceId)
          ]);

          if (!splitViewToLoad) {
            // This case implies data inconsistency. A workspace should have a split view.
            // Create one if missing.
            console.warn(`[loadWorkspaces] SplitView missing for workspace ${newActiveWorkspaceId}. Creating default.`);
            splitViewToLoad = useSplitViewStore.getState().createDefaultSplitViewState(newActiveWorkspaceId);
            await storage.saveSplitView(splitViewToLoad);
          }
           // Update lastAccessed for the determined active workspace
           const activeWsIndex = sortedWorkspaces.findIndex(ws => ws.id === newActiveWorkspaceId);
           if (activeWsIndex > -1) {
               const updatedActiveWs = { ...sortedWorkspaces[activeWsIndex], lastAccessed: Date.now() };
               await storage.saveWorkspace(updatedActiveWs);
               sortedWorkspaces[activeWsIndex] = updatedActiveWs;
           }

          set({ workspaces: sortedWorkspaces, activeWorkspaceId: newActiveWorkspaceId });
          useTabsStore.setState({ tabs: tabsToLoad });
          useSplitViewStore.setState({ splitView: splitViewToLoad });

        } else {
          // No workspaces in DB. State will reflect this.
          // WelcomeScreen will prompt user action, which will call ensureWorkspace.
          set({ workspaces: [], activeWorkspaceId: null });
          useTabsStore.setState({ tabs: [] });
          useSplitViewStore.setState({ splitView: useSplitViewStore.getState().createDefaultSplitViewState() });
        }
        usePersistenceStore.setState({ isInitialized: true }); // Mark persistence as initialized
      } catch (error) {
        console.error("Error during workspace load:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to load workspaces' });
      } finally {
        set({ isLoading: false });
      }
    },

    ensureWorkspace: async (): Promise<string | null> => {
      let currentWorkspaces = get().workspaces;
      let currentActiveId = get().activeWorkspaceId;

      if (currentWorkspaces.length === 0) {
        console.log("[ensureWorkspace] No workspaces found. Creating default workspace.");
        const defaultWorkspace: Workspace = {
          id: crypto.randomUUID(),
          name: 'Default Workspace',
          links: [],
          createdAt: Date.now(),
          lastAccessed: Date.now(),
        };
        await storage.saveWorkspace(defaultWorkspace);

        const initialSplitView = useSplitViewStore.getState().createDefaultSplitViewState(defaultWorkspace.id);
        await storage.saveSplitView(initialSplitView);

        set({ workspaces: [defaultWorkspace], activeWorkspaceId: defaultWorkspace.id });
        useTabsStore.setState({ tabs: [] }); // Default workspace has no tabs initially
        useSplitViewStore.setState({ splitView: initialSplitView });
        return defaultWorkspace.id;
      } else if (!currentActiveId && currentWorkspaces.length > 0) {
        // Workspaces exist, but none is active (e.g., after deleting the active one)
        // Activate the most recently accessed one
        const sorted = [...currentWorkspaces].sort((a, b) => b.lastAccessed - a.lastAccessed);
        currentActiveId = sorted[0].id;
        set({ activeWorkspaceId: currentActiveId });
        // No need to switchWorkspace here, as loadWorkspaces or a direct switch action should handle loading data.
        return currentActiveId;
      }
      return currentActiveId; // Return existing active ID
    },

    switchWorkspace: async (workspaceId: string) => {
      const { workspaces, activeWorkspaceId: currentActiveWsId, isLoading } = get();
      if (workspaceId === currentActiveWsId || isLoading) {
        // If trying to switch to current, or if already loading, just ensure lastAccessed is updated
        if (workspaceId === currentActiveWsId) {
            const targetWorkspace = workspaces.find(w => w.id === workspaceId);
            if(targetWorkspace) {
                const updatedTargetWorkspace = { ...targetWorkspace, lastAccessed: Date.now() };
                await storage.saveWorkspace(updatedTargetWorkspace);
                set(state => ({
                  workspaces: state.workspaces.map(w =>
                    w.id === workspaceId ? updatedTargetWorkspace : w
                  ).sort((a,b) => b.lastAccessed - a.lastAccessed)
                }));
            }
        }
        return;
      }

      const targetWorkspace = workspaces.find(w => w.id === workspaceId);
      if (!targetWorkspace) {
        set({ error: `Workspace with ID ${workspaceId} not found.` });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const persistence = usePersistenceStore.getState();
        if (persistence.isInitialized && currentActiveWsId) {
          await persistence.saveState();
        }

        const [newTabs, newSplitViewRecord] = await Promise.all([
          storage.getTabsByWorkspace(workspaceId),
          storage.getSplitViewByWorkspace(workspaceId)
        ]);

        let finalNewSplitView = newSplitViewRecord;
        if (!finalNewSplitView) {
          console.warn(`[switchWorkspace] No split view for ${workspaceId}, creating default.`);
          finalNewSplitView = useSplitViewStore.getState().createDefaultSplitViewState(workspaceId);
          await storage.saveSplitView(finalNewSplitView);
        }

        const updatedTargetWorkspace = { ...targetWorkspace, lastAccessed: Date.now() };
        await storage.saveWorkspace(updatedTargetWorkspace);

        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId ? updatedTargetWorkspace : w
          ).sort((a, b) => b.lastAccessed - a.lastAccessed),
          activeWorkspaceId: workspaceId,
        }));
        useTabsStore.setState({ tabs: newTabs, activeTabId: finalNewSplitView.activeLeftTabId || finalNewSplitView.activeRightTabId || (newTabs[0]?.id || null) });
        useSplitViewStore.setState({ splitView: finalNewSplitView });

      } catch (error) {
        console.error("Error switching workspace:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to switch workspace' });
      } finally {
        set({ isLoading: false });
      }
    },

    createWorkspace: async (name: string) => {
      const newWorkspace: Workspace = {
        id: crypto.randomUUID(),
        name,
        links: [],
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };

      try {
        const initialTab: Tab = {
          id: crypto.randomUUID(),
          title: 'Welcome',
          content: `# ${name}\n\nStart typing here...`,
          language: 'markdown',
          languageLocked: false,
          workspaceId: newWorkspace.id,
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 }
        };

        const initialSplitView = useSplitViewStore.getState().createDefaultSplitViewState(newWorkspace.id);
        initialSplitView.leftTabs = [initialTab.id];
        initialSplitView.activeLeftTabId = initialTab.id;

        await Promise.all([
          storage.saveWorkspace(newWorkspace),
          storage.saveTab(initialTab),
          storage.saveSplitView(initialSplitView)
        ]);

        set(state => ({
          workspaces: [...state.workspaces, newWorkspace]
            .sort((a, b) => b.lastAccessed - a.lastAccessed),
        }));

        await get().switchWorkspace(newWorkspace.id);
        return newWorkspace.id;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create workspace' });
        throw error;
      }
    },

    // ... (deleteWorkspace, renameWorkspace, etc. remain similar, but ensure they call loadWorkspaces or switchWorkspace appropriately to refresh state)
    deleteWorkspace: async (workspaceId: string) => {
      const { workspaces, activeWorkspaceId: currentActiveId } = get();
      if (workspaces.length <= 1 && workspaceId === currentActiveId) {
          alert("Cannot delete the last workspace if it's active. Create another workspace first or ensure this isn't the only one.");
          return; // Prevent deleting the sole active workspace if it's the only one
      }
      try {
        await storage.deleteWorkspace(workspaceId);
        const remainingWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);

        if (remainingWorkspaces.length === 0) {
          // No workspaces left, ensure a new default is created and activated
          set({ workspaces: [], activeWorkspaceId: null}); // Clear current state
          await get().ensureWorkspace(); // This will create and activate a new default
        } else if (workspaceId === currentActiveId) {
          // Deleted the active workspace, switch to the most recent of the remaining
          const sortedRemaining = [...remainingWorkspaces].sort((a,b) => b.lastAccessed - a.lastAccessed);
          await get().switchWorkspace(sortedRemaining[0].id);
        } else {
          // Deleted a non-active workspace, just update the list
          set({ workspaces: remainingWorkspaces });
        }
      } catch (error) {
        console.error("Error deleting workspace:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to delete workspace' });
      }
    },

    renameWorkspace: async (workspaceId: string, newName: string) => {
      const { workspaces } = get();
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (!workspace) return;

      try {
        const updatedWorkspace = { ...workspace, name: newName, lastAccessed: Date.now() }; // Update lastAccessed
        await storage.saveWorkspace(updatedWorkspace);
        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId ? updatedWorkspace : w
          ).sort((a,b) => b.lastAccessed - a.lastAccessed) // Keep sorted
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to rename workspace' });
      }
    },

    getActiveWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find(w => w.id === activeWorkspaceId);
    },
    // ... other actions like updateWorkspaceNotes, addWorkspaceLink, removeWorkspaceLink
     updateWorkspaceNotes: async (workspaceId: string, notes: string) => {
       const { workspaces } = get();
       const workspace = workspaces.find(w => w.id === workspaceId);
       if (!workspace) return;

       try {
         const updatedWorkspace = { ...workspace, notes };
         await storage.saveWorkspace(updatedWorkspace);

         set(state => ({
           workspaces: state.workspaces.map(w =>
             w.id === workspaceId ? updatedWorkspace : w
           )
         }));
       } catch (error) {
         set({ error: error instanceof Error ? error.message : 'Failed to update workspace notes' });
       }
     },

     addWorkspaceLink: async (workspaceId: string, url: string, title?: string) => {
       const { workspaces } = get();
       const workspace = workspaces.find(w => w.id === workspaceId);
       if (!workspace) return;

       try {
         const newLink = { id: crypto.randomUUID(), url, title };
         const updatedWorkspace = {
           ...workspace,
           links: [...(workspace.links || []), newLink] // Ensure links array exists
         };

         await storage.saveWorkspace(updatedWorkspace);

         set(state => ({
           workspaces: state.workspaces.map(w =>
             w.id === workspaceId ? updatedWorkspace : w
           )
         }));
       } catch (error) {
         set({ error: error instanceof Error ? error.message : 'Failed to add workspace link' });
       }
     },

     removeWorkspaceLink: async (workspaceId: string, linkId: string) => {
       const { workspaces } = get();
       const workspace = workspaces.find(w => w.id === workspaceId);
       if (!workspace || !workspace.links) return; // Check if links exist

       try {
         const updatedWorkspace = {
           ...workspace,
           links: workspace.links.filter(link => link.id !== linkId)
         };

         await storage.saveWorkspace(updatedWorkspace);

         set(state => ({
           workspaces: state.workspaces.map(w =>
             w.id === workspaceId ? updatedWorkspace : w
           )
         }));
       } catch (error) {
         set({ error: error instanceof Error ? error.message : 'Failed to remove workspace link' });
       }
     },
  };
});