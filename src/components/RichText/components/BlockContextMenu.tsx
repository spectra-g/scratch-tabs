import React, { useRef, useEffect } from 'react';
import { EyeOff, Code } from '../../Icons';

interface BlockContextMenuProps {
  onBlurContent: () => void;
  onImportCode: () => void;
  position: { x: number; y: number };
  visible: boolean;
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
  onBlurContent,
  onImportCode,
  position,
  visible,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Menu will be hidden by parent component's mouse leave
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1 min-w-[120px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <button
        onClick={onBlurContent}
        className="w-full flex items-center px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
      >
        <EyeOff size={12} className="mr-2" />
        Blur Content
      </button>
      
      <button
        onClick={onImportCode}
        className="w-full flex items-center px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 transition-colors"
      >
        <Code size={12} className="mr-2" />
        Import Code
      </button>
    </div>
  );
};