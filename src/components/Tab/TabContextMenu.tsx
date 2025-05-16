import React, { useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { UseContextMenuConfigReturn, useContextMenuConfig } from './UseContextMenuConfig';
import { ContextMenuItem } from './ContextMenuItem';
import { DownloadModal } from './DownloadModal';
import { ConfirmationDialog } from './ConfirmationDialog'; // Import the confirmation dialog

interface TabContextMenuProps {
    tabId: string;
    position: { x: number; y: number };
    // This onClose is the complex one that can trigger other actions or modals
    onClose: (action?: 'compare' | 'compareSides' | 'summary' | 'compareClipboard', tabId?: string, side?: 'left' | 'right') => void;
    isRightSide: boolean;
    startEditingTab: (tabId: string) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({ tabId, position, onClose, isRightSide, startEditingTab }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showDownloadModal, setShowDownloadModal] = useState(false);

    // This is the function that will be called by useContextMenuConfig to simply close this context menu
    const closeThisContextMenu = (action?: 'compare' | 'compareSides' | 'summary' | 'compareClipboard', tabId?: string, side?: 'left' | 'right') => {
        onClose(action, tabId, side); // Call the original onClose prop
    };

    useClickOutside(menuRef, () => {
        // Only close if no modal (download or confirmation) is open.
        // The confirmationDialogProps.isOpen check handles the confirmation dialog.
        if (!showDownloadModal && (!confirmationDialogProps || !confirmationDialogProps.isOpen)) {
            closeThisContextMenu();
        }
    });

    const handleOpenDownloadModal = () => {
        setShowDownloadModal(true);
        // Unlike confirmation, DownloadModal likely doesn't require the context menu to close first,
        // as it's a separate flow. If it should, call `closeThisContextMenu()` here.
    };

    const handleCloseDownloadModal = () => {
        setShowDownloadModal(false);
        closeThisContextMenu(); // Close context menu when download modal closes
    };

    const { menuItems, confirmationDialogProps }: UseContextMenuConfigReturn = useContextMenuConfig(
        tabId,
        isRightSide,
        closeThisContextMenu, // Pass the function to close the context menu
        handleOpenDownloadModal,
        startEditingTab
    );

    useClickOutside(menuRef, () => {
        if (!showDownloadModal && (!confirmationDialogProps || !confirmationDialogProps.isOpen)) {
            closeThisContextMenu();
        }
    });

    return (
        <>
            <div
                ref={menuRef}
                className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg z-50 py-1"
                style={{ top: `${position.y}px`, left: `${position.x}px`, minWidth: "200px" }}
                onContextMenu={(e) => e.preventDefault()} // Prevent native context menu over custom one
            >
                {menuItems.map((item) => {
                    if (item.isSeparator) {
                        return <div key={item.id} className="border-t border-gray-600 my-1 mx-1"></div>;
                    }
                    return <ContextMenuItem key={item.id} item={item} />;
                })}
            </div>

            {showDownloadModal && (
                <DownloadModal
                    onClose={handleCloseDownloadModal}
                />
            )}

            {/* Render the confirmation dialog */}
            {confirmationDialogProps && confirmationDialogProps.isOpen && (
                <ConfirmationDialog
                    isOpen={confirmationDialogProps.isOpen}
                    message={confirmationDialogProps.message}
                    confirmButtonText={confirmationDialogProps.confirmButtonText}
                    onConfirm={confirmationDialogProps.onConfirm}
                    onCancel={confirmationDialogProps.onCancel}
                />
            )}
        </>
    );
};