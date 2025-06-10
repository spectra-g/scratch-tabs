import React from 'react';
import { X, Undo2, Redo2, Eye, EyeOff } from 'lucide-react';
import { DiffEditorEngine } from './useDiffEditor';

interface DiffModalUIProps {
  leftTabTitle: string;
  rightTabTitle: string;
  engine: DiffEditorEngine;
  onClose: () => void;
}

export const DiffModalUI: React.FC<DiffModalUIProps> = ({ 
  leftTabTitle, 
  rightTabTitle, 
  engine, 
  onClose 
}) => {
  const {
    editorContainerRef,
    areContentsIdentical,
    hideMatchingLines,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    toggleHideMatching,
  } = engine;

  return (
    <div className="fixed inset-8 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-700 px-4 py-2 border-b border-gray-600 flex-wrap">
        <h2 
          className="text-gray-200 font-medium mr-4 mb-1 sm:mb-0" 
          title={`${leftTabTitle} ↔ ${rightTabTitle}`}
        >
          Compare: {leftTabTitle} <span className="text-gray-400 mx-1">↔</span> {rightTabTitle}
        </h2>
        <div className="flex items-center flex-shrink-0">
          {/* Toggle Hide Matching Lines Button */}
          <button
            onClick={toggleHideMatching}
            title={hideMatchingLines ? "Show Matching Lines" : "Hide Matching Lines (Contextual Diff)"}
            className="mr-4 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white flex items-center"
          >
            {hideMatchingLines
              ? <Eye size={14} className="mr-1" />
              : <EyeOff size={14} className="mr-1" />
            }
            {hideMatchingLines ? 'Show All' : 'Hide Matching'}
          </button>
          {/* Undo/Redo Buttons */}
          <button 
            onClick={handleUndo} 
            title="Undo" 
            disabled={!canUndo} 
            className="mr-2 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Undo2 size={14} />
          </button>
          <button 
            onClick={handleRedo} 
            title="Redo" 
            disabled={!canRedo} 
            className="mr-4 px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Redo2 size={14} />
          </button>
          {/* Close Button */}
          <button 
            className="text-gray-400 hover:text-gray-200" 
            onClick={onClose} 
            title="Close and Save Changes"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Identical Content Message */}
      {areContentsIdentical && (
        <div className="bg-green-900 bg-opacity-50 text-green-200 text-sm px-4 py-1 text-center border-b border-gray-600 flex-shrink-0">
          Contents are identical.
        </div>
      )}

      {/* Editor Area */}
      <div ref={editorContainerRef} className="flex-1 overflow-hidden">
        {/* Monaco Editor renders here */}
      </div>
    </div>
  );
}; 