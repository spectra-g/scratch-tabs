import { create } from 'zustand';
import { StorageProviderFactory } from '../db';
import { Workspace } from '../types';

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadWorkspaces: () => Promise<void>;
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
    
    loadWorkspaces: async () => {
      set({ isLoading: true, error: null });
      try {
        const workspaces = await storage.getWorkspaces();
        
        // If no workspaces exist, create a default one
        if (!workspaces || workspaces.length === 0) {
          const defaultWorkspace: Workspace = {
            id: crypto.randomUUID(),
            name: 'Default Workspace',
            links: [],
            createdAt: Date.now(),
            lastAccessed: Date.now()
          };
          await storage.saveWorkspace(defaultWorkspace);
          set({ workspaces: [defaultWorkspace], activeWorkspaceId: defaultWorkspace.id });
        } else {
          // Use most recently accessed workspace as active
          const sortedWorkspaces = [...workspaces].sort((a, b) => b.lastAccessed - a.lastAccessed);
          set({ workspaces: sortedWorkspaces, activeWorkspaceId: sortedWorkspaces[0]?.id });
          
          // Load the active workspace's content
          if (sortedWorkspaces[0]) {
            await get().switchWorkspace(sortedWorkspaces[0].id);
          }
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to load workspaces' });
      } finally {
        set({ isLoading: false });
      }
    },
    
    deleteWorkspace: async (workspaceId: string) => {
      const { workspaces } = get();
      console.log('[WorkspaceStore] Starting delete workspace:', { workspaceId, totalWorkspaces: workspaces.length });
      
      try {
        // Delete the workspace and its data from storage
        console.log('[WorkspaceStore] Deleting workspace data from storage');
        await storage.deleteWorkspace(workspaceId);
    
        // If this was the last workspace, clear everything
        if (workspaces.length <= 1) {
          set({
            workspaces: [],
            activeWorkspaceId: null
          });
          window.dispatchEvent(new CustomEvent('loadPersistedTabs', { detail: [] }));
          window.dispatchEvent(new CustomEvent('loadPersistedSplitView', { detail: null }));
        } else {
          // Reload workspaces from storage
          const updatedWorkspaces = await storage.getWorkspaces();
          if (updatedWorkspaces.length > 0) {
            // Sort by last accessed and switch to the most recent one
            const sortedWorkspaces = [...updatedWorkspaces].sort((a, b) => b.lastAccessed - a.lastAccessed);
            set({ workspaces: sortedWorkspaces });
            
            // Switch to the first workspace
            const nextWorkspace = sortedWorkspaces[0];
            if (nextWorkspace) {
              // Load the workspace's content
              const [tabs, splitView] = await Promise.all([
                storage.getTabsByWorkspace(nextWorkspace.id),
                storage.getSplitViewByWorkspace(nextWorkspace.id)
              ]);
    
              // Update lastAccessed timestamp
              const updatedWorkspace = { ...nextWorkspace, lastAccessed: Date.now() };
              await storage.saveWorkspace(updatedWorkspace);
    
              // Update state and dispatch events
              set({ activeWorkspaceId: nextWorkspace.id });
              window.dispatchEvent(new CustomEvent('loadPersistedTabs', { detail: tabs }));
              window.dispatchEvent(new CustomEvent('loadPersistedSplitView', { detail: splitView }));
            }
          }
        }
    
        console.log('[WorkspaceStore] Workspace deletion completed successfully');
      } catch (error) {
        console.error("[WorkspaceStore] Failed to delete workspace:", error);
        set({ error: error instanceof Error ? error.message : 'Failed to delete workspace' });
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
        // Create initial tab and split view state
        const initialTab = {
          id: crypto.randomUUID(),
          title: 'Welcome',
          content: '',
          language: 'plaintext',
          languageLocked: false,
          workspaceId: newWorkspace.id,
          dateCreated: Date.now(),
          lastModified: Date.now(),
          cursorPosition: { lineNumber: 1, column: 1 }
        };
    
        const initialSplitView = {
          id: crypto.randomUUID(),
          isSplit: false,
          leftTabs: [initialTab.id],
          rightTabs: [],
          activeLeftTabId: initialTab.id,
          activeRightTabId: null,
          activeSide: 'left',
          splitRatio: 0.5,
          leftTabHistory: [initialTab.id],
          rightTabHistory: [],
          workspaceId: newWorkspace.id,
          lastModified: Date.now()
        };

        // Save everything
        await Promise.all([
          storage.saveWorkspace(newWorkspace),
          storage.saveTab(initialTab),
          storage.saveSplitView(initialSplitView)
        ]);
    
        // Update store state
        set(state => ({
          workspaces: [...state.workspaces, newWorkspace],
          activeWorkspaceId: newWorkspace.id
        }));
    
        // Update tabs and split view state
        window.dispatchEvent(new CustomEvent('loadPersistedTabs', { detail: [initialTab] }));
        window.dispatchEvent(new CustomEvent('loadPersistedSplitView', { detail: initialSplitView }));
    
        return newWorkspace.id;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create workspace' });
        throw error;
      }
    },

    switchWorkspace: async (workspaceId: string) => {
      const { workspaces } = get();
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (!workspace) return;
      
      try {
        // Save current workspace state directly
        const storage = StorageProviderFactory.getProvider();
        const saveStateEvent = new CustomEvent('requestSaveState', {
          detail: {
            callback: async (tabs: any[], splitView: any) => {
              try {
                const { activeWorkspaceId } = get();
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
                throw error;
              }
            }
          }
        });
        
        window.dispatchEvent(saveStateEvent);
    
        // Get tabs and split view state for the new workspace
        const [tabs, splitView] = await Promise.all([
          storage.getTabsByWorkspace(workspaceId),
          storage.getSplitViewByWorkspace(workspaceId)
        ]);
    
        // Update lastAccessed timestamp
        const updatedWorkspace = { ...workspace, lastAccessed: Date.now() };
        await storage.saveWorkspace(updatedWorkspace);
        
        // Update workspace store state
        set(state => ({
          workspaces: state.workspaces.map(w => 
            w.id === workspaceId ? updatedWorkspace : w
          ),
          activeWorkspaceId: workspaceId
        }));
    
        // Update tabs and split view state
        window.dispatchEvent(new CustomEvent('loadPersistedTabs', { detail: tabs }));
        if (splitView) {
          window.dispatchEvent(new CustomEvent('loadPersistedSplitView', { detail: splitView }));
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to switch workspace' });
      }
    },
    
    renameWorkspace: async (workspaceId: string, newName: string) => {
      const { workspaces } = get();
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (!workspace) return;
      
      try {
        const updatedWorkspace = { ...workspace, name: newName };
        await storage.saveWorkspace(updatedWorkspace);
        
        set(state => ({
          workspaces: state.workspaces.map(w => 
            w.id === workspaceId ? updatedWorkspace : w
          )
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to rename workspace' });
      }
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
          links: [...workspace.links, newLink]
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
      if (!workspace) return;
      
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
    
    getActiveWorkspace: () => {
      const { workspaces, activeWorkspaceId } = get();
      return workspaces.find(w => w.id === activeWorkspaceId);
    }
  };
});
