import * as React from "react";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface FullValuePopupProps {
  value: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export const FullValuePopup: React.FC<FullValuePopupProps> = ({
  value,
  position,
  onClose,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Add listener after a small delay to prevent immediate close from the double-click event
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Adjust position to prevent popup from going off-screen
  const adjustedPosition = { ...position };

  useEffect(() => {
    if (popupRef.current) {
      const rect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position if popup goes off right edge
      if (rect.right > viewportWidth - 10) {
        adjustedPosition.x = viewportWidth - rect.width - 10;
        popupRef.current.style.left = `${adjustedPosition.x}px`;
      }

      // Adjust vertical position if popup goes off bottom edge
      if (rect.bottom > viewportHeight - 10) {
        adjustedPosition.y = Math.max(10, viewportHeight - rect.height - 10);
        popupRef.current.style.top = `${adjustedPosition.y}px`;
      }
    }
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />

      {/* Popup */}
      <div
        ref={popupRef}
        className="fixed z-50 bg-surface border border-base rounded-lg shadow-2xl max-w-2xl"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-base">
          <span className="text-sm font-medium text-main">Full Value</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-element-hover rounded transition-colors"
            title="Close (Esc)"
          >
            <X size={14} className="text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 max-h-96 overflow-auto custom-scrollbar">
          <div className="text-sm text-main break-words whitespace-pre-wrap font-mono">
            {value}
          </div>
        </div>

        {/* Footer with character count */}
        <div className="px-3 py-2 border-t border-base text-xs text-muted">
          {value.length} characters
        </div>
      </div>
    </>
  );
};
