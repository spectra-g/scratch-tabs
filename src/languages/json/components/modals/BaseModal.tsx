import React from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const BaseModal: React.FC<BaseModalProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between bg-gray-700 px-4 py-3 border-b border-gray-600">
        <h2 className="text-lg font-medium text-gray-200">{title}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6 custom-scrollbar">
        {children}
      </div>
    </div>
  );
};