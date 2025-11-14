import { create } from 'zustand';

/**
 * Define the shape of the state for a single panel
 */
interface QueryPanelState {
  isOpen: boolean;
  query: string;
  panelSizes: number[]; // For react-resizable-panels layout
}

/**
 * Store to manage the JSON Query Panel's state per tab
 */
interface QueryPanelStore {
  panels: Record<string, QueryPanelState>; // Dictionary keyed by tabId

  // Actions now operate on a specific tabId
  getStateForTab: (tabId: string) => QueryPanelState;
  togglePanel: (tabId: string) => void;
  openPanel: (tabId: string) => void;
  closePanel: (tabId: string) => void;
  setQuery: (tabId: string, query: string) => void;
  setPanelSizes: (tabId: string, sizes: number[]) => void;
  removePanelState: (tabId: string) => void; // For cleanup
}

const defaultPanelState: QueryPanelState = {
  isOpen: false,
  query: '',
  panelSizes: [70, 30], // Will be overridden by actual layout; keeping for reference
};

export const useQueryPanelStore = create<QueryPanelStore>((set, get) => ({
  panels: {},

  getStateForTab: (tabId: string) => {
    return get().panels[tabId] || defaultPanelState;
  },

  togglePanel: (tabId: string) =>
    set((state) => {
      const currentState = state.panels[tabId] || defaultPanelState;
      return {
        panels: {
          ...state.panels,
          [tabId]: { ...currentState, isOpen: !currentState.isOpen },
        },
      };
    }),

  openPanel: (tabId: string) =>
    set((state) => {
      const currentState = state.panels[tabId] || defaultPanelState;
      return {
        panels: {
          ...state.panels,
          [tabId]: { ...currentState, isOpen: true },
        },
      };
    }),

  closePanel: (tabId: string) =>
    set((state) => {
      const currentState = state.panels[tabId] || defaultPanelState;
      return {
        panels: {
          ...state.panels,
          [tabId]: { ...currentState, isOpen: false },
        },
      };
    }),

  setQuery: (tabId: string, query: string) =>
    set((state) => {
      const currentState = state.panels[tabId] || defaultPanelState;
      return {
        panels: {
          ...state.panels,
          [tabId]: { ...currentState, query },
        },
      };
    }),

  setPanelSizes: (tabId: string, sizes: number[]) =>
    set((state) => {
      const currentState = state.panels[tabId] || defaultPanelState;
      return {
        panels: {
          ...state.panels,
          [tabId]: { ...currentState, panelSizes: sizes },
        },
      };
    }),

  removePanelState: (tabId: string) =>
    set((state) => {
      const newPanels = { ...state.panels };
      delete newPanels[tabId];
      return { panels: newPanels };
    }),
}));
