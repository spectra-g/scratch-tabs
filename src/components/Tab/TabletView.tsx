import React, {
  memo,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { tabletRegistry } from "../../tablets";
import { Tab } from "../../types.ts";
import { TabletErrorBoundary } from "../Tablet/TabletErrorBoundary";
import { useRootStore } from "../../stores";
import { useTabletCounting } from "../../tablets/utils/useTabletCounting";
import { TabletContextProvider } from "../../tablets/bridge/context";


interface TabletViewProps {
  tab: Tab;
  onChange: (tabletState: string) => void;
}

// Cache for created React Components - outside the component to persist across renders
// Make it tab-specific to prevent state sharing between tabs
const tabletComponentCache = new Map<string, React.FC<any>>();

// Memoized wrapper to prevent unnecessary re-renders
const TabletWrapper = memo<TabletViewProps>(({ tab, onChange }) => {
  const { removeTab } = useRootStore();
  const [ActiveTabletComponent, setActiveTabletComponent] =
    useState<React.FC<any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to store the onChange function to prevent infinite re-renders
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Extract tablet type more efficiently - only parse if needed
  const tabletType = useMemo(() => {
    if (!tab.isTablet || !tab.tabletState) {
      return null;
    }

    try {
      const parsed = JSON.parse(tab.tabletState || "{}");
      return parsed.type || null;
    } catch (e) {
      console.error("Failed to parse tablet state:", e);
      return null;
    }
  }, [tab.tabletState, tab.isTablet]);

  // Count tablet usage (production only, privacy-respecting)
  useTabletCounting(tabletType || '');

  // Parse state only when needed for rendering
  const state = useMemo(() => {
    if (!tab.isTablet || !tab.tabletState) {
      return null;
    }

    try {
      const parsedState = JSON.parse(tab.tabletState || "{}");
      return parsedState;
    } catch (e) {
      console.error("Failed to parse tablet state:", e);

      // Try to create a default state for the tablet type
      if (tabletType) {
        // We'll handle this in the loading logic
        return null;
      }
      return null;
    }
  }, [tab.tabletState, tab.isTablet, tabletType, tab.id]);

  // Create a wrapper for onChange that serializes the tablet state
  const handleTabletStateChange = useCallback(
    (newState: any) => {
      // We need to get the tablet to serialize the state
      // Since we don't have direct access to the tablet object here,
      // we'll use a fallback serialization
      try {
        const serializedState = JSON.stringify(newState);
        onChangeRef.current(serializedState);
      } catch (error) {
        console.error("Failed to serialize tablet state:", error);
      }
    },
    [tab.id],
  );

  // Load tablet and create stable component - only when tablet type changes
  useEffect(() => {
    // Don't load if not a tablet or no state
    if (!tab.isTablet || !tab.tabletState || !tabletType) {
      setIsLoading(false);
      setActiveTabletComponent(null);
      return;
    }

    let isMounted = true;

    const loadAndCreateComponent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check cache first
        const cacheKey = `${tabletType}-${tab.id}`;
        if (tabletComponentCache.has(cacheKey)) {
          if (isMounted) {
            setActiveTabletComponent(() => tabletComponentCache.get(cacheKey)!);
            setIsLoading(false);
          }
          return;
        }

        const loadedTablet = await tabletRegistry.getById(tabletType);

        if (isMounted && loadedTablet) {
          // Create a new, stable component for this tablet type with proper serialization
          // Each component is created with a unique key to ensure proper mounting/unmounting
          const NewComponent: React.FC<{
            state: any;
            onChange: (state: any) => void;
          }> = (props) => {
            // Validate that we have the correct state type for this tablet
            if (!props.state || props.state.type !== tabletType) {
              return (
                <div className="flex items-center justify-center h-full">
                  <div className="text-danger">Invalid tablet state</div>
                </div>
              );
            }

            const handleChange = (newState: any) => {
              if (loadedTablet.serializeState) {
                const serializedState = loadedTablet.serializeState(newState);
                onChangeRef.current(serializedState);
              } else {
                // Fallback serialization
                try {
                  const serializedState = JSON.stringify(newState);
                  onChangeRef.current(serializedState);
                } catch (error) {
                  console.error("Failed to serialize tablet state:", error);
                }
              }
            };

            return loadedTablet.render(props.state, handleChange);
          };

          NewComponent.displayName = `Tablet_${loadedTablet.id}`;

          // Cache the component for future use
          tabletComponentCache.set(cacheKey, NewComponent);
          setActiveTabletComponent(() => NewComponent);

          // If we have invalid state, create a new default state
          if (!state && loadedTablet.createInitialState) {
            const newState = loadedTablet.createInitialState();
            const serializedState = loadedTablet.serializeState(newState);
            onChangeRef.current(serializedState);
          }
        } else if (isMounted) {
          setError(`Tablet not found: ${tabletType}`);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`TabletView: Error loading tablet ${tabletType}:`, err);
          setError(
            err instanceof Error ? err.message : "Failed to load tablet",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAndCreateComponent();

    return () => {
      isMounted = false;
    };
  }, [tabletType, tab.id]); // Removed tab.tabletState to prevent unnecessary re-renders that cause cache issues

  // Error boundary recovery functions
  const handleCloseTab = () => {
    removeTab(tab.id);
  };

  const handleRetry = () => {
    // Clear the component cache for this tablet type and retry
    if (tabletType) {
      const cacheKey = `${tabletType}-${tab.id}`;
      tabletComponentCache.delete(cacheKey);
    }
    setActiveTabletComponent(null);
    setError(null);
    setIsLoading(true);
  };

  // Get tablet metadata to check config (memoized to prevent re-iteration on every render)
  const tabletMeta = useMemo(() => {
    return tabletRegistry.getAllMetadata().find(m => m.id === tabletType);
  }, [tabletType]);
  const showStandardHeader = tabletMeta?.config?.showStandardHeader ?? false;

  // Now handle all the conditional rendering after hooks are called
  if (!tab.isTablet || !tab.tabletState) {
    return null;
  }

  if (!state) {
    return <div className="p-4 text-danger">Invalid tablet state</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted">Loading tablet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-danger">
        Error loading tablet: {error}
        <button
          onClick={handleRetry}
          className="ml-2 px-2 py-1 bg-primary text-white rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!ActiveTabletComponent) {
    return (
      <div className="p-4 text-danger">Unknown tablet type: {tabletType}</div>
    );
  }

  return (
    <TabletErrorBoundary
      tabletType={tabletType || "unknown"}
      tabletId={tab.id}
      tabletState={tab.tabletState}
      onCloseTab={handleCloseTab}
      onRetry={handleRetry}
    >
      <div className="tablet-root text-main">
        {showStandardHeader && (
          <div className="tablet-toolbar justify-between">
            <div className="flex items-center space-x-3">
              {/* Note: Icon rendering would ideally be dynamic if we had the icon component available in metadata or registry.
                  For now, we'll use the label. If icons are needed, we'd need to fetch them.
                  However, standard header usually implies a simple title.
               */}
              <h2 className="text-xl font-semibold text-main">{tabletMeta?.label || "Tablet"}</h2>
            </div>
          </div>
        )}
        <div className="tablet-content-area overflow-hidden">
          <TabletContextProvider value={{ tabId: tab.id }}>
            <ActiveTabletComponent
              state={state}
              onChange={handleTabletStateChange}
            />
          </TabletContextProvider>
        </div>
      </div>
    </TabletErrorBoundary>
  );
});

export const TabletView: React.FC<TabletViewProps> = (props) => {
  return <TabletWrapper {...props} />;
};
