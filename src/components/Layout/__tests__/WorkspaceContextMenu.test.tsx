import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceContextMenu } from "../WorkspaceContextMenu";
import { useWorkspaceStore } from "../../../stores/workspaceStore";
import { useRootStore } from "../../../stores/rootStore";

// Mock stores
jest.mock("../../../stores/workspaceStore");
jest.mock("../../../hooks/useClickOutside", () => ({
    useClickOutside: jest.fn(),
}));
jest.mock("../../../stores/rootStore");

const mockUseWorkspaceStore = useWorkspaceStore as jest.MockedFunction<typeof useWorkspaceStore>;

describe("WorkspaceContextMenu", () => {
    const mockCreateWorkspace = jest.fn();
    const mockRenameWorkspace = jest.fn();
    const mockDeleteWorkspace = jest.fn();
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
        it("should open rename dialog when Rename is clicked", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            expect(screen.getByText("Rename Workspace")).toBeInTheDocument();
            expect(screen.getByPlaceholderText("Workspace name")).toBeInTheDocument();
        });

        it("should prepopulate input with current workspace name", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            const input = screen.getByPlaceholderText("Workspace name") as HTMLInputElement;
            expect(input.value).toBe(mockWorkspace.name);
        });

        it("should call renameWorkspace with new name when confirmed", async () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            const input = screen.getByPlaceholderText("Workspace name");
            fireEvent.change(input, { target: { value: "New Name" } });

            const renameButton = screen.getByRole("button", { name: /rename/i });
            fireEvent.click(renameButton);

            await waitFor(() => {
                expect(mockRenameWorkspace).toHaveBeenCalledWith(mockWorkspace.id, "New Name");
                expect(mockOnClose).toHaveBeenCalled();
            });
        });

        it("should not rename when name is empty", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            const input = screen.getByPlaceholderText("Workspace name");
            fireEvent.change(input, { target: { value: "" } });

            const renameButton = screen.getByRole("button", { name: /rename/i });
            expect(renameButton).toBeDisabled();
        });

        it("should cancel rename on Cancel button", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            const cancelButton = screen.getByRole("button", { name: /cancel/i });
            fireEvent.click(cancelButton);

            expect(mockRenameWorkspace).not.toHaveBeenCalled();
            expect(screen.queryByPlaceholderText("Workspace name")).not.toBeInTheDocument();
        });

        it("should rename on Enter key", async () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            const input = screen.getByPlaceholderText("Workspace name");
            fireEvent.change(input, { target: { value: "Enter Name" } });
            fireEvent.keyDown(input, { key: "Enter" });

            await waitFor(() => {
                expect(mockRenameWorkspace).toHaveBeenCalledWith(mockWorkspace.id, "Enter Name");
            });
        });

        it("should cancel on Escape key", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            const input = screen.getByPlaceholderText("Workspace name");
            fireEvent.keyDown(input, { key: "Escape" });

            expect(screen.queryByPlaceholderText("Workspace name")).not.toBeInTheDocument();
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
        it("should hide menu when rename dialog is open", () => {
            render(
                <WorkspaceContextMenu
                    workspaceId={mockWorkspace.id}
                    position={{ x: 100, y: 100 }}
                    onClose={mockOnClose}
                />
            );

            fireEvent.click(screen.getByText("Rename Workspace"));

            // Menu is now portaled to document.body
            const menu = document.querySelector(".fixed.bg-surface.rounded.shadow-lg");
            expect(menu).not.toBeInTheDocument();
        });

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
