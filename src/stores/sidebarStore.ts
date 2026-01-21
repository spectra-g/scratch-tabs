import { create } from "zustand";
import { SidebarTabInfo, Tab } from "../types";
import { StorageProviderFactory } from "../db";
import { useWorkspaceStore } from "./workspaceStore";
import { useTabsStore } from "./tabsStore";

interface SidebarState {
    // Desktop state
    isSidebarExpanded: boolean;
    // Mobile state
    isMobileOpen: boolean;

    expandedWorkspaceIds: Set<string>;
    workspaceTabsMetadata: Map<string, SidebarTabInfo[]>;
    loadingWorkspaceIds: Set<string>;
    searchQuery: string;

    toggleSidebar: () => void;
    setSidebarExpanded: (expanded: boolean) => void;
    setMobileOpen: (isOpen: boolean) => void;
    expandWorkspace: (workspaceId: string) => Promise<void>;
    collapseWorkspace: (workspaceId: string) => void;
    setSearchQuery: (query: string) => void;
    refreshWorkspaceMetadata: (workspaceId: string) => Promise<void>;
}

export const useSidebarStore = create<SidebarState>((set, get) => {
    const storage = StorageProviderFactory.getProvider();

    return {
        // Desktop: open by default for discoverability
        isSidebarExpanded: true,
        // Mobile: closed by default to maximize editor space
        isMobileOpen: false,

        expandedWorkspaceIds: new Set<string>(),
        workspaceTabsMetadata: new Map<string, SidebarTabInfo[]>(),
        loadingWorkspaceIds: new Set<string>(),
        searchQuery: "",

        toggleSidebar: () => set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),

        setSidebarExpanded: (expanded: boolean) => set({ isSidebarExpanded: expanded }),

        setMobileOpen: (isOpen: boolean) => set({ isMobileOpen: isOpen }),

        expandWorkspace: async (workspaceId: string) => {
            const { expandedWorkspaceIds, workspaceTabsMetadata, loadingWorkspaceIds } = get();

            // If already expanded, do nothing
            if (expandedWorkspaceIds.has(workspaceId)) {
                return;
            }

            set((state) => {
                const next = new Set(state.expandedWorkspaceIds);
                next.add(workspaceId);
                return { expandedWorkspaceIds: next };
            });

            // If active workspace, we use tabsStore, so no need to fetch metadata here
            // But we might want to refresh metadata for inactive workspaces if not present
            const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
            if (workspaceId !== activeWorkspaceId && !workspaceTabsMetadata.has(workspaceId)) {
                await get().refreshWorkspaceMetadata(workspaceId);
            }
        },

        collapseWorkspace: (workspaceId: string) => {
            set((state) => {
                const next = new Set(state.expandedWorkspaceIds);
                next.delete(workspaceId);
                return { expandedWorkspaceIds: next };
            });
        },

        setSearchQuery: (query: string) => set({ searchQuery: query }),

        refreshWorkspaceMetadata: async (workspaceId: string) => {
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
                // Explicitly type to ensure type safety
                let orderedTabs: Tab[] = [];
                if (splitView) {
                    const allTabIds = [...(splitView.leftTabs || []), ...(splitView.rightTabs || [])];
                    // Map IDs to tabs, preserving splitView order
                    orderedTabs = allTabIds
                        .map(id => tabMap.get(id))
                        .filter((t): t is Tab => t !== undefined);

                    // Add any tabs not in splitView (shouldn't happen, but defensive)
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
    };
});
