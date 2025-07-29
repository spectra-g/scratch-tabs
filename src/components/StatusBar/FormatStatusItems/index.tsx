import { formatRegistry } from "../../../formats";
import * as monaco from "monaco-editor";
import { Tab } from "../../../types";

export const getFormatStatusItem = (format: string) => {
  // First check if the format detector provides a status item
  const detector = formatRegistry.getById(format);
  if (detector?.getStatusItem) {
    return detector.getStatusItem();
  }
  return null;
};

export const getFormatOptionsMenu = (
  format: string,
  editor: monaco.editor.IStandaloneCodeEditor | null,
) => {
  // First check if the format detector provides an options menu
  const detector = formatRegistry.getById(format);
  if (detector?.getOptionsMenu && editor) {
    return detector.getOptionsMenu();
  }
  return null;
};
