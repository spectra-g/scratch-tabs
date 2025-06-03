import React, { useState, useRef, useMemo } from 'react';
import { getLanguageStatusItem, getLanguageOptionsMenu } from './LanguageStatusItems';
import { Macro } from '../Macro';
import { tabletRegistry } from '../../tablets';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Tab } from "../../types.ts";
import { AIStatusIcon } from '../AI/AIStatusIcon';
import { useRootStore } from '../../stores';
import { Search, Coffee, ChevronDown } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';
import { languageRegistry } from '../../languages';
import { getPotentialLanguageMatches } from '../../languages';
import { LanguageSelectionPopup } from './LanguageSelectionPopup';

interface StatusBarProps {
  editor: monaco.editor.IStandaloneCodeEditor | null,
  activeTab: Tab,
  side: 'left' | 'right'
}

export const StatusBar: React.FC<StatusBarProps> = ({editor, activeTab, side}) => {
  const { splitView, updateTabLanguage } = useRootStore();
  const { toggleSearch } = useSearchStore();
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const languageLabelRef = useRef<HTMLDivElement>(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });

  const showAIIcon = (!splitView.isSplit && side === 'left') || (splitView.isSplit && side === 'right');

  // Get the tablet if this is a tablet tab
  let tabletLabel = '';
  if (activeTab?.isTablet && activeTab.tabletState) {
    try {
      const state = JSON.parse(activeTab.tabletState);
      const tablet = tabletRegistry.getById(state.type);
      if (tablet) {
        tabletLabel = tablet.label;
      }
    } catch (e) {
      console.error('Error parsing tablet state:', e);
    }
  }

  const LanguageStatusItem = activeTab && !activeTab.isTablet ? 
    getLanguageStatusItem(activeTab.language, activeTab.content) : null;

  const LanguageOptionsMenu = activeTab && !activeTab.isTablet ? 
    getLanguageOptionsMenu(activeTab.language, editor) : null;

  // Get potential language matches for the current content
  const potentialLanguages = useMemo(() => {
    if (!activeTab || activeTab.isTablet) return [];
    return getPotentialLanguageMatches(activeTab.content);
  }, [activeTab]);

  // Get languages to display in the popup
  const getPopupLanguages = () => {
    if (!activeTab || activeTab.isTablet) return [];

    let languages = [];
    
    if (activeTab.languageLocked) {
      // If language is locked, show other potential matches excluding the current language
      languages = potentialLanguages.filter(lang => lang.id !== activeTab.language);
    } else if (activeTab.content.trim() === '') {
      // If content is empty and not locked, show all languages
      languages = languageRegistry.getAll().map(lang => ({
        id: lang.id,
        name: lang.name
      }));
    } else {
      // If content is not empty and not locked, show potential matches
      languages = [...potentialLanguages];
    }
    
    // Sort alphabetically by name
    return languages.sort((a, b) => a.name.localeCompare(b.name));
  };

  // Handle opening the language popup
  const handleOpenLanguagePopup = () => {
    if (languageLabelRef.current && !activeTab.isTablet) {
      const rect = languageLabelRef.current.getBoundingClientRect();
      
      // Just use the actual element position - the popup component will
      // position itself correctly above the element
      setPopupPosition({
        top: rect.top,
        left: rect.left
      });
      
      // Always ensure we close any existing popup before opening a new one
      setShowLanguagePopup(false);
      
      // Use setTimeout to ensure React has time to process the state change
      setTimeout(() => {
        setShowLanguagePopup(true);
      }, 0);
    }
  };

  // Handle selecting a language from the popup
  const handleSelectLanguage = (languageId: string) => {
    if (activeTab && !activeTab.isTablet) {
      updateTabLanguage(activeTab.id, languageId, true); // Lock the language
    }
    setShowLanguagePopup(false);
  };

  // Render the language section
  const renderLanguageSection = () => {
    if (!activeTab || activeTab.isTablet) {
      return <span className="capitalize">{tabletLabel}</span>;
    }

    const currentLanguage = languageRegistry.getById(activeTab.language);
    const languageName = currentLanguage?.name || activeTab.language;
    
    if (activeTab.languageLocked) {
      // Locked language
      const hasAlternatives = potentialLanguages.some(lang => lang.id !== activeTab.language);
      return (
        <div 
          ref={languageLabelRef}
          onClick={hasAlternatives ? handleOpenLanguagePopup : undefined}
          className={`flex items-center ${hasAlternatives ? 'cursor-pointer hover:bg-gray-700' : ''} px-1.5 py-0.5 rounded`}
        >
          <span className="capitalize">{languageName}</span>
          {hasAlternatives && (
            <span className="ml-1 text-blue-400 text-xs">.</span>
          )}
        </div>
      );
    } else if (activeTab.content.trim() === '') {
      // Empty content, not locked - always show dropdown since all languages are available
      return (
        <div 
          ref={languageLabelRef}
          onClick={handleOpenLanguagePopup}
          className="flex items-center cursor-pointer hover:bg-gray-700 px-1.5 py-0.5 rounded"
        >
          <span className="capitalize">Plaintext</span>
          <span className="ml-1 text-gray-400">?</span>
        </div>
      );
    } else {
      // Content present, not locked, show suggestions
      const topSuggestions = potentialLanguages.slice(0, 3);
      
      if (topSuggestions.length === 0) {
        // No language suggestions - show plaintext with a question mark but no dropdown
        return (
          <div ref={languageLabelRef} className="flex items-center px-1.5 py-0.5 rounded">
            <span className="capitalize">Plaintext</span>
            <span className="ml-1 text-gray-400">?</span>
          </div>
        );
      }
      
      // Check if there are more languages beyond what we're displaying
      const hasMoreLanguages = potentialLanguages.length > topSuggestions.length;
      
      return (
        <div ref={languageLabelRef} className="flex items-center space-x-2">
          {topSuggestions.map((lang, index) => (
            <button
              key={lang.id}
              onClick={() => handleSelectLanguage(lang.id)}
              className="hover:bg-gray-700 px-1.5 py-0.5 rounded text-gray-300"
            >
              {lang.name}{index === topSuggestions.length - 1 ? '?' : ''}
            </button>
          ))}
          {hasMoreLanguages && (
            <button
              onClick={handleOpenLanguagePopup}
              className="hover:bg-gray-700 px-1 rounded text-gray-400"
            >
              <ChevronDown size={12} />
            </button>
          )}
        </div>
      );
    }
  };

  return (
   <div className="flex items-center justify-between px-3 py-0.5 bg-gray-800 text-gray-300 text-xs"> 
    <div className="flex items-center space-x-4">
        {activeTab && (
          <>
            <span>
              Ln {activeTab.cursorPosition.lineNumber}, Col {activeTab.cursorPosition.column}
            </span>
            <div className="p-0.5 flex items-center space-x-2">
              {renderLanguageSection()}
              {LanguageStatusItem && <LanguageStatusItem />}
              {LanguageOptionsMenu && editor && <LanguageOptionsMenu editor={editor} />}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {showAIIcon &&
            <button
                onClick={() => window.open('https://ko-fi.com/scratchtabs', '_blank')}
                className="p-0.5 hover:bg-gray-700 rounded transition-colors"
                title="Support on Ko-fi"
            >
                <Coffee size={14} />
            </button> }

        {showAIIcon &&
            <button
                onClick={() => toggleSearch()} // Open search with no initial query
                className="p-0.5 hover:bg-gray-700 rounded transition-colors"
                title="Find in Files (Ctrl+Shift+F)"
            >
                <Search size={14} />
            </button> }

        {showAIIcon && <AIStatusIcon />}
        <Macro editor={editor}/>
      </div>
      
      {/* Language Selection Popup */}
      {showLanguagePopup && (
        <LanguageSelectionPopup
          languages={getPopupLanguages()}
          onSelectLanguage={handleSelectLanguage}
          onClose={() => setShowLanguagePopup(false)}
          position={popupPosition}
          showScores={false}
          title={activeTab?.languageLocked ? "Other Language Options" : "Select Language"}
        />
      )}
    </div>
  );
};