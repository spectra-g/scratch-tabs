import React from "react";
import { X } from "lucide-react";

interface BaseModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
  maxHeightClass?: string;
  widthClass?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  title,
  onClose,
  children,
  maxWidthClass = "max-w-4xl",
  maxHeightClass = "max-h-[85vh]",
  widthClass = "w-full",
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-surface rounded-lg shadow-xl ${widthClass} ${maxWidthClass} ${maxHeightClass} flex flex-col overflow-hidden border border-base`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex-none flex items-center justify-between p-3 border-b border-base bg-surface">
          <h2 className="text-lg font-medium text-main">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-secondary hover:text-main hover:bg-element-hover rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:border-focus"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
