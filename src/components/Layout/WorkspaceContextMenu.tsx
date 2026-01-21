import React, { useRef, useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { ContextMenuItem } from "../Tab/ContextMenuItem";
import { MenuItem } from "../Tab/types";
import {
    Plus,
    Edit,
    Trash2,
    Copy,
    FolderOpen
} from "../Icons";
import { useWorkspaceStore } from "../../stores/workspaceStore";
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
    const { workspaces, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspaceStore();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");

    const workspace = workspaces.find(w => w.id === workspaceId);

    useClickOutside(menuRef, () => {
        if (!confirmDelete && !renameDialogOpen) {
            onClose();
        }
    });

    const handleNewTab = () => {
        // TODO: Will be implemented when we add tab creation from sidebar
        console.log("New tab in workspace:", workspaceId);
        onClose();
    };

    const handleRename = () => {
        if (workspace) {
            setNewName(workspace.name);
            setRenameDialogOpen(true);
        }
    };

    const handleRenameConfirm = () => {
        if (newName.trim() && workspace) {
            renameWorkspace(workspaceId, newName.trim());
        }
        setRenameDialogOpen(false);
        onClose();
    };

    const handleRenameCancel = () => {
        setRenameDialogOpen(false);
        setNewName("");
    };

    const handleDuplicate = () => {
        // TODO: Implement proper workspace duplication with tab content copying
        // For now, this just creates an empty workspace
        if (workspace) {
            createWorkspace(`${workspace.name} (Copy)`);
        }
        onClose();
    };

    const handleDelete = () => {
        setConfirmDelete(true);
    };

    const handleDeleteConfirm = () => {
        deleteWorkspace(workspaceId);
        setConfirmDelete(false);
        onClose();
    };

    const handleDeleteCancel = () => {
        setConfirmDelete(false);
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
            {!confirmDelete && !renameDialogOpen && (
                <div
                    ref={menuRef}
                    className="absolute bg-surface border border-base rounded shadow-lg z-50 py-1"
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
                </div>
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

            {renameDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-base rounded-lg shadow-xl p-6 w-96">
                        <h3 className="text-lg font-semibold text-main mb-4">Rename Workspace</h3>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleRenameConfirm();
                                } else if (e.key === "Escape") {
                                    handleRenameCancel();
                                }
                            }}
                            className="w-full px-3 py-2 bg-canvas border border-base rounded text-main focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Workspace name"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={handleRenameCancel}
                                className="px-4 py-2 bg-element hover:bg-element-hover border border-base rounded text-main transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameConfirm}
                                disabled={!newName.trim()}
                                className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
