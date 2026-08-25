import React, { useState, useRef } from "react";
import { getFormatOptionsMenu } from "./FormatStatusItems";
import { Tab } from "../../types";
import { AIStatusIcon } from "../AI/AIStatusIcon";
import { useRootStore } from "../../stores";
import { useSplitViewStore } from "../../stores/splitViewStore";
import { Search } from "../Icons";
import { useSearchStore } from "../../stores/searchStore";
import { ThemeToggle } from "../ThemeToggle";
import { FormatSelectionPopup, type PopupAnchor } from "./FormatSelectionPopup";
import { FontSizeControls } from "./FontSizeControls";
import { RichTextControls } from "./RichTextControls";
import { useActiveEditorStore } from "../../stores/activeEditorStore";
import { useCursorPosition, useStatusBarLogic } from "./useStatusBarLogic";
import { getTabContentKind } from "../../utils/tabContentKind";
import { RendererStatusItems } from "./RendererStatusItems";

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
  const [popupAnchor, setPopupAnchor] = useState<PopupAnchor | null>(null);
  const languageLabelRef = useRef<HTMLDivElement>(null);
  const contentKind = getTabContentKind(activeTab);
  const showRichTextControls =
    !isInSmartView &&
    (contentKind === "text" || contentKind === "rich-text");

  const showAIIcon =
    (!splitView.isSplit && side === "left") ||
    (splitView.isSplit && side === "right");

  const FormatOptionsMenu =
    contentKind === "text"
      ? getFormatOptionsMenu(languageForOptions || 'plaintext', editor)
      : null;

  // Handle opening/closing the language popup
  const handleOpenLanguagePopup = () => {
    if (contentKind !== "text") return;
    if (showLanguagePopup) {
      setShowLanguagePopup(false);
      return;
    }
    const rect = languageLabelRef.current?.getBoundingClientRect();
    setPopupAnchor(rect ? { left: rect.left, top: rect.top } : null);
    setShowLanguagePopup(true);
  };

  // Handle selecting a language from the popup
  const handleSelectLanguage = (languageId: string) => {
    if (activeTab && contentKind === "text") {
      updateTabLanguage(activeTab.id, languageId, true); // Lock the language
    }
    setShowLanguagePopup(false);
  };

  // Render the language section - logic extracted to useStatusBarLogic hook
  const renderLanguageSection = () => {
    if (!activeTab) return null;

    if (contentKind === "canvas") {
      return <RendererStatusItems tabId={activeTab.id} fallbackLabel="Canvas" />;
    }

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
            anchor={popupAnchor}
            triggerRef={languageLabelRef}
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
    <div className="status-bar-container flex min-w-0 items-center justify-between gap-2 border-t border-base bg-surface-tab-bar px-3 py-0.5 text-xs text-main" data-testid="status-bar">
      {/* Left side: Language/Position info */}
      <div className="status-bar-left flex min-w-0 flex-1 items-center gap-3 overflow-x-auto">
        {activeTab && (
          <>
            {contentKind === "text" && (
              <span className="status-bar-cursor-position shrink-0">
                Ln {realTimeCursorPosition.lineNumber}, Col{" "}
                {realTimeCursorPosition.column}
              </span>
            )}
            {contentKind === "text" && (
              <div className="status-bar-cursor-divider h-4 shrink-0 border-l border-base"></div>
            )}
            {/* Only show language/format info when NOT in rich text mode */}
            {contentKind !== "rich-text" && (
              <div className="flex min-w-0 shrink-0 items-center gap-2 p-0.5">
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
      <div className="status-bar-right flex shrink-0 items-center gap-2">
        {/* Group 1: Font Size */}
        <div className="flex items-center">
          {contentKind !== "rich-text" && contentKind !== "canvas" && (
            <FontSizeControls
              editor={editor}
              isTablet={activeTab?.isTablet || false}
              activeTabId={activeTab?.id || null}
            />
          )}

          {showRichTextControls && (
            <RichTextControls activeTab={activeTab} />
          )}
        </div>

        {/* Divider 1 - only show if Group 2 has content */}
        {showAIIcon && <div className="h-4 border-l border-base"></div>}

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
        {showAIIcon && <div className="h-4 border-l border-base"></div>}

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
