import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
    const { removeTab, toggleTabPin, duplicateTab } = useRootStore();
    const { activeWorkspaceId, workspaces } = useWorkspaceStore();
    const { tabs: activeTabs } = useTabsStore();
    const { workspaceTabsMetadata, setEditingId } = useSidebarStore();
    const [confirmDelete, setConfirmDelete] = useState(false);

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
        if (!confirmDelete) {
            onClose();
        }
    });

    const handleRename = () => {
        setEditingId(tabId, getTabTitle());
        onClose();
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
        // Don't call onClose() here - keep component mounted for dialog
    };

    const handleDeleteConfirm = () => {
        removeTab(tabId);
        setConfirmDelete(false);
        onClose();
    };

    const handleDeleteCancel = () => {
        setConfirmDelete(false);
        onClose();
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
                    <span className="flex-1 truncate text-[11px]">{workspace.name}</span>
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
            {!confirmDelete && createPortal(
                <div
                    ref={menuRef}
                    className="fixed bg-surface border border-base rounded shadow-lg z-[100] py-1"
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
                </div>,
                document.body
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
        </>
    );
};
