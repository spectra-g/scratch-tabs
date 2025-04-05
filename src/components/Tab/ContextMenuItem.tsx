import React, { useState, useRef } from 'react';
import { ChevronRight } from "lucide-react"; // Icon for submenu indicator
import { MenuItem } from './types'; // Assuming type definition path

interface ContextMenuItemProps {
    item: MenuItem;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ item }) => {
    const [isSubmenuVisible, setIsSubmenuVisible] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);
    const leaveTimeout = useRef<number | null>(null);

    const handleMouseEnter = () => {
        if (item.submenu) {
            if (leaveTimeout.current) {
                clearTimeout(leaveTimeout.current);
                leaveTimeout.current = null;
            }
            setIsSubmenuVisible(true);
        }
    };

    const handleMouseLeave = () => {
        if (item.submenu) {
            // Delay hiding slightly to allow moving cursor to submenu
            leaveTimeout.current = window.setTimeout(() => {
                setIsSubmenuVisible(false);
            }, 150);
        }
    };

    // Prevent accidental close if mouse briefly leaves then re-enters submenu area
    const handleSubmenuMouseEnter = () => {
        if (leaveTimeout.current) {
            clearTimeout(leaveTimeout.current);
            leaveTimeout.current = null;
        }
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (item.action) {
            item.action();
        }
        // Optionally: Keep submenu open on click? Or toggle?
        // For now, action handles closing via `onClose` passed earlier.
    }

    return (
        <div
            ref={itemRef}
            className="relative" // Container for positioning submenu
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                className="w-full text-left px-3 py-1.5 hover:bg-gray-600 flex items-center text-xs text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleClick}
                disabled={!item.action && !item.submenu} // Disable if no action/submenu
            >
                <item.icon size={14} className="mr-2 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.submenu && <ChevronRight size={14} className="ml-auto flex-shrink-0 text-gray-400" />}
            </button>

            {item.submenu && isSubmenuVisible && (
                <div
                    className="absolute left-full top-[-5px] ml-1 bg-gray-700 border border-gray-600 rounded shadow-lg z-[60] py-1 min-w-[150px]"
                    onMouseEnter={handleSubmenuMouseEnter} // Keep submenu open if mouse enters it
                    onMouseLeave={handleMouseLeave} // Hide if mouse leaves submenu too
                >
                    {item.submenu}
                </div>
            )}
        </div>
    );
};