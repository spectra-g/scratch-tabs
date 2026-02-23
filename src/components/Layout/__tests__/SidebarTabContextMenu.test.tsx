import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SidebarTabContextMenu } from "../SidebarTabContextMenu";
import { useRootStore } from "../../../stores/rootStore";
import { useWorkspaceStore } from "../../../stores/workspaceStore";
import { useTabsStore } from "../../../stores/tabsStore";
import { useSidebarStore } from "../../../stores/sidebarStore";

// Mock stores
jest.mock("../../../stores/rootStore");
jest.mock("../../../stores/workspaceStore");
jest.mock("../../../stores/tabsStore");
jest.mock("../../../stores/sidebarStore");
jest.mock("../../../hooks/useClickOutside", () => ({
    useClickOutside: jest.fn(),
}));

const mockUseRootStore = useRootStore as jest.MockedFunction<typeof useRootStore>;
const mockUseWorkspaceStore = useWorkspaceStore as jest.MockedFunction<typeof useWorkspaceStore>;
const mockUseTabsStore = useTabsStore as jest.MockedFunction<typeof useTabsStore>;
const mockUseSidebarStore = useSidebarStore as jest.MockedFunction<typeof useSidebarStore>;

describe("SidebarTabContextMenu", () => {
    const mockRemoveTab = jest.fn();
    const mockToggleTabPin = jest.fn();
    const mockDuplicateTab = jest.fn();
    const mockUpdateTabTitle = jest.fn();
    const mockSetEditingId = jest.fn();
    const mockOnClose = jest.fn();

    const mockTab = {
        id: "tab-1",
        title: "Test Tab",
        content: "test content",
        language: "typescript",
        languageLocked: false,
        cursorPosition: { line: 1, column: 1 },
        isPinned: false,
        dateCreated: Date.now(),
        lastModified: Date.now(),
        workspaceId: "ws-1",
    };

    const mockWorkspace = {
        id: "ws-1",
        name: "Test Workspace",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        links: [],
    };

    const mockOtherWorkspace = {
        id: "ws-2",
        name: "Other Workspace",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        links: [],
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockUseRootStore.mockReturnValue({
            removeTab: mockRemoveTab,
            toggleTabPin: mockToggleTabPin,
            duplicateTab: mockDuplicateTab,
            updateTabTitle: mockUpdateTabTitle,
        } as any);

        mockUseWorkspaceStore.mockReturnValue({
            activeWorkspaceId: "ws-1",
            workspaces: [mockWorkspace, mockOtherWorkspace],
        } as any);

        mockUseTabsStore.mockReturnValue({
            tabs: [mockTab],
        } as any);

        mockUseSidebarStore.mockReturnValue({
            workspaceTabsMetadata: new Map(),
            setEditingId: mockSetEditingId,
        } as any);
    });

    describe("Rendering", () => {
        it("should render all menu items for active workspace", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            expect(screen.getByText("Rename")).toBeInTheDocument();
            expect(screen.getByText("Duplicate")).toBeInTheDocument();
            expect(screen.getByText("Pin")).toBeInTheDocument();
            expect(screen.getByText("Move to Workspace")).toBeInTheDocument();
            expect(screen.getByText("Close")).toBeInTheDocument();
        });

        it("should render at the correct position", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 150, y: 200 }}
                    onClose={mockOnClose}
                />
            );

            // Menu is now portaled to document.body with fixed positioning
            const menu = document.querySelector(".fixed.bg-surface");
            expect(menu).toHaveStyle({ top: "200px", left: "150px" });
        });
    });

    describe("Rename Action", () => {
        it("should call setEditingId and onClose when Rename is clicked", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename"));

            expect(mockSetEditingId).toHaveBeenCalledWith(mockTab.id, mockTab.title);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe("Duplicate Action", () => {
        it("should call duplicateTab when Duplicate is clicked", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Duplicate"));

            expect(mockDuplicateTab).toHaveBeenCalledWith(mockTab.id, false);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe("Pin Action", () => {
        it("should call toggleTabPin when Pin is clicked", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Pin"));

            expect(mockToggleTabPin).toHaveBeenCalledWith(mockTab.id);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe("Move to Workspace", () => {
        it("should show submenu with other workspaces", async () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            const moveToWorkspaceItem = screen.getByText("Move to Workspace");
            fireEvent.mouseEnter(moveToWorkspaceItem.closest("div")!);

            // Wait for submenu to appear
            await waitFor(() => {
                expect(screen.getByText("Other Workspace")).toBeInTheDocument();
            });
        });

        it("should disable Move to Workspace when no other workspaces exist", () => {
            mockUseWorkspaceStore.mockReturnValue({
                activeWorkspaceId: "ws-1",
                workspaces: [mockWorkspace],
            } as any);

            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            const moveToWorkspaceButton = screen.getByText("Move to Workspace").closest("button");
            expect(moveToWorkspaceButton).toBeDisabled();
        });
    });

    describe("Close Action", () => {
        it("should show confirmation dialog when Close is clicked", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Close"));

            expect(screen.getByText(/are you sure you want to close this tab/i)).toBeInTheDocument();
        });

        it("should call removeTab when confirmed", async () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Close"));

            const closeButton = screen.getByRole("button", { name: /close/i });
            fireEvent.click(closeButton);

            await waitFor(() => {
                expect(mockRemoveTab).toHaveBeenCalledWith(mockTab.id);
                expect(mockOnClose).toHaveBeenCalled();
            });
        });

        it("should not close when cancelled", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Close"));

            const cancelButton = screen.getByRole("button", { name: /cancel/i });
            fireEvent.click(cancelButton);

            expect(mockRemoveTab).not.toHaveBeenCalled();
        });
    });

    describe("Inactive Workspace Tab", () => {
        it("should call setEditingId with title from metadata for inactive workspace", () => {
            const metadata = new Map([
                ["ws-2", [{ id: "tab-2", title: "Inactive Tab", language: "javascript", lastModified: Date.now(), workspaceId: "ws-2" }]]
            ]);

            mockUseSidebarStore.mockReturnValue({
                workspaceTabsMetadata: metadata,
                setEditingId: mockSetEditingId,
            } as any);

            render(
                <SidebarTabContextMenu
                    tabId="tab-2"
                    workspaceId="ws-2"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename"));

            expect(mockSetEditingId).toHaveBeenCalledWith("tab-2", "Inactive Tab");
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe("Menu Visibility", () => {
        it("should hide menu when confirmation dialog is open", () => {
            render(
                <SidebarTabContextMenu
                    tabId={mockTab.id}
                    workspaceId="ws-1"
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Close"));

            // Menu is now portaled to document.body
            const menu = document.querySelector(".fixed.bg-surface.rounded.shadow-lg");
            expect(menu).not.toBeInTheDocument();
        });
    });
});
