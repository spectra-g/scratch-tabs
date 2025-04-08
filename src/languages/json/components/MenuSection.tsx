import React from 'react';

interface MenuSectionProps {
  children: React.ReactNode;
}

export const MenuSection: React.FC<MenuSectionProps> = ({ children }) => {
  return (
    <>
      <div className="py-1">
        {children}
      </div>
      <div className="border-t border-gray-600 my-1"></div>
    </>
  );
};