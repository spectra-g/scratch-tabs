import React, { useState, useCallback } from 'react';
import { BaseModal } from './BaseModal';
import JsonNode from './JsonNode'; // Import the new component
import { Copy } from 'lucide-react';

interface PathFinderModalProps {
  json: any;
  onClose: () => void;
}

export const PathFinderModal: React.FC<PathFinderModalProps> = ({ json, onClose }) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const handlePathSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setCopySuccess(false); // Reset copy status when a new path is selected
  }, []);

  const handleCopyPath = async () => {
    if (!selectedPath) return;
    try {
      await navigator.clipboard.writeText(selectedPath);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 1500); // Hide message after 1.5s
    } catch (err) {
      console.error('Failed to copy path: ', err);
      // Optionally show an error message to the user
    }
  };

  // Basic validation in case json prop is not an object/array
  const isValidJson = json !== null && typeof json === 'object';

  return (
    <BaseModal title="JSON Path Finder" onClose={onClose}>
      <div className="space-y-4 font-mono text-sm">
        {/* Selected Path Display and Copy Button */}
        <div className="bg-gray-800 p-3 rounded-md flex items-center justify-between sticky top-0 z-10">
          <div className="flex-1 overflow-hidden mr-2">
            <span className="text-gray-400 mr-2">Selected Path:</span>
            {selectedPath ? (
              <span className="text-yellow-300 break-all">{selectedPath}</span>
            ) : (
              <span className="text-gray-500 italic">Click on a property key below...</span>
            )}
          </div>
          <button
            onClick={handleCopyPath}
            disabled={!selectedPath}
            className={`px-3 py-1 rounded ${
              !selectedPath
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : copySuccess
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } transition-colors duration-150 flex items-center space-x-1`}
            title={selectedPath ? "Copy path to clipboard" : "Select a path first"}
          >
            <Copy className="w-4 h-4" />
            <span>{copySuccess ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Interactive JSON Tree */}
        <div className="bg-gray-900 rounded-lg p-4 max-h-[60vh] overflow-auto custom-scrollbar">
          {isValidJson ? (
             <JsonNode
               data={json}
               onPathSelect={handlePathSelect}
               isRoot={true} // Indicate this is the root node
             />
          ) : (
             <div className="text-red-400">Invalid JSON data provided.</div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};