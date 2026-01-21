import React, { useRef, useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { ContextMenuItem } from "../Tab/ContextMenuItem";
import { MenuItem } from "../Tab/types";
import {
    Edit,
    Trash2,
    Copy,
    Pin,
    FolderOpen
} from "../Icons";
import { useRootStore } from "../../stores/rootStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";
import { useTabsStore } from "../../stores/tabsStore";
import { useSidebarStore } from "../../stores/sidebarStore";
import { ConfirmationDialog } from "../Tab/ConfirmationDialog";

interface SidebarTabContextMenuProps {
    tabId: string;
    workspaceId: string;
    position: { x: number; y: number };
    onClose: () => void;
}

export const SidebarTabContextMenu: React.FC<SidebarTabContextMenuProps> = ({
    tabId,
    workspaceId,
    position,
    onClose
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const { removeTab, toggleTabPin, duplicateTab, updateTabTitle } = useRootStore();
    const { activeWorkspaceId, workspaces } = useWorkspaceStore();
    const { tabs: activeTabs } = useTabsStore();
    const { workspaceTabsMetadata } = useSidebarStore();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [moveToWorkspaceMenuOpen, setMoveToWorkspaceMenuOpen] = useState(false);

    const isActiveWorkspace = workspaceId === activeWorkspaceId;
    const otherWorkspaces = workspaces.filter(w => w.id !== workspaceId);

    // Get tab title from appropriate source
    const getTabTitle = () => {
        if (isActiveWorkspace) {
            const tab = activeTabs.find(t => t.id === tabId);
            return tab?.title || "";
        } else {
            const metadata = workspaceTabsMetadata.get(workspaceId);
            const tab = metadata?.find(t => t.id === tabId);
            return tab?.title || "";
        }
    };

    useClickOutside(menuRef, () => {
        if (!confirmDelete && !renameDialogOpen) {
            onClose();
        }
    });

    const handleRename = () => {
        setNewTitle(getTabTitle());
        setRenameDialogOpen(true);
    };

    const handleRenameConfirm = () => {
        if (newTitle.trim()) {
            updateTabTitle(tabId, newTitle.trim());
        }
        setRenameDialogOpen(false);
        onClose();
    };

    const handleRenameCancel = () => {
        setRenameDialogOpen(false);
        setNewTitle("");
    };

    const handleDuplicate = () => {
        // Duplicate on the left side by default when called from sidebar
        duplicateTab(tabId, false);
        onClose();
    };

    const handlePin = () => {
        toggleTabPin(tabId);
        onClose();
    };

    const handleDelete = () => {
        setConfirmDelete(true);
    };

    const handleDeleteConfirm = () => {
        removeTab(tabId);
        setConfirmDelete(false);
        onClose();
    };

    const handleDeleteCancel = () => {
        setConfirmDelete(false);
    };

    const handleMoveToWorkspace = (targetWorkspaceId: string) => {
        // TODO: Implement move to workspace functionality
        console.log("Move tab", tabId, "to workspace", targetWorkspaceId);
        onClose();
    };

    const moveToWorkspaceSubmenu = otherWorkspaces.length > 0 ? (
        <div className="flex flex-col">
            {otherWorkspaces.map(workspace => (
                <button
                    key={workspace.id}
                    onClick={() => handleMoveToWorkspace(workspace.id)}
                    className="w-full text-left px-3 py-1.5 hover:bg-element-hover flex items-center text-xs text-main transition-colors"
                >
                    <FolderOpen size={14} className="mr-2 flex-shrink-0" />
                    <span className="flex-1 truncate">{workspace.name}</span>
                </button>
            ))}
        </div>
    ) : (
        <div className="px-3 py-1.5 text-xs text-secondary italic">
            No other workspaces
        </div>
    );

    const menuItems: MenuItem[] = [
        {
            id: "rename",
            label: "Rename",
            icon: Edit,
            action: handleRename,
        },
        {
            id: "duplicate",
            label: "Duplicate",
            icon: Copy,
            action: handleDuplicate,
        },
        {
            id: "pin",
            label: "Pin",
            icon: Pin,
            action: handlePin,
        },
        {
            id: "separator-1",
            isSeparator: true,
        },
        {
            id: "move-to-workspace",
            label: "Move to Workspace",
            icon: FolderOpen,
            submenu: moveToWorkspaceSubmenu,
            disabled: otherWorkspaces.length === 0,
        },
        {
            id: "separator-2",
            isSeparator: true,
        },
        {
            id: "delete",
            label: "Close",
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
                        minWidth: "180px",
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

            {confirmDelete && (
                <ConfirmationDialog
                    isOpen={confirmDelete}
                    message="Are you sure you want to close this tab?"
                    confirmButtonText="Close"
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                />
            )}

            {renameDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-surface border border-base rounded-lg shadow-xl p-6 w-96">
                        <h3 className="text-lg font-semibold text-main mb-4">Rename Tab</h3>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleRenameConfirm();
                                } else if (e.key === "Escape") {
                                    handleRenameCancel();
                                }
                            }}
                            className="w-full px-3 py-2 bg-canvas border border-base rounded text-main focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Tab name"
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
                                disabled={!newTitle.trim()}
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
