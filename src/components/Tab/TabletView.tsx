import React, { memo, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { tabletRegistry } from '../../tablets';
import { Tab } from '../../types.ts';
import { TabletErrorBoundary } from '../Tablet/TabletErrorBoundary';
import { useRootStore } from '../../stores';

interface TabletViewProps {
  tab: Tab;
  onChange: (tabletState: string) => void;
}

// Memoized wrapper to prevent unnecessary re-renders
const TabletWrapper = memo<TabletViewProps>(({ tab, onChange }) => {
  const { removeTab } = useRootStore();
  const [tablet, setTablet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use tab-specific refs to prevent state sharing between tabs
  const loadingRef = useRef<boolean>(false);
  const lastLoadedType = useRef<string | null>(null);
  const lastTabId = useRef<string | null>(null);
  
  // Extract tablet type more efficiently - only parse if needed
  const tabletType = useMemo(() => {
    if (!tab.isTablet || !tab.tabletState) {
      return null;
    }
    
    try {
      const parsed = JSON.parse(tab.tabletState || '{}');
      return parsed.type || null;
    } catch (e) {
      console.error('Failed to parse tablet state:', e);
      return null;
    }
  }, [tab.tabletState, tab.isTablet]);

  // Parse state only when needed for rendering
  const state = useMemo(() => {
    if (!tab.isTablet || !tab.tabletState) {
      return null;
    }
    
    try {
      // Check if the state is already an object (invalid state)
      if (typeof tab.tabletState === 'object') {
        console.warn('TabletView: tabletState is already an object, this indicates invalid state storage');
        return tab.tabletState;
      }
      
      return JSON.parse(tab.tabletState || '{}');
    } catch (e) {
      console.error('Failed to parse tablet state:', e);
      console.log('TabletView: Invalid tablet state:', tab.tabletState);
      
      // Try to create a default state for the tablet type
      if (tabletType) {
        console.log('TabletView: Attempting to create default state for tablet type:', tabletType);
        // We'll handle this in the loading logic
        return null;
      }
      return null;
    }
  }, [tab.tabletState, tab.isTablet, tabletType]);

  // Reset state when tab changes
  useEffect(() => {
    if (lastTabId.current !== tab.id) {
      console.log(`TabletView: Tab changed from ${lastTabId.current} to ${tab.id}, resetting state`);
      lastTabId.current = tab.id;
      lastLoadedType.current = null;
      setTablet(null);
      setError(null);
      setIsLoading(true);
      loadingRef.current = false;
    }
  }, [tab.id]);

  // Load tablet asynchronously - only when tablet type changes
  useEffect(() => {
    // Don't load if not a tablet or no state
    if (!tab.isTablet || !tab.tabletState || !tabletType) {
      setIsLoading(false);
      return;
    }

    // Don't reload if we already have this tablet type loaded for this tab
    if (lastLoadedType.current === tabletType && tablet && lastTabId.current === tab.id) {
      setIsLoading(false);
      return;
    }

    // Prevent multiple simultaneous loads
    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;
    let isMounted = true;
    
    const loadTablet = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`TabletView: Loading tablet ${tabletType} for tab ${tab.id}`);
        const loadedTablet = await tabletRegistry.getById(tabletType);
        
        if (isMounted && lastTabId.current === tab.id) {
          if (loadedTablet) {
            setTablet(loadedTablet);
            lastLoadedType.current = tabletType;
            
            // If we have invalid state, create a new default state
            if (!state && loadedTablet.createInitialState) {
              console.log('TabletView: Creating new default state for tablet:', tabletType);
              const newState = loadedTablet.createInitialState();
              const serializedState = loadedTablet.serializeState(newState);
              onChange(serializedState);
            }
          } else {
            setError(`Tablet not found: ${tabletType}`);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted && lastTabId.current === tab.id) {
          console.error(`TabletView: Error loading tablet ${tabletType}:`, err);
          setError(err instanceof Error ? err.message : 'Failed to load tablet');
          setIsLoading(false);
        }
      } finally {
        if (isMounted && lastTabId.current === tab.id) {
          loadingRef.current = false;
        }
      }
    };

    loadTablet();

    return () => {
      isMounted = false;
      if (lastTabId.current === tab.id) {
        loadingRef.current = false;
      }
    };
  }, [tabletType, tab.id]); // Removed state and onChange from dependencies

  // Create a wrapper for onChange that serializes the tablet state
  const handleTabletStateChange = useCallback((newState: any) => {
    if (tablet && tablet.serializeState) {
      const serializedState = tablet.serializeState(newState);
      onChange(serializedState);
    } else {
      // Fallback: try to serialize manually
      try {
        const serializedState = JSON.stringify(newState);
        onChange(serializedState);
      } catch (error) {
        console.error('Failed to serialize tablet state:', error);
      }
    }
  }, [tablet, onChange]);

  // Error boundary recovery functions
  const handleCloseTab = () => {
    removeTab(tab.id);
  };

  const handleRetry = () => {
    // Reset loading state and try again
    loadingRef.current = false;
    lastLoadedType.current = null;
    setTablet(null);
    setError(null);
    setIsLoading(true);
  };

  // Now handle all the conditional rendering after hooks are called
  if (!tab.isTablet || !tab.tabletState) {
    return null;
  }

  if (!state) {
    return (
      <div className="p-4 text-red-500">
        Invalid tablet state
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading tablet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading tablet: {error}
        <button 
          onClick={handleRetry}
          className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!tablet) {
    return (
      <div className="p-4 text-red-500">
        Unknown tablet type: {tabletType}
      </div>
    );
  }

  return (
    <TabletErrorBoundary
      key={`${tab.id}-${tabletType}`}
      tabletType={tabletType || 'unknown'}
      tabletId={tab.id}
      tabletState={tab.tabletState}
      onCloseTab={handleCloseTab}
      onRetry={handleRetry}
    >
      <div className="h-full">
        {tablet.render(state, handleTabletStateChange)}
      </div>
    </TabletErrorBoundary>
  );
});

export const TabletView: React.FC<TabletViewProps> = (props) => {
  return <TabletWrapper {...props} />;
};