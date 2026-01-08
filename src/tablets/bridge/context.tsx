import { createContext, useContext } from 'react';

/**
 * Context to provide the current tab ID to tablets
 * This allows tablets to know which tab they're rendering in
 */
interface TabletContextValue {
    tabId: string;
}

const TabletContext = createContext<TabletContextValue | null>(null);

/**
 * Hook to access the current tab ID from within a tablet
 * @throws Error if used outside of a TabletContext.Provider
 */
export function useTabletContext(): TabletContextValue {
    const context = useContext(TabletContext);
    if (!context) {
        throw new Error('useTabletContext must be used within a TabletContext.Provider');
    }
    return context;
}

export const TabletContextProvider = TabletContext.Provider;
