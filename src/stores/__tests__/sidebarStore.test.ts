const mockStorageProvider = {
    getTabsByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any[]>>,
    getSplitViewByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any>>,
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
            const mockSplitView = {
                leftTabs: ["tab1"],
                rightTabs: [],
            };
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue(mockTabs);
            mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(mockSplitView);

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
            const mockSplitView = { leftTabs: ["t1"], rightTabs: [] };

            // Setup a pending promise to test loading state
            let resolveTabsPromise: any;
            let resolveSplitViewPromise: any;
            const tabsPromise = new Promise<any[]>((resolve) => { resolveTabsPromise = resolve; });
            const splitViewPromise = new Promise<any>((resolve) => { resolveSplitViewPromise = resolve; });
            mockStorageProvider.getTabsByWorkspace.mockReturnValue(tabsPromise);
            mockStorageProvider.getSplitViewByWorkspace.mockReturnValue(splitViewPromise);

            const refreshPromise = useSidebarStore.getState().refreshWorkspaceMetadata(wsId);

            expect(useSidebarStore.getState().loadingWorkspaceIds.has(wsId)).toBe(true);

            resolveTabsPromise(mockTabs);
            resolveSplitViewPromise(mockSplitView);
            await refreshPromise;

            expect(useSidebarStore.getState().loadingWorkspaceIds.has(wsId)).toBe(false);
            expect(useSidebarStore.getState().workspaceTabsMetadata.get(wsId)).toHaveLength(1);
        });

        it("should handle reach errors during refresh", async () => {
            const wsId = "ws-1";
            mockStorageProvider.getTabsByWorkspace.mockRejectedValue(new Error("DB Error"));
            mockStorageProvider.getSplitViewByWorkspace.mockRejectedValue(new Error("DB Error"));

            await useSidebarStore.getState().refreshWorkspaceMetadata(wsId);

            expect(useSidebarStore.getState().loadingWorkspaceIds.has(wsId)).toBe(false);
            expect(useSidebarStore.getState().workspaceTabsMetadata.has(wsId)).toBe(false);
        });
    });

    describe("Handle Metadata Update (Broadcast Sync)", () => {
        it("should update metadata cache when receiving broadcast update", () => {
            const wsId = "ws-broadcast";
            const metadata = [
                { id: "t1", title: "Tab 1", language: "typescript", lastModified: 100, workspaceId: wsId },
                { id: "t2", title: "Tab 2", language: "javascript", lastModified: 200, workspaceId: wsId }
            ];

            useSidebarStore.getState().handleMetadataUpdate(wsId, metadata);

            const cachedMetadata = useSidebarStore.getState().workspaceTabsMetadata.get(wsId);
            expect(cachedMetadata).toEqual(metadata);
        });

        it("should overwrite existing metadata for a workspace", () => {
            const wsId = "ws-existing";
            const oldMetadata = [
                { id: "old1", title: "Old Tab", language: "python", lastModified: 50, workspaceId: wsId }
            ];
            const newMetadata = [
                { id: "new1", title: "New Tab", language: "rust", lastModified: 150, workspaceId: wsId },
                { id: "new2", title: "Another New", language: "go", lastModified: 160, workspaceId: wsId }
            ];

            // Set initial metadata
            useSidebarStore.getState().handleMetadataUpdate(wsId, oldMetadata);
            expect(useSidebarStore.getState().workspaceTabsMetadata.get(wsId)).toEqual(oldMetadata);

            // Update with new metadata (simulating broadcast)
            useSidebarStore.getState().handleMetadataUpdate(wsId, newMetadata);
            expect(useSidebarStore.getState().workspaceTabsMetadata.get(wsId)).toEqual(newMetadata);
            expect(useSidebarStore.getState().workspaceTabsMetadata.get(wsId)).toHaveLength(2);
        });

        it("should not affect metadata for other workspaces", () => {
            const ws1 = "ws-1";
            const ws2 = "ws-2";
            const metadata1 = [
                { id: "t1", title: "Tab 1", language: "typescript", lastModified: 100, workspaceId: ws1 }
            ];
            const metadata2 = [
                { id: "t2", title: "Tab 2", language: "javascript", lastModified: 200, workspaceId: ws2 }
            ];

            useSidebarStore.getState().handleMetadataUpdate(ws1, metadata1);
            useSidebarStore.getState().handleMetadataUpdate(ws2, metadata2);

            expect(useSidebarStore.getState().workspaceTabsMetadata.get(ws1)).toEqual(metadata1);
            expect(useSidebarStore.getState().workspaceTabsMetadata.get(ws2)).toEqual(metadata2);
        });
    });
});
