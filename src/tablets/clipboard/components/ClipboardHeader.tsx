import React from 'react';
import { List, Grid } from '../../../components/Icons';
import { ViewMode } from '../types';

interface ClipboardHeaderProps {
  itemCount: number;
  totalCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ClipboardHeader: React.FC<ClipboardHeaderProps> = ({
  itemCount,
  totalCount,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex-none p-4 border-b border-gray-700/50 flex items-center justify-between">
      <div className="text-sm text-gray-400">
        {itemCount} of {totalCount} items showing
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-gray-800/50 border border-gray-700/50 rounded-md">
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-1.5 rounded-l-md transition-colors ${
              viewMode === "list" 
                ? "bg-blue-500/20 text-blue-300" 
                : "text-gray-400 hover:bg-gray-700/50"
            }`}
            title="List View"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => onViewModeChange("card")}
            className={`p-1.5 rounded-r-md transition-colors ${
              viewMode === "card" 
                ? "bg-blue-500/20 text-blue-300" 
                : "text-gray-400 hover:bg-gray-700/50"
            }`}
            title="Card View"
          >
            <Grid size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};