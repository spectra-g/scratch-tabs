import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { Workspace, Tab, SplitViewState, SplitViewRecord } from '../types';
import { useTabsStore } from './tabsStore';
import { useSplitViewStore } from './splitViewStore';
import { usePersistenceStore } from './persistenceStore';
import { useCacheStore } from './cacheStore';

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;

  loadWorkspaces: (options?: { preventAutoSwitch?: boolean }) => Promise<void>;
  ensureWorkspace: () => Promise<string | null>;
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
        let splitViewRecord: SplitViewRecord | null = null;
        let splitViewState: SplitViewState | null = null;

        if (workspacesFromDB && workspacesFromDB.length > 0) {
          const sortedWorkspaces = [...workspacesFromDB].sort((a, b) => a.name.localeCompare(b.name));
          const mostRecentWorkspace = [...workspacesFromDB].sort((a, b) => b.lastAccessed - a.lastAccessed)[0];
          newActiveWorkspaceId = mostRecentWorkspace.id;

          const results = await Promise.all([
            storage.getTabsByWorkspace(newActiveWorkspaceId),
            storage.getSplitViewByWorkspace(newActiveWorkspaceId)
          ]);
          tabsToLoad = results[0];
          const fetchedRecord = results[1];

          // Explicitly construct SplitViewState, excluding lastModified and ensuring activeSide type
          if (fetchedRecord) {
            splitViewRecord = {
              ...fetchedRecord,
              activeSide: fetchedRecord.activeSide as 'left' | 'right' | null
            };
            splitViewState = {
              id: splitViewRecord.id,
              isSplit: splitViewRecord.isSplit,
              leftTabs: splitViewRecord.leftTabs,
              rightTabs: splitViewRecord.rightTabs,
              activeLeftTabId: splitViewRecord.activeLeftTabId,
              activeRightTabId: splitViewRecord.activeRightTabId,
              activeSide: splitViewRecord.activeSide,
              splitRatio: splitViewRecord.splitRatio,
              workspaceId: splitViewRecord.workspaceId,
              leftTabHistory: [],
              rightTabHistory: []
            };
            useSplitViewStore.setState({ splitView: splitViewState });
          }

          const activeWsIndex = sortedWorkspaces.findIndex(ws => ws.id === newActiveWorkspaceId);
          if (activeWsIndex > -1) {
            const updatedActiveWs = { ...sortedWorkspaces[activeWsIndex], lastAccessed: Date.now() };
            sortedWorkspaces[activeWsIndex] = updatedActiveWs;
          }

          set({ workspaces: sortedWorkspaces, activeWorkspaceId: newActiveWorkspaceId });
          useTabsStore.setState({ tabs: tabsToLoad });

        } else {
          set({ workspaces: [], activeWorkspaceId: null });
          useTabsStore.setState({ tabs: [] });
          useSplitViewStore.setState({ splitView: undefined });
        }
        usePersistenceStore.setState({ isInitialized: true });
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

        const initialSplitViewState = useSplitViewStore.getState().createDefaultSplitViewState(defaultWorkspace.id);
        const initialSplitViewRecord: SplitViewRecord = {
          ...initialSplitViewState,
          activeSide: initialSplitViewState.activeSide,
          lastModified: Date.now()
        };
        await storage.saveSplitView(initialSplitViewRecord);

        set({ workspaces: [defaultWorkspace], activeWorkspaceId: defaultWorkspace.id });
        useTabsStore.setState({ tabs: [] });
        useSplitViewStore.setState({ splitView: initialSplitViewState });
        return defaultWorkspace.id;
      } else if (!currentActiveId && currentWorkspaces.length > 0) {
        const sorted = [...currentWorkspaces].sort((a, b) => b.lastAccessed - a.lastAccessed);
        currentActiveId = sorted[0].id;
        set({ activeWorkspaceId: currentActiveId });
        return currentActiveId;
      }
      return currentActiveId;
    },

    switchWorkspace: async (workspaceId: string) => {
      console.log(`[WorkspaceStore] ENTRY POINT: switchWorkspace(${workspaceId}) called!`);

      const { workspaces, activeWorkspaceId: currentActiveWsId, isLoading } = get();

      if (workspaceId === currentActiveWsId || isLoading) {
        return;
      }

      const targetWorkspace = workspaces.find(w => w.id === workspaceId);
      if (!targetWorkspace) {
        console.error(`[WorkspaceStore] Target workspace ${workspaceId} not found in store.`);
        set({ error: `Workspace with ID ${workspaceId} not found.` });
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const persistence = usePersistenceStore.getState();
        if (persistence.isInitialized && currentActiveWsId) {
          await persistence.saveState();
        }

        // Check if we have a cached SplitViewRecord from a recent move operation
        const cachedData = useCacheStore.getState().cachedSplitView;
        let cachedSplitView = null;

        if (cachedData && cachedData.workspaceId === workspaceId) {
          cachedSplitView = cachedData.splitView;
          // Clear the cache after use
          useCacheStore.getState().clearCachedSplitView();
        }

        const [newTabs, newSplitViewRecord] = await Promise.all([
          storage.getTabsByWorkspace(workspaceId),
          cachedSplitView ? Promise.resolve(cachedSplitView) : storage.getSplitViewByWorkspace(workspaceId)
        ]);

        let finalSplitViewRecord = newSplitViewRecord;
        if (!finalSplitViewRecord) {
          console.error(`[switchWorkspace] No split view for ${workspaceId}.`);
          return;
        }

        const updatedTargetWorkspace = { ...targetWorkspace, lastAccessed: Date.now() };
        await storage.saveWorkspace(updatedTargetWorkspace);

        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId ? updatedTargetWorkspace : w
          ).sort((a, b) => a.name.localeCompare(b.name)),
          activeWorkspaceId: workspaceId,
        }));

        const activeTabIdToSet = finalSplitViewRecord.activeLeftTabId || finalSplitViewRecord.activeRightTabId || (newTabs[0]?.id || null);
        useTabsStore.setState({ tabs: newTabs, activeTabId: activeTabIdToSet });

        const splitViewStateForStore: SplitViewState = {
          id: finalSplitViewRecord.id,
          isSplit: finalSplitViewRecord.isSplit,
          leftTabs: finalSplitViewRecord.leftTabs,
          rightTabs: finalSplitViewRecord.rightTabs,
          activeLeftTabId: finalSplitViewRecord.activeLeftTabId,
          activeRightTabId: finalSplitViewRecord.activeRightTabId,
          activeSide: finalSplitViewRecord.activeSide as 'left' | 'right' | null,
          splitRatio: finalSplitViewRecord.splitRatio,
          workspaceId: finalSplitViewRecord.workspaceId,
          leftTabHistory: [],
          rightTabHistory: []
        };
        useSplitViewStore.setState({ splitView: splitViewStateForStore });
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

        const initialSplitViewState = useSplitViewStore.getState().createDefaultSplitViewState(newWorkspace.id);
        initialSplitViewState.leftTabs = [initialTab.id];
        initialSplitViewState.activeLeftTabId = initialTab.id;

        const initialSplitViewRecord: SplitViewRecord = {
          ...initialSplitViewState,
          activeSide: initialSplitViewState.activeSide,
          lastModified: Date.now()
        };

        await Promise.all([
          storage.saveWorkspace(newWorkspace),
          storage.saveTab(initialTab),
          storage.saveSplitView(initialSplitViewRecord)
        ]);

        set(state => ({
          workspaces: [...state.workspaces, newWorkspace]
            .sort((a, b) => a.name.localeCompare(b.name)),
        }));

        await get().switchWorkspace(newWorkspace.id);
        return newWorkspace.id;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create workspace' });
        throw error;
      }
    },

    deleteWorkspace: async (workspaceId: string) => {
      const { workspaces, activeWorkspaceId: currentActiveId } = get();
      try {
        await storage.deleteWorkspace(workspaceId);

        useTabsStore.getState().removeTabsByWorkspace(workspaceId);
        useSplitViewStore.getState().clearSplitViewForWorkspace(workspaceId);

        const remainingWorkspaces = workspaces.filter(ws => ws.id !== workspaceId);
        if (workspaceId === currentActiveId && remainingWorkspaces.length > 0) {
          await get().switchWorkspace(remainingWorkspaces[0].id);
        } else {
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
        const updatedWorkspace = { ...workspace, name: newName, lastAccessed: Date.now() };
        await storage.saveWorkspace(updatedWorkspace);
        set(state => ({
          workspaces: state.workspaces.map(w =>
            w.id === workspaceId ? updatedWorkspace : w
          ).sort((a, b) => a.name.localeCompare(b.name))
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to rename workspace' });
      }
    },

    getActiveWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find(w => w.id === activeWorkspaceId);
    },

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
          links: [...(workspace.links || []), newLink]
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
      if (!workspace || !workspace.links) return;

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