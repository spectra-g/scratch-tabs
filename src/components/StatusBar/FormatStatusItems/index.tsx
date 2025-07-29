import { formatRegistry } from "../../../formats";
import * as monaco from "monaco-editor";
import { Tab } from "../../../types";

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
