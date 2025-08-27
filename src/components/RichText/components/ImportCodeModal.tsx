import React, { useState } from 'react';
import { Tab } from '../../../types';
import { RichTextService } from '../services/RichTextService';
import { Code, X } from '../../Icons';

interface ImportCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTabId: string;
  editor: any; // TipTap editor instance
}

export const ImportCodeModal: React.FC<ImportCodeModalProps> = ({
  isOpen,
  onClose,
  targetTabId,
  editor,
}) => {
  const [selectedTabId, setSelectedTabId] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);

  const availableTabs = RichTextService.getImportableTabs(targetTabId);

  const handleImport = async () => {
    if (!selectedTabId || !editor) return;

    setIsImporting(true);
    try {
      await RichTextService.importContentAsCodeBlock(
        selectedTabId,
        editor
      );
      onClose();
    } catch (error) {
      console.error('Failed to import content:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedTabId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-850 p-6 rounded-lg shadow-2xl max-w-md w-full border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Code size={24} className="text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-white">Import content from tab</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
        
        <p className="text-gray-300 mb-4">
          Select a tab to import its content as a code block:
        </p>

        {availableTabs.length === 0 ? (
          <div className="text-center py-8">
            <Code size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">No tabs available for import</p>
          </div>
        ) : (
          <>
            <div className="max-h-60 overflow-y-auto custom-scrollbar mb-4 space-y-2">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTabId(tab.id)}
                  className={`w-full text-left p-3 rounded-md border transition-colors ${
                    selectedTabId === tab.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-200">{tab.title}</div>
                      <div className="text-xs text-gray-400 capitalize">
                        {tab.language}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(tab.content?.length || 0)} chars
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!selectedTabId || isImporting}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              >
                {isImporting ? 'Importing...' : 'Import Code'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};