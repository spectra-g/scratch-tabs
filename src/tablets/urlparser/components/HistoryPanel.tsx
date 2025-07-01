import React from 'react';
import { Clock, ExternalLink } from 'lucide-react';

interface HistoryPanelProps {
  history: string[];
  onSelectUrl: (url: string) => void;
  onClose: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onSelectUrl,
  onClose
}) => {
  if (history.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-lg w-full p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-200">URL History</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
            >
              <X size={18} />
            </button>
          </div>
          <div className="text-center text-gray-400 py-8">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p>No URL history yet</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-lg w-full p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-200">URL History</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {history.map((url, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 hover:bg-gray-700/50 rounded-md cursor-pointer group"
              onClick={() => {
                onSelectUrl(url);
                onClose();
              }}
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <Clock size={16} className="text-gray-400 flex-shrink-0" />
                <div className="truncate text-gray-300">{url}</div>
              </div>
              <ExternalLink size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};