import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Tab } from "../../types";
import { tabletRegistry } from "../../tablets";
import { formatRegistry, getPotentialFormatMatches } from "../../formats";
import { getFormatStatusItem } from "./FormatStatusItems";
import { getTabContentForLanguageDetection } from "../../utils/formatDetectionUtils";
import type { PopupMenuItem } from "./types";
import { getTabContentKind } from "../../utils/tabContentKind";

interface CursorPosition {
  lineNumber: number;
  column: number;
}

/**
 * Hook to get real-time cursor position from Monaco editor.
 * Returns { lineNumber: 1, column: 1 } when editor is null.
 */
export const useCursorPosition = (
  editor: monaco.editor.IStandaloneCodeEditor | null
): CursorPosition => {
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({
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

interface StatusBarItem {
  id: string;
  component: React.ComponentType<any>;
  priority: number;
}

interface UseStatusBarLogicParams {
  activeTab: Tab | null;
}

interface UseStatusBarLogicResult {
  /** Label for tablet tabs (e.g., "Calculator", "JSON Mapper") */
  tabletLabel: string;
  /** Content sample for language detection (first N lines) */
  contentSample: string;
  /** Format-specific status bar items */
  statusBarItems: StatusBarItem[];
  /** Language ID for format options menu */
  languageForOptions: string | null;
  /** Display label for the language indicator */
  displayLabel: string;
  /** Whether to show the dot indicator for alternatives */
  showDotIndicator: boolean;
  /** Function to get popup menu items - pass isPopupOpen for optimization */
  getPopupLanguages: (isPopupOpen: boolean) => PopupMenuItem[];
}

/**
 * Hook that encapsulates data preparation logic for StatusBar.
 * Handles tablet label resolution, content sampling, and status bar item generation.
 */
export function useStatusBarLogic({
  activeTab,
}: UseStatusBarLogicParams): UseStatusBarLogicResult {
  // Tablet label state (async resolution)
  const [tabletLabel, setTabletLabel] = useState("");
  const contentKind = activeTab ? getTabContentKind(activeTab) : null;

  // Get the tablet label if this is a tablet tab
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
    if (!activeTab || contentKind !== "text") {
      return "";
    }
    return getTabContentForLanguageDetection(activeTab);
  }, [activeTab?.id, activeTab?.content, contentKind]);

  // Generate status bar items based on format
  const statusBarItems = useMemo((): StatusBarItem[] => {
    if (!activeTab || contentKind !== "text") {
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
  }, [activeTab?.language, activeTab?.id, contentKind]);

  // Language for format options menu
  const languageForOptions = useMemo(() => {
    if (!activeTab || contentKind !== "text") return null;
    return activeTab.language;
  }, [activeTab?.language, contentKind]);

  // Compute display label and dot indicator
  const { displayLabel, showDotIndicator } = useMemo(() => {
    if (!activeTab || contentKind !== "text") {
      return { displayLabel: "Plaintext", showDotIndicator: false };
    }

    const currentLanguageId = activeTab.language;
    const currentLanguageObject = formatRegistry.getById(currentLanguageId);
    const currentLanguageName = currentLanguageObject?.name || currentLanguageId;
    const isLocked = activeTab.languageLocked;

    // Get potential matches for determining alternatives
    const potentialMatches = getPotentialFormatMatches(contentSample);

    let label = "Plaintext";
    let showDot = false;

    if (isLocked) {
      label = currentLanguageName;
      // For locked languages, show alternatives if content is ambiguous or different
      const hasAlternatives =
        potentialMatches.length > 0 &&
        potentialMatches.some((lang) => lang.id !== currentLanguageId);
      if (hasAlternatives) {
        showDot = true;
      }
    } else if (!contentSample?.trim()) {
      label = "Plaintext";
    } else if (
      potentialMatches.length === 0 ||
      (potentialMatches.length === 1 && potentialMatches[0].id === "plaintext")
    ) {
      label = "Plaintext";
    } else {
      const topSuggestion = potentialMatches[0];
      label = topSuggestion.name;
      if (potentialMatches.length > 1 && topSuggestion.id !== "plaintext") {
        showDot = true;
      }
    }

    return { displayLabel: label, showDotIndicator: showDot };
  }, [activeTab?.language, activeTab?.languageLocked, contentKind, contentSample]);

  // Function to get popup languages - optimized to only detect when popup is open
  const getPopupLanguages = useCallback(
    (isPopupOpen: boolean): PopupMenuItem[] => {
      if (!activeTab || contentKind !== "text") return [];

      const allLangs = formatRegistry
        .getAll()
        .map((lang) => ({
          id: lang.id,
          name: lang.name,
          isSeparator: false,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      // Only get potential matches when popup is open to avoid redundant detection calls
      const potentialMatches = isPopupOpen
        ? getPotentialFormatMatches(contentSample)
        : [];
      const isLocked = activeTab.languageLocked;
      const currentLanguageId = activeTab.language;
      const popupList: PopupMenuItem[] = [];

      // Manually ensure plaintext is always available
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
          (l) => l.id !== "plaintext" && l.id !== currentLanguageId
        );
        popupList.push(...otherLangs);

        return popupList;
      }

      // Scenario B: Suggestions found, not locked
      const topSuggestionInStatusBar = potentialMatches[0];
      const otherSuggestions = potentialMatches
        .slice(1)
        .filter((s) => s.id !== topSuggestionInStatusBar.id);

      // 1. Suggested languages group at the TOP
      const suggestionItems = otherSuggestions.map((s) => ({
        id: s.id,
        name: s.name,
        isSeparator: false,
      }));
      popupList.push(...suggestionItems);

      // Add Plaintext at the bottom of the suggestions group
      if (plaintextEntry && !isCurrentlyPlaintext) {
        popupList.push(plaintextEntry);
      }

      // 2. Separator line
      popupList.push({ id: "sep1", name: "-", isSeparator: true });

      // 3. All other non-suggested languages (alphabetical)
      const nonSuggestedLangs = allLangs.filter(
        (lang) =>
          lang.id !== "plaintext" &&
          lang.id !== topSuggestionInStatusBar.id &&
          lang.id !== currentLanguageId &&
          !otherSuggestions.some((s) => s.id === lang.id)
      );
      popupList.push(...nonSuggestedLangs);

      return popupList;
    },
    [activeTab, contentKind, contentSample]
  );

  return {
    tabletLabel,
    contentSample,
    statusBarItems,
    languageForOptions,
    displayLabel,
    showDotIndicator,
    getPopupLanguages,
  };
}
