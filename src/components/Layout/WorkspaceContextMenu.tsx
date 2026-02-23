import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../../hooks/useClickOutside";
import { ContextMenuItem } from "../Tab/ContextMenuItem";
import { MenuItem } from "../Tab/types";
import {
    Plus,
    Edit,
    Trash2
} from "../Icons";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { ConfirmationDialog } from "../Tab/ConfirmationDialog";

interface WorkspaceContextMenuProps {
    workspaceId: string;
    position: { x: number; y: number };
    onClose: () => void;
}

export const WorkspaceContextMenu: React.FC<WorkspaceContextMenuProps> = ({
    workspaceId,
    position,
    onClose
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { workspaces, deleteWorkspace } = useWorkspaceStore();
    const { setEditingId } = useSidebarStore();
    const [confirmDelete, setConfirmDelete] = useState(false);

    const workspace = workspaces.find(w => w.id === workspaceId);

    useClickOutside(menuRef, () => {
        if (!confirmDelete) {
            onClose();
        }
    });

    const handleNewTab = async () => {
        const { activeWorkspaceId, switchWorkspace } = useWorkspaceStore.getState();

        // If clicking on an inactive workspace, switch to it first
        if (workspaceId !== activeWorkspaceId) {
            await switchWorkspace(workspaceId);
        }

        // Import rootStore and create a new tab
        const { useRootStore } = await import("../../stores/rootStore");
        const newId = await useRootStore.getState().handleNewTab(false);

        if (newId) {
            setEditingId(newId, "");
        }

        onClose();
    };

    const handleRename = () => {
        if (workspace) {
            setEditingId(workspaceId, workspace.name);
            onClose();
        }
    };


    const handleDelete = () => {
        setConfirmDelete(true);
        // Don't call onClose() here - keep component mounted for dialog
    };

    const handleDeleteConfirm = () => {
        deleteWorkspace(workspaceId);
        setConfirmDelete(false);
        onClose();
    };

    const handleDeleteCancel = () => {
        setConfirmDelete(false);
        onClose();
    };

    const menuItems: MenuItem[] = [
        {
            id: "new-tab",
            label: "New Tab",
            icon: Plus,
            action: handleNewTab,
        },
        {
            id: "separator-1",
            isSeparator: true,
        },
        {
            id: "rename",
            label: "Rename Workspace",
            icon: Edit,
            action: handleRename,
        },
        {
            id: "separator-2",
            isSeparator: true,
        },
        {
            id: "delete",
            label: "Delete Workspace",
            icon: Trash2,
            action: handleDelete,
        },
    ];

    return (
        <>
            {!confirmDelete && createPortal(
                <div
                    ref={menuRef}
                    data-testid="workspace-context-menu"
                    className="fixed bg-surface border border-base rounded shadow-lg z-[100] py-1"
                    style={{
                        top: `${position.y}px`,
                        left: `${position.x}px`,
                        minWidth: "200px",
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {menuItems.map((item) => {
                        if (item.isSeparator) {
                            return (
                                <div
                                    key={item.id}
                                    className="border-t border-base my-1 mx-1"
                                ></div>
                            );
                        }
                        return <ContextMenuItem key={item.id} item={item} />;
                    })}
                </div>,
                document.body
            )}

            {confirmDelete && workspace && (
                <ConfirmationDialog
                    isOpen={confirmDelete}
                    message={`Are you sure you want to delete workspace "${workspace.name}"? All tabs in this workspace will be deleted.`}
                    confirmButtonText="Delete"
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                />
            )}
        </>
    );
};
