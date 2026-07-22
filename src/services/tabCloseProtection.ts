import type { Tab } from "../types";
import { getTabContentKind } from "../utils/tabContentKind";
import { RichTextService } from "../components/RichText/services/RichTextService";

export type CanvasContentInspector = (tabId: string) => Promise<boolean>;

const inspectCanvasContent: CanvasContentInspector = async (tabId) => {
  const { canvasDocumentManager } = await import(
    "../features/canvas/services/CanvasDocumentManager"
  );
  return canvasDocumentManager.hasContent(tabId);
};

export const tabHasCloseProtectedContent = async (
  tab: Tab,
  canvasContentInspector: CanvasContentInspector = inspectCanvasContent,
): Promise<boolean> => {
  switch (getTabContentKind(tab)) {
    case "canvas":
      return canvasContentInspector(tab.id);
    case "tablet":
      return true;
    case "rich-text":
      return (
        RichTextService.hasContent(tab.richContent ?? null) ||
        (tab.content ?? "").trim().length > 0
      );
    case "text":
      return (tab.content ?? "").trim().length > 0;
  }
};

export const shouldConfirmTabClose = async (
  tab: Tab,
  bypassConfirmation: boolean,
  canvasContentInspector?: CanvasContentInspector,
): Promise<boolean> => {
  if (bypassConfirmation) return false;

  try {
    return await tabHasCloseProtectedContent(tab, canvasContentInspector);
  } catch (error) {
    console.error("Failed to inspect tab content before closing:", error);
    return true;
  }
};
