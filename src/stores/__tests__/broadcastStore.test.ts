// Mock dependencies before imports
const mockUseSidebarStore = {
    getState: jest.fn(() => ({
        handleMetadataUpdate: jest.fn(),
    })),
};

jest.mock("../sidebarStore", () => ({
    useSidebarStore: mockUseSidebarStore,
}));

const mockUseTabsStore = {
    setState: jest.fn(),
    getState: jest.fn(() => ({ tabs: [] })),
};

jest.mock("../tabsStore", () => ({
    useTabsStore: mockUseTabsStore,
}));

const mockUseSplitViewStore = {
    setState: jest.fn(),
    getState: jest.fn(() => ({
        splitView: {
            isSplit: false,
            leftTabs: [],
            rightTabs: [],
            activeLeftTabId: null,
            activeRightTabId: null,
            leftTabHistory: [],
            rightTabHistory: [],
        },
        createDefaultSplitViewState: jest.fn(),
    })),
};

jest.mock("../splitViewStore", () => ({
    useSplitViewStore: mockUseSplitViewStore,
}));

const mockUseWorkspaceStore = {
    setState: jest.fn(),
    getState: jest.fn(() => ({
        workspaces: [],
        activeWorkspaceId: "active-ws",
        switchWorkspace: jest.fn(),
        ensureWorkspace: jest.fn(),
    })),
};

jest.mock("../workspaceStore", () => ({
    useWorkspaceStore: mockUseWorkspaceStore,
}));

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// Test the broadcast functionality by directly testing the message type definition
// and the broadcastWorkspaceTabsMetadata method
describe("BroadcastStore", () => {
    let mockChannel: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a fresh mock channel
        mockChannel = {
            postMessage: jest.fn(),
            close: jest.fn(),
            onmessage: null,
        };

        // Mock BroadcastChannel constructor to return our mock
        (global as any).BroadcastChannel = jest.fn(() => mockChannel);
    });

    describe("broadcastWorkspaceTabsMetadata", () => {
        it("should send WORKSPACE_TABS_METADATA_UPDATED message with correct payload", async () => {
            // Import fresh to get a new instance with our mocked BroadcastChannel
            jest.resetModules();
            const { broadcastManager } = await import("../broadcastStore");

            const workspaceId = "ws-123";
            const tabsMetadata = [
                { id: "t1", title: "Tab 1", language: "typescript", lastModified: 100, workspaceId },
                { id: "t2", title: "Tab 2", language: "javascript", lastModified: 200, workspaceId },
            ];

            broadcastManager.broadcastWorkspaceTabsMetadata(workspaceId, tabsMetadata);

            expect(mockChannel.postMessage).toHaveBeenCalledWith({
                type: "WORKSPACE_TABS_METADATA_UPDATED",
                payload: {
                    workspaceId,
                    tabsMetadata,
                },
            });
        });

        it("should broadcast empty metadata array", async () => {
            jest.resetModules();
            const { broadcastManager } = await import("../broadcastStore");

            const workspaceId = "ws-empty";
            const tabsMetadata: any[] = [];

            broadcastManager.broadcastWorkspaceTabsMetadata(workspaceId, tabsMetadata);

            expect(mockChannel.postMessage).toHaveBeenCalledWith({
                type: "WORKSPACE_TABS_METADATA_UPDATED",
                payload: {
                    workspaceId,
                    tabsMetadata: [],
                },
            });
        });
    });

    describe("WORKSPACE_TABS_METADATA_UPDATED message handling", () => {
        it("should call handleMetadataUpdate when receiving broadcast message", async () => {
            jest.resetModules();

            const mockHandleMetadataUpdate = jest.fn();
            mockUseSidebarStore.getState = jest.fn(() => ({
                handleMetadataUpdate: mockHandleMetadataUpdate,
            }));

            const { broadcastManager } = await import("../broadcastStore");

            const workspaceId = "ws-broadcast";
            const tabsMetadata = [
                { id: "t1", title: "Tab 1", language: "rust", lastModified: 150, workspaceId },
            ];

            // Simulate receiving a broadcast message
            const messageEvent = {
                data: {
                    type: "WORKSPACE_TABS_METADATA_UPDATED",
                    payload: {
                        workspaceId,
                        tabsMetadata,
                    },
                },
            };

            // Trigger the onmessage handler
            if (mockChannel.onmessage) {
                await mockChannel.onmessage(messageEvent);
            }

            // The handler uses dynamic import, so we need to give it time
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(mockHandleMetadataUpdate).toHaveBeenCalledWith(workspaceId, tabsMetadata);
        });
    });
});
