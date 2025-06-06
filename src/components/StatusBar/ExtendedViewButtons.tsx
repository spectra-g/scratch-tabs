import React from 'react';
import { extendedViewRegistry } from '../../views/registry';
import { useRootStore } from '../../stores';

interface ExtendedViewButtonsProps {
  language: string;
  tabId: string;
}

export const ExtendedViewButtons: React.FC<ExtendedViewButtonsProps> = ({ language, tabId }) => {
  const { getActiveView, setActiveView } = useRootStore();
  const activeViewId = getActiveView(tabId);
  
  const availableViews = extendedViewRegistry.getViewsForLanguage(language);
  
  if (availableViews.length === 0) {
    return null;
  }

  return (
    <>
      {availableViews.map((view) => {
        const isActive = activeViewId === view.id;
        const Icon = view.icon;
        
        return (
          <button
            key={view.id}
            onClick={() => setActiveView(tabId, isActive ? null : view.id)}
            className={`p-0.75 rounded transition-colors ${
              isActive 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-700 text-gray-300'
            }`}
            title={`${isActive ? 'Close' : 'Open'} ${view.label}`}
          >
            <Icon size={14} />
          </button>
        );
      })}
    </>
  );
}; 