import React from "react";
import { createPortal } from "react-dom";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  message: string;
  confirmButtonText?: string;
  position?: { x: number; y: number };
  positionType?: "above" | "below"; // Whether to position above or below the trigger point
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  message,
  confirmButtonText = "Confirm",
  position,
  positionType = "above",
}) => {
  if (!isOpen) return null;

  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleConfirmClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConfirm();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel();
  };

  // If position is provided, position near the trigger point
  // Otherwise, center on screen (default behavior)
  const dialogStyle = position
    ? {
      position: "fixed" as const,
      top: `${position.y}px`,
      left: `${position.x}px`,
      transform:
        positionType === "above"
          ? "translate(-50%, -100%)" // Position above and centered on the trigger point
          : "translate(-50%, 0%)", // Position below and centered on the trigger point
      zIndex: 50,
    }
    : {};

  const backdropStyle = position
    ? {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      zIndex: 49,
    }
    : {};

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={position ? "" : "fixed inset-0 bg-black bg-opacity-60"}
        style={position ? backdropStyle : {}}
        onClick={onCancel}
      />

      {/* Dialog */}
      <div
        className={
          position
            ? ""
            : "fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
        }
        style={position ? {} : {}}
        onClick={position ? undefined : onCancel}
      >
        <div
          className="bg-surface p-4 rounded-lg shadow-2xl max-w-md w-full border border-base"
          style={dialogStyle}
          onClick={handleModalContentClick}
          data-testid="confirmation-dialog"
        >
          <p className="text-main mb-6 font-medium">{message}</p>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancelClick}
              className="px-3 py-1.5 text-sm text-info bg-transparent hover:bg-info/10 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              className="px-3 py-1.5 text-sm bg-element hover:bg-element-hover rounded-md transition-colors text-main"
            >
              {confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
