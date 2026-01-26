import { StorageProviderFactory } from "../../db";
import { Workspace } from "../../types";

// Mock storage before anything else
const mockStorage = {
    getWorkspaces: jest.fn(),
    saveWorkspace: jest.fn().mockResolvedValue(undefined),
    getTabsByWorkspace: jest.fn().mockResolvedValue([]),
    getSplitViewByWorkspace: jest.fn().mockResolvedValue(null),
};

jest.mock("../../db", () => ({
    StorageProviderFactory: {
        getProvider: jest.fn(() => mockStorage),
    },
    db: {
        transaction: jest.fn(),
    },
}));

jest.mock("../broadcastStore", () => ({
    broadcastManager: {
        broadcastWorkspaceList: jest.fn(),
    },
}));

describe("WorkspaceStore Reordering", () => {
    let useWorkspaceStore: any;
    let broadcastManager: any;

    beforeEach(async () => {
        jest.clearAllMocks();

        // Reset modules to ensure store is re-initialized with mocked storage
        jest.resetModules();
        const storeModule = await import("../workspaceStore");
        useWorkspaceStore = storeModule.useWorkspaceStore;
        const broadcastModule = await import("../broadcastStore");
        broadcastManager = broadcastModule.broadcastManager;

        // Reset store state
        useWorkspaceStore.setState({
            workspaces: [],
            activeWorkspaceId: null,
            error: null,
        });
    });

    it("should reorder workspaces and update displayOrder", async () => {
        const initialWorkspaces: Workspace[] = [
            { id: "ws-1", name: "Workspace 1", createdAt: 100, lastAccessed: 100, links: [], displayOrder: 0 },
            { id: "ws-2", name: "Workspace 2", createdAt: 200, lastAccessed: 200, links: [], displayOrder: 1 },
            { id: "ws-3", name: "Workspace 3", createdAt: 300, lastAccessed: 300, links: [], displayOrder: 2 },
        ];

        useWorkspaceStore.setState({ workspaces: initialWorkspaces });

        const newOrder = ["ws-3", "ws-1", "ws-2"];
        await useWorkspaceStore.getState().reorderWorkspaces(newOrder);

        const updatedWorkspaces = useWorkspaceStore.getState().workspaces;

        // Verify order in state
        expect(updatedWorkspaces[0].id).toBe("ws-3");
        expect(updatedWorkspaces[1].id).toBe("ws-1");
        expect(updatedWorkspaces[2].id).toBe("ws-2");

        // Verify displayOrder values
        expect(updatedWorkspaces[0].displayOrder).toBe(0);
        expect(updatedWorkspaces[1].displayOrder).toBe(1);
        expect(updatedWorkspaces[2].displayOrder).toBe(2);

        // Verify persistence
        expect(mockStorage.saveWorkspace).toHaveBeenCalledTimes(3);

        // Verify broadcasting
        expect(broadcastManager.broadcastWorkspaceList).toHaveBeenCalledWith(updatedWorkspaces);
    });
});
