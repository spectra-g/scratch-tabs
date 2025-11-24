import React, { useState, useRef } from "react";
import { MoreHorizontal } from "../../components/Icons";
import * as monaco from "monaco-editor";

import { useClickOutside } from "../../hooks/useClickOutside";
import { useJsonMenuConfig } from "./hooks/useJsonMenuConfig";
import { ContextMenuItem } from "../../components/Tab/ContextMenuItem";
import { useJsonModals } from "./hooks/useJsonModals";

interface JsonOptionsMenuProps {
  editor: monaco.editor.IStandaloneCodeEditor | null; // Allow null initially
}

export const JsonOptionsMenu: React.FC<JsonOptionsMenuProps> = ({ editor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { renderModal } = useJsonModals();

  // Close handler
  const handleClose = () => {
    setIsOpen(false);
  };

  // Hook to generate menu items
  // Pass handleClose so actions within the config can close the menu
  const menuConfig = useJsonMenuConfig(editor, handleClose);

  // Click outside handler for menu and button
  useClickOutside([menuRef], handleClose); // Pass array of refs

  const toggleMenu = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  // Prevent rendering if editor is not available, or disable button
  const isDisabled = !editor;

  return (
    <>
      <div className="relative">
        <button
          onClick={toggleMenu}
          className="p-0.5 bg-element hover:bg-element-hover rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="JSON Options"
          disabled={isDisabled} // Disable if no editor
        >
          <MoreHorizontal size={14} />
        </button>

        {isOpen && (
          <div
            ref={menuRef}
            className="absolute bg-surface-highlight border border-base rounded shadow-lg z-50 py-1 custom-scrollbar"
            style={{
              bottom: "28px",
              left: "0px",
              width: "250px",
              height: "420px",
              overflowY: "auto",
            }}
            onContextMenu={(e) => e.preventDefault()}
          >
            {menuConfig.length === 0 && (
              <div className="px-3 py-1.5 text-xs text-muted italic">
                Loading...
              </div>
            )}
            {menuConfig.map((item) => {
              if (item.isSeparator) {
                // Use exact separator style from TabContextMenu
                return (
                  <div
                    key={item.id}
                    className="border-t border-base my-1 mx-1"
                  ></div>
                );
              }
              // Use the reusable ContextMenuItem component
              return <ContextMenuItem key={item.id} item={item} />;
            })}
          </div>
        )}
      </div>

      {/* Render active modal */}
      {renderModal()}
    </>
  );
};
