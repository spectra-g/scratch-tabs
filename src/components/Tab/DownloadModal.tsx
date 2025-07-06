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

// --- Helper Function for Sanitizing Filenames ---
// Removes characters forbidden in most file systems and trims whitespace.
// Replaces forbidden characters with an underscore.
function sanitizeFilename(name: string): string {
  if (!name) {
    return 'untitled'; // Handle empty or null names
  }
  // Remove or replace characters like / \ : * ? " < > |
  const sanitized = name.replace(/[\\/:*?"<>|]/g, '_');
  // Replace multiple consecutive underscores with a single one
  const collapsedUnderscores = sanitized.replace(/_+/g, '_');
  // Trim leading/trailing whitespace and underscores
  const trimmed = collapsedUnderscores.trim().replace(/^_+|_+$/g, '');
  // Prevent filenames that are just dots or empty after sanitization
  if (trimmed === '' || /^\.+$/.test(trimmed)) {
    return 'untitled';
  }
  // Limit filename length (optional, but good practice)
  const maxLength = 200;
  return trimmed.substring(0, maxLength);
}
// --- End Helper Function ---

export const DownloadModal: React.FC<DownloadModalProps> = ({ onClose }) => {
  console.time('[DownloadModal] Component render');
  console.log('[DownloadModal] Rendering download modal');
  const { tabs, splitView } = useRootStore();
  console.timeEnd('[DownloadModal] Component render');
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
      const selectedTabObjects = downloadableTabs.filter(tab => selectedTabs.has(tab.id));

      // If only one file is selected, download it directly
      if (selectedTabObjects.length === 1) {
        const tab = selectedTabObjects[0];
        const detector = languageRegistry.getById(tab.language);
        const extension = detector?.getFileExtension() || 'txt';
        const filename = `${sanitizeFilename(tab.title)}.${extension}`;
        const blob = new Blob([tab.content], { type: 'text/plain;charset=utf-8' }); // Added charset
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Create a zip file for multiple selections
        const zip = new JSZip();
        const usedFilenames = new Set<string>();

        selectedTabObjects.forEach(tab => {
          const detector = languageRegistry.getById(tab.language);
          const extension = detector?.getFileExtension() || 'txt';

          const baseFilename = sanitizeFilename(tab.title);
          let finalFilename = `${baseFilename}.${extension}`;
          let counter = 1;

          while (usedFilenames.has(finalFilename)) {
            finalFilename = `${baseFilename} (${counter}).${extension}`;
            counter++;
          }
          usedFilenames.add(finalFilename); // Mark this filename as used

          zip.file(finalFilename, tab.content);
        });

        // Generate and download zip
        const content = await zip.generateAsync({
          type: 'blob',
          compression: "DEFLATE",
          compressionOptions: {
              level: 6
          }
         });
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
      // Consider adding user feedback here, e.g., a toast notification
    } finally {
      setIsDownloading(false);
      onClose(); // Close modal even on error, or handle error state differently
    }
  };

  const TabList = ({ tabs }: { tabs: Tab[] }) => (
    <div className="space-y-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => toggleTab(tab.id)}
          className="w-full flex items-center space-x-3 px-3 py-1 hover:bg-gray-700/50 rounded-md transition-colors text-left"
        >
          {selectedTabs.has(tab.id) ? (
            <CheckCircle2 size={16} className="text-blue-400 flex-shrink-0" />
          ) : (
            <Circle size={16} className="text-gray-400 flex-shrink-0" />
          )}
          <span className="flex-1 truncate min-w-0">{tab.title}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">.{languageRegistry.getById(tab.language)?.getFileExtension() || 'txt'}</span>
        </button>
      ))}
    </div>
  );

  return (
    <BaseModal title="Download Tabs" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
          >
            Select All
          </button>
          {splitView.isSplit && (
            <>
              <button
                onClick={selectLeftSide}
                className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
              >
                Select Left Side
              </button>
              <button
                onClick={selectRightSide}
                className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
              >
                Select Right Side
              </button>
            </>
          )}
          <button
            onClick={clearSelection}
            className="px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-md text-sm transition-colors"
          >
            Clear Selection
          </button>
        </div>

        {/* Tab lists */}
        <div className="space-y-3">
          {!splitView.isSplit ? (
            <TabList tabs={downloadableTabs} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Left Side</h3>
                <TabList tabs={leftTabs} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">Right Side</h3>
                <TabList tabs={rightTabs} />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-2">
          <button
            onClick={downloadFiles}
            disabled={selectedTabs.size === 0 || isDownloading}
            className="flex items-center space-x-2 px-4 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-md text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            <span>
              {isDownloading
                ? 'Downloading...'
                : `Download ${selectedTabs.size === 1 ? 'File' : `${selectedTabs.size} Files`}`} {/* Show count */}
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};