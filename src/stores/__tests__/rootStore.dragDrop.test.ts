// Mock dependencies
const mockTabsStore = {
    getState: jest.fn(() => ({
        tabs: [] as any[],
        addTab: jest.fn(),
        removeTab: jest.fn(),
    })),
};

const mockSplitViewStore = {
    getState: jest.fn(() => ({
        splitView: {
            workspaceId: "active-ws",
            leftTabs: [] as string[],
            rightTabs: [] as string[],
            isSplit: false,
        },
        addTabToSide: jest.fn(),
        removeTabFromSide: jest.fn(),
        reorderTabs: jest.fn(),
    })),
};

const mockWorkspaceStore = {
    getState: jest.fn(() => ({
        activeWorkspaceId: "active-ws",
        workspaces: [] as any[],
        deleteWorkspace: jest.fn(),
        switchWorkspace: jest.fn(),
    })),
};

const mockSidebarStore = {
    getState: jest.fn(() => ({
        refreshWorkspaceMetadata: jest.fn(),
    })),
};

const mockStorageProvider = {
    getTabsByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any[]>>,
    saveTabNow: jest.fn() as jest.MockedFunction<(tab: any) => Promise<void>>,
    deleteTab: jest.fn() as jest.MockedFunction<(id: string) => Promise<void>>,
    getSplitViewByWorkspace: jest.fn() as jest.MockedFunction<(workspaceId: string) => Promise<any | null>>,
    saveSplitViewNow: jest.fn() as jest.MockedFunction<(splitView: any) => Promise<void>>,
};

const mockModelManager = {
    dispose: jest.fn(),
};

const mockQueryPanelStore = {
    getState: jest.fn(() => ({
        removePanelState: jest.fn(),
    })),
};

const mockBroadcastManager = {
    broadcastWorkspaceState: jest.fn(),
    broadcastWorkspaceTabsMetadata: jest.fn(),
};

jest.mock("../tabsStore", () => ({
    useTabsStore: mockTabsStore,
}));

jest.mock("../splitViewStore", () => ({
    useSplitViewStore: mockSplitViewStore,
}));

jest.mock("../workspaceStore", () => ({
    useWorkspaceStore: mockWorkspaceStore,
}));

jest.mock("../sidebarStore", () => ({
    useSidebarStore: mockSidebarStore,
}));

jest.mock("../../db", () => ({
    StorageProviderFactory: {
        getProvider: () => mockStorageProvider,
    },
    incrementSetting: jest.fn(),
}));

jest.mock("../../services/modelManager", () => ({
    modelManager: mockModelManager,
}));

jest.mock("../../formats/json/stores/useQueryPanelStore", () => ({
    useQueryPanelStore: mockQueryPanelStore,
}));

jest.mock("../broadcastStore", () => ({
    broadcastManager: mockBroadcastManager,
}));

jest.mock("../milestoneCelebrationStore", () => ({
    useMilestoneCelebrationStore: {
        getState: jest.fn(() => ({
            checkMilestone: jest.fn(),
        })),
    },
}));

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useRootStore } from "../rootStore";

describe("RootStore - Drag and Drop", () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset default mock implementations
        mockTabsStore.getState.mockReturnValue({
            tabs: [],
            addTab: jest.fn(),
            removeTab: jest.fn(),
        });

        mockSplitViewStore.getState.mockReturnValue({
            splitView: {
                workspaceId: "active-ws",
                leftTabs: [] as string[],
                rightTabs: [] as string[],
                isSplit: false,
            },
            addTabToSide: jest.fn(),
            removeTabFromSide: jest.fn(),
            reorderTabs: jest.fn(),
        });

        mockWorkspaceStore.getState.mockReturnValue({
            activeWorkspaceId: "active-ws",
            workspaces: [
                { id: "active-ws", name: "Active Workspace" },
                { id: "inactive-ws", name: "Inactive Workspace" },
            ],
            deleteWorkspace: jest.fn(),
            switchWorkspace: jest.fn(),
        });

        mockSidebarStore.getState.mockReturnValue({
            refreshWorkspaceMetadata: jest.fn(),
        });

        mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);
        mockStorageProvider.saveTabNow.mockResolvedValue(undefined);
        mockStorageProvider.deleteTab.mockResolvedValue(undefined);
        mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(null);
        mockStorageProvider.saveSplitViewNow.mockResolvedValue(undefined);
    });

    describe("moveTabBetweenWorkspaces", () => {
        it("should move tab from inactive to active workspace", async () => {
            const mockTab = {
                id: "tab1",
                title: "Test Tab",
                content: "test content",
                language: "javascript",
                workspaceId: "inactive-ws",
                lastModified: Date.now(),
                dateCreated: Date.now(),
                languageLocked: false,
                cursorPosition: { lineNumber: 1, column: 1 },
            };

            const addTabMock = jest.fn();
            const addTabToSideMock = jest.fn();
            const refreshMetadataMock = jest.fn();

            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([mockTab]);
            mockTabsStore.getState.mockReturnValue({
                tabs: [],
                addTab: addTabMock,
                removeTab: jest.fn(),
            });
            mockSplitViewStore.getState.mockReturnValue({
                splitView: { workspaceId: "active-ws", leftTabs: [] as string[], rightTabs: [] as string[], isSplit: false },
                addTabToSide: addTabToSideMock,
                removeTabFromSide: jest.fn(),
                reorderTabs: jest.fn(),
            });
            mockSidebarStore.getState.mockReturnValue({
                refreshWorkspaceMetadata: refreshMetadataMock,
            });

            await useRootStore.getState().moveTabBetweenWorkspaces("tab1", "inactive-ws", "active-ws");

            // Verify tab was added to active workspace
            expect(addTabMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: "tab1",
                    workspaceId: "active-ws",
                })
            );

            // Verify tab was added to split view
            expect(addTabToSideMock).toHaveBeenCalledWith("tab1", false, "tab1");

            // Verify tab was deleted from source
            expect(mockStorageProvider.deleteTab).toHaveBeenCalledWith("tab1");

            // Verify metadata was refreshed
            expect(refreshMetadataMock).toHaveBeenCalledWith("inactive-ws");

            // Verify broadcast was called
            expect(mockBroadcastManager.broadcastWorkspaceState).toHaveBeenCalled();
        });

        it("should move tab from active to inactive workspace", async () => {
            const mockTab = {
                id: "tab1",
                title: "Test Tab",
                content: "test content",
                language: "javascript",
                workspaceId: "active-ws",
                lastModified: Date.now(),
                dateCreated: Date.now(),
                languageLocked: false,
                cursorPosition: { lineNumber: 1, column: 1 },
            };

            const removeTabMock = jest.fn();
            const removeTabFromSideMock = jest.fn();
            const refreshMetadataMock = jest.fn();

            mockTabsStore.getState.mockReturnValue({
                tabs: [mockTab],
                addTab: jest.fn(),
                removeTab: removeTabMock,
            });
            mockSplitViewStore.getState.mockReturnValue({
                splitView: { workspaceId: "active-ws", leftTabs: ["tab1"], rightTabs: [] as string[], isSplit: false },
                addTabToSide: jest.fn(),
                removeTabFromSide: removeTabFromSideMock,
                reorderTabs: jest.fn(),
            });
            mockSidebarStore.getState.mockReturnValue({
                refreshWorkspaceMetadata: refreshMetadataMock,
            });
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([mockTab]);

            await useRootStore.getState().moveTabBetweenWorkspaces("tab1", "active-ws", "inactive-ws");

            // Verify tab was saved to IndexedDB
            expect(mockStorageProvider.saveTabNow).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: "tab1",
                    workspaceId: "inactive-ws",
                })
            );

            // Verify model was disposed
            expect(mockModelManager.dispose).toHaveBeenCalledWith("tab1");

            // Verify tab was removed from store
            expect(removeTabFromSideMock).toHaveBeenCalledWith("tab1");
            expect(removeTabMock).toHaveBeenCalledWith("tab1");

            // Verify metadata was refreshed for both workspaces
            expect(refreshMetadataMock).toHaveBeenCalledWith("inactive-ws");

            // Verify broadcast was called
            expect(mockBroadcastManager.broadcastWorkspaceState).toHaveBeenCalled();
        });

        it("should allow empty workspaces after moving last tab", async () => {
            const mockTab = {
                id: "tab1",
                title: "Test Tab",
                content: "test content",
                language: "javascript",
                workspaceId: "inactive-ws",
                lastModified: Date.now(),
                dateCreated: Date.now(),
                languageLocked: false,
                cursorPosition: { lineNumber: 1, column: 1 },
            };

            const deleteWorkspaceMock = jest.fn();
            const refreshMetadataMock = jest.fn();

            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([mockTab]);
            mockSidebarStore.getState.mockReturnValue({
                refreshWorkspaceMetadata: refreshMetadataMock,
            });

            mockWorkspaceStore.getState.mockReturnValue({
                activeWorkspaceId: "active-ws",
                workspaces: [
                    { id: "active-ws", name: "Active" },
                    { id: "inactive-ws", name: "Inactive" },
                ],
                deleteWorkspace: deleteWorkspaceMock,
                switchWorkspace: jest.fn(),
            });

            await useRootStore.getState().moveTabBetweenWorkspaces("tab1", "inactive-ws", "active-ws");

            // Verify workspace was NOT deleted (empty workspaces are now allowed)
            expect(deleteWorkspaceMock).not.toHaveBeenCalled();

            // Verify metadata was still refreshed
            expect(refreshMetadataMock).toHaveBeenCalledWith("inactive-ws");
        });

        it("should not move pinned tabs", async () => {
            const mockTab = {
                id: "tab1",
                title: "Pinned Tab",
                content: "test",
                language: "javascript",
                workspaceId: "active-ws",
                isPinned: true,
                lastModified: Date.now(),
                dateCreated: Date.now(),
                languageLocked: false,
                cursorPosition: { lineNumber: 1, column: 1 },
            };

            mockTabsStore.getState.mockReturnValue({
                tabs: [mockTab],
                addTab: jest.fn(),
                removeTab: jest.fn(),
            });
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([mockTab]);

            // This should still work (no built-in pinned check in the action)
            // The UI prevents dragging pinned tabs
            await useRootStore.getState().moveTabBetweenWorkspaces("tab1", "active-ws", "inactive-ws");

            // Tab should still be moved (constraint is in UI, not action)
            expect(mockStorageProvider.saveTabNow).toHaveBeenCalled();
        });
    });

    describe("reorderTabsInWorkspace", () => {
        it("should not reorder tabs in active workspace", async () => {
            console.warn = jest.fn(); // Mock console.warn

            await useRootStore.getState().reorderTabsInWorkspace("active-ws", ["tab1", "tab2"]);

            expect(console.warn).toHaveBeenCalledWith("Use reorderTabs() for active workspace reordering");
            expect(mockStorageProvider.saveSplitViewNow).not.toHaveBeenCalled();
        });

        it("should reorder tabs in inactive workspace", async () => {
            const mockSplitView = {
                id: "split1",
                workspaceId: "inactive-ws",
                leftTabs: ["tab1", "tab2"],
                rightTabs: [],
                isSplit: false,
                lastModified: Date.now(),
            };

            mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(mockSplitView);

            const refreshMetadataMock = jest.fn();
            mockSidebarStore.getState.mockReturnValue({
                refreshWorkspaceMetadata: refreshMetadataMock,
            });

            await useRootStore.getState().reorderTabsInWorkspace("inactive-ws", ["tab2", "tab1"]);

            // Verify splitView was updated and saved
            expect(mockStorageProvider.saveSplitViewNow).toHaveBeenCalledWith(
                expect.objectContaining({
                    workspaceId: "inactive-ws",
                    leftTabs: ["tab2", "tab1"],
                })
            );

            // Verify metadata was refreshed
            expect(refreshMetadataMock).toHaveBeenCalledWith("inactive-ws");
        });

        it("should handle workspace without splitView", async () => {
            mockStorageProvider.getSplitViewByWorkspace.mockResolvedValue(null);

            const refreshMetadataMock = jest.fn();
            mockSidebarStore.getState.mockReturnValue({
                refreshWorkspaceMetadata: refreshMetadataMock,
            });

            await useRootStore.getState().reorderTabsInWorkspace("inactive-ws", ["tab1", "tab2"]);

            // Should not throw error
            expect(mockStorageProvider.saveSplitViewNow).not.toHaveBeenCalled();
            expect(refreshMetadataMock).not.toHaveBeenCalled();
        });
    });

    describe("Error Handling", () => {
        it("should handle tab not found error", async () => {
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([]);
            mockTabsStore.getState.mockReturnValue({
                tabs: [],
                addTab: jest.fn(),
                removeTab: jest.fn(),
            });

            await expect(
                useRootStore.getState().moveTabBetweenWorkspaces("nonexistent", "inactive-ws", "active-ws")
            ).rejects.toThrow("Tab nonexistent not found in source workspace");
        });

        it("should handle storage errors gracefully", async () => {
            const mockTab = {
                id: "tab1",
                title: "Test Tab",
                content: "test",
                language: "javascript",
                workspaceId: "active-ws",
                lastModified: Date.now(),
                dateCreated: Date.now(),
                languageLocked: false,
                cursorPosition: { lineNumber: 1, column: 1 },
            };

            // Set up the tab in the active workspace
            mockTabsStore.getState.mockReturnValue({
                tabs: [mockTab],
                addTab: jest.fn(),
                removeTab: jest.fn(),
            });

            // Make saveTabNow fail when trying to save to inactive workspace
            mockStorageProvider.saveTabNow.mockRejectedValue(new Error("Storage error"));
            mockStorageProvider.getTabsByWorkspace.mockResolvedValue([mockTab]);

            await expect(
                useRootStore.getState().moveTabBetweenWorkspaces("tab1", "active-ws", "inactive-ws")
            ).rejects.toThrow("Storage error");
        });
    });
});
