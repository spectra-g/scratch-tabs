import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import { useWorkspaceStore } from "../../../stores/workspaceStore";
import { useTabsStore } from "../../../stores/tabsStore";
import { useRootStore } from "../../../stores/rootStore";
import { useSidebarStore } from "../../../stores/sidebarStore";
import { useSplitViewStore } from "../../../stores/splitViewStore";

// Mock stores
jest.mock("../../../stores/workspaceStore", () => ({
    useWorkspaceStore: jest.fn(),
}));
jest.mock("../../../stores/tabsStore", () => ({
    useTabsStore: jest.fn(),
}));
jest.mock("../../../stores/rootStore", () => ({
    useRootStore: jest.fn(),
}));
jest.mock("../../../stores/sidebarStore", () => ({
    useSidebarStore: jest.fn(),
}));
jest.mock("../../../stores/splitViewStore", () => ({
    useSplitViewStore: jest.fn(),
}));

// Mock ResizeObserver
beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
});

describe("Sidebar Component", () => {
    const mockWorkspaces = [
        { id: "ws-1", name: "Workspace 1", createdAt: 0, lastAccessed: 0, links: [] },
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        (useWorkspaceStore as any).mockReturnValue({
            workspaces: mockWorkspaces,
            activeWorkspaceId: "ws-1",
            switchWorkspace: jest.fn(),
            createWorkspace: jest.fn(),
        });

        (useTabsStore as any).mockReturnValue({
            tabs: [],
        });

        (useRootStore as any).mockReturnValue({
            setActiveTab: jest.fn(),
        });

        (useSidebarStore as any).mockReturnValue({
            isSidebarExpanded: true,
            expandedWorkspaceIds: new Set(),
            workspaceTabsMetadata: new Map(),
            expandWorkspace: jest.fn(),
            collapseWorkspace: jest.fn(),
            searchQuery: "",
            setSearchQuery: jest.fn(),
        });

        (useSplitViewStore as any).mockReturnValue({
            splitView: {
                activeSide: "left",
                activeLeftTabId: null,
                leftTabs: [],
                rightTabs: []
            },
        });
    });

    it("renders the explorer title", () => {
        render(<Sidebar />);
        expect(screen.getByText("Explorer")).toBeInTheDocument();
    });

    it("renders a search input", () => {
        render(<Sidebar />);
        expect(screen.getByPlaceholderText("Filter tabs...")).toBeInTheDocument();
    });

    it("renders workspace name", () => {
        render(<Sidebar />);
        expect(screen.getByText("Workspace 1")).toBeInTheDocument();
    });

    it("calls expandWorkspace when a collapsed workspace is clicked", () => {
        const expandWorkspace = jest.fn();
        (useSidebarStore as any).mockReturnValue({
            isSidebarExpanded: true,
            expandedWorkspaceIds: new Set(),
            workspaceTabsMetadata: new Map(),
            expandWorkspace,
            collapseWorkspace: jest.fn(),
            searchQuery: "",
            setSearchQuery: jest.fn(),
        });

        render(<Sidebar />);
        fireEvent.click(screen.getByText("Workspace 1"));
        expect(expandWorkspace).toHaveBeenCalledWith("ws-1");
    });

    it("returns null if sidebar is NOT expanded", () => {
        (useSidebarStore as any).mockReturnValue({
            isSidebarExpanded: false,
            expandedWorkspaceIds: new Set(),
            workspaceTabsMetadata: new Map(),
            expandWorkspace: jest.fn(),
            collapseWorkspace: jest.fn(),
            searchQuery: "",
            setSearchQuery: jest.fn(),
        });

        const { container } = render(<Sidebar />);
        expect(container.firstChild).toBeNull();
    });
});
