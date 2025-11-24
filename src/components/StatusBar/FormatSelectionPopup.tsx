import React, { useRef, useEffect, useState, useMemo } from "react";
import type { PopupMenuItem } from "./types";

interface FormatSelectionPopupProps {
  formats: PopupMenuItem[];
  onSelectFormat: (formatId: string) => void;
  onClose: () => void;
  title?: string;
}

export const FormatSelectionPopup: React.FC<FormatSelectionPopupProps> = ({
  formats,
  onSelectFormat,
  onClose,
  title,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter formats based on search term
  const filteredFormats = useMemo(() => {
    if (!searchTerm.trim()) return formats;
    
    const term = searchTerm.toLowerCase();
    return formats.filter(item => 
      !item.isSeparator && item.name.toLowerCase().includes(term)
    );
  }, [formats, searchTerm]);

  // Focus input when popup opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle click outside to close - using a more direct approach that works better with Monaco editor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSelectFormat = (formatId: string) => {
    onSelectFormat(formatId);
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className="absolute z-50 bg-surface border border-base rounded shadow-lg overflow-hidden custom-scrollbar"
      style={{
        bottom: "28px",
        left: "0px",
        maxHeight: "300px",
        width: "170px",
        overflowY: "auto",
      }}
    >
      <div className="px-3 py-2 border-b border-base">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search formats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-secondary placeholder-gray-500 border-none outline-none"
        />
      </div>
      <div className="py-1">
        {filteredFormats.map((item) => {
          if (item.isSeparator) {
            return (
              <div
                key={item.id}
                className="border-t border-base my-1 mx-2"
              ></div>
            );
          }
          return (
            <button
              key={item.id}
              className="w-full text-left px-3 py-1.5 bg-themed-hover text-xs text-main transition-colors block"
              onClick={() => handleSelectFormat(item.id)}
              title={`Select ${item.name}`}
            >
              <span>{item.name}</span>
            </button>
          );
        })}

        {filteredFormats.length === 0 && searchTerm.trim() && (
          <div className="px-3 py-2 text-xs text-muted italic">
            No formats found
          </div>
        )}

        {formats.length === 0 && (
          <div className="px-3 py-2 text-xs text-muted italic">
            No formats available
          </div>
        )}
      </div>
    </div>
  );
};
