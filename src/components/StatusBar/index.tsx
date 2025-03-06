import React from 'react';
import { useEditorStore } from '../../store';
import { getLanguageStatusItem } from './LanguageStatusItems';
import { Macro } from '../Macro';

interface StatusBarProps {
  side?: 'left' | 'right';
}

export const StatusBar: React.FC<StatusBarProps> = ({ side = 'left' }) => {
  const { cursorPosition, splitView } = useEditorStore();
  
  // Determine which tab to show based on the side
  const isRightSide = side === 'right';
  const activeTabId = isRightSide ? splitView.activeRightTabId : splitView.activeLeftTabId;
  
  const activeTab = useEditorStore((state) => 
    state.tabs.find((tab) => tab.id === activeTabId)
  );

  const LanguageStatusItem = activeTab ? getLanguageStatusItem(activeTab.language) : null;

  return (
    <div className="flex items-center justify-between px-3 py-0.5 bg-gray-800 text-gray-300 text-xs">
      <div className="flex items-center space-x-4">
        <span>
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>
        {activeTab && (
          <div className="p-0.5 flex items-center space-x-2">
            <span className="capitalize">{activeTab.language}</span>
            {LanguageStatusItem && <LanguageStatusItem />}
          </div>
        )}
      </div>
      {!isRightSide && <Macro />}
    </div>
  );
};