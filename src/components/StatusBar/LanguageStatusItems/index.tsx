import { languageRegistry } from '../../../languages';

export const getLanguageStatusItem = (language: string, content: string) => {
  // First check if the language detector provides a status item
  const detector = languageRegistry.getById(language);
  if (detector?.getStatusItem) {
    const StatusItem = detector.getStatusItem();
    return () => <StatusItem content={content} />;
  }
};