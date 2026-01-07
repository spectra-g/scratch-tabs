import { create } from 'zustand';

type SearchMode = "keyValue" | "path";
type SearchExpansion = "matched" | "children";

/**
 * Define the shape of the state for a single navigator instance
 */
interface NavigatorState {
  inputValue: string;
  searchMode: SearchMode;
  searchExpansion: SearchExpansion;
  expandedPaths: string[]; // Stored as array, converted to/from Set in component
  selectedPath: string;
  showSettings: boolean;
}

/**
 * Store to manage the JSON Navigator's state per tab
 */
interface NavigatorStore {
  navigators: Record<string, NavigatorState>; // Dictionary keyed by tabId

  // Actions operate on a specific tabId
  getStateForTab: (tabId: string) => NavigatorState;
  setInputValue: (tabId: string, inputValue: string) => void;
  setSearchMode: (tabId: string, searchMode: SearchMode) => void;
  setSearchExpansion: (tabId: string, searchExpansion: SearchExpansion) => void;
  setExpandedPaths: (tabId: string, expandedPaths: string[]) => void;
  setSelectedPath: (tabId: string, selectedPath: string) => void;
  setShowSettings: (tabId: string, showSettings: boolean) => void;
  removeNavigatorState: (tabId: string) => void; // For cleanup
}

const defaultNavigatorState: NavigatorState = {
  inputValue: '',
  searchMode: 'keyValue',
  searchExpansion: 'matched',
  expandedPaths: [''], // Root is expanded by default
  selectedPath: '',
  showSettings: false,
};

export const useNavigatorStore = create<NavigatorStore>((set, get) => ({
  navigators: {},

  getStateForTab: (tabId: string) => {
    return get().navigators[tabId] || defaultNavigatorState;
  },

  setInputValue: (tabId: string, inputValue: string) =>
    set((state) => {
      const currentState = state.navigators[tabId] || defaultNavigatorState;
      return {
        navigators: {
          ...state.navigators,
          [tabId]: { ...currentState, inputValue },
        },
      };
    }),

  setSearchMode: (tabId: string, searchMode: SearchMode) =>
    set((state) => {
      const currentState = state.navigators[tabId] || defaultNavigatorState;
      return {
        navigators: {
          ...state.navigators,
          [tabId]: { ...currentState, searchMode },
        },
      };
    }),

  setSearchExpansion: (tabId: string, searchExpansion: SearchExpansion) =>
    set((state) => {
      const currentState = state.navigators[tabId] || defaultNavigatorState;
      return {
        navigators: {
          ...state.navigators,
          [tabId]: { ...currentState, searchExpansion },
        },
      };
    }),

  setExpandedPaths: (tabId: string, expandedPaths: string[]) =>
    set((state) => {
      const currentState = state.navigators[tabId] || defaultNavigatorState;
      return {
        navigators: {
          ...state.navigators,
          [tabId]: { ...currentState, expandedPaths },
        },
      };
    }),

  setSelectedPath: (tabId: string, selectedPath: string) =>
    set((state) => {
      const currentState = state.navigators[tabId] || defaultNavigatorState;
      return {
        navigators: {
          ...state.navigators,
          [tabId]: { ...currentState, selectedPath },
        },
      };
    }),

  setShowSettings: (tabId: string, showSettings: boolean) =>
    set((state) => {
      const currentState = state.navigators[tabId] || defaultNavigatorState;
      return {
        navigators: {
          ...state.navigators,
          [tabId]: { ...currentState, showSettings },
        },
      };
    }),

  removeNavigatorState: (tabId: string) =>
    set((state) => {
      const newNavigators = { ...state.navigators };
      delete newNavigators[tabId];
      return { navigators: newNavigators };
    }),
}));
