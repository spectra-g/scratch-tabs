import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getLanguageStatusItem, getLanguageOptionsMenu } from './LanguageStatusItems';
import { Macro } from '../Macro';
import { tabletRegistry } from '../../tablets';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { Tab } from "../../types.ts";
import { AIStatusIcon } from '../AI/AIStatusIcon';
import { useRootStore } from '../../stores';
import { useSplitViewStore } from '../../stores/splitViewStore';
import { Search, Coffee } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';
import { languageRegistry } from '../../languages';
import { getPotentialLanguageMatches } from '../../languages';
import { LanguageSelectionPopup } from './LanguageSelectionPopup';
import { ExtendedViewButtons } from './ExtendedViewButtons';
import type { PopupMenuItem } from './types';

interface StatusBarProps {
  editor: monaco.editor.IStandaloneCodeEditor | null,
  activeTab: Tab,
  side: 'left' | 'right'
}

// Simple content accessor for language detection
const getContentForLanguageDetection = (tab: Tab): string => {
  return tab.content || '';
};

export const StatusBar: React.FC<StatusBarProps> = ({editor, activeTab, side}) => {
  const { splitView } = useSplitViewStore();
  const { updateTabLanguage } = useRootStore();
  const { toggleSearch } = useSearchStore();
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [tabletLabel, setTabletLabel] = useState('');
  const languageLabelRef = useRef<HTMLDivElement>(null);

  const showAIIcon = (!splitView.isSplit && side === 'left') || (splitView.isSplit && side === 'right');

  // Get the tablet if this is a tablet tab
  useEffect(() => {
    const getTabletLabel = async () => {
      if (activeTab?.isTablet && activeTab.tabletState) {
        try {
          const state = JSON.parse(activeTab.tabletState);
          const tablet = await tabletRegistry.getById(state.type);
          if (tablet) {
            setTabletLabel(tablet.label);
          } else {
            setTabletLabel('');
          }
        } catch (e) {
          console.error('Error parsing tablet state:', e);
          setTabletLabel('');
        }
      } else {
        setTabletLabel('');
      }
    };

    getTabletLabel();
  }, [activeTab]);

  // Memoize language detection to avoid expensive operations on every render
  const languageDetectionData = useMemo(() => {
    if (!activeTab || activeTab.isTablet) {
      return {
        potentialMatches: [],
        contentSample: ''
      };
    }

    const contentSample = getContentForLanguageDetection(activeTab);
    const potentialMatches = getPotentialLanguageMatches(contentSample);
    
    return {
      potentialMatches,
      contentSample
    };
  }, [activeTab?.id, activeTab?.content, activeTab?.isTablet]);

  const LanguageStatusItem = activeTab && !activeTab.isTablet ? 
    getLanguageStatusItem(activeTab.language, languageDetectionData.contentSample, activeTab) : null;

  const LanguageOptionsMenu = activeTab && !activeTab.isTablet ? 
    getLanguageOptionsMenu(activeTab.language, editor) : null;

  // Get languages to display in the popup with the new ordering rules
  const getPopupLanguages = (): PopupMenuItem[] => {
    if (!activeTab || activeTab.isTablet) return [];

    const allLangs = languageRegistry.getAll().map(lang => ({ 
      id: lang.id, 
      name: lang.name, 
      isSeparator: false 
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    const { potentialMatches, contentSample } = languageDetectionData;
    const isLocked = activeTab.languageLocked;
    const currentLanguageId = activeTab.language;
    const popupList: PopupMenuItem[] = [];

    // Manually ensure plaintext is always available (it might not be in the registry)
    const plaintextEntry = allLangs.find(l => l.id === 'plaintext') || 
                           { id: 'plaintext', name: 'Plaintext', isSeparator: false };
    const isCurrentlyPlaintext = currentLanguageId === 'plaintext';



    // Scenario A: Locked, empty, or no real suggestions (just plaintext)
    if (isLocked || !contentSample?.trim() || potentialMatches.length === 0 || 
        (potentialMatches.length === 1 && potentialMatches[0].id === 'plaintext')) {
      
      // Add plaintext first if it's not the current language
      if (plaintextEntry && !isCurrentlyPlaintext) {
        popupList.push(plaintextEntry);
      }
      
      // Add all other languages except plaintext and current language
      const otherLangs = allLangs.filter(l => 
        l.id !== 'plaintext' && l.id !== currentLanguageId
      );
      popupList.push(...otherLangs);
      
      return popupList;
    }

    // Scenario B: Suggestions found, not locked
    const topSuggestionInStatusBar = potentialMatches[0]; // This is already displayed
    const otherSuggestions = potentialMatches.slice(1)
                                .filter(s => s.id !== topSuggestionInStatusBar.id);

    // 1. Suggested languages group at the TOP
    // Second-best suggestion first, then third-best, etc.
    const suggestionItems = otherSuggestions.map(s => ({ 
      id: s.id, 
      name: s.name, 
      isSeparator: false 
    }));
    popupList.push(...suggestionItems);

    // Add Plaintext at the bottom of the suggestions group if it's not current language
    if (plaintextEntry && !isCurrentlyPlaintext) {
      popupList.push(plaintextEntry);
    }

    // 2. Separator line
    popupList.push({ id: 'sep1', name: '-', isSeparator: true });

    // 3. All other non-suggested languages (alphabetical)
    // Exclude plaintext, topSuggestion, otherSuggestions, and current language
    const nonSuggestedLangs = allLangs.filter(lang =>
      lang.id !== 'plaintext' &&
      lang.id !== topSuggestionInStatusBar.id &&
      lang.id !== currentLanguageId &&
      !otherSuggestions.some(s => s.id === lang.id)
    );
    popupList.push(...nonSuggestedLangs);

    return popupList;
  };

  // Handle opening the language popup
  const handleOpenLanguagePopup = () => {
    if (!activeTab.isTablet) {
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

  // Render the language section with new simplified logic
  const renderLanguageSection = () => {
    if (!activeTab) return null;

    if (activeTab.isTablet) {
      return <span className="capitalize">{tabletLabel}</span>;
    }

    // Language Info
    const currentLanguageId = activeTab.language;
    const currentLanguageObject = languageRegistry.getById(currentLanguageId);
    const currentLanguageName = currentLanguageObject?.name || currentLanguageId;
    const isLocked = activeTab.languageLocked;
    const { potentialMatches } = languageDetectionData;

    let displayLabel = "Plaintext";
    let showDotIndicator = false;

    if (isLocked) {
      displayLabel = currentLanguageName;
      // For locked languages, show alternatives if content is ambiguous or different
      const hasAlternatives = potentialMatches.length > 0 && potentialMatches.some(lang => lang.id !== currentLanguageId);
      if (hasAlternatives) {
         showDotIndicator = true; // Show a dot if alternatives exist even when locked
      }
    } else if (!languageDetectionData.contentSample?.trim()) {
      displayLabel = "Plaintext"; // Already default
    } else if (potentialMatches.length === 0 || (potentialMatches.length === 1 && potentialMatches[0].id === 'plaintext')) {
      displayLabel = "Plaintext";
    } else {
      const topSuggestion = potentialMatches[0];
      displayLabel = topSuggestion.name;
      if (potentialMatches.length > 1 && topSuggestion.id !== 'plaintext') {
        showDotIndicator = true;
      }
    }

    return (
      <div className="relative">
        <div
          ref={languageLabelRef}
          onClick={handleOpenLanguagePopup} // Always open popup on click
          className="flex items-center cursor-pointer hover:bg-gray-700/50 px-1.5 py-0.5 rounded transition-colors"
          title="Change language"
        >
          <span className="capitalize">{displayLabel}</span>
          {showDotIndicator && (
            <span className="ml-1 text-blue-400 text-xs leading-none">•</span>
          )}
        </div>
        
        {/* Language Selection Popup */}
        {showLanguagePopup && (
          <LanguageSelectionPopup
            languages={getPopupLanguages()}
            onSelectLanguage={handleSelectLanguage}
            onClose={() => setShowLanguagePopup(false)}
            title={activeTab?.languageLocked ? "Other Language Options" : "Select Language"}
          />
        )}
      </div>
    );
  };

  return (
   <div className="flex items-center justify-between px-3 py-0.5 bg-gray-800 text-gray-300 text-xs"> 
    <div className="flex items-center space-x-4">
        {activeTab && (
          <>
            {!activeTab.isTablet && (
              <span>
                Ln {activeTab.cursorPosition.lineNumber}, Col {activeTab.cursorPosition.column}
              </span>
            )}
            <div className="p-0.5 flex items-center space-x-2">
              {renderLanguageSection()}
              {LanguageStatusItem && <LanguageStatusItem />}
              {LanguageOptionsMenu && editor && <LanguageOptionsMenu editor={editor} />}
              <ExtendedViewButtons language={activeTab.language} tabId={activeTab.id} />
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
                title="Find in Tabs (Ctrl+Shift+F)"
            >
                <Search size={14} />
            </button> }

        {showAIIcon && <AIStatusIcon />}
        <Macro editor={editor}/>
      </div>
    </div>
  );
};