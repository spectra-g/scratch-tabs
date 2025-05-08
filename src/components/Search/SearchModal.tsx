import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { Search, X, CaseSensitive, CaseLower, WholeWord, BookType, ListFilter, History, Trash2, ChevronDown, Loader2 } from 'lucide-react';

import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { useSearchStore, SearchScope, SearchOptions, SearchResult } from '../../stores/searchStore';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { searchTabs, highlightMatchesInText } from '../../services/searchService';
import { languageRegistry } from '../../languages';
import { SearchPreviewPane } from './SearchPreviewPane'; // Create this component

const DEBOUNCE_DELAY = 300;

// --- SearchResultItem Component (Internal or Separate File) ---
interface SearchResultItemProps {
    result: SearchResult;
    isSelected: boolean;
    onSelect: () => void;
    searchQuery: string; // Pass query for highlighting
    searchOptions: SearchOptions; // Pass options for highlighting
    itemRef: React.RefObject<HTMLDivElement>; // Ref for scrolling
}

const SearchResultItem: React.FC<SearchResultItemProps> = React.memo(({
    result,
    isSelected,
    onSelect,
    searchQuery,
    searchOptions,
    itemRef // Receive the ref
}) => {
    const highlightedLine = useMemo(() => {
        // Highlight only the matching part within the lineText
        return highlightMatchesInText(result.lineText, searchQuery, searchOptions);
    }, [result.lineText, searchQuery, searchOptions]);

    // Scroll into view if selected
    useEffect(() => {
        if (isSelected && itemRef.current) {
            itemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [isSelected, itemRef]);

    return (
        <div
            ref={itemRef} // Attach the ref here
            // Removed style prop application
            className={`border-b border-gray-700/50 cursor-pointer p-2 ${isSelected ? 'bg-blue-900/20' : 'hover:bg-gray-700/30'}`}
            onClick={onSelect}
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
        >
            <div className="flex justify-between items-start text-xs">
                {/* Left: Highlighted Line */}
                <div className="flex-1 font-mono mr-4 overflow-hidden">
                    <span className="text-gray-500 mr-2">{result.lineNumber}:</span>
                    {/* Careful with dangerouslySetInnerHTML */}
                    <span
                        className="text-gray-100 whitespace-pre" // Allow wrapping maybe? Or keep pre? `whitespace-pre-wrap`
                        dangerouslySetInnerHTML={{ __html: highlightedLine }}
                    />
                </div>
                {/* Right: File Info */}
                <div className="text-gray-400 text-right flex-shrink-0 max-w-[40%]" title={result.tabTitle}>
                    <span className="truncate block">{result.tabTitle}</span>
                    <span className="text-gray-500"> ({result.language})</span>
                </div>
            </div>
        </div>
    );
});
SearchResultItem.displayName = 'SearchResultItem';

// --- Main Search Modal Component ---
export const SearchModal: React.FC = () => {
    const {
        isOpen, closeSearch, query, setQuery, results, selectedResultIndex, setSelectedResultIndex,
        scope, setScope, options, setOptions, titleFilter, setTitleFilter, languageFilter,
        setLanguageFilter, searchHistory, addSearchToHistory, clearHistory, isLoading, statusMessage,
        error, setLoading, setError, setResults, setStatusMessage, clearResults
    } = useSearchStore();

    const { tabs } = useRootStore();
    const { activeWorkspaceId, workspaces } = useWorkspaceStore();

    const [showHistory, setShowHistory] = useState(false);
    const [showLangFilter, setShowLangFilter] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const langFilterRef = useRef<HTMLDivElement>(null);
    const resultsListContainerRef = useRef<HTMLDivElement>(null); // Ref for the div that WILL contain the list
    const resultsContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable container
    const selectedItemRef = useRef<HTMLDivElement>(null); // Ref for the selected item

    // --- Fetching Tabs Based on Scope ---
    const getTabsToSearch = useCallback(() => {
        if (scope === 'activeWorkspace') {
            return tabs.filter(tab => tab.workspaceId === activeWorkspaceId);
        } else {
            return tabs; // All workspaces
        }
    }, [tabs, scope, activeWorkspaceId]);

    // --- Glob Pattern Matching ---
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

    // --- Run Search Logic ---
    const runSearch = useCallback(debounce(() => {
        // Get the latest state values directly inside the debounced function
        // This avoids stale closure issues with state variables in the dependency array
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
        setSelectedResultIndex(null); // Deselect result while searching

        // Add to history only when search is run
        // Note: Accessing addSearchToHistory directly might still use stale state
        // It's safer to get the action from the store instance if needed inside debounce,
        // but for history, adding it here based on currentQuery is usually okay.
        addSearchToHistory(currentQuery);

        // Use setTimeout to allow UI to update loading state *before* blocking calculation
        setTimeout(() => {
            try {
                let tabsForScope: Tab[];
                if (currentScope === 'activeWorkspace') {
                    // Need to get current tabs and activeWorkspaceId here
                    const allTabs = useRootStore.getState().tabs;
                    const currentActiveWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId;
                    tabsForScope = allTabs.filter(tab => tab.workspaceId === currentActiveWorkspaceId);
                } else {
                    tabsForScope = useRootStore.getState().tabs;
                }


                let filteredTabs = tabsForScope;

                // Apply title filter
                if (currentTitleFilter) {
                    // Re-evaluate matchesTitleFilter here or ensure it doesn't rely on stale state
                    filteredTabs = filteredTabs.filter(tab => matchesTitleFilter(tab.title));
                }

                // Apply language filter
                if (currentLanguageFilter.length > 0) {
                    const langSet = new Set(currentLanguageFilter);
                    filteredTabs = filteredTabs.filter(tab => langSet.has(tab.language));
                }

                const foundResults = searchTabs(currentQuery, currentOptions, filteredTabs);
                setResults(foundResults); // Update results in the store

                if (foundResults.length === 0) {
                    setStatusMessage('No results found.');
                } else {
                    const uniqueTabs = new Set(foundResults.map(r => r.tabId));
                    setStatusMessage(`${foundResults.length} match${foundResults.length === 1 ? '' : 'es'} in ${uniqueTabs.size} tab${uniqueTabs.size === 1 ? '' : 's'}`);
                    setSelectedResultIndex(0); // Select first result after search
                }
            } catch (e) {
                console.error("Search error:", e);
                setError(e instanceof Error ? e.message : "An unknown error occurred during search.");
                setResults([]);
                setStatusMessage('Search failed.');
            } finally {
                setLoading(false);
            }
        }, 50); // Short delay (50ms) just to let loading state render

    }, DEBOUNCE_DELAY), // This is the correct place for the debounce delay
        // Dependencies for useCallback:
        // We need to include functions from the store that are used *outside* the debounce
        // The functions inside debounce should ideally get fresh state using .getState()
        // to avoid stale closures or overly complex dependency arrays.
        [
            setStatusMessage, setResults, setLoading, setError, setSelectedResultIndex,
            addSearchToHistory, matchesTitleFilter // Include helpers used outside debounce if they rely on state/props
            // Note: Removed state variables like query, options, etc. from deps
            // as we get fresh state inside the debounced function using getState()
        ]
    );

    // --- Trigger Search on Relevant Changes ---
    useEffect(() => {
        if (isOpen) {
            runSearch();
        }
        // Cleanup debounce timer on unmount or when dependencies change
        return () => runSearch.cancel();
    }, [isOpen, query, options, scope, titleFilter, languageFilter, runSearch]);

    // --- Focus Input on Open ---
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen]);

    // --- Click Outside Handlers ---
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


    // --- Event Handlers ---
    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        // Search is triggered by useEffect watching debounced query
    };

     const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!results.length) return;

        let newIndex = selectedResultIndex ?? -1; // Start at -1 if null

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            newIndex = Math.min(newIndex + 1, results.length - 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            newIndex = Math.max(newIndex - 1, 0);
        } else if (e.key === 'Enter') {
             if (selectedResultIndex !== null && results[selectedResultIndex]) {
                 // TODO: Implement navigation to the selected tab/line
                 // handleResultNavigation(results[selectedResultIndex]);
                 console.log("Navigate to:", results[selectedResultIndex]);
                 closeSearch(); // Close modal on Enter for now
             }
        } else {
            return; // Ignore other keys
        }

        setSelectedResultIndex(newIndex);
    };

    const handleHistoryClick = (histQuery: string) => {
        setQuery(histQuery);
        setShowHistory(false);
        // Search will trigger via useEffect
    };

    const handleLangCheckboxChange = (langId: string, checked: boolean) => {
        setLanguageFilter(
            checked
                ? [...languageFilter, langId]
                : languageFilter.filter(id => id !== langId)
        );
        // Search will trigger via useEffect
    };

    const languages = useMemo(() => languageRegistry.getAll().sort((a, b) => a.name.localeCompare(b.name)), []);
    const selectedResult = (selectedResultIndex !== null && results[selectedResultIndex]) ? results[selectedResultIndex] : null;
    const selectedTab = selectedResult ? tabs.find(t => t.id === selectedResult.tabId) : null;

    if (!isOpen) return null;

    return (
        <BaseModal title="Find in Tabs" onClose={closeSearch} maxWidthClass="max-w-6xl" maxHeightClass="max-h-[93vh]">
            {/* Main div listens for keydown */}
            <div className="flex flex-col h-[85vh]" onKeyDown={handleKeyDown} tabIndex={-1}> {/* Add tabIndex to make it focusable */}
                {/* Top Controls */}
                <div className="flex-none p-3 border-b border-gray-700/50 space-y-3">
                    {/* Search Input & History */}
                    <div className="flex items-center space-x-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={handleQueryChange}
                            placeholder="Search..."
                            className="w-full bg-gray-800/50 border border-gray-600/80 rounded-md pl-10 pr-2 py-1.5 text-gray-100 focus:outline-none focus:border-blue-600/70 focus:ring-1 focus:ring-blue-600/50"
                        />
                        {searchHistory.length > 0 && (
                             <button
                                onClick={() => setShowHistory(!showHistory)}
                                className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded"
                                title="Search History"
                            >
                                <History size={16}/>
                            </button>
                        )}
                        {/* History Dropdown */}
                        {showHistory && searchHistory.length > 0 && (
                            <div ref={historyRef} className="absolute top-full right-0 mt-1 w-64 bg-gray-800 border border-gray-600/80 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center p-1 border-b border-gray-600/50">
                                     <span className="text-xs text-gray-400 px-2">Recent Searches</span>
                                     <button
                                        onClick={(e) => { e.stopPropagation(); clearHistory(); setShowHistory(false); }}
                                        className="p-1 text-gray-400 hover:text-red-400 rounded" title="Clear History">
                                         <Trash2 size={12}/>
                                     </button>
                                </div>
                                {searchHistory.map((histQuery, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleHistoryClick(histQuery)}
                                        className="block w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-700/50 truncate"
                                    >
                                        {histQuery}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Options & Filters */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {/* Case/Word Options */}
                        <div className="flex items-center space-x-1">
                           <button
                                onClick={() => setOptions({ caseSensitive: !options.caseSensitive })}
                                className={`p-1 rounded ${options.caseSensitive ? 'bg-blue-500/30 text-blue-300' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'}`}
                                title="Case Sensitive"
                           >
                               <CaseSensitive size={16}/>
                           </button>
                            <button
                                onClick={() => setOptions({ wholeWord: !options.wholeWord })}
                                className={`p-1 rounded ${options.wholeWord ? 'bg-blue-500/30 text-blue-300' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'}`}
                                title="Whole Word"
                           >
                               <WholeWord size={16}/>
                           </button>
                        </div>

                        {/* Title Filter */}
                        <div className="flex items-center space-x-2 flex-1 min-w-[150px]">
                             <label htmlFor="titleFilter" className="text-sm text-gray-400 flex-shrink-0">Tab title:</label>
                             <input
                                id="titleFilter"
                                type="text"
                                value={titleFilter}
                                onChange={(e) => setTitleFilter(e.target.value)}
                                placeholder="e.g. *Todo*, *.tsx"
                                className="flex-grow bg-gray-800/50 border border-gray-600/80 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-blue-600/70 focus:ring-1 focus:ring-blue-600/50"
                            />
                        </div>

                        {/* Language Filter Dropdown */}
                        <div className="relative">
                           <button
                                onClick={() => setShowLangFilter(!showLangFilter)}
                                className="flex items-center space-x-1 px-2 py-0.5 bg-gray-700/50 border border-gray-600/80 rounded text-xs text-gray-300 hover:bg-gray-600/50"
                            >
                                <ListFilter size={12} />
                                <span>Languages ({languageFilter.length || 'All'})</span>
                                <ChevronDown size={12} />
                            </button>
                             {showLangFilter && (
                                <div ref={langFilterRef} className="absolute top-full left-0 mt-1 w-56 bg-gray-800 border border-gray-600/80 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar py-1">
                                     <button
                                        onClick={() => setLanguageFilter([])} // Clear all
                                        className="block w-full text-left px-3 py-1 text-xs text-gray-400 hover:bg-gray-700/50 italic"
                                    >
                                        (All Languages)
                                    </button>
                                    <div className="border-t border-gray-600/50 my-1"></div>
                                    {languages.map(lang => (
                                        <label key={lang.id} className="flex items-center space-x-2 px-3 py-1 hover:bg-gray-700/50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={languageFilter.includes(lang.id)}
                                                onChange={(e) => handleLangCheckboxChange(lang.id, e.target.checked)}
                                                className="h-3 w-3 rounded border-gray-500 text-blue-500 focus:ring-blue-600/50 bg-gray-700 accent-blue-500"
                                            />
                                            <span className="text-xs text-gray-200">{lang.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Scope Selector */}
                        <div className="flex items-center space-x-2">
                            <label className="text-sm text-gray-400">Scope:</label>
                            <select
                                value={scope}
                                onChange={(e) => setScope(e.target.value as SearchScope)}
                                className="bg-gray-800/50 border border-gray-600/80 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-blue-600/70 focus:ring-1 focus:ring-blue-600/50"
                            >
                                <option value="activeWorkspace">Active Workspace</option>
                                <option value="allWorkspaces">All Workspaces</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Main Content Area (Results + Preview) */}
                <div className="flex-1 flex overflow-hidden"> {/* Parent flex container */}
                    {/* Results List Container */}
                    <div ref={resultsContainerRef} className="w-1/2 border-r border-gray-700/50 flex flex-col overflow-y-auto custom-scrollbar">
                        {isLoading ? (
                             <div className="flex items-center justify-center h-full text-gray-400">
                                <Loader2 size={24} className="animate-spin mr-2"/> Searching...
                             </div>
                        ) : error ? (
                            <div className="p-4 text-red-400">{error}</div>
                        ) : results.length > 0 ? (
                            // --- Render simple list using map ---
                            <div> {/* Optional: Add padding if needed */}
                                {results.map((result, index) => (
                                    <SearchResultItem
                                        key={`${result.tabId}-${result.lineNumber}-${result.matchIndex}`} // Unique key
                                        itemRef={index === selectedResultIndex ? selectedItemRef : React.createRef()} // Pass ref conditionally
                                        result={result}
                                        isSelected={index === selectedResultIndex}
                                        onSelect={() => setSelectedResultIndex(index)}
                                        searchQuery={query}
                                        searchOptions={options}
                                    />
                                ))}
                            </div>
                        ) : (
                             <div className="flex items-center justify-center h-full text-gray-500">
                                {statusMessage}
                             </div>
                        )}
                    </div> {/* End Results List Container */}

                    {/* Preview Pane */}
                    <div className="w-1/2">
                        <SearchPreviewPane
                            tab={selectedTab}
                            selectedResult={selectedResult}
                        />
                    </div>
                </div>

                {/* Footer Status */}
                <div className="flex-none p-2 border-t border-gray-700/50 text-xs text-gray-400">
                    {statusMessage}
                </div>
            </div>
        </BaseModal>
    );
};