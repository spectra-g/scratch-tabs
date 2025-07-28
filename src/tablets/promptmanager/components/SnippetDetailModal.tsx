import React from 'react';
import { X } from '../../../components/Icons';
import { Snippet } from '../types';
import { MarkdownPreview } from './MarkdownPreview';
import { estimateTokenCount, formatTokenCount, getTokenCountColor } from '../utils/tokenCount';

interface SnippetDetailModalProps {
  snippet: Snippet;
  onClose: () => void;
}

export const SnippetDetailModal: React.FC<SnippetDetailModalProps> = ({ snippet, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">{snippet.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <MarkdownPreview content={snippet.content} />
        </div>
        
        {/* Token Count Status Bar */}
        <div className="px-4 py-2 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Token Count:</span>
            <span className={getTokenCountColor(estimateTokenCount(snippet.content))}>
              {formatTokenCount(estimateTokenCount(snippet.content))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 