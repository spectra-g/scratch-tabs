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
    <div className="flex-none p-4 border-b border-base flex items-center justify-between bg-surface-secondary">
      <div className="text-sm text-secondary">
        {itemCount} of {totalCount} items showing
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-element border border-base rounded-md">
          <button
            onClick={() => onViewModeChange("list")}
            className={`p-1.5 rounded-l-md transition-colors ${viewMode === "list"
              ? "bg-primary/20 text-info"
              : "text-secondary hover:bg-element-hover"
              }`}
            title="List View"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => onViewModeChange("card")}
            className={`p-1.5 rounded-r-md transition-colors ${viewMode === "card"
              ? "bg-primary/20 text-info"
              : "text-secondary hover:bg-element-hover"
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