import React from 'react';
import { tabletRegistry } from '../tablets';
import { Tab } from '../types';

interface TabletViewProps {
  tab: Tab;
  onChange: (tabletState: string) => void;
}

export const TabletView: React.FC<TabletViewProps> = ({ tab, onChange }) => {
  if (!tab.isTablet || !tab.tabletState) {
    return null;
  }
  
  const state = JSON.parse(tab.tabletState);
  const tablet = tabletRegistry.getById(state.type);
  
  if (!tablet) {
    return (
      <div className="p-4 text-red-500">
        Unknown tablet type: {state.type}
      </div>
    );
  }
  
  return tablet.render(state, (newState) => {
    onChange(JSON.stringify(newState));
  });
};