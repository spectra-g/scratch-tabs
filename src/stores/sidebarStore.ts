import { create } from "zustand";
import { SidebarTabInfo, Tab } from "../types";
import { StorageProviderFactory, getSetting, setSetting } from "../db";
import { useWorkspaceStore } from "./workspaceStore";
import { debounce } from "../utils/domUtils";

interface SidebarPersistedState {
    isSidebarExpanded: boolean;
    sidebarWidth: number;
    expandedWorkspaceIds: string[];
}

interface SidebarState {
    // Desktop state
    isSidebarExpanded: boolean;
    // Mobile state
    isMobileOpen: boolean;
    // Width state for resizing
    sidebarWidth: number;

    expandedWorkspaceIds: Set<string>;
    workspaceTabsMetadata: Map<string, SidebarTabInfo[]>;
    loadingWorkspaceIds: Set<string>;
    searchQuery: string;

    toggleSidebar: () => void;
    setSidebarExpanded: (expanded: boolean) => void;
    setSidebarWidth: (width: number) => void;
    setMobileOpen: (isOpen: boolean) => void;
    expandWorkspace: (workspaceId: string) => Promise<void>;
    collapseWorkspace: (workspaceId: string) => void;
    setSearchQuery: (query: string) => void;
    refreshWorkspaceMetadata: (workspaceId: string) => Promise<void>;
    handleMetadataUpdate: (workspaceId: string, metadata: SidebarTabInfo[]) => void;
    initializeSidebarState: () => Promise<void>;
}

const SIDEBAR_CONFIG_KEY = "sidebar_config";
const DEFAULT_SIDEBAR_WIDTH = 225;

// Helper function to save sidebar state to IndexedDB
const saveSidebarState = async (state: Partial<SidebarPersistedState>) => {
    try {
        const currentValue = await getSetting(SIDEBAR_CONFIG_KEY);
        const currentState: SidebarPersistedState = currentValue
            ? JSON.parse(currentValue)
            : {
                isSidebarExpanded: true,
                sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
                expandedWorkspaceIds: [],
            };

        const updatedState: SidebarPersistedState = {
            ...currentState,
            ...state,
        };

        await setSetting(SIDEBAR_CONFIG_KEY, JSON.stringify(updatedState));
    } catch (error) {
        console.error("Failed to save sidebar state:", error);
    }
};

// Debounced version for width changes
const debouncedSaveWidth = debounce(async (width: number) => {
    await saveSidebarState({ sidebarWidth: width });
}, 1000);

export const useSidebarStore = create<SidebarState>((set, get) => {
    const storage = StorageProviderFactory.getProvider();

    return {
        // Desktop: open by default for discoverability
        isSidebarExpanded: true,
        // Mobile: closed by default to maximize editor space
        isMobileOpen: false,
        // Default width 240px
        sidebarWidth: DEFAULT_SIDEBAR_WIDTH,

        expandedWorkspaceIds: new Set<string>(),
        workspaceTabsMetadata: new Map<string, SidebarTabInfo[]>(),
        loadingWorkspaceIds: new Set<string>(),
        searchQuery: "",

        toggleSidebar: () => {
            set((state) => {
                const newExpanded = !state.isSidebarExpanded;
                saveSidebarState({ isSidebarExpanded: newExpanded });
                return { isSidebarExpanded: newExpanded };
            });
        },

        setSidebarExpanded: (expanded: boolean) => {
            set({ isSidebarExpanded: expanded });
            saveSidebarState({ isSidebarExpanded: expanded });
        },

        setSidebarWidth: (width: number) => {
            set({ sidebarWidth: width });
            debouncedSaveWidth(width);
        },

        setMobileOpen: (isOpen: boolean) => set({ isMobileOpen: isOpen }),

        expandWorkspace: async (workspaceId: string) => {
            const { expandedWorkspaceIds, workspaceTabsMetadata } = get();

            // If already expanded, do nothing
            if (expandedWorkspaceIds.has(workspaceId)) {
                return;
            }

            // Optimistically expand the UI
            const newExpandedIds = new Set([...expandedWorkspaceIds, workspaceId]);
            set({ expandedWorkspaceIds: newExpandedIds });

            // Persist to IndexedDB
            await saveSidebarState({
                expandedWorkspaceIds: Array.from(newExpandedIds),
            });

            // Check if we need to load metadata
            const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;

            // We fetch metadata if it's NOT the active workspace (active is handled by main store)
            // AND we don't have it cached yet
            if (workspaceId !== activeWorkspaceId && !workspaceTabsMetadata.has(workspaceId)) {
                await get().refreshWorkspaceMetadata(workspaceId);
            }
        },

        collapseWorkspace: (workspaceId: string) => {
            set((state) => {
                const next = new Set(state.expandedWorkspaceIds);
                next.delete(workspaceId);

                // Persist to IndexedDB
                saveSidebarState({
                    expandedWorkspaceIds: Array.from(next),
                });

                return { expandedWorkspaceIds: next };
            });
        },

        setSearchQuery: (query: string) => set({ searchQuery: query }),

        refreshWorkspaceMetadata: async (workspaceId: string) => {
            // Avoid duplicate fetches
            if (get().loadingWorkspaceIds.has(workspaceId)) return;

            set((state) => {
                const next = new Set(state.loadingWorkspaceIds);
                next.add(workspaceId);
                return { loadingWorkspaceIds: next };
            });

            try {
                const tabs = await storage.getTabsByWorkspace(workspaceId);
                const splitView = await storage.getSplitViewByWorkspace(workspaceId);

                // Create tab map for quick lookup
                const tabMap = new Map<string, Tab>(tabs.map(t => [t.id, t]));

                // Order tabs according to splitView order (leftTabs then rightTabs)
                let orderedTabs: Tab[] = [];
                if (splitView) {
                    const allTabIds = [...(splitView.leftTabs || []), ...(splitView.rightTabs || [])];

                    orderedTabs = allTabIds
                        .map(id => tabMap.get(id))
                        .filter((t): t is Tab => t !== undefined);

                    // Add any tabs not in splitView
                    const remainingTabs = tabs.filter(t => !allTabIds.includes(t.id));
                    orderedTabs = [...orderedTabs, ...remainingTabs];
                } else {
                    orderedTabs = tabs;
                }

                const metadata: SidebarTabInfo[] = orderedTabs.map((t) => ({
                    id: t.id,
                    title: t.title,
                    language: t.language,
                    isTablet: t.isTablet,
                    isRich: t.isRich,
                    isPinned: t.isPinned,
                    lastModified: t.lastModified,
                    workspaceId: t.workspaceId,
                }));

                set((state) => {
                    const nextMap = new Map(state.workspaceTabsMetadata);
                    nextMap.set(workspaceId, metadata);
                    const nextLoading = new Set(state.loadingWorkspaceIds);
                    nextLoading.delete(workspaceId);
                    return {
                        workspaceTabsMetadata: nextMap,
                        loadingWorkspaceIds: nextLoading,
                    };
                });
            } catch (error) {
                console.error(`Failed to fetch metadata for workspace ${workspaceId}:`, error);
                set((state) => {
                    const nextLoading = new Set(state.loadingWorkspaceIds);
                    nextLoading.delete(workspaceId);
                    return { loadingWorkspaceIds: nextLoading };
                });
            }
        },

        handleMetadataUpdate: (workspaceId: string, metadata: SidebarTabInfo[]) => {
            // Update the metadata cache for the workspace
            // This is called from broadcast events to keep all windows in sync
            set((state) => {
                const nextMap = new Map(state.workspaceTabsMetadata);
                nextMap.set(workspaceId, metadata);
                return { workspaceTabsMetadata: nextMap };
            });
        },

        initializeSidebarState: async () => {
            try {
                const savedValue = await getSetting(SIDEBAR_CONFIG_KEY);

                if (!savedValue) {
                    // No saved state, use defaults
                    return;
                }

                const savedState: SidebarPersistedState = JSON.parse(savedValue);

                set({
                    isSidebarExpanded: savedState.isSidebarExpanded ?? true,
                    sidebarWidth: savedState.sidebarWidth ?? DEFAULT_SIDEBAR_WIDTH,
                    expandedWorkspaceIds: new Set(savedState.expandedWorkspaceIds ?? []),
                });
            } catch (error) {
                console.error("Failed to initialize sidebar state:", error);
                // Use defaults on error
            }
        },
    };
});