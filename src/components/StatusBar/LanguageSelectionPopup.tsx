import React, { useRef, useEffect, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface LanguageSelectionPopupProps {
  languages: Array<{
    id: string;
    name: string;
    score?: number;
  }>;
  onSelectLanguage: (languageId: string) => void;
  onClose: () => void;
  position: { top: number, left: number };
  showScores?: boolean;
  title?: string;
}

export const LanguageSelectionPopup: React.FC<LanguageSelectionPopupProps> = ({
  languages,
  onSelectLanguage,
  onClose,
  position,
  title
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [finalPosition, setFinalPosition] = useState(position);
  
  useClickOutside(popupRef, onClose);
  
  useEffect(() => {
    if (popupRef.current) {
      const popupRect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      let newTop = position.top;
      let newLeft = position.left;
      
      const popupHeight = popupRect.height;
      
      newTop = newTop - popupHeight - 40;
      
      if (newLeft + popupRect.width > viewportWidth) {
        newLeft = Math.max(10, viewportWidth - popupRect.width - 10);
      }
      
      if (newTop < 10) {
        newTop = 10;
      }
      
      setFinalPosition({
        top: newTop,
        left: newLeft
      });
    }
  }, [position, languages.length]);
  
  const handleSelectLanguage = (languageId: string) => {
    onSelectLanguage(languageId);
    onClose();
  };

  return (
    <div 
      ref={popupRef}
      className="absolute z-50 bg-gray-800 border border-gray-700 rounded shadow-lg overflow-hidden custom-scrollbar"
      style={{ 
        top: `${finalPosition.top}px`, 
        left: `${finalPosition.left}px`,
        maxHeight: '300px',
        maxWidth: '170px',
        overflowY: 'auto'
      }}
    >
      {title && (
        <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
          {title}
        </div>
      )}
      <div className="py-1">
        {languages.map(language => (
          <button
            key={language.id}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-xs text-gray-200"
            onClick={() => handleSelectLanguage(language.id)}
          >
            <span>{language.name}</span>
          </button>
        ))}
        
        {languages.length === 0 && (
          <div className="px-3 py-2 text-sm text-gray-400 italic">
            No languages available
          </div>
        )}
      </div>
    </div>
  );
}; 