import type { Tab } from "../types";
import { getTabContentKind } from "../utils/tabContentKind";

const toCanvasBroadcastMetadata = (tab: Tab): Tab => ({
  id: tab.id,
  title: tab.title,
  content: "",
  language: tab.language,
  languageLocked: tab.languageLocked,
  isTablet: false,
  tabletState: "",
  isRich: false,
  contentKind: "canvas",
  documentId: tab.documentId,
  cursorPosition: tab.cursorPosition,
  isPinned: tab.isPinned,
  dateCreated: tab.dateCreated,
  lastModified: tab.lastModified,
  lastAccessed: tab.lastAccessed,
  workspaceId: tab.workspaceId,
  activeViewId: tab.activeViewId,
  previewMode: false,
  fontSize: tab.fontSize,
  smartViewIndicatorDismissed: tab.smartViewIndicatorDismissed,
});

export const prepareTabsForBroadcast = (tabs: Tab[]): Tab[] =>
  tabs.map((tab) =>
    getTabContentKind(tab) === "canvas"
      ? toCanvasBroadcastMetadata(tab)
      : tab,
  );
