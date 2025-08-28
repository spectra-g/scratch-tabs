import React from 'react';
import { FileText } from '../Icons';
import { useRootStore } from '../../stores/rootStore';
import { Tab } from '../../types';

interface RichTextControlsProps {
  activeTab: Tab;
}

export const RichTextControls: React.FC<RichTextControlsProps> = ({
  activeTab,
}) => {
  const { updateTabState } = useRootStore();

  const handleToggleRichMode = () => {
    updateTabState(activeTab.id, { 
      isRich: !activeTab.isRich,
      lastModified: Date.now(),
    });
  };

  return (
    <button
      onClick={handleToggleRichMode}
      className="flex items-center space-x-1 px-2 py-1 hover:bg-gray-700/50 rounded transition-colors group"
      title={activeTab.isRich ? 'Switch to Plain Text' : 'Switch to Rich Text'}
      data-testid="rich-text-toggle"
    >
      <FileText size={12} />
      <span className="text-xs text-gray-300">
        {activeTab.isRich ? 'Rich' : 'Text'}
      </span>
    </button>
  );
};