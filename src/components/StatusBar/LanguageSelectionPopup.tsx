import React, { useRef, useEffect, useState, useMemo } from "react";
import type { PopupMenuItem } from "./types";

interface LanguageSelectionPopupProps {
  languages: PopupMenuItem[];
  onSelectLanguage: (languageId: string) => void;
  onClose: () => void;
  title?: string;
}

export const LanguageSelectionPopup: React.FC<LanguageSelectionPopupProps> = ({
  languages,
  onSelectLanguage,
  onClose,
  title,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter languages based on search term
  const filteredLanguages = useMemo(() => {
    if (!searchTerm.trim()) return languages;
    
    const term = searchTerm.toLowerCase();
    return languages.filter(item => 
      !item.isSeparator && item.name.toLowerCase().includes(term)
    );
  }, [languages, searchTerm]);

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

  const handleSelectLanguage = (languageId: string) => {
    onSelectLanguage(languageId);
    onClose();
  };

  return (
    <div
      ref={popupRef}
      className="absolute z-50 bg-gray-800 border border-gray-700 rounded shadow-lg overflow-hidden custom-scrollbar"
      style={{
        bottom: "28px",
        left: "0px",
        maxHeight: "300px",
        width: "170px",
        overflowY: "auto",
      }}
    >
      <div className="px-3 py-2 border-b border-gray-700">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search formats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-xs text-gray-400 placeholder-gray-500 border-none outline-none"
        />
      </div>
      <div className="py-1">
        {filteredLanguages.map((item) => {
          if (item.isSeparator) {
            return (
              <div
                key={item.id}
                className="border-t border-gray-700/50 my-1 mx-2"
              ></div>
            );
          }
          return (
            <button
              key={item.id}
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700/50 text-xs text-gray-200 transition-colors block"
              onClick={() => handleSelectLanguage(item.id)}
              title={`Select ${item.name}`}
            >
              <span>{item.name}</span>
            </button>
          );
        })}

        {filteredLanguages.length === 0 && searchTerm.trim() && (
          <div className="px-3 py-2 text-xs text-gray-400 italic">
            No formats found
          </div>
        )}

        {languages.length === 0 && (
          <div className="px-3 py-2 text-xs text-gray-400 italic">
            No languages available
          </div>
        )}
      </div>
    </div>
  );
};
