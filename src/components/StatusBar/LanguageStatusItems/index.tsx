import { languageRegistry } from '../../../languages';
import * as monaco from 'monaco-editor';

export const getLanguageStatusItem = (language: string, content: string) => {
  // First check if the language detector provides a status item
  const detector = languageRegistry.getById(language);
  if (detector?.getStatusItem) {
    const StatusItem = detector.getStatusItem();
    return () => <StatusItem content={content} />;
  }
};

export const getLanguageOptionsMenu = (language: string, editor: monaco.editor.IStandaloneCodeEditor | null) => {
  // First check if the language detector provides an options menu
  const detector = languageRegistry.getById(language);
  if (detector?.getOptionsMenu && editor) {
    const OptionsMenu = detector.getOptionsMenu();
    return () => <OptionsMenu editor={editor} />;
  }
};