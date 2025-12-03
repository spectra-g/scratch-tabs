import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, X } from '../../Icons';

interface EditorSearchBarProps {
  editor: any; // TipTap editor instance
  isVisible: boolean;
  onClose: () => void;
}

export const EditorSearchBar: React.FC<EditorSearchBarProps> = ({
  editor,
  isVisible,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
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
    } else if (editor) {
      editor.commands.setSearchTerm('');
    }
  };

  const handleNext = () => {
    if (editor && totalMatches > 0) {
      editor.commands.goToNextSearchResult();
      setCurrentIndex((prev) => (prev >= totalMatches ? 1 : prev + 1));
    }
  };

  const handlePrevious = () => {
    if (editor && totalMatches > 0) {
      editor.commands.goToPreviousSearchResult();
      setCurrentIndex((prev) => (prev <= 1 ? totalMatches : prev - 1));
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

  if (!isVisible) return null;

  return (
    <div className="flex items-center bg-surface border border-base rounded-md p-2 shadow-lg">
      <Search size={16} className="text-muted mr-2" />
      
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search in document..."
        className="flex-1 bg-transparent text-sm text-main placeholder-muted outline-none"
      />
      
      {totalMatches > 0 && (
        <div className="flex items-center space-x-2 ml-3">
          <span className="text-xs text-muted">
            {currentIndex} of {totalMatches}
          </span>
          
          <button
            onClick={handlePrevious}
            className="p-1 hover:bg-element rounded transition-colors"
            title="Previous match"
          >
            <ChevronUp size={14} />
          </button>
          
          <button
            onClick={handleNext}
            className="p-1 hover:bg-element rounded transition-colors"
            title="Next match"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      )}
      
      <button
        onClick={handleClose}
        className="p-1 hover:bg-element rounded transition-colors ml-2"
        title="Close search"
      >
        <X size={14} />
      </button>
    </div>
  );
};