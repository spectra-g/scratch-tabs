import React, { useState, useRef } from "react";
import { getFormatOptionsMenu } from "./FormatStatusItems";
import { Tab } from "../../types";
import { AIStatusIcon } from "../AI/AIStatusIcon";
import { useRootStore } from "../../stores";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { Search } from "../Icons";
import { useSearchStore } from "../../stores/searchStore";
import { ThemeToggle } from "../ThemeToggle";
import { FormatSelectionPopup } from "./FormatSelectionPopup";
import { FontSizeControls } from "./FontSizeControls";
import { RichTextControls } from "./RichTextControls";
import { useActiveEditorStore } from "../../stores/activeEditorStore";
import { useCursorPosition, useStatusBarLogic } from "./useStatusBarLogic";

interface StatusBarProps {
  activeTab: Tab;
  side: "left" | "right";
  isInSmartView?: boolean;
}

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

  // Get computed data from the status bar logic hook
  const {
    tabletLabel,
    contentSample,
    statusBarItems,
    languageForOptions,
    displayLabel,
    showDotIndicator,
    getPopupLanguages,
  } = useStatusBarLogic({ activeTab });

  const { splitView } = useSplitViewStore();
  const { updateTabLanguage } = useRootStore();
  const { toggleSearch } = useSearchStore();
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const languageLabelRef = useRef<HTMLDivElement>(null);

  const showAIIcon =
    (!splitView.isSplit && side === "left") ||
    (splitView.isSplit && side === "right");

  const FormatOptionsMenu =
    activeTab && !activeTab.isTablet && !activeTab.isRich
      ? getFormatOptionsMenu(languageForOptions || 'plaintext', editor)
      : null;

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

  // Render the language section - logic extracted to useStatusBarLogic hook
  const renderLanguageSection = () => {
    if (!activeTab) return null;

    if (activeTab.isTablet) {
      return <span className="capitalize">{tabletLabel}</span>;
    }

    if (activeTab.isRich) {
      return <span className="capitalize">Rich Text</span>;
    }

    return (
      <div className="relative">
        <div
          ref={languageLabelRef}
          onClick={handleOpenLanguagePopup}
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
            formats={getPopupLanguages(showLanguagePopup)}
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
              <div className="h-4 border-l border-gray-400 dark:border-gray-600"></div>
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
        {showAIIcon && <div className="h-4 border-l border-gray-400 dark:border-gray-600"></div>}

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

        {/* Divider 3 */}
        {showAIIcon && <div className="h-4 border-l border-gray-400 dark:border-gray-600"></div>}

        {/* Group 3: Theme Toggle */}
        {showAIIcon && (
          <div className="flex items-center">
            <ThemeToggle />
          </div>
        )}

      </div>
    </div>
  );
};
