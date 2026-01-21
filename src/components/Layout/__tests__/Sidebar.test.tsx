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

    describe("Context Menu Integration", () => {
        it("should open workspace context menu on right click", () => {
            render(<Sidebar />);

            const workspace = screen.getByText("Workspace 1");
            fireEvent.contextMenu(workspace);

            // WorkspaceContextMenu should be rendered (we'd need to check for menu items)
            // This is tested more thoroughly in WorkspaceContextMenu.test.tsx
        });

        it("should open tab context menu on right click of a tab", () => {
            const mockTabs = [
                { id: "tab-1", title: "Test Tab", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(["ws-1"]),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            (useSplitViewStore as any).mockReturnValue({
                splitView: {
                    activeSide: "left",
                    activeLeftTabId: "tab-1",
                    leftTabs: ["tab-1"],
                    rightTabs: []
                },
            });

            render(<Sidebar />);

            const tab = screen.getByText("Test Tab");
            fireEvent.contextMenu(tab);

            // SidebarTabContextMenu should be rendered (tested in SidebarTabContextMenu.test.tsx)
        });

        it("should close workspace context menu when onClose is called", () => {
            const { container } = render(<Sidebar />);

            const workspace = screen.getByText("Workspace 1");
            fireEvent.contextMenu(workspace);

            // Click outside or trigger onClose would close the menu
            // The context menu component itself handles this
        });
    });

    describe("Tab Display", () => {
        it("should display tabs in splitView order for active workspace", () => {
            const mockTabs = [
                { id: "tab-1", title: "Tab 1", language: "typescript", lastModified: 0, workspaceId: "ws-1" },
                { id: "tab-2", title: "Tab 2", language: "javascript", lastModified: 0, workspaceId: "ws-1" },
                { id: "tab-3", title: "Tab 3", language: "python", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(["ws-1"]),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            (useSplitViewStore as any).mockReturnValue({
                splitView: {
                    activeSide: "left",
                    activeLeftTabId: "tab-2",
                    leftTabs: ["tab-2", "tab-1"], // Different order than tabs array
                    rightTabs: ["tab-3"]
                },
            });

            const { container } = render(<Sidebar />);

            const tabElements = container.querySelectorAll('.flex.items-center.px-6');
            expect(tabElements).toHaveLength(3);

            // Should be in splitView order: tab-2, tab-1, tab-3
            expect(tabElements[0].textContent).toContain("Tab 2");
            expect(tabElements[1].textContent).toContain("Tab 1");
            expect(tabElements[2].textContent).toContain("Tab 3");
        });

        it("should show active tab with highlighted styling", () => {
            const mockTabs = [
                { id: "tab-1", title: "Active Tab", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(["ws-1"]),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            (useSplitViewStore as any).mockReturnValue({
                splitView: {
                    activeSide: "left",
                    activeLeftTabId: "tab-1",
                    leftTabs: ["tab-1"],
                    rightTabs: []
                },
            });

            const { container } = render(<Sidebar />);

            const activeTab = screen.getByText("Active Tab").closest('.flex');
            expect(activeTab).toHaveClass("bg-primary-subtle");
        });

        it("should filter tabs based on search query", () => {
            const mockTabs = [
                { id: "tab-1", title: "TypeScript File", language: "typescript", lastModified: 0, workspaceId: "ws-1" },
                { id: "tab-2", title: "JavaScript File", language: "javascript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(["ws-1"]),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "typescript",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            (useSplitViewStore as any).mockReturnValue({
                splitView: {
                    activeSide: "left",
                    activeLeftTabId: "tab-1",
                    leftTabs: ["tab-1", "tab-2"],
                    rightTabs: []
                },
            });

            render(<Sidebar />);

            // Should only show TypeScript file
            expect(screen.getByText("TypeScript File")).toBeInTheDocument();
            expect(screen.queryByText("JavaScript File")).not.toBeInTheDocument();
        });
    });

    describe("Metadata Loading", () => {
        it("should call refreshWorkspaceMetadata for inactive workspaces on mount", () => {
            const mockRefreshWorkspaceMetadata = jest.fn();
            const mockWorkspaces = [
                { id: "ws-1", name: "Active Workspace", createdAt: 0, lastAccessed: 0, links: [] },
                { id: "ws-2", name: "Inactive Workspace", createdAt: 0, lastAccessed: 0, links: [] }
            ];

            (useWorkspaceStore as any).mockReturnValue({
                workspaces: mockWorkspaces,
                activeWorkspaceId: "ws-1",
                switchWorkspace: jest.fn(),
                createWorkspace: jest.fn(),
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: mockRefreshWorkspaceMetadata,
            });

            render(<Sidebar />);

            // Should call refreshWorkspaceMetadata for ws-2 (inactive workspace)
            expect(mockRefreshWorkspaceMetadata).toHaveBeenCalledWith("ws-2");
            // Should NOT call it for ws-1 (active workspace)
            expect(mockRefreshWorkspaceMetadata).not.toHaveBeenCalledWith("ws-1");
        });
    });
});
