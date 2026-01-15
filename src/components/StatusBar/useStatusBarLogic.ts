import { useState, useEffect, useMemo, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Tab } from "../../types";
import { tabletRegistry } from "../../tablets";
import { formatRegistry } from "../../formats";
import { getFormatStatusItem } from "./FormatStatusItems";
import { getTabContentForLanguageDetection } from "../../utils/formatDetectionUtils";

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
    if (!activeTab || activeTab.isTablet || activeTab.isRich) {
      return "";
    }
    return getTabContentForLanguageDetection(activeTab);
  }, [activeTab?.id, activeTab?.content, activeTab?.isTablet, activeTab?.isRich]);

  // Generate status bar items based on format
  const statusBarItems = useMemo((): StatusBarItem[] => {
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

  // Language for format options menu
  const languageForOptions = useMemo(() => {
    if (!activeTab || activeTab.isTablet || activeTab.isRich) return null;
    return activeTab.language;
  }, [activeTab?.language, activeTab?.isTablet, activeTab?.isRich]);

  return {
    tabletLabel,
    contentSample,
    statusBarItems,
    languageForOptions,
  };
}
