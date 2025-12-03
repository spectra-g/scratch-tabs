import React from "react";
import { AlertTriangle } from "lucide-react";

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

/**
 * Generic confirmation dialog component with configurable title, message, and buttons
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full p-6 border border-base" data-testid="confirmation-dialog">
        <h3 className="font-semibold text-red-300 mb-1 flex items-center">
          <AlertTriangle size={18} className="mr-2" />
          {title}
        </h3>
        <p className="text-secondary mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-surface-highlight hover:bg-element-hover text-main rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${isDestructive ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary-hover"} text-white rounded-md transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
