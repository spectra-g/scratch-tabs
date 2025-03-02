import { loader } from '@monaco-editor/react';
import { registerYamlProvider } from './yaml';
import { registerMarkdownProvider } from './markdown';
import { registerJsonProvider } from './json';
import { registerBashProvider } from './bash';
import { registerCsvProvider } from './csv';
import { languageRegistry } from './registry';
import { LanguageDetector } from './types';

// Import all language detectors
import './json';
import './yaml';
import './markdown';
import './csv';
import './bash';
import './sql';
import './html';
import './javascript';

// Export the registry for use in the application
export { languageRegistry };

// Export a function to register all language providers with Monaco
export const registerAllLanguageProviders = (monaco: any) => {
  // Get all registered detectors and register their providers
  languageRegistry.getAll().forEach((detector: LanguageDetector) => {
    detector.registerProvider(monaco);
  });
};

// Export individual language registration functions for backward compatibility
export { registerJsonProvider } from './json';
export { registerYamlProvider } from './yaml';
export { registerMarkdownProvider } from './markdown';
export { registerCsvProvider } from './csv';
export { registerBashProvider } from './bash';
export { registerSqlProvider } from './sql';
export { registerHtmlProvider } from './html';
export { registerJavaScriptProvider, registerTypeScriptProvider } from './javascript';

/**
 * Initialize all language providers with Monaco
 */
export const initializeLanguageProviders = () => {
  loader.init().then((monaco) => {
    // Register all language providers using the registry
    registerAllLanguageProviders(monaco);
  });
};

/**
 * Detect the language of content
 */
export const detectLanguage = (content: string): string => {
  return languageRegistry.detectLanguage(content);
};

/**
 * Check if the content matches patterns that could be ambiguous between languages
 */
export const isAmbiguousLanguage = (content: string): boolean => {
  return languageRegistry.isAmbiguous(content);
};