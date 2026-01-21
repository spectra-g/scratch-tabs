const mockStorageProvider = {
    getTabsByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any[]>>,
};

jest.mock("../../db", () => ({
    StorageProviderFactory: {
        getProvider: () => mockStorageProvider,
    },
}));

jest.mock("../workspaceStore", () => ({
    useWorkspaceStore: {
        getState: jest.fn(() => ({
            activeWorkspaceId: "active-ws",
        })),
    },
}));

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useSidebarStore } from "../sidebarStore";


describe("SidebarStore", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        useSidebarStore.setState({
            isSidebarExpanded: true,
            expandedWorkspaceIds: new Set<string>(),
            workspaceTabsMetadata: new Map(),
            loadingWorkspaceIds: new Set<string>(),
            searchQuery: "",
        });
    });

    describe("Initial State", () => {
        it("should initialize with default values", () => {
            const state = useSidebarStore.getState();
            expect(state.isSidebarExpanded).toBe(true);
            expect(state.expandedWorkspaceIds.size).toBe(0);
            expect(state.searchQuery).toBe("");
        });
    });

    describe("Sidebar Toggle", () => {
        it("should toggle sidebar expanded state", () => {
            useSidebarStore.getState().toggleSidebar();
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(false);
            useSidebarStore.getState().toggleSidebar();
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(true);
        });

        it("should set sidebar expanded state explicitly", () => {
            useSidebarStore.getState().setSidebarExpanded(false);
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(false);
            useSidebarStore.getState().setSidebarExpanded(true);
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(true);
        });
    });

    describe("Workspace Expansion", () => {
        it("should expand and collapse workspace", async () => {
            const wsId = "inactive-ws";
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);

            await useSidebarStore.getState().expandWorkspace(wsId);
            expect(useSidebarStore.getState().expandedWorkspaceIds.has(wsId)).toBe(true);

            useSidebarStore.getState().collapseWorkspace(wsId);
            expect(useSidebarStore.getState().expandedWorkspaceIds.has(wsId)).toBe(false);
        });

        it("should fetch metadata when expanding inactive workspace if not already cached", async () => {
            const wsId = "inactive-ws";
            const mockTabs = [
                { id: "tab1", title: "Tab 1", language: "typescript", lastModified: 100, workspaceId: wsId }
            ];
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue(mockTabs);

            await useSidebarStore.getState().expandWorkspace(wsId);

            expect(mockStorageProvider.getTabsByWorkspace).toHaveBeenCalledWith(wsId);
            const metadata = useSidebarStore.getState().workspaceTabsMetadata.get(wsId);
            expect(metadata).toHaveLength(1);
            expect(metadata?.[0].id).toBe("tab1");
        });

        it("should NOT fetch metadata when expanding active workspace", async () => {
            const activeWsId = "active-ws";
            await useSidebarStore.getState().expandWorkspace(activeWsId);

            expect(mockStorageProvider.getTabsByWorkspace).not.toHaveBeenCalled();
        });
    });

    describe("Search Query", () => {
        it("should update search query", () => {
            useSidebarStore.getState().setSearchQuery("test query");
            expect(useSidebarStore.getState().searchQuery).toBe("test query");
        });
    });

    describe("Refresh Metadata", () => {
        it("should refresh metadata and handle loading states", async () => {
            const wsId = "ws-1";
            const mockTabs = [{ id: "t1", title: "T1", language: "js", lastModified: 200, workspaceId: wsId }];

            // Setup a pending promise to test loading state
            let resolvePromise: any;
            const promise = new Promise<any[]>((resolve) => { resolvePromise = resolve; });
            mockStorageProvider.getTabsByWorkspace.mockReturnValue(promise);

            const refreshPromise = useSidebarStore.getState().refreshWorkspaceMetadata(wsId);

            expect(useSidebarStore.getState().loadingWorkspaceIds.has(wsId)).toBe(true);

            resolvePromise(mockTabs);
            await refreshPromise;

            expect(useSidebarStore.getState().loadingWorkspaceIds.has(wsId)).toBe(false);
            expect(useSidebarStore.getState().workspaceTabsMetadata.get(wsId)).toHaveLength(1);
        });

        it("should handle reach errors during refresh", async () => {
            const wsId = "ws-1";
            mockStorageProvider.getTabsByWorkspace.mockRejectedValue(new Error("DB Error"));

            await useSidebarStore.getState().refreshWorkspaceMetadata(wsId);

            expect(useSidebarStore.getState().loadingWorkspaceIds.has(wsId)).toBe(false);
            expect(useSidebarStore.getState().workspaceTabsMetadata.has(wsId)).toBe(false);
        });
    });
});
