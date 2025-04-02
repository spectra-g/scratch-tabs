import React, { useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useContextMenuConfig } from './UseContextMenuConfig'; // Adjust path
import { ContextMenuItem } from './ContextMenuItem'; // Adjust path

interface TabContextMenuProps {
    tabId: string;
    position: { x: number; y: number };
    onClose: (action?: 'compare') => void;
    isRightSide: boolean;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({ tabId, position, onClose, isRightSide }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    useClickOutside(menuRef, () => onClose());
    const menuConfig = useContextMenuConfig(tabId, isRightSide, onClose);

    return (
        <div
            ref={menuRef}
            className="absolute bg-gray-700 border border-gray-600 rounded shadow-lg z-50 py-1"
            style={{ top: `${position.y}px`, left: `${position.x}px`, minWidth: "200px" }}
            // Prevent context menu trigger inside the menu itself
            onContextMenu={(e) => e.preventDefault()}
        >
            {menuConfig.map((item) => {
                if (item.isSeparator) {
                    return <div key={item.id} className="border-t border-gray-600 my-1 mx-1"></div>; // Added mx-1 for slight indent
                }

                // Delegate rendering and submenu logic to the specialized component
                return <ContextMenuItem key={item.id} item={item} />;
            })}
        </div>
    );
};