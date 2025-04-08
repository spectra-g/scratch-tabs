import React from 'react';

interface MenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
}

export const MenuItem: React.FC<MenuItemProps> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
    >
      {children}
    </button>
  );
};