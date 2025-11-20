import React from 'react';
import { ImageIcon, FileText } from '../../Icons';

interface UpgradeConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const UpgradeConfirmationModal: React.FC<UpgradeConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-themed p-6 rounded-lg shadow-2xl max-w-md w-full border border-themed" data-testid="rich-text-upgrade-modal">
        <div className="flex items-center mb-4">
          <ImageIcon size={24} className="text-blue-500 mr-3" />
          <h3 className="text-lg font-semibold text-themed">Convert to Rich Text?</h3>
        </div>

        <p className="text-themed-secondary mb-6 leading-relaxed">
          It looks like you've pasted an image. Would you like to convert this tab to a rich text note to display it properly?
        </p>

        <div className="bg-themed-secondary p-3 rounded-md mb-6">
          <div className="flex items-center text-sm text-themed-muted mb-2">
            <FileText size={16} className="mr-2" />
            <span>Rich text notes support:</span>
          </div>
          <ul className="text-xs text-themed-muted space-y-1 ml-6">
            <li>• Images and media</li>
            <li>• Formatted text (bold, italic, lists)</li>
            <li>• Tables and code blocks</li>
            <li>• Background textures</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-themed-muted hover:text-themed transition-colors"
          >
            Keep as Text
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Convert to Rich Text
          </button>
        </div>
      </div>
    </div>
  );
};