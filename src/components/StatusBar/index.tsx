import React from 'react';
import { useRootStore } from '../../stores';
import { getLanguageStatusItem } from './LanguageStatusItems';
import { Macro } from '../Macro';
import { tabletRegistry } from '../../tablets';

interface StatusBarProps {}

export const StatusBar: React.FC<StatusBarProps> = () => {
  const { cursorPosition, activeTabId } = useRootStore();

  const activeTab = useRootStore((state) =>
    state.tabs.find((tab) => tab.id === activeTabId)
  );

  // Get the tablet if this is a tablet tab
  let tabletLabel = '';
  if (activeTab?.isTablet && activeTab.tabletState) {
    try {
      const state = JSON.parse(activeTab.tabletState);
      const tablet = tabletRegistry.getById(state.type);
      if (tablet) {
        tabletLabel = tablet.label;
      }
    } catch (e) {
      // If there's an error parsing the state, fall back to showing the language
      console.error('Error parsing tablet state:', e);
    }
  }

  const LanguageStatusItem = activeTab && !activeTab.isTablet ? 
    getLanguageStatusItem(activeTab.language, activeTab.content) : null;

  return (
    <div className="flex items-center justify-between px-3 py-0.5 bg-gray-800 text-gray-300 text-xs">
      <div className="flex items-center space-x-4">
        <span>
          Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}
        </span>
        {activeTab && (
          <div className="p-0.5 flex items-center space-x-2">
            <span className="capitalize">
              {tabletLabel || activeTab.language}
            </span>
            {LanguageStatusItem && <LanguageStatusItem />}
          </div>
        )}
      </div>
      <Macro />
    </div>
  );
};