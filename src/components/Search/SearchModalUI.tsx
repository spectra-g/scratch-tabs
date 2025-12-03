import React, { useMemo, useEffect } from "react";
import {
  Search,
  ChevronDown,
  History,
  Trash2,
  CaseSensitive,
  WholeWord,
  ListFilter,
  Loader2,
} from "../Icons";
import { BaseModal } from "../../formats/json/components/modals/BaseModal";
import { SearchResult, SearchOptions } from "../../stores/searchStore";
import { highlightMatchesInText } from "../../services/searchService";
import { SearchPreviewPane } from "./SearchPreviewPane";
import { SearchEngine } from "./useSearchEngine";

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: (result: SearchResult) => void;
  searchQuery: string;
  searchOptions: SearchOptions;
  itemRef: React.RefObject<HTMLDivElement>;
}

const SearchResultItem: React.FC<SearchResultItemProps> = React.memo(
  ({
    result,
    isSelected,
    onSelect,
    onDoubleClick,
    searchQuery,
    searchOptions,
    itemRef,
  }) => {
    const highlightedLine = useMemo(() => {
      // Highlight only the matching part within the lineText
      return highlightMatchesInText(
        result.lineText,
        searchQuery,
        searchOptions,
      );
    }, [result.lineText, searchQuery, searchOptions]);

    // Scroll into view if selected
    useEffect(() => {
      if (isSelected && itemRef.current) {
        itemRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, [isSelected, itemRef]);

    return (
      <div
        ref={itemRef}
        className={`border-b border-base cursor-pointer p-2 ${isSelected ? "bg-info/10" : "hover:bg-element-hover"}`}
        onClick={onSelect}
        onDoubleClick={() => onDoubleClick(result)}
        role="button"
        tabIndex={0}
        aria-selected={isSelected}
      >
        <div className="flex justify-between items-start text-xs">
          {/* Left: Highlighted Line */}
          <div className="flex-1 font-mono mr-4 overflow-hidden">
            <span className="text-muted mr-2">{result.lineNumber}:</span>
            <span
              className="text-main whitespace-pre"
              dangerouslySetInnerHTML={{ __html: highlightedLine }}
            />
          </div>
          {/* Right: File Info */}
          <div
            className="text-muted text-right flex-shrink-0 max-w-[40%]"
            title={result.tabTitle}
          >
            <span className="truncate block">{result.tabTitle}</span>
            <span className="text-muted"> ({result.language})</span>
          </div>
        </div>
      </div>
    );
  },
);
SearchResultItem.displayName = "SearchResultItem";

interface SearchModalUIProps {
  engine: SearchEngine;
}

export const SearchModalUI: React.FC<SearchModalUIProps> = ({ engine }) => {
  const {
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
    showHistory,
    showLangFilter,
    languages,
    selectedTabForModalContext,
    selectedResult,
    inputRef,
    historyRef,
    langFilterRef,
    resultsContainerRef,
    selectedItemRef,
    closeSearch,
    setScope,
    setOptions,
    setTitleFilter,
    setLanguageFilter,
    clearHistory,
    setShowHistory,
    setShowLangFilter,
    setSelectedResultIndex,
    handleQueryChange,
    handleKeyDown,
    handleHistoryClick,
    handleLangCheckboxChange,
    handleResultNavigation,
  } = engine;

  if (!isOpen) return null;

  return (
    <BaseModal
      title="Find in Tabs"
      onClose={closeSearch}
      widthClass="w-[95vw]"
      maxWidthClass="max-w-[1800px]"
      maxHeightClass="max-h-[93vh]"
    >
      {/* Main div listens for keydown */}
      <div
        className="flex flex-col h-[85vh]"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Top Controls */}
        <div className="flex-none p-3 border-b border-base bg-surface space-y-3">
          {/* Search Input & History */}
          <div className="flex items-center space-x-2 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={18}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search..."
              className="w-full bg-element text-main border border-base rounded-md pl-10 pr-2 py-1.5 focus:outline-none focus:ring-2 focus:border-focus"
            />
            {searchHistory.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1.5 text-muted hover:text-main hover:bg-element-hover rounded"
                title="Search History"
              >
                <History size={16} />
              </button>
            )}
            {/* History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div
                ref={historyRef}
                className="absolute top-full right-0 mt-1 w-64 bg-surface border border-base rounded-md shadow-lg z-50 max-h-48 overflow-y-auto custom-scrollbar"
              >
                <div className="flex justify-between items-center p-1 border-b border-base">
                  <span className="text-xs text-muted px-2">
                    Recent Searches
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearHistory();
                      setShowHistory(false);
                    }}
                    className="p-1 text-muted hover:text-red-400 rounded"
                    title="Clear History"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                {searchHistory.map((histQuery, index) => (
                  <button
                    key={index}
                    onClick={() => handleHistoryClick(histQuery)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-main hover:bg-element-hover truncate"
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
                onClick={() =>
                  setOptions({ caseSensitive: !options.caseSensitive })
                }
                className={`p-1 rounded ${options.caseSensitive ? "bg-info/30 text-info" : "bg-surface-highlight text-muted hover:bg-element-hover"}`}
                title="Case Sensitive"
              >
                <CaseSensitive size={16} />
              </button>
              <button
                onClick={() => setOptions({ wholeWord: !options.wholeWord })}
                className={`p-1 rounded ${options.wholeWord ? "bg-info/30 text-info" : "bg-surface-highlight text-muted hover:bg-element-hover"}`}
                title="Whole Word"
              >
                <WholeWord size={16} />
              </button>
            </div>

            {/* Title Filter */}
            <div className="flex items-center space-x-2 flex-1 min-w-[150px]">
              <label
                htmlFor="titleFilter"
                className="text-sm text-muted flex-shrink-0"
              >
                Tab title:
              </label>
              <input
                id="titleFilter"
                type="text"
                value={titleFilter}
                onChange={(e) => setTitleFilter(e.target.value)}
                placeholder="e.g. My Tab, *Todo*"
                className="flex-grow bg-element text-main border border-base rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:border-focus"
              />
            </div>

            {/* Language Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowLangFilter(!showLangFilter)}
                className="flex items-center space-x-1 px-2 py-0.5 bg-surface-highlight border border-base rounded text-xs text-main hover:bg-element-hover"
              >
                <ListFilter size={12} />
                <span>Languages ({languageFilter.length || "All"})</span>
                <ChevronDown size={12} />
              </button>
              {showLangFilter && (
                <div
                  ref={langFilterRef}
                  className="absolute top-full left-0 mt-1 w-56 bg-surface border border-base rounded-md shadow-lg z-50 max-h-60 overflow-y-auto custom-scrollbar py-1"
                >
                  <button
                    onClick={() => setLanguageFilter([])} // Clear all
                    className="block w-full text-left px-3 py-1 text-xs text-muted hover:bg-element-hover italic"
                  >
                    (All Languages)
                  </button>
                  <div className="border-t border-base my-1"></div>
                  {languages.map((lang) => (
                    <label
                      key={lang.id}
                      className="flex items-center space-x-2 px-3 py-1 hover:bg-element-hover cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={languageFilter.includes(lang.id)}
                        onChange={(e) =>
                          handleLangCheckboxChange(lang.id, e.target.checked)
                        }
                        className="h-3 w-3 rounded border-base text-info focus:ring-info/50 bg-input accent-info"
                      />
                      <span className="text-xs text-main">{lang.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Scope Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-muted">Scope:</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="bg-element text-main border border-base rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-2 focus:border-focus"
              >
                <option value="activeWorkspace">Active Workspace</option>
                <option value="allWorkspaces">All Workspaces</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content Area (Results + Preview) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Results List Container */}
          <div
            ref={resultsContainerRef}
            className="w-1/2 border-r border-base flex flex-col overflow-y-auto custom-scrollbar"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted">
                <Loader2 size={24} className="animate-spin mr-2" /> Searching...
              </div>
            ) : error ? (
              <div className="p-4 text-red-400">{error}</div>
            ) : results.length > 0 ? (
              <div>
                {results.map((result, index) => (
                  <SearchResultItem
                    key={`${result.tabId}-${result.lineNumber}-${result.matchIndex}`}
                    itemRef={
                      index === selectedResultIndex
                        ? selectedItemRef
                        : React.createRef()
                    }
                    result={result}
                    isSelected={index === selectedResultIndex}
                    onSelect={() => setSelectedResultIndex(index)}
                    onDoubleClick={handleResultNavigation}
                    searchQuery={query}
                    searchOptions={options}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted">
                {statusMessage}
              </div>
            )}
          </div>

          {/* Preview Pane */}
          <div className="w-1/2">
            <SearchPreviewPane
              tab={selectedTabForModalContext}
              selectedResult={selectedResult}
            />
          </div>
        </div>

        {/* Footer Status */}
        <div className="flex-none p-2 border-t border-base text-xs text-muted">
          {statusMessage}
        </div>
      </div>
    </BaseModal>
  );
};
