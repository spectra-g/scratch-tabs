const mockStorageProvider = {
    getTabsByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any[]>>,
    getSplitViewByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any>>,
};

const mockGetSetting = jest.fn() as jest.MockedFunction<(key: string) => Promise<string | undefined>>;
const mockSetSetting = jest.fn() as jest.MockedFunction<(key: string, value: string) => Promise<void>>;

jest.mock("../../db", () => ({
    StorageProviderFactory: {
        getProvider: () => mockStorageProvider,
    },
    getSetting: mockGetSetting,
    setSetting: mockSetSetting,
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

            // Suppress expected console.error
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            await useSidebarStore.getState().refreshWorkspaceMetadata(wsId);

            expect(useSidebarStore.getState().loadingWorkspaceIds.has(wsId)).toBe(false);
            expect(useSidebarStore.getState().workspaceTabsMetadata.has(wsId)).toBe(false);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
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

    describe("Persistence - initializeSidebarState", () => {
        it("should hydrate state from IndexedDB", async () => {
            const savedState = {
                isSidebarExpanded: false,
                sidebarWidth: 350,
                expandedWorkspaceIds: ["workspace-1", "workspace-2"],
            };

            mockGetSetting.mockResolvedValue(JSON.stringify(savedState));

            await useSidebarStore.getState().initializeSidebarState();

            expect(mockGetSetting).toHaveBeenCalledWith("sidebar_config");
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(false);
            expect(useSidebarStore.getState().sidebarWidth).toBe(350);
            expect(useSidebarStore.getState().expandedWorkspaceIds).toEqual(
                new Set(["workspace-1", "workspace-2"])
            );
        });

        it("should use defaults when no saved state exists", async () => {
            mockGetSetting.mockResolvedValue(undefined);

            // Reset to defaults first
            useSidebarStore.setState({
                isSidebarExpanded: true,
                sidebarWidth: 288,
                expandedWorkspaceIds: new Set(),
            });

            await useSidebarStore.getState().initializeSidebarState();

            expect(mockGetSetting).toHaveBeenCalledWith("sidebar_config");
            // Should keep default values
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(true);
            expect(useSidebarStore.getState().sidebarWidth).toBe(288);
            expect(useSidebarStore.getState().expandedWorkspaceIds).toEqual(new Set());
        });

        it("should handle null expandedWorkspaceIds gracefully", async () => {
            const savedState = {
                isSidebarExpanded: false,
                sidebarWidth: 350,
                expandedWorkspaceIds: null,
            };

            mockGetSetting.mockResolvedValue(JSON.stringify(savedState));

            await useSidebarStore.getState().initializeSidebarState();

            expect(useSidebarStore.getState().expandedWorkspaceIds).toEqual(new Set());
        });

        it("should handle corrupted JSON gracefully", async () => {
            mockGetSetting.mockResolvedValue("{ invalid json");

            // Set known state before initialization
            useSidebarStore.setState({
                isSidebarExpanded: true,
                sidebarWidth: 288,
            });

            // Suppress expected console.error
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            await useSidebarStore.getState().initializeSidebarState();

            // Should keep defaults on error
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(true);
            expect(useSidebarStore.getState().sidebarWidth).toBe(288);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe("Persistence - toggleSidebar", () => {
        it("should toggle sidebar and save to IndexedDB", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: [],
                })
            );

            useSidebarStore.getState().toggleSidebar();

            // Wait for async setSetting to be called
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(useSidebarStore.getState().isSidebarExpanded).toBe(false);
            expect(mockSetSetting).toHaveBeenCalledWith(
                "sidebar_config",
                expect.stringContaining('"isSidebarExpanded":false')
            );
        });
    });

    describe("Persistence - setSidebarExpanded", () => {
        it("should update state and save immediately", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: [],
                })
            );

            useSidebarStore.getState().setSidebarExpanded(false);

            // Wait for async setSetting to be called
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(useSidebarStore.getState().isSidebarExpanded).toBe(false);
            expect(mockSetSetting).toHaveBeenCalledWith(
                "sidebar_config",
                expect.stringContaining('"isSidebarExpanded":false')
            );
        });
    });

    describe("Persistence - setSidebarWidth", () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it("should update state immediately but debounce database save", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: [],
                })
            );

            useSidebarStore.getState().setSidebarWidth(350);

            // State should update immediately
            expect(useSidebarStore.getState().sidebarWidth).toBe(350);

            // Database save should not happen yet
            expect(mockSetSetting).not.toHaveBeenCalled();

            // Fast-forward time
            jest.advanceTimersByTime(1000);

            // Flush promises
            await Promise.resolve();

            // Now the database save should have been called
            expect(mockSetSetting).toHaveBeenCalledWith(
                "sidebar_config",
                expect.stringContaining('"sidebarWidth":350')
            );
        });

        it("should debounce multiple rapid width changes", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: [],
                })
            );

            useSidebarStore.getState().setSidebarWidth(300);
            useSidebarStore.getState().setSidebarWidth(320);
            useSidebarStore.getState().setSidebarWidth(350);

            expect(useSidebarStore.getState().sidebarWidth).toBe(350);
            expect(mockSetSetting).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1000);

            await Promise.resolve();

            // Should only save once with the final value
            expect(mockSetSetting).toHaveBeenCalledTimes(1);
            expect(mockSetSetting).toHaveBeenCalledWith(
                "sidebar_config",
                expect.stringContaining('"sidebarWidth":350')
            );
        });
    });

    describe("Persistence - expandWorkspace", () => {
        it("should expand workspace and save to IndexedDB", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: [],
                })
            );
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);
            mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(null);

            await useSidebarStore.getState().expandWorkspace("workspace-2");

            expect(useSidebarStore.getState().expandedWorkspaceIds).toEqual(new Set(["workspace-2"]));
            expect(mockSetSetting).toHaveBeenCalledWith(
                "sidebar_config",
                expect.stringContaining('"expandedWorkspaceIds":["workspace-2"]')
            );
        });

        it("should serialize Set to Array for storage", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: ["workspace-1"],
                })
            );
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);
            mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(null);

            // Initialize with existing expanded workspace
            await useSidebarStore.getState().initializeSidebarState();

            await useSidebarStore.getState().expandWorkspace("workspace-2");

            // Verify that the saved value contains an array
            const lastCall = mockSetSetting.mock.calls[mockSetSetting.mock.calls.length - 1];
            const savedData = JSON.parse(lastCall[1] as string);
            expect(Array.isArray(savedData.expandedWorkspaceIds)).toBe(true);
            expect(savedData.expandedWorkspaceIds).toContain("workspace-1");
            expect(savedData.expandedWorkspaceIds).toContain("workspace-2");
        });

        it("should not save if already expanded", async () => {
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);
            mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(null);

            await useSidebarStore.getState().expandWorkspace("workspace-1");

            mockSetSetting.mockClear();

            await useSidebarStore.getState().expandWorkspace("workspace-1");

            // Should not save again
            expect(mockSetSetting).not.toHaveBeenCalled();
        });
    });

    describe("Persistence - collapseWorkspace", () => {
        it("should collapse workspace and save to IndexedDB", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: ["workspace-1", "workspace-2"],
                })
            );

            await useSidebarStore.getState().initializeSidebarState();

            useSidebarStore.getState().collapseWorkspace("workspace-1");

            // Wait for async setSetting
            await new Promise((resolve) => setTimeout(resolve, 10));

            expect(useSidebarStore.getState().expandedWorkspaceIds).toEqual(new Set(["workspace-2"]));
            expect(mockSetSetting).toHaveBeenCalledWith(
                "sidebar_config",
                expect.stringContaining('"expandedWorkspaceIds":["workspace-2"]')
            );
        });
    });

    describe("Persistence - integration", () => {
        it("should maintain state across multiple operations", async () => {
            mockGetSetting.mockResolvedValue(
                JSON.stringify({
                    isSidebarExpanded: true,
                    sidebarWidth: 288,
                    expandedWorkspaceIds: [],
                })
            );
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);
            mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(null);

            await useSidebarStore.getState().initializeSidebarState();
            useSidebarStore.getState().setSidebarExpanded(false);
            await new Promise((resolve) => setTimeout(resolve, 10));
            await useSidebarStore.getState().expandWorkspace("workspace-1");

            // Verify final state
            expect(useSidebarStore.getState().isSidebarExpanded).toBe(false);
            expect(useSidebarStore.getState().expandedWorkspaceIds).toEqual(new Set(["workspace-1"]));

            // Verify all changes were persisted
            const calls = mockSetSetting.mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            // Last call should have both changes
            const lastCall = calls[calls.length - 1];
            const savedData = JSON.parse(lastCall[1] as string);
            expect(savedData.expandedWorkspaceIds).toContain("workspace-1");
        });
    });
});
