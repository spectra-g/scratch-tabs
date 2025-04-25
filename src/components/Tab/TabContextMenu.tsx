import React, { useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useContextMenuConfig } from './UseContextMenuConfig';
import { ContextMenuItem } from './ContextMenuItem';
import { DownloadModal } from './DownloadModal';

interface TabContextMenuProps {
    tabId: string;
    position: { x: number; y: number };
    onClose: (action?: 'compare') => void;
    isRightSide: boolean;
    startEditingTab: (tabId: string) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({ tabId, position, onClose, isRightSide, startEditingTab }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    // Close the context menu when clicking outside
    useClickOutside(menuRef, () => {
        if (!showDownloadModal) { // Don't close if the modal is open (modal handles its own close)
           onClose();
        }
    });

    const handleOpenModal = () => {
        setShowDownloadModal(true);
    };

    // --- Pass a function to trigger the modal state ---
    const handleCloseModal = () => {
        setShowDownloadModal(false);
        onClose();
    };

    // --- Pass the trigger function to the hook ---
    const menuConfig = useContextMenuConfig(
        tabId,
        isRightSide,
        onClose,
        handleOpenModal,
        startEditingTab
    );

    return (
        <>
            <div
                ref={menuRef}
                className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg z-50 py-1"
                style={{ top: `${position.y}px`, left: `${position.x}px`, minWidth: "200px" }}
                onContextMenu={(e) => e.preventDefault()}
            >
                {menuConfig.map((item) => {
                    if (item.isSeparator) {
                        return <div key={item.id} className="border-t border-gray-600 my-1 mx-1"></div>;
                    }
                    return <ContextMenuItem key={item.id} item={item} />;
                })}
            </div>

            {showDownloadModal && (
                <DownloadModal
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
};