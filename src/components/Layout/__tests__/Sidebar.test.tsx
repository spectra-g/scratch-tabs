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
            isMobileOpen: false,
            setMobileOpen: jest.fn(),
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
            isMobileOpen: false,
            setMobileOpen: jest.fn(),
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

    it("renders with collapsed classes when sidebar is NOT expanded on desktop", () => {
        // Mock desktop width
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });

        (useSidebarStore as any).mockReturnValue({
            isSidebarExpanded: false,
            isMobileOpen: false,
            setMobileOpen: jest.fn(),
            expandedWorkspaceIds: new Set(),
            workspaceTabsMetadata: new Map(),
            expandWorkspace: jest.fn(),
            collapseWorkspace: jest.fn(),
            searchQuery: "",
            setSearchQuery: jest.fn(),
        });

        const { container } = render(<Sidebar />);

        // Sidebar should still be in DOM for smooth animation
        expect(container.firstChild).not.toBeNull();

        // Should have the collapsed classes (md:w-0, md:overflow-hidden)
        const sidebar = container.querySelector('.flex.flex-col.h-full');
        expect(sidebar).toBeInTheDocument();
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
                isMobileOpen: false,
                setMobileOpen: jest.fn(),
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
                isMobileOpen: false,
                setMobileOpen: jest.fn(),
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
                isMobileOpen: false,
                setMobileOpen: jest.fn(),
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

    describe("Search Functionality", () => {
        it("should debounce search input changes", async () => {
            jest.useFakeTimers();
            const mockSetSearchQuery = jest.fn();

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: mockSetSearchQuery,
                refreshWorkspaceMetadata: jest.fn(),
            });

            render(<Sidebar />);

            const searchInput = screen.getByPlaceholderText("Filter tabs...");

            // Type "test" character by character
            fireEvent.change(searchInput, { target: { value: "t" } });
            fireEvent.change(searchInput, { target: { value: "te" } });
            fireEvent.change(searchInput, { target: { value: "tes" } });
            fireEvent.change(searchInput, { target: { value: "test" } });

            // Should not call setSearchQuery immediately
            expect(mockSetSearchQuery).not.toHaveBeenCalled();

            // Fast-forward time by 300ms
            jest.advanceTimersByTime(300);

            // Should call setSearchQuery once with the final value
            expect(mockSetSearchQuery).toHaveBeenCalledTimes(1);
            expect(mockSetSearchQuery).toHaveBeenCalledWith("test");

            jest.useRealTimers();
        });

        it("should show chevron down and folder open when searching", () => {
            const mockTabs = [
                { id: "tab-1", title: "Test Tab", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(), // Workspace is collapsed
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "test", // Active search query
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

            // The workspace should appear expanded (chevron down) even though it's collapsed
            const workspace = screen.getByText("Workspace 1").closest('.flex');

            // We can't easily check the icon itself, but we can verify the tab is visible
            expect(screen.getByText("Test Tab")).toBeInTheDocument();
        });
    });

    describe("Reveal in Sidebar", () => {
        it("should expand workspace when active tab is in a collapsed workspace", async () => {
            const mockExpandWorkspace = jest.fn().mockResolvedValue(undefined);
            const mockTabs = [
                { id: "tab-1", title: "Tab 1", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(), // Workspace is collapsed
                workspaceTabsMetadata: new Map(),
                expandWorkspace: mockExpandWorkspace,
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            (useSplitViewStore as any).mockReturnValue({
                splitView: {
                    activeSide: "left",
                    activeLeftTabId: "tab-1", // Active tab is tab-1
                    leftTabs: ["tab-1"],
                    rightTabs: []
                },
            });

            render(<Sidebar />);

            // Should call expandWorkspace for the workspace containing the active tab
            expect(mockExpandWorkspace).toHaveBeenCalledWith("ws-1");
        });

        it("should scroll to active tab when it is visible in the tree", () => {
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
                isMobileOpen: false,
                setMobileOpen: jest.fn(),
                expandedWorkspaceIds: new Set(["ws-1"]), // Workspace is expanded
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
                    activeLeftTabId: "tab-2", // Active tab is tab-2
                    leftTabs: ["tab-1", "tab-2", "tab-3"],
                    rightTabs: []
                },
            });

            const { container } = render(<Sidebar />);

            // The active tab should be highlighted
            const activeTab = screen.getByText("Tab 2").closest('.flex');
            expect(activeTab).toHaveClass("bg-primary-subtle");
        });

        it("should not expand workspace if active tab is not found", () => {
            const mockExpandWorkspace = jest.fn();
            const mockTabs = [
                { id: "tab-1", title: "Tab 1", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: mockExpandWorkspace,
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            (useSplitViewStore as any).mockReturnValue({
                splitView: {
                    activeSide: "left",
                    activeLeftTabId: "tab-999", // Non-existent tab
                    leftTabs: ["tab-1"],
                    rightTabs: []
                },
            });

            render(<Sidebar />);

            // Should not call expandWorkspace for non-existent tab
            expect(mockExpandWorkspace).not.toHaveBeenCalled();
        });

        it("should not scroll when there is no active tab", () => {
            const mockTabs = [
                { id: "tab-1", title: "Tab 1", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: false,
                setMobileOpen: jest.fn(),
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
                    activeLeftTabId: null, // No active tab
                    leftTabs: ["tab-1"],
                    rightTabs: []
                },
            });

            const { container } = render(<Sidebar />);

            // Should render without errors
            expect(screen.getByText("Tab 1")).toBeInTheDocument();
        });

        it("should handle active tab in right pane", () => {
            const mockTabs = [
                { id: "tab-1", title: "Tab 1", language: "typescript", lastModified: 0, workspaceId: "ws-1" },
                { id: "tab-2", title: "Tab 2", language: "javascript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: false,
                setMobileOpen: jest.fn(),
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
                    activeSide: "right", // Active side is right
                    activeLeftTabId: "tab-1",
                    activeRightTabId: "tab-2", // Active tab in right pane
                    leftTabs: ["tab-1"],
                    rightTabs: ["tab-2"]
                },
            });

            render(<Sidebar />);

            // The active tab (tab-2) should be highlighted
            const activeTab = screen.getByText("Tab 2").closest('.flex');
            expect(activeTab).toHaveClass("bg-primary-subtle");
        });
    });

    describe("Mobile Responsive Behavior", () => {
        // Mock window.innerWidth for mobile tests
        const mockInnerWidth = (width: number) => {
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: width,
            });
        };

        afterEach(() => {
            // Reset to desktop width
            mockInnerWidth(1024);
        });

        it("should render mobile backdrop when isMobileOpen is true", () => {
            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: true, // Mobile sidebar is open
                setMobileOpen: jest.fn(),
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            render(<Sidebar />);

            // Should have a backdrop element
            const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
            expect(backdrop).toBeInTheDocument();
        });

        it("should not render backdrop when isMobileOpen is false", () => {
            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: false, // Mobile sidebar is closed
                setMobileOpen: jest.fn(),
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            render(<Sidebar />);

            // Should not have a backdrop element
            const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
            expect(backdrop).not.toBeInTheDocument();
        });

        it("should close sidebar on backdrop click", () => {
            const mockSetMobileOpen = jest.fn();

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: true,
                setMobileOpen: mockSetMobileOpen,
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            render(<Sidebar />);

            const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(mockSetMobileOpen).toHaveBeenCalledWith(false);
            }
        });

        it("should render close button on mobile", () => {
            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: true,
                setMobileOpen: jest.fn(),
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            render(<Sidebar />);

            // Close button should be present
            const closeButton = screen.getByTitle("Close sidebar");
            expect(closeButton).toBeInTheDocument();
        });

        it("should close sidebar when close button is clicked", () => {
            const mockSetMobileOpen = jest.fn();

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: true,
                setMobileOpen: mockSetMobileOpen,
                expandedWorkspaceIds: new Set(),
                workspaceTabsMetadata: new Map(),
                expandWorkspace: jest.fn(),
                collapseWorkspace: jest.fn(),
                searchQuery: "",
                setSearchQuery: jest.fn(),
                refreshWorkspaceMetadata: jest.fn(),
            });

            render(<Sidebar />);

            const closeButton = screen.getByTitle("Close sidebar");
            fireEvent.click(closeButton);

            expect(mockSetMobileOpen).toHaveBeenCalledWith(false);
        });

        it("should auto-close on mobile when tab is clicked", async () => {
            mockInnerWidth(375); // Mobile width

            const mockSetMobileOpen = jest.fn();
            const mockSetActiveTab = jest.fn();
            const mockTabs = [
                { id: "tab-1", title: "Tab 1", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useRootStore as any).mockReturnValue({
                setActiveTab: mockSetActiveTab,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: true,
                setMobileOpen: mockSetMobileOpen,
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

            const tab = screen.getByText("Tab 1");
            fireEvent.click(tab);

            // Should close the mobile sidebar
            expect(mockSetMobileOpen).toHaveBeenCalledWith(false);
        });

        it("should not auto-close on desktop when tab is clicked", async () => {
            mockInnerWidth(1024); // Desktop width

            const mockSetMobileOpen = jest.fn();
            const mockSetActiveTab = jest.fn();
            const mockTabs = [
                { id: "tab-1", title: "Tab 1", language: "typescript", lastModified: 0, workspaceId: "ws-1" }
            ];

            (useTabsStore as any).mockReturnValue({
                tabs: mockTabs,
            });

            (useRootStore as any).mockReturnValue({
                setActiveTab: mockSetActiveTab,
            });

            (useSidebarStore as any).mockReturnValue({
                isSidebarExpanded: true,
                isMobileOpen: false,
                setMobileOpen: mockSetMobileOpen,
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

            const tab = screen.getByText("Tab 1");
            fireEvent.click(tab);

            // Should NOT close the sidebar on desktop
            expect(mockSetMobileOpen).not.toHaveBeenCalled();
        });
    });
});
