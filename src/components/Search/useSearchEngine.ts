import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { StorageProviderFactory } from '../../db';
import { useSearchStore, SearchScope, SearchOptions, SearchResult } from '../../stores/searchStore';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { searchTabs } from '../../services/searchService';
import { languageRegistry } from '../../languages';
import { Tab } from '../../types';

const DEBOUNCE_DELAY = 300;

export interface SearchEngine {
  // Store state
  isOpen: boolean;
  query: string;
  results: SearchResult[];
  selectedResultIndex: number | null;
  scope: SearchScope;
  options: SearchOptions;
  titleFilter: string;
  languageFilter: string[];
  searchHistory: string[];
  isLoading: boolean;
  statusMessage: string;
  error: string | null;
  
  // UI state
  showHistory: boolean;
  showLangFilter: boolean;
  languages: Array<{ id: string; name: string }>;
  selectedResult: SearchResult | null;
  selectedTabForModalContext: Tab | null;
  
  // Refs
  inputRef: React.RefObject<HTMLInputElement>;
  historyRef: React.RefObject<HTMLDivElement>;
  langFilterRef: React.RefObject<HTMLDivElement>;
  resultsContainerRef: React.RefObject<HTMLDivElement>;
  selectedItemRef: React.RefObject<HTMLDivElement>;
  
  // Actions
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setSelectedResultIndex: (index: number | null) => void;
  setScope: (scope: SearchScope) => void;
  setOptions: (options: Partial<SearchOptions>) => void;
  setTitleFilter: (filter: string) => void;
  setLanguageFilter: (filter: string[]) => void;
  clearHistory: () => void;
  setShowHistory: (show: boolean) => void;
  setShowLangFilter: (show: boolean) => void;
  
  // Event handlers
  handleQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleHistoryClick: (histQuery: string) => void;
  handleLangCheckboxChange: (langId: string, checked: boolean) => void;
  handleResultNavigation: (result: SearchResult) => Promise<void>;
  
  // Utility functions
  matchesTitleFilter: (tabTitle: string) => boolean;
  runSearch: () => void;
}

export const useSearchEngine = (): SearchEngine => {
  const {
    isOpen, closeSearch, query, setQuery, results, selectedResultIndex, setSelectedResultIndex,
    scope, setScope, options, setOptions, titleFilter, setTitleFilter, languageFilter,
    setLanguageFilter, searchHistory, addSearchToHistory, clearHistory, isLoading, statusMessage,
    error, setLoading, setError, setResults, setStatusMessage
  } = useSearchStore();

  const { tabs: allTabsInCurrentWorkspace, setActiveLeftTab, setActiveRightTab, setActiveSide } = useRootStore();
  const { switchWorkspace, activeWorkspaceId: currentActiveWsId } = useWorkspaceStore();

  const storage = StorageProviderFactory.getProvider();

  // UI state
  const [showHistory, setShowHistory] = useState(false);
  const [showLangFilter, setShowLangFilter] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const langFilterRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Computed values
  const languages = useMemo(() => languageRegistry.getAll().sort((a, b) => a.name.localeCompare(b.name)), []);
  const currentResults = useSearchStore(state => state.results);
  const currentSelectedResultIndex = useSearchStore(state => state.selectedResultIndex);
  const selectedResult = (currentSelectedResultIndex !== null && currentResults[currentSelectedResultIndex])
    ? currentResults[currentSelectedResultIndex]
    : null;
  const selectedTabForModalContext = selectedResult
    ? allTabsInCurrentWorkspace.find(t => t.id === selectedResult.tabId) || null
    : null;

  // Glob Pattern Matching
  const matchesTitleFilter = useCallback((tabTitle: string) => {
    if (!titleFilter) return true;
    try {
      // Basic glob: convert * to .*? and escape regex chars
      const regexPattern = '^' + titleFilter
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex chars
        .replace(/\*/g, '.*?') // Convert * to non-greedy match
        + '$';
      const regex = new RegExp(regexPattern, 'i'); // Case-insensitive
      return regex.test(tabTitle);
    } catch (e) {
      console.error("Invalid title filter pattern:", e);
      setError("Invalid title filter pattern.");
      return false; // Treat invalid pattern as no match
    }
  }, [titleFilter, setError]);

  const runSearch = useCallback(debounce(async () => {
    const currentQuery = useSearchStore.getState().query;
    const currentOptions = useSearchStore.getState().options;
    const currentScope = useSearchStore.getState().scope;
    const currentTitleFilter = useSearchStore.getState().titleFilter;
    const currentLanguageFilter = useSearchStore.getState().languageFilter;

    if (!currentQuery || currentQuery.trim().length < 1) {
      setStatusMessage('Enter text to search.');
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatusMessage('Searching...');
    setError(null);
    setSelectedResultIndex(null);
    addSearchToHistory(currentQuery);

    // Use setTimeout to allow UI to update loading state
    setTimeout(async () => {
      try {
        let tabsToSearch: Tab[];

        if (currentScope === 'activeWorkspace') {
          tabsToSearch = allTabsInCurrentWorkspace.filter(tab => tab.workspaceId === currentActiveWsId);
        } else { // 'allWorkspaces'
          tabsToSearch = await storage.getTabs();
        }

        let filteredTabs = tabsToSearch;

        if (currentTitleFilter) {
          filteredTabs = filteredTabs.filter(tab => matchesTitleFilter(tab.title));
        }

        if (currentLanguageFilter.length > 0) {
          const langSet = new Set(currentLanguageFilter);
          filteredTabs = filteredTabs.filter(tab => langSet.has(tab.language));
        }

        const foundResults = searchTabs(currentQuery, currentOptions, filteredTabs);
        setResults(foundResults);

        if (foundResults.length === 0) {
          setStatusMessage('No results found.');
        } else {
          const uniqueTabs = new Set(foundResults.map(r => r.tabId));
          setStatusMessage(`${foundResults.length} match${foundResults.length === 1 ? '' : 'es'} in ${uniqueTabs.size} file${uniqueTabs.size === 1 ? '' : 's'}`);
          setSelectedResultIndex(0);
        }
      } catch (e) {
        console.error("Search error:", e);
        setError(e instanceof Error ? e.message : "An unknown error occurred during search.");
        setResults([]);
        setStatusMessage('Search failed.');
      } finally {
        setLoading(false);
      }
    }, 50);

  }, DEBOUNCE_DELAY), [
    setStatusMessage, setResults, setLoading, setError, setSelectedResultIndex,
    addSearchToHistory, matchesTitleFilter, allTabsInCurrentWorkspace, currentActiveWsId, storage
  ]);

  // Search effect
  useEffect(() => {
    if (isOpen) {
      runSearch();
    }
    return () => runSearch.cancel();
  }, [isOpen, query, options, scope, titleFilter, languageFilter, runSearch]);

  // Focus Input on Open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Click Outside Handlers
  const useClickOutside = (ref: React.RefObject<HTMLElement>, handler: () => void) => {
    useEffect(() => {
      const listener = (event: MouseEvent | TouchEvent) => {
        if (!ref.current || ref.current.contains(event.target as Node)) {
          return;
        }
        handler();
      };
      document.addEventListener("mousedown", listener);
      document.addEventListener("touchstart", listener);
      return () => {
        document.removeEventListener("mousedown", listener);
        document.removeEventListener("touchstart", listener);
      };
    }, [ref, handler]);
  };

  useClickOutside(historyRef, () => setShowHistory(false));
  useClickOutside(langFilterRef, () => setShowLangFilter(false));

  // Result Navigation Handler
  const handleResultNavigation = useCallback(async (result: SearchResult) => {
    closeSearch();

    // 1. Check if we need to switch workspaces
    if (result.workspaceId !== currentActiveWsId) {
      try {
        await switchWorkspace(result.workspaceId);
        await new Promise(resolve => setTimeout(resolve, 150)); // Small delay for state to settle
      } catch (error) {
        console.error("Failed to switch workspace:", error);
        setError("Could not switch to the tab's workspace.");
        return;
      }
    }

    // At this point, the correct workspace should be active
    const updatedRootState = useRootStore.getState();
    const targetTabSide = updatedRootState.splitView.leftTabs.includes(result.tabId) ? 'left'
                        : updatedRootState.splitView.rightTabs.includes(result.tabId) ? 'right'
                        : null;

    if (targetTabSide === 'left') {
      setActiveLeftTab(result.tabId);
      setActiveSide('left');
    } else if (targetTabSide === 'right') {
      setActiveRightTab(result.tabId);
      setActiveSide('right');
    } else {
      // Tab not found in either side of the current splitView after potential workspace switch
      const allCurrentTabs = updatedRootState.tabs;
      if (allCurrentTabs.find(t => t.id === result.tabId)) {
        setActiveLeftTab(result.tabId); // Default to left
        setActiveSide('left');
        if (!updatedRootState.splitView.leftTabs.includes(result.tabId)) {
          console.warn(`Tab ${result.tabId} activated but was not in expected splitView side.`);
        }
      } else {
        setError(`Tab "${result.tabTitle}" could not be found or activated.`);
        console.error(`Tab ${result.tabId} not found after workspace switch or in current workspace.`);
      }
    }
  }, [closeSearch, currentActiveWsId, switchWorkspace, setError, setActiveLeftTab, setActiveRightTab, setActiveSide]);

  // Event Handlers
  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, [setQuery]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!results.length) return;

    let newIndex = selectedResultIndex ?? -1; // Start at -1 if null

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      newIndex = Math.min(newIndex + 1, results.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      newIndex = Math.max(newIndex - 1, 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedResultIndex !== null && results[selectedResultIndex]) {
        handleResultNavigation(results[selectedResultIndex]);
      }
    } else {
      return; // Ignore other keys
    }

    setSelectedResultIndex(newIndex);
  }, [results, selectedResultIndex, setSelectedResultIndex, handleResultNavigation]);

  const handleHistoryClick = useCallback((histQuery: string) => {
    setQuery(histQuery);
    setShowHistory(false);
  }, [setQuery]);

  const handleLangCheckboxChange = useCallback((langId: string, checked: boolean) => {
    setLanguageFilter(
      checked
        ? [...languageFilter, langId]
        : languageFilter.filter(id => id !== langId)
    );
  }, [languageFilter, setLanguageFilter]);

  return {
    // Store state
    isOpen,
    query,
    results,
    selectedResultIndex,
    scope,
    options,
    titleFilter,
    languageFilter,
    searchHistory,
    isLoading,
    statusMessage,
    error,
    
    // UI state
    showHistory,
    showLangFilter,
    languages,
    selectedResult,
    selectedTabForModalContext,
    
    // Refs
    inputRef,
    historyRef,
    langFilterRef,
    resultsContainerRef,
    selectedItemRef,
    
    // Actions
    closeSearch,
    setQuery,
    setSelectedResultIndex,
    setScope,
    setOptions,
    setTitleFilter,
    setLanguageFilter,
    clearHistory,
    setShowHistory,
    setShowLangFilter,
    
    // Event handlers
    handleQueryChange,
    handleKeyDown,
    handleHistoryClick,
    handleLangCheckboxChange,
    handleResultNavigation,
    
    // Utility functions
    matchesTitleFilter,
    runSearch,
  };
}; 