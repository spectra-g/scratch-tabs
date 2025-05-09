import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SearchResult {
    tabId: string;
    workspaceId: string; // To know which workspace it belongs to
    tabTitle: string;    // Store title for display
    language: string;    // Store language for filtering/display
    lineNumber: number;
    lineText: string;    // The full line where the match occurred
    matchIndex: number;  // Start index of the match within the lineText
    matchLength: number; // Length of the match
    tabContent: string;
}

export interface SearchOptions {
    caseSensitive: boolean;
    wholeWord: boolean;
    // isRegex: boolean; // Excluded for now
}

export type SearchScope = 'activeWorkspace' | 'allWorkspaces';

interface SearchState {
    isOpen: boolean;
    query: string;
    results: SearchResult[];
    selectedResultIndex: number | null;
    scope: SearchScope;
    options: SearchOptions;
    titleFilter: string; // Glob pattern like *Todo*
    languageFilter: string[]; // Array of language IDs (e.g., ['json', 'markdown'])
    searchHistory: string[];
    isLoading: boolean;
    statusMessage: string;
    error: string | null;
    // --- Actions ---
    toggleSearch: (initialQuery?: string) => void;
    setQuery: (query: string) => void;
    setScope: (scope: SearchScope) => void;
    setOptions: (options: Partial<SearchOptions>) => void;
    setTitleFilter: (filter: string) => void;
    setLanguageFilter: (languages: string[]) => void;
    addSearchToHistory: (query: string) => void;
    clearHistory: () => void;
    setResults: (results: SearchResult[]) => void;
    setSelectedResultIndex: (index: number | null) => void;
    setLoading: (loading: boolean) => void;
    setStatusMessage: (message: string) => void;
    setError: (error: string | null) => void;
    clearResults: () => void;
    closeSearch: () => void;
}

const MAX_HISTORY = 20;

export const useSearchStore = create<SearchState>()(
    persist(
        (set, get) => ({
            isOpen: false,
            query: '',
            results: [],
            selectedResultIndex: null,
            scope: 'activeWorkspace',
            options: {
                caseSensitive: false,
                wholeWord: false,
                // isRegex: false,
            },
            titleFilter: '',
            languageFilter: [],
            searchHistory: [],
            isLoading: false,
            statusMessage: 'Enter text to search.',
            error: null,

            toggleSearch: (initialQuery = '') => set((state) => {
                const newState = !state.isOpen;
                return {
                    isOpen: newState,
                    query: newState && initialQuery ? initialQuery : (newState ? state.query : ''), // Populate if opening with initial query
                    error: null, // Clear error on open/close
                    statusMessage: newState ? (initialQuery ? 'Searching...' : 'Enter text to search.') : 'Search closed.', // Update status
                    // Don't clear results on open, maybe user wants to refine
                }
            }),
            setQuery: (query) => set({ query, error: null, selectedResultIndex: null }), // Reset selection on query change
            setScope: (scope) => set({ scope, error: null, selectedResultIndex: null }),
            setOptions: (newOptions) => set((state) => ({
                options: { ...state.options, ...newOptions },
                error: null,
                selectedResultIndex: null
            })),
            setTitleFilter: (filter) => set({ titleFilter: filter, error: null, selectedResultIndex: null }),
            setLanguageFilter: (languages) => set({ languageFilter: languages, error: null, selectedResultIndex: null }),

            addSearchToHistory: (query) => {
                if (!query || query.trim().length < 2) return; // Ignore empty or very short queries
                set((state) => {
                    const lowerQuery = query.toLowerCase();
                    const newHistory = [
                        query,
                        ...state.searchHistory.filter(h => h.toLowerCase() !== lowerQuery) // Prevent duplicates (case-insensitive)
                    ].slice(0, MAX_HISTORY);
                    return { searchHistory: newHistory };
                });
            },
            clearHistory: () => set({ searchHistory: [] }),

            setResults: (results) => set({ results, selectedResultIndex: results.length > 0 ? 0 : null }), // Auto-select first result
            setSelectedResultIndex: (index) => set({ selectedResultIndex: index }),
            setLoading: (loading) => set({ isLoading: loading }),
            setStatusMessage: (message) => set({ statusMessage: message }),
            setError: (error) => set({ error, isLoading: false }), // Stop loading on error
            clearResults: () => set({ results: [], selectedResultIndex: null, statusMessage: 'Results cleared.', error: null }),
            closeSearch: () => set({ isOpen: false, statusMessage: 'Search closed.' }) // Explicit close action
        }),
        {
            name: 'scratch-tabs-search-storage', // Name of the item in storage
            storage: createJSONStorage(() => localStorage), // Use localStorage
            partialize: (state) => ({
                // Only persist history and user preferences
                searchHistory: state.searchHistory,
                scope: state.scope,
                options: state.options,
                titleFilter: state.titleFilter,
                languageFilter: state.languageFilter,
            }),
        }
    )
);