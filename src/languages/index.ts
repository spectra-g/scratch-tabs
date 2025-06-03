import { loader } from '@monaco-editor/react';
import { languageRegistry } from './registry';
import { LanguageDetector } from './types';

import.meta.glob('./!(index|types|registry|baseDetector)*.ts', { eager: true });

// Export the registry for use in the application
export { languageRegistry };

export const registerAllLanguageProviders = (monaco: any) => {
  languageRegistry.getAll().forEach((detector: LanguageDetector) => {
    try {
        // Ensure registerProvider exists before calling
        if (typeof detector.registerProvider === 'function') {
            detector.registerProvider(monaco);
        } else {
             console.warn(`Detector "${detector.id}" is missing registerProvider method.`);
        }
    } catch (error) {
        console.error(`Error registering provider for language "${detector.id}":`, error);
    }
  });
};

/**
 * Initialize all language providers with Monaco
 */
export const initializeLanguageProviders = () => {
  // Ensure Monaco loader promise is handled correctly
  loader.init()
    .then((monaco) => {
      registerAllLanguageProviders(monaco);
    })
    .catch(error => {
      console.error("Monaco Loader failed to initialize:", error);
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

/**
 * Get potential language matches for the given content
 * Returns an array of language objects with their confidence scores
 * Always includes plaintext as a fallback if no other languages match
 */
export const getPotentialLanguageMatches = (content: string, limit: number = 5): Array<{
  id: string;
  name: string;
  score: number;
}> => {
  const matches = languageRegistry.getPotentialMatches(content, limit);
  
  // Ensure we always have at least plaintext in the results
  if (matches.length === 0) {
    const plaintext = languageRegistry.getById('plaintext');
    if (plaintext) {
      return [{
        id: 'plaintext',
        name: plaintext.name,
        score: 1.0
      }];
    }
  }
  
  return matches;
};