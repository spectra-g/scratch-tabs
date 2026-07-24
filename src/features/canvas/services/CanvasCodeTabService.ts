import { useRootStore } from "../../../stores/rootStore";
import { useSplitViewStore } from "../../../stores/splitViewStore";
import type { Tab } from "../../../types";
import type { CanvasCodeItem } from "../types";

const getLanguageLabel = (language: string): string =>
  language === "json"
    ? "JSON"
    : language === "plaintext"
      ? "Code"
      : language.toUpperCase();

export const createTabInputFromCanvasCode = (
  item: CanvasCodeItem,
): Partial<Tab> => ({
  title: `${getLanguageLabel(item.language)} from Canvas`,
  content: item.source,
  language: item.language,
  languageLocked: item.languageLocked,
  contentKind: "text",
});

export const openCanvasCodeItemInTab = async (
  canvasTabId: string,
  item: CanvasCodeItem,
): Promise<string | undefined> => {
  const openOnRight = useSplitViewStore
    .getState()
    .splitView.rightTabs.includes(canvasTabId);
  return useRootStore
    .getState()
    .handleNewPopulatedTab(createTabInputFromCanvasCode(item), openOnRight);
};
