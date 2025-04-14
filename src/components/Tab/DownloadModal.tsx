import React, { useState } from 'react';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { Download, CheckCircle2, Circle } from 'lucide-react';
import { Tab } from '../../types';
import { useRootStore } from '../../stores';
import JSZip from 'jszip';
import { languageRegistry } from '../../languages';

interface DownloadModalProps {
  onClose: () => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({ onClose }) => {
  const { tabs, splitView } = useRootStore();
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

  // Filter out tablet tabs
  const downloadableTabs = tabs.filter(tab => !tab.isTablet);
  const leftTabs = downloadableTabs.filter(tab => splitView.leftTabs.includes(tab.id));
  const rightTabs = downloadableTabs.filter(tab => splitView.rightTabs.includes(tab.id));

  const toggleTab = (tabId: string) => {
    const newSelected = new Set(selectedTabs);
    if (newSelected.has(tabId)) {
      newSelected.delete(tabId);
    } else {
      newSelected.add(tabId);
    }
    setSelectedTabs(newSelected);
  };

  const selectAll = () => {
    setSelectedTabs(new Set(downloadableTabs.map(tab => tab.id)));
  };

  const selectLeftSide = () => {
    setSelectedTabs(new Set(leftTabs.map(tab => tab.id)));
  };

  const selectRightSide = () => {
    setSelectedTabs(new Set(rightTabs.map(tab => tab.id)));
  };

  const clearSelection = () => {
    setSelectedTabs(new Set());
  };

  const downloadFiles = async () => {
    if (selectedTabs.size === 0) return;

    setIsDownloading(true);
    try {
      // If only one file is selected, download it directly
      if (selectedTabs.size === 1) {
        const tab = tabs.find(t => t.id === Array.from(selectedTabs)[0])!;
        const detector = languageRegistry.getById(tab.language);
        const extension = detector?.getFileExtension() || 'txt';
        const blob = new Blob([tab.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${tab.title}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Create a zip file for multiple selections
        const zip = new JSZip();

        // Add selected files to zip
        selectedTabs.forEach(tabId => {
          const tab = tabs.find(t => t.id === tabId)!;
          const detector = languageRegistry.getById(tab.language);
          const extension = detector?.getFileExtension() || 'txt';
          zip.file(`${tab.title}.${extension}`, tab.content);
        });

        // Generate and download zip
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scratch-tabs-export.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to download files:', error);
    } finally {
      setIsDownloading(false);
      onClose();
    }
  };

  const TabList = ({ tabs }: { tabs: Tab[] }) => (
    <div className="space-y-2">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => toggleTab(tab.id)}
          className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-700/50 rounded-md transition-colors text-left"
        >
          {selectedTabs.has(tab.id) ? (
            <CheckCircle2 size={16} className="text-blue-400" />
          ) : (
            <Circle size={16} className="text-gray-400" />
          )}
          <span className="flex-1 truncate">{tab.title}</span>
          <span className="text-xs text-gray-400">.{languageRegistry.getById(tab.language)?.getFileExtension() || 'txt'}</span>
        </button>
      ))}
    </div>
  );

  return (
    <BaseModal title="Download Tabs" onClose={onClose}>
      <div className="space-y-6">
        {/* Selection buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
          >
            Select All
          </button>
          {splitView.isSplit && (
            <>
              <button
                onClick={selectLeftSide}
                className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
              >
                Select Left Side
              </button>
              <button
                onClick={selectRightSide}
                className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
              >
                Select Right Side
              </button>
            </>
          )}
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
          >
            Clear Selection
          </button>
        </div>

        {/* Tab lists */}
        <div className="space-y-4">
          {!splitView.isSplit ? (
            <TabList tabs={downloadableTabs} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Left Side</h3>
                <TabList tabs={leftTabs} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Right Side</h3>
                <TabList tabs={rightTabs} />
              </div>
            </div>
          )}
        </div>

        {/* Download button */}
        <div className="flex justify-end">
          <button
            onClick={downloadFiles}
            disabled={selectedTabs.size === 0 || isDownloading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span>
              {isDownloading
                ? 'Downloading...'
                : `Download ${selectedTabs.size === 1 ? 'File' : 'Files'}`}
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};