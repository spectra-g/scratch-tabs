import React, { useRef, useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import {
  UseContextMenuConfigReturn,
  useContextMenuConfig,
} from "./UseContextMenuConfig";
import { ContextMenuItem } from "./ContextMenuItem";
import { DownloadModal } from "./DownloadModal";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { SplitTabModal } from "./SplitTabModal";
import { ShareModal } from "../Share/ShareModal";
import { ContextMenuAction, TabSide } from "../../constants";
import { useTabsStore } from "../../stores/tabsStore";
import { ToolSelectorModal } from "../ToolSelector";

interface ContextMenuActionPayload {
  action: ContextMenuAction;
  tabId?: string;
  side?: TabSide;
}

interface TabContextMenuProps {
  tabId: string;
  position: { x: number; y: number };
  // Updated to use object payload instead of multiple optional arguments
  onClose: (payload?: ContextMenuActionPayload) => void;
  isRightSide: boolean;
  startEditingTab: (tabId: string) => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  tabId,
  position,
  onClose,
  isRightSide,
  startEditingTab,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // This is the function that will be called by useContextMenuConfig to simply close this context menu
  const closeThisContextMenu = (
    action?: ContextMenuAction,
    tabId?: string,
    side?: TabSide,
  ) => {
    if (action) {
      onClose({ action, tabId, side }); // Call with object payload
    } else {
      onClose(); // Call without payload for simple close
    }
  };

  const handleOpenDownloadModal = () => {
    setShowDownloadModal(true);
    // Unlike confirmation, DownloadModal likely doesn't require the context menu to close first,
    // as it's a separate flow. If it should, call `closeThisContextMenu()` here.
  };

  const handleCloseDownloadModal = () => {
    setShowDownloadModal(false);
    closeThisContextMenu(); // Close context menu when download modal closes
  };

  const { menuItems, confirmationDialogProps, splitModalProps, shareModalProps, tabletModalOpen, onOpenTabletModal, onSelectTool }: UseContextMenuConfigReturn =
    useContextMenuConfig(
      tabId,
      isRightSide,
      closeThisContextMenu, // Pass the function to close the context menu
      handleOpenDownloadModal,
      startEditingTab,
    );

  const tabsStore = useTabsStore();
  const tab = tabsStore.tabs.find((t) => t.id === tabId);

  useClickOutside(menuRef, () => {
    if (
      !showDownloadModal &&
      !tabletModalOpen &&
      (!confirmationDialogProps || !confirmationDialogProps.isOpen) &&
      (!splitModalProps || !splitModalProps.isOpen) &&
      (!shareModalProps || !shareModalProps.isOpen)
    ) {
      closeThisContextMenu();
    }
  });

  return (
    <>
      {/* Hide context menu when any modal is open, but keep component mounted */}
      {(!splitModalProps || !splitModalProps.isOpen) &&
        (!shareModalProps || !shareModalProps.isOpen) &&
        !tabletModalOpen && (
          <div
            ref={menuRef}
            className="absolute bg-surface border border-base rounded shadow-lg z-50 py-1"
            style={{
              top: `${position.y}px`,
              left: `${position.x}px`,
              minWidth: "200px",
            }}
            onContextMenu={(e) => e.preventDefault()} // Prevent native context menu over custom one
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

      {showDownloadModal && (
        <DownloadModal onClose={handleCloseDownloadModal} />
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

      {/* Render the split tab modal */}
      {splitModalProps && splitModalProps.isOpen && (
        <SplitTabModal
          tabId={splitModalProps.tabId}
          onClose={splitModalProps.onClose}
        />
      )}

      {/* Render the share modal */}
      {shareModalProps && shareModalProps.isOpen && tab && (
        <ShareModal tab={tab} onClose={shareModalProps.onClose} />
      )}

      {/* Render the tool selector modal */}
      {tabletModalOpen && (
        <ToolSelectorModal
          onSelect={onSelectTool}
          onClose={() => {
            closeThisContextMenu();
          }}
        />
      )}
    </>
  );
};
