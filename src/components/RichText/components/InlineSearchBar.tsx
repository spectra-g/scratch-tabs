import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X } from '../../Icons';

interface InlineSearchBarProps {
  editor: any; // TipTap editor instance
  isVisible: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export const InlineSearchBar: React.FC<InlineSearchBarProps> = ({
  editor,
  isVisible,
  onClose,
  onOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      // Small delay to ensure animation starts before focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isVisible]);

  useEffect(() => {
    if (editor && searchTerm) {
      // Use TipTap's search extension
      const results = editor.storage.searchAndReplace?.results || [];
      setTotalMatches(results.length);
      setCurrentIndex(results.length > 0 ? 1 : 0);
    } else {
      setTotalMatches(0);
      setCurrentIndex(0);
    }
  }, [editor, searchTerm]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (editor && term) {
      editor.commands.setSearchTerm(term);
      // Always try to scroll after search, regardless of results structure
      setTimeout(() => {
        scrollToCurrentResult();
      }, 250);
    } else if (editor) {
      editor.commands.setSearchTerm('');
    }
  };

  const scrollToCurrentResult = () => {
    // Small delay to ensure the editor has updated the search highlights
    setTimeout(() => {
      if (editor?.view) {
        try {
          // Try multiple selectors for search highlights
          let searchHighlight = editor.view.dom.querySelector('.search-result') ||
            editor.view.dom.querySelector('[data-search-result]') ||
            editor.view.dom.querySelector('.search-result-current') ||
            editor.view.dom.querySelector('.ProseMirror-search-result') ||
            editor.view.dom.querySelector('mark[data-type="search"]') ||
            editor.view.dom.querySelector('span[data-decoration-type="search"]') ||
            editor.view.dom.querySelector('.search-and-replace-result') ||
            editor.view.dom.querySelector('.searchAndReplace-result') ||
            editor.view.dom.querySelector('mark') ||
            editor.view.dom.querySelector('span[style*="background"]') ||
            editor.view.dom.querySelector('[class*="search"]') ||
            editor.view.dom.querySelector('[class*="highlight"]');

          if (searchHighlight) {
            // If we found a highlighted result, scroll to it carefully to avoid moving the toolbar
            const editorElement = editor.view.dom;
            const scrollContainer = editorElement.closest('.overflow-y-auto');

            if (scrollContainer) {
              // Manual scroll calculation to avoid scrollIntoView affecting the toolbar
              const containerRect = scrollContainer.getBoundingClientRect();
              const highlightRect = searchHighlight.getBoundingClientRect();

              // Calculate the position relative to the scroll container
              const relativeTop = highlightRect.top - containerRect.top + scrollContainer.scrollTop;
              const targetScroll = relativeTop - containerRect.height / 2;

              scrollContainer.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
              });
            } else {
              // Fallback to scrollIntoView only if we can't find the container
              searchHighlight.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
              });
            }
            return;
          }

          // Fallback: try to get search results from the extension
          const searchResults = editor.storage.searchAndReplace?.results || [];
          if (searchResults.length > 0 && currentIndex > 0) {
            const currentResult = searchResults[currentIndex - 1];
            if (currentResult && typeof currentResult.from === 'number') {
              // Get coordinates of the search result position
              const coords = editor.view.coordsAtPos(currentResult.from);

              // Find the scrollable container
              let scrollContainer = editor.view.dom.closest('.overflow-y-auto');
              if (!scrollContainer) {
                // Try finding by specific class combination
                scrollContainer = editor.view.dom.closest('.flex-1.overflow-y-auto');
              }
              if (!scrollContainer) {
                // Last resort - find any scrollable parent
                let parent = editor.view.dom.parentElement;
                while (parent) {
                  const style = window.getComputedStyle(parent);
                  if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    scrollContainer = parent;
                    break;
                  }
                  parent = parent.parentElement;
                }
              }

              if (scrollContainer && coords) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const scrollTop = scrollContainer.scrollTop;

                // Calculate relative position
                const resultTop = coords.top - containerRect.top + scrollTop;
                const containerHeight = containerRect.height;

                // Center the result
                const targetScrollTop = resultTop - containerHeight / 2;

                scrollContainer.scrollTo({
                  top: Math.max(0, targetScrollTop),
                  behavior: 'smooth'
                });
                return;
              }
            }
          }

          // Final fallback: try different scrolling approaches
          const { from } = editor.state.selection;

          // Skip built-in scrolling methods as they may affect the toolbar
          // Go directly to manual coordinate calculation for better control

          // Manual coordinate calculation with strict container targeting
          const coords = editor.view.coordsAtPos(from);

          if (coords) {
            // Find ONLY the editor content scrollable container (not the whole editor)
            const editorElement = editor.view.dom;

            // Look specifically for the editor content container with overflow-y-auto
            // The structure is: editor container (.flex-1.overflow-y-auto) contains EditorContent
            let scrollContainer = editorElement.closest('.flex-1.overflow-y-auto') ||
              editorElement.closest('.overflow-y-auto.custom-scrollbar') ||
              editorElement.closest('.overflow-y-auto');

            if (scrollContainer) {
              const containerRect = scrollContainer.getBoundingClientRect();

              // Calculate position relative to the scroll container
              const relativeTop = coords.top - containerRect.top + scrollContainer.scrollTop;
              const targetScroll = relativeTop - containerRect.height / 2;

              scrollContainer.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
              });
            }
            // Removed the window scroll fallback to prevent toolbar issues
          }

        } catch (error) {
          console.warn('Could not scroll to search result:', error);
        }
      }
    }, 200);
  };

  const handleNext = () => {
    if (editor && totalMatches > 0) {
      editor.commands.goToNextSearchResult();
      setCurrentIndex((prev) => (prev >= totalMatches ? 1 : prev + 1));
      scrollToCurrentResult();
    }
  };

  const handlePrevious = () => {
    if (editor && totalMatches > 0) {
      editor.commands.goToPreviousSearchResult();
      setCurrentIndex((prev) => (prev <= 1 ? totalMatches : prev - 1));
      scrollToCurrentResult();
    }
  };

  const handleClose = () => {
    if (editor) {
      // Clear search term in the editor to remove highlights
      editor.commands.clearSearchResults();
    }
    setSearchTerm('');
    setCurrentIndex(0);
    setTotalMatches(0);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div className="absolute top-2 right-2 z-30 flex items-center justify-end">
      {/* Search Icon Button */}
      <button
        onClick={isVisible ? handleClose : onOpen}
        className={`px-2 py-1 bg-themed bg-themed-hover border border-themed-light rounded-md shadow-lg transition-all duration-300 ease-out ${isVisible ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        title="Search (Ctrl+F)"
        style={{ height: '36px' }}
      >
        <Search size={14} className="icon-themed" />
      </button>

      {/* Search Bar - slides out from the search icon position */}
      <div
        className={`absolute right-0 flex items-center bg-themed border border-themed-light rounded-md shadow-lg transition-all duration-300 ease-out overflow-hidden ${isVisible
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4 pointer-events-none'
          }`}
        style={{
          width: isVisible ? '360px' : '36px', // 36px matches the button width
          height: '36px', // Further reduced height for better spacing
        }}
      >
        <div
          className={`flex items-center px-2.5 py-1 w-full transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'
            }`}
          data-testid={isVisible ? 'inline-search-bar' : undefined}
        >
          <Search size={14} className="icon-themed mr-2 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in document..."
            className="flex-1 bg-transparent text-xs text-themed placeholder-gray-500 outline-none min-w-0"
          />

          {totalMatches > 0 && (
            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
              <span className="text-[10px] text-themed-tertiary whitespace-nowrap">
                {currentIndex} of {totalMatches}
              </span>

              <button
                onClick={handlePrevious}
                className="p-1 bg-themed-hover rounded transition-colors"
                title="Previous match"
              >
                <ChevronUp size={14} />
              </button>

              <button
                onClick={handleNext}
                className="p-1 bg-themed-hover rounded transition-colors"
                title="Next match"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          <button
            onClick={handleClose}
            className="p-1 bg-themed-hover rounded transition-colors ml-2 flex-shrink-0"
            title="Close search"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};