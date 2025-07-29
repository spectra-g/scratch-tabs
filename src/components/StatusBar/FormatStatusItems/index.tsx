import { formatRegistry } from "../../../formats";
import * as monaco from "monaco-editor";
import { Tab } from "../../../types";
import { SmartViewButtons } from "../SmartViewButtons";

export const getFormatStatusItem = (format: string) => {
  // First check if the format module provides a legacy status item
  const module = formatRegistry.getById(format);
  if (module?.getStatusItem) {
    return module.getStatusItem();
  }
  return null;
};

export const getFormatOptionsMenu = (
  format: string,
  editor: monaco.editor.IStandaloneCodeEditor | null,
) => {
  // First check if the format module provides a legacy options menu
  const module = formatRegistry.getById(format);
  if (module?.getOptionsMenu && editor) {
    return module.getOptionsMenu();
  }
  return null;
};

// New generic function to get smart view buttons for formats that don't have legacy methods
export const getSmartViewButtons = (format: string, tabId: string) => {
  const module = formatRegistry.getById(format);
  if (module?.getSmartViews && !module?.getStatusItem && !module?.getOptionsMenu) {
    // Only show smart view buttons if this format doesn't have legacy methods
    return SmartViewButtons;
  }
  return null;
};
