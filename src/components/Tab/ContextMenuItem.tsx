import React, { useState, useRef, useEffect } from "react";
import { ChevronRight } from "../Icons";
import { MenuItem } from "./types";

interface ContextMenuItemProps {
  item: MenuItem;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ item }) => {
  const [isSubmenuVisible, setIsSubmenuVisible] = useState(false);
  const [submenuPosition, setSubmenuPosition] = useState({
    top: "-5px",
    left: "100%",
    bottom: "auto",
  }); // Added bottom
  const itemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const leaveTimeout = useRef<number | null>(null);

  const handleMouseEnter = () => {
    if (item.submenu) {
      // Clear any existing timeout
      if (leaveTimeout.current) {
        clearTimeout(leaveTimeout.current);
        leaveTimeout.current = null;
      }
      // Show submenu immediately
      setIsSubmenuVisible(true);
    } else {
      // If entering a non-submenu item, hide any visible submenu immediately
      if (leaveTimeout.current) {
        clearTimeout(leaveTimeout.current);
        leaveTimeout.current = null;
      }
      setIsSubmenuVisible(false);
    }
  };

  const handleMouseLeave = () => {
    if (item.submenu) {
      leaveTimeout.current = window.setTimeout(() => {
        // Check if the mouse is over the submenu itself before hiding
        if (submenuRef.current && !submenuRef.current.matches(":hover")) {
          setIsSubmenuVisible(false);
        }
      }, 50); // Reduced from 150ms to 50ms for faster response
    }
  };

  const handleSubmenuMouseEnter = () => {
    if (leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
      leaveTimeout.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (item.action) {
      item.action();
    }
    // Prevent submenu from immediately closing if main item is clicked
    if (item.submenu && leaveTimeout.current) {
      clearTimeout(leaveTimeout.current);
    }
  };

  // Effect to calculate submenu position dynamically to avoid going off-screen
  useEffect(() => {
    if (isSubmenuVisible && itemRef.current && submenuRef.current) {
      const itemRect = itemRef.current.getBoundingClientRect();
      const submenuHeight = submenuRef.current.offsetHeight;
      const windowHeight = window.innerHeight;

      let top = -5; // Default top position relative to item

      // Check if submenu goes below viewport
      if (itemRect.top + submenuHeight > windowHeight - 20) {
        // 20px buffer
        // Adjust: Position upwards relative to the item's bottom
        top = itemRect.height - submenuHeight + 5; // Adjust slightly above bottom
        // Ensure it doesn't go above the viewport top
        if (itemRect.top + top < 10) {
          top = -itemRect.top + 10; // Place 10px from viewport top
        }
      }

      setSubmenuPosition({ top: `${top}px`, left: "100%", bottom: "auto" }); // Update position style
    }
  }, [isSubmenuVisible]); // Rerun when visibility changes

  return (
    <div
      ref={itemRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className="w-full text-left px-3 py-1.5 hover:bg-element-hover flex items-center text-xs text-main disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={handleClick}
        disabled={item.disabled || (!item.action && !item.submenu)} // Added item.disabled check
        aria-haspopup={!!item.submenu} // Accessibility
        aria-expanded={isSubmenuVisible} // Accessibility
      >
        {item.icon && <item.icon size={14} className="mr-2 flex-shrink-0" />}
        <span className="flex-1 truncate">{item.label}</span>
        {item.submenu && (
          <ChevronRight
            size={14}
            className="ml-auto flex-shrink-0 icon-themed"
          />
        )}
      </button>

      {/* Submenu Wrapper */}
      {item.submenu && isSubmenuVisible && (
        <div
          ref={submenuRef}
          className="absolute left-full ml-1 bg-surface border border-base rounded shadow-lg z-[60] py-1 min-w-[150px] max-h-[300px] overflow-y-auto custom-scrollbar"
          style={{ top: submenuPosition.top, left: submenuPosition.left }}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {item.submenu}
        </div>
      )}
    </div>
  );
};
