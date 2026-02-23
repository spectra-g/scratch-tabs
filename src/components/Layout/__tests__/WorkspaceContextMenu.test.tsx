import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceContextMenu } from "../WorkspaceContextMenu";
import { useWorkspaceStore } from "../../../stores/workspaceStore";
import { useRootStore } from "../../../stores/rootStore";
import { useSidebarStore } from "../../../stores/sidebarStore";

// Mock stores
jest.mock("../../../stores/workspaceStore");
jest.mock("../../../stores/sidebarStore");
jest.mock("../../../hooks/useClickOutside", () => ({
    useClickOutside: jest.fn(),
}));
jest.mock("../../../stores/rootStore");

const mockUseWorkspaceStore = useWorkspaceStore as jest.MockedFunction<typeof useWorkspaceStore>;
const mockUseSidebarStore = useSidebarStore as jest.MockedFunction<typeof useSidebarStore>;

describe("WorkspaceContextMenu", () => {
    const mockCreateWorkspace = jest.fn();
    const mockRenameWorkspace = jest.fn();
    const mockDeleteWorkspace = jest.fn();
    const mockSetEditingId = jest.fn();
    const mockOnClose = jest.fn();

    const mockWorkspace = {
        id: "ws-1",
        name: "Test Workspace",
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        links: [],
    };

    const mockSwitchWorkspace = jest.fn();
    const mockHandleNewTab = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        const mockState = {
            workspaces: [mockWorkspace],
            createWorkspace: mockCreateWorkspace,
            renameWorkspace: mockRenameWorkspace,
            deleteWorkspace: mockDeleteWorkspace,
            activeWorkspaceId: "ws-1",
            isLoading: false,
            error: null,
            loadWorkspaces: jest.fn(),
            switchWorkspace: mockSwitchWorkspace,
            updateWorkspaceNotes: jest.fn(),
            addWorkspaceLink: jest.fn(),
            removeWorkspaceLink: jest.fn(),
            getActiveWorkspace: jest.fn(),
        };

        mockUseWorkspaceStore.mockReturnValue(mockState);
        // Mock getState for non-hook usage
        (useWorkspaceStore as any).getState = jest.fn().mockReturnValue(mockState);

        mockUseSidebarStore.mockReturnValue({
            setEditingId: mockSetEditingId,
        } as any);

        // Mock RootStore
        (useRootStore as any).getState = jest.fn().mockReturnValue({
            handleNewTab: mockHandleNewTab,
        });
    });

    describe("Rendering", () => {
        it("should render all menu items", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            expect(screen.getByText("New Tab")).toBeInTheDocument();
            expect(screen.getByText("Rename Workspace")).toBeInTheDocument();
            expect(screen.getByText("Delete Workspace")).toBeInTheDocument();
        });

        it("should render at the correct position", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 150, y: 200 }}
                    onClose={mockOnClose}
                />
            );

            // Menu is now portaled to document.body with fixed positioning
            const menu = document.querySelector(".fixed.bg-surface");
            expect(menu).toHaveStyle({ top: "200px", left: "150px" });
        });
    });

    describe("New Tab Action", () => {
        it("should close menu when New Tab is clicked", async () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("New Tab"));

            await waitFor(() => {
                expect(mockHandleNewTab).toHaveBeenCalledWith(false);
                expect(mockOnClose).toHaveBeenCalled();
            });
        });
    });

    describe("Rename Workspace", () => {
        it("should call setEditingId and onClose when Rename is clicked", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            expect(mockSetEditingId).toHaveBeenCalledWith(mockWorkspace.id, mockWorkspace.name);
            expect(mockOnClose).toHaveBeenCalled();
        });
    });

    describe("Delete Workspace", () => {
        it("should show confirmation dialog when Delete is clicked", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Delete Workspace"));

            expect(screen.getByText(/are you sure you want to delete workspace/i)).toBeInTheDocument();
        });

        it("should call deleteWorkspace when confirmed", async () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Delete Workspace"));

            const deleteButton = screen.getByRole("button", { name: /delete/i });
            fireEvent.click(deleteButton);

            await waitFor(() => {
                expect(mockDeleteWorkspace).toHaveBeenCalledWith(mockWorkspace.id);
                expect(mockOnClose).toHaveBeenCalled();
            });
        });

        it("should not delete when cancelled", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Delete Workspace"));

            const cancelButton = screen.getByRole("button", { name: /cancel/i });
            fireEvent.click(cancelButton);

            expect(mockDeleteWorkspace).not.toHaveBeenCalled();
        });
    });

    describe("Menu Visibility", () => {
        it("should hide menu when delete confirmation is open", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Delete Workspace"));

            // Menu is now portaled to document.body
            const menu = document.querySelector(".fixed.bg-surface.rounded.shadow-lg");
            expect(menu).not.toBeInTheDocument();
        });
    });
});
