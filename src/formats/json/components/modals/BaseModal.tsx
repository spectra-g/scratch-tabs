import React from "react";
import { X } from "lucide-react";

interface BaseModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  // Optional: Allow overriding max width/height for specific modals
  maxWidthClass?: string;
  maxHeightClass?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  title,
  onClose,
  children,
  maxWidthClass = "max-w-4xl", // Default max width
  maxHeightClass = "max-h-[85vh]", // Default max height
}) => {
  return (
    // --- Backdrop ---
    // Slightly darker, more blur potential if needed later
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      {/* --- Modal Container --- */}
      {/* Slightly lighter dark bg, refined border, larger shadow, constrained width/height */}
      <div
        className={`bg-surface rounded-lg shadow-xl w-full ${maxWidthClass} ${maxHeightClass} flex flex-col overflow-hidden border border-base`}
      >
        {/* --- Modal Header --- */}
        <div className="flex-none flex items-center justify-between p-3 border-b border-base bg-surface-highlight">
          <h2 className="text-lg font-medium text-main">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:border-focus"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- Modal Content Area --- */}
        {/* Let children handle padding, ensure scrollbar styling is applied */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {" "}
          {/* Allow vertical scroll */}
          {children}
        </div>
      </div>
    </div>
  );
};
