import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { Search, CaseSensitive, WholeWord, ListFilter, History, Trash2, ChevronDown, Loader2 } from 'lucide-react';

import { StorageProviderFactory } from '../../db';
import { BaseModal } from '../../languages/json/components/modals/BaseModal';
import { useSearchStore, SearchScope, SearchOptions, SearchResult } from '../../stores/searchStore';
import { useRootStore } from '../../stores';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { searchTabs, highlightMatchesInText } from '../../services/searchService';
import { languageRegistry } from '../../languages';
import { SearchPreviewPane } from './SearchPreviewPane';
import { Tab } from '../../types';

const DEBOUNCE_DELAY = 300;

interface SearchResultItemProps {
    result: SearchResult;
    isSelected: boolean;
    onSelect: () => void;
    onDoubleClick: (result: SearchResult) => void;
    searchQuery: string;
    searchOptions: SearchOptions;
    itemRef: React.RefObject<HTMLDivElement>;
}

const SearchResultItem: React.FC<SearchResultItemProps> = React.memo(({
    result,
    isSelected,
    onSelect,
    onDoubleClick,
    searchQuery,
    searchOptions,
    itemRef
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
            ref={itemRef}
            className={`border-b border-gray-700/50 cursor-pointer p-2 ${isSelected ? 'bg-blue-900/20' : 'hover:bg-gray-700/30'}`}
            onClick={onSelect}
            onDoubleClick={() => onDoubleClick(result)}
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
        error, setLoading, setError, setResults, setStatusMessage
    } = useSearchStore();

    const { tabs: allTabsInCurrentWorkspace, setActiveLeftTab, setActiveRightTab, setActiveSide } = useRootStore();
    const { switchWorkspace, activeWorkspaceId: currentActiveWsId } = useWorkspaceStore();

    const storage = StorageProviderFactory.getProvider();

    const [showHistory, setShowHistory] = useState(false);
    const [showLangFilter, setShowLangFilter] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const langFilterRef = useRef<HTMLDivElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable container
    const selectedItemRef = useRef<HTMLDivElement>(null); // Ref for the selected item

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
                    // Use 'allTabsInCurrentWorkspace' which IS defined in this component's scope
                    // And 'currentActiveWsId' which is also defined here
                    tabsToSearch = allTabsInCurrentWorkspace.filter(tab => tab.workspaceId === currentActiveWsId);
                } else { // 'allWorkspaces'
                    tabsToSearch = await storage.getTabs();
                }

                let filteredTabs = tabsToSearch;

                if (currentTitleFilter) { // Now using titleFilter from the store via getState
                    filteredTabs = filteredTabs.filter(tab => matchesTitleFilter(tab.title));
                }

                if (currentLanguageFilter.length > 0) { // Now using languageFilter from store
                    const langSet = new Set(currentLanguageFilter);
                    filteredTabs = filteredTabs.filter(tab => langSet.has(tab.language));
                }

                const foundResults = searchTabs(currentQuery, currentOptions, filteredTabs);
                setResults(foundResults); // from useSearchStore

                if (foundResults.length === 0) {
                    setStatusMessage('No results found.');
                } else {
                    const uniqueTabs = new Set(foundResults.map(r => r.tabId));
                    setStatusMessage(`${foundResults.length} match${foundResults.length === 1 ? '' : 'es'} in ${uniqueTabs.size} file${uniqueTabs.size === 1 ? '' : 's'}`);
                    setSelectedResultIndex(0); // from useSearchStore
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

    }, DEBOUNCE_DELAY),
        [ // Dependencies for useCallback
            // Store setters are stable
            setStatusMessage, setResults, setLoading, setError, setSelectedResultIndex,
            addSearchToHistory,
            // Utility function (assuming its identity is stable or properly memoized)
            matchesTitleFilter,
            // Variables from outer scope that are used to fetch initial data for the search
            allTabsInCurrentWorkspace, // Renamed from currentWorkspaceTabs for clarity
            currentActiveWsId,         // Renamed from activeWorkspaceId
            storage
        ]
    );
    useEffect(() => {
        if (isOpen) {
            runSearch();
        }
        return () => runSearch.cancel();
    }, [isOpen, query, options, scope, titleFilter, languageFilter, runSearch]); // 'query', 'options', etc. come from useSearchStore

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

    const handleResultNavigation = async (result: SearchResult) => {
        closeSearch();

        // 1. Check if we need to switch workspaces
        if (result.workspaceId !== currentActiveWsId) {
            try {
                await switchWorkspace(result.workspaceId);
                // After workspace switch, the tab data (and active tabs) will be reloaded by workspaceStore.
                // We might need a slight delay or a way to ensure the target tab is "known"
                // before trying to activate it. For simplicity, let's assume switchWorkspace
                // updates the rootStore's tabs and splitView sufficiently.
                // A more robust way might involve waiting for an event or a specific state change.
                await new Promise(resolve => setTimeout(resolve, 150)); // Small delay for state to settle
            } catch (error) {
                console.error("Failed to switch workspace:", error);
                setError("Could not switch to the tab's workspace."); // Show error in search store if needed
                return;
            }
        }

        // At this point, the correct workspace should be active,
        // and its tabs/splitView loaded into useRootStore.
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
            // Tab not found in either side of the current splitView after potential workspace switch.
            // This might happen if the tab was closed or if there's a state sync issue.
            // As a fallback, try to activate it on the left if it exists at all.
            const allCurrentTabs = updatedRootState.tabs;
            if (allCurrentTabs.find(t => t.id === result.tabId)) {
                setActiveLeftTab(result.tabId); // Default to left
                setActiveSide('left');
                // If the tab wasn't in splitView.leftTabs initially, make sure it gets added
                if (!updatedRootState.splitView.leftTabs.includes(result.tabId)) {
                     // This part might need more sophisticated logic in splitViewStore to ensure
                     // the tab list is correctly updated if it wasn't part of the initial load.
                     // For now, activating it should bring it into focus.
                     console.warn(`Tab ${result.tabId} activated but was not in expected splitView side.`);
                }
            } else {
                setError(`Tab "${result.tabTitle}" could not be found or activated.`);
                console.error(`Tab ${result.tabId} not found after workspace switch or in current workspace.`);
            }
        }

        // TODO (Advanced): Scroll to line in editor
        // This would require communication with the EditorInstance, e.g., via an event
        // or by storing a "scrollToLine" request in the tab's state.
        // For now, just activating the tab is the main goal.
    };

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
            e.preventDefault();
             if (selectedResultIndex !== null && results[selectedResultIndex]) {
                 handleResultNavigation(results[selectedResultIndex]);
                 console.log("Navigate to:", results[selectedResultIndex]);
//                  closeSearch(); // Close modal on Enter for now
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
    const currentResults = useSearchStore(state => state.results);
    const currentSelectedResultIndex = useSearchStore(state => state.selectedResultIndex);
    const selectedResult = (currentSelectedResultIndex !== null && currentResults[currentSelectedResultIndex])
        ? currentResults[currentSelectedResultIndex]
        : null;
    const selectedTabForModalContext = selectedResult
        ? allTabsInCurrentWorkspace.find(t => t.id === selectedResult.tabId)
        : null;

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
                                placeholder="e.g. My Tab, *Todo*"
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
                                        itemRef={index === currentSelectedResultIndex ? selectedItemRef : React.createRef()} // Pass ref conditionally
                                        result={result}
                                        isSelected={index === currentSelectedResultIndex}
                                        onSelect={() => setSelectedResultIndex(index)}
                                        onDoubleClick={handleResultNavigation}
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
                            tab={selectedTabForModalContext}
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