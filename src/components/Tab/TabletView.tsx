import React, { memo, useMemo } from 'react';
import { tabletRegistry } from '../../tablets';
import { Tab } from '../../types.ts';
import { TabletErrorBoundary } from '../Tablet/TabletErrorBoundary';
import { useRootStore } from '../../stores';

interface TabletViewProps {
  tab: Tab;
  onChange: (tabletState: string) => void;
}

// Create individual components for each tablet type
const TabletComponents: Record<string, React.FC<{ state: any; onChange: (state: any) => void }>> = {};

function getTabletComponent(tabletId: string) {
  if (!TabletComponents[tabletId]) {
    const tablet = tabletRegistry.getById(tabletId);
    if (!tablet) return null;

    // Create a dedicated component for this tablet type
    TabletComponents[tabletId] = memo(({ state, onChange }) => {
      return <>{tablet.render(state, onChange)}</>;
    });
    
    // Set display name for better debugging
    TabletComponents[tabletId].displayName = `Tablet_${tabletId}`;
  }
  
  return TabletComponents[tabletId];
}

// Memoized wrapper to prevent unnecessary re-renders
const TabletWrapper = memo<TabletViewProps>(({ tab, onChange }) => {
  const { removeTab } = useRootStore();
  
  if (!tab.isTablet || !tab.tabletState) {
    return null;
  }
  
  const state = useMemo(() => {
    try {
      return JSON.parse(tab.tabletState || '{}');
    } catch (e) {
      console.error('Failed to parse tablet state:', e);
      return null;
    }
  }, [tab.tabletState]);

  if (!state) {
    return (
      <div className="p-4 text-red-500">
        Invalid tablet state
      </div>
    );
  }

  const TabletComponent = getTabletComponent(state.type);
  
  if (!TabletComponent) {
    return (
      <div className="p-4 text-red-500">
        Unknown tablet type: {state.type}
      </div>
    );
  }

  // Error boundary recovery functions
  const handleCloseTab = () => {
    removeTab(tab.id);
  };

  const handleRetry = () => {
    // Force a re-render by updating the tab state slightly
    onChange(tab.tabletState || '{}');
  };

  return (
    <TabletErrorBoundary
      tabletType={state.type || 'unknown'}
      tabletId={tab.id}
      tabletState={tab.tabletState}
      onCloseTab={handleCloseTab}
      onRetry={handleRetry}
    >
      <div className="h-full">
        <TabletComponent
          state={state}
          onChange={(newState) => onChange(JSON.stringify(newState))}
        />
      </div>
    </TabletErrorBoundary>
  );
});

TabletWrapper.displayName = 'TabletWrapper';

export const TabletView: React.FC<TabletViewProps> = (props) => {
  return <TabletWrapper {...props} />;
};