import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  getFormatStatusItem,
  getFormatOptionsMenu,
} from "./FormatStatusItems";
import { Macro } from "../Macro";
import { tabletRegistry } from "../../tablets";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Tab } from "../../types";
import { AIStatusIcon } from "../AI/AIStatusIcon";
import { useRootStore } from "../../stores";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { Search, Coffee } from "../Icons";
import { useSearchStore } from "../../stores/searchStore";
import { formatRegistry } from "../../formats";
import { getPotentialFormatMatches } from "../../formats";
import { getTabContentForLanguageDetection } from "../../utils/formatDetectionUtils";
import { FormatSelectionPopup } from "./FormatSelectionPopup";
import { SmartViewButtons } from "./SmartViewButtons";
import { FontSizeControls } from "./FontSizeControls";
import { RichTextControls } from "./RichTextControls";
import { useIsMobile } from "../../hooks/useIsMobile";
import type { PopupMenuItem } from "./types";
import { useActiveEditorStore } from "../../stores/activeEditorStore";
import { ThemeToggle } from "../ThemeToggle";

interface StatusBarProps {
  activeTab: Tab;
  side: "left" | "right";
  isInSmartView?: boolean;
}

// Custom hook to get real-time cursor position from Monaco editor
const useCursorPosition = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
) => {
  const [cursorPosition, setCursorPosition] = useState({
    lineNumber: 1,
    column: 1,
  });
  const listenerRef = useRef<monaco.IDisposable | null>(null);

  useEffect(() => {
    if (!editor) {
      setCursorPosition({ lineNumber: 1, column: 1 });
      return;
    }

    // Get initial cursor position
    const position = editor.getPosition();
    if (position) {
      setCursorPosition({
        lineNumber: position.lineNumber,
        column: position.column,
      });
    }

    // Set up cursor position listener
    listenerRef.current = editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });

    return () => {
      listenerRef.current?.dispose();
    };
  }, [editor]);

  return cursorPosition;
};

export const StatusBar: React.FC<StatusBarProps> = ({
  activeTab,
  side,
  isInSmartView = false,
}) => {
  // GET EDITOR FROM THE STORE
  const editor = useActiveEditorStore((state) =>
    side === 'left' ? state.activeLeftEditor : state.activeRightEditor
  );

  // Get real-time cursor position from editor
  const realTimeCursorPosition = useCursorPosition(editor);

  const { splitView } = useSplitViewStore();
  const { updateTabLanguage } = useRootStore();
  const { toggleSearch } = useSearchStore();
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [tabletLabel, setTabletLabel] = useState("");
  const languageLabelRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const showAIIcon =
    (!splitView.isSplit && side === "left") ||
    (splitView.isSplit && side === "right");

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
            setTabletLabel("");
          }
        } catch (e) {
          console.error("Error parsing tablet state:", e);
          setTabletLabel("");
        }
      } else {
        setTabletLabel("");
      }
    };

    getTabletLabel();
  }, [activeTab]);

  // Memoize content sample for status bar items
  const contentSample = useMemo(() => {
    if (!activeTab || activeTab.isTablet || activeTab.isRich) {
      return "";
    }
    return getTabContentForLanguageDetection(activeTab);
  }, [activeTab?.id, activeTab?.content, activeTab?.isTablet, activeTab?.isRich]);

  const statusBarItems = useMemo(() => {
    if (!activeTab || activeTab.isTablet || activeTab.isRich) {
      return [];
    }

    const module = formatRegistry.getById(activeTab.language);
    if (!module) {
      return [];
    }

    if (module.getStatusBarItems) {
      return module.getStatusBarItems().sort((a, b) => a.priority - b.priority);
    }

    // Legacy fallback for formats not yet updated
    const LegacyStatusItem = getFormatStatusItem(activeTab.language);
    if (LegacyStatusItem) {
      return [{ id: 'legacy-status', component: LegacyStatusItem, priority: 10 }];
    }

    return [];
  }, [activeTab?.language, activeTab?.id]);

  const languageForOptions = useMemo(() => {
    if (!activeTab || activeTab.isTablet || activeTab.isRich) return null;
    return activeTab.language;
  }, [activeTab?.language, activeTab?.isTablet, activeTab?.isRich]);

  const FormatOptionsMenu =
    activeTab && !activeTab.isTablet && !activeTab.isRich
      ? getFormatOptionsMenu(languageForOptions || 'plaintext', editor)
      : null;

  // Get languages to display in the popup with the new ordering rules
  const getPopupLanguages = (): PopupMenuItem[] => {
    if (!activeTab || activeTab.isTablet || activeTab.isRich) return [];

    const allLangs = formatRegistry
      .getAll()
      .map((lang) => ({
        id: lang.id,
        name: lang.name,
        isSeparator: false,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Only get potential matches when popup is open to avoid redundant detection calls
    const potentialMatches = showLanguagePopup
      ? getPotentialFormatMatches(getTabContentForLanguageDetection(activeTab))
      : [];
    const isLocked = activeTab.languageLocked;
    const currentLanguageId = activeTab.language;
    const popupList: PopupMenuItem[] = [];

    // Manually ensure plaintext is always available (it might not be in the registry)
    const plaintextEntry = allLangs.find((l) => l.id === "plaintext") || {
      id: "plaintext",
      name: "Plaintext",
      isSeparator: false,
    };
    const isCurrentlyPlaintext = currentLanguageId === "plaintext";

    // Scenario A: Locked, empty, or no real suggestions (just plaintext)
    if (
      isLocked ||
      !contentSample?.trim() ||
      potentialMatches.length === 0 ||
      (potentialMatches.length === 1 && potentialMatches[0].id === "plaintext")
    ) {
      // Add plaintext first if it's not the current language
      if (plaintextEntry && !isCurrentlyPlaintext) {
        popupList.push(plaintextEntry);
      }

      // Add all other languages except plaintext and current language
      const otherLangs = allLangs.filter(
        (l) => l.id !== "plaintext" && l.id !== currentLanguageId,
      );
      popupList.push(...otherLangs);

      return popupList;
    }

    // Scenario B: Suggestions found, not locked
    const topSuggestionInStatusBar = potentialMatches[0]; // This is already displayed
    const otherSuggestions = potentialMatches
      .slice(1)
      .filter((s) => s.id !== topSuggestionInStatusBar.id);

    // 1. Suggested languages group at the TOP
    // Second-best suggestion first, then third-best, etc.
    const suggestionItems = otherSuggestions.map((s) => ({
      id: s.id,
      name: s.name,
      isSeparator: false,
    }));
    popupList.push(...suggestionItems);

    // Add Plaintext at the bottom of the suggestions group if it's not current language
    if (plaintextEntry && !isCurrentlyPlaintext) {
      popupList.push(plaintextEntry);
    }

    // 2. Separator line
    popupList.push({ id: "sep1", name: "-", isSeparator: true });

    // 3. All other non-suggested languages (alphabetical)
    // Exclude plaintext, topSuggestion, otherSuggestions, and current language
    const nonSuggestedLangs = allLangs.filter(
      (lang) =>
        lang.id !== "plaintext" &&
        lang.id !== topSuggestionInStatusBar.id &&
        lang.id !== currentLanguageId &&
        !otherSuggestions.some((s) => s.id === lang.id),
    );
    popupList.push(...nonSuggestedLangs);

    return popupList;
  };

  // Handle opening the language popup
  const handleOpenLanguagePopup = () => {
    if (!activeTab.isTablet && !activeTab.isRich) {
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
    if (activeTab && !activeTab.isTablet && !activeTab.isRich) {
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

    if (activeTab.isRich) {
      return <span className="capitalize">Rich Text</span>;
    }

    // Language Info
    const currentLanguageId = activeTab.language;
    const currentLanguageObject = formatRegistry.getById(currentLanguageId);
    const currentLanguageName =
      currentLanguageObject?.name || currentLanguageId;
    const isLocked = activeTab.languageLocked;

    // Get potential matches only when we need them for the popup
    const potentialMatches = activeTab && !activeTab.isTablet && !activeTab.isRich
      ? getPotentialFormatMatches(getTabContentForLanguageDetection(activeTab))
      : [];

    let displayLabel = "Plaintext";
    let showDotIndicator = false;

    if (isLocked) {
      displayLabel = currentLanguageName;

      // For locked languages, show alternatives if content is ambiguous or different
      const hasAlternatives =
        potentialMatches.length > 0 &&
        potentialMatches.some((lang) => lang.id !== currentLanguageId);
      if (hasAlternatives) {
        showDotIndicator = true; // Show a dot if alternatives exist even when locked
      }
    } else if (!contentSample?.trim()) {
      displayLabel = "Plaintext"; // Already default
    } else if (
      potentialMatches.length === 0 ||
      (potentialMatches.length === 1 && potentialMatches[0].id === "plaintext")
    ) {
      displayLabel = "Plaintext";
    } else {
      const topSuggestion = potentialMatches[0];
      displayLabel = topSuggestion.name;

      if (potentialMatches.length > 1 && topSuggestion.id !== "plaintext") {
        showDotIndicator = true;
      }
    }

    return (
      <div className="relative">
        <div
          ref={languageLabelRef}
          onClick={handleOpenLanguagePopup} // Always open popup on click
          className="flex items-center cursor-pointer bg-themed-hover px-1.5 py-0.5 rounded transition-colors"
          title="Change language"
        >
          <span className="capitalize" data-testid="status-language">{displayLabel}</span>
          {showDotIndicator && (
            <span className="ml-1 text-blue-400 text-xs leading-none">•</span>
          )}
        </div>

        {/* Format Selection Popup */}
        {showLanguagePopup && (
          <FormatSelectionPopup
            formats={getPopupLanguages()}
            onSelectFormat={handleSelectLanguage}
            onClose={() => setShowLanguagePopup(false)}
            title={
              activeTab?.languageLocked
                ? "Other Format Options"
                : "Select Format"
            }
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center justify-between px-3 py-0.5 bg-surface-tab-bar text-main text-xs border-t border-base" data-testid="status-bar">
      {/* Left side: Language/Position info */}
      <div className="flex items-center space-x-4">
        {activeTab && (
          <>
            {!activeTab.isTablet && !activeTab.isRich && (
              <span>
                Ln {realTimeCursorPosition.lineNumber}, Col{" "}
                {realTimeCursorPosition.column}
              </span>
            )}
            {!activeTab.isTablet && !activeTab.isRich && (
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            )}
            {/* Only show language/format info when NOT in rich text mode */}
            {!activeTab.isRich && (
              <div className="p-0.5 flex items-center space-x-2">
                {renderLanguageSection()}

                {/* REPLACE the old FormatStatusItem and SmartViewButtons with this */}
                {statusBarItems.map(({ id, component: Component }) => (
                  <Component
                    key={id}
                    content={contentSample}
                    activeTab={activeTab}
                  />
                ))}

                {/* Keep legacy options menu for now */}
                {FormatOptionsMenu && editor && (
                  <FormatOptionsMenu editor={editor} />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Right side: New organized pattern with dividers */}
      <div className="flex items-center space-x-3">
        {/* Group 1: Font Size */}
        <div className="flex items-center">
          {!activeTab?.isRich && (
            <FontSizeControls
              editor={editor}
              isTablet={activeTab?.isTablet || false}
              activeTabId={activeTab?.id || null}
            />
          )}

          {!activeTab?.isTablet && !isInSmartView && (
            <RichTextControls activeTab={activeTab} />
          )}
        </div>

        {/* Divider 1 - only show if Group 2 has content */}
        {showAIIcon && <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>}

        {/* Group 2: Search and Init AI */}
        {showAIIcon && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => toggleSearch()}
              className="p-0.5 bg-themed-hover rounded transition-colors"
              title="Find in Tabs (Ctrl+Shift+F)"
            >
              <Search size={14} />
            </button>
            <AIStatusIcon />
          </div>
        )}

        {/* Divider 2 - show if Group 2 OR Group 3 has content */}
        {(showAIIcon || !isMobile) && <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>}

        {/* Group 3: Macro controls (Record, Stop, Play, Play to End) + Status */}
        {!isMobile && (
          <div className="flex items-center">
            <Macro editor={editor} />
          </div>
        )}

        {/* Divider 3 - only show if both Macro and Group 4 are visible */}
        {!isMobile && showAIIcon && <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>}

        {/* Group 4: Support & Theme */}
        {showAIIcon && (
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
            <button
              onClick={() =>
                window.open("https://ko-fi.com/scratchtabs", "_blank")
              }
              className="p-0.5 bg-themed-hover rounded transition-colors"
              title="Support on Ko-fi"
            >
              <Coffee size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
