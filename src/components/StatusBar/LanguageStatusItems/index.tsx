import { languageRegistry } from "../../../languages";
import * as monaco from "monaco-editor";
import { Tab } from "../../../types";

export const getLanguageStatusItem = (language: string) => {
  // First check if the language detector provides a status item
  const detector = languageRegistry.getById(language);
  if (detector?.getStatusItem) {
    return detector.getStatusItem();
  }
  return null;
};

export const getLanguageOptionsMenu = (
  language: string,
  editor: monaco.editor.IStandaloneCodeEditor | null,
) => {
  // First check if the language detector provides an options menu
  const detector = languageRegistry.getById(language);
  if (detector?.getOptionsMenu && editor) {
    return detector.getOptionsMenu();
  }
  return null;
};
