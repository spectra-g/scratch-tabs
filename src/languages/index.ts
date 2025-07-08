import { loader } from '@monaco-editor/react';
import { languageRegistry } from './registry';
import { LanguageDetector } from './types';

// Import all language detectors explicitly
import './accesslog';
import './bash';
import './cpp';
import './csharp';
import './css';
import './csv';
import './curl';
import './diff';
import './dockerfile';
import './go';
import './graphql';
import './groovy';
import './hcl';
import './html';
import './java';
import './javascript';
import './json';
import './jsonlog';
import './kotlin';
import './markdown';
import './php';
import './properties';
import './python';
import './r';
import './ruby';
import './rust';
import './scala';
import './sql';
import './stacktrace';
import './vhost';
import './xml';
import './yaml';

// Export the registry for use in the application
export { languageRegistry };

/**
 * Configuration for language detection performance optimization
 */
const LANGUAGE_DETECTION_CONFIG = {
  /**
   * Maximum number of lines to sample for language detection
   * Increase for better accuracy with files that have important content later
   * Decrease for better performance with very large files
   */
  MAX_SAMPLE_LINES: 100,
  
  /**
   * Minimum file size (in characters) before sampling is applied
   * Files smaller than this will be processed entirely
   */
  MIN_SIZE_FOR_SAMPLING: 5000,
} as const;

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
 * Content is automatically sampled to first 100 lines for performance optimization
 */
export const detectLanguage = (content: string): string => {
  // Sample content for performance - detectors work with first N lines only
  const sampledContent = sampleContentForDetection(content);
  return languageRegistry.detectLanguage(sampledContent);
};

/**
 * Check if the content matches patterns that could be ambiguous between languages
 * Content is automatically sampled to first 100 lines for performance optimization
 */
export const isAmbiguousLanguage = (content: string): boolean => {
  // Sample content for performance - detectors work with first N lines only
  const sampledContent = sampleContentForDetection(content);
  return languageRegistry.isAmbiguous(sampledContent);
};

/**
 * Sample content to first N lines for performance optimization
 * @param content The full content to sample
 * @returns Sampled content with first N lines (or full content if small)
 */
const sampleContentForDetection = (content: string): string => {
  if (!content) return content;
  
  // Skip sampling for small files
  if (content.length < LANGUAGE_DETECTION_CONFIG.MIN_SIZE_FOR_SAMPLING) {
    return content;
  }
  
  const lines = content.split('\n');
  if (lines.length <= LANGUAGE_DETECTION_CONFIG.MAX_SAMPLE_LINES) {
    return content; // No need to sample if content is already small
  }
  
  // Take first N lines and preserve line endings
  return lines.slice(0, LANGUAGE_DETECTION_CONFIG.MAX_SAMPLE_LINES).join('\n');
};

/**
 * Get potential language matches for the given content
 * Returns an array of language objects with their confidence scores
 * Always includes plaintext as a fallback if no other languages match
 * 
 * Content is automatically sampled to first 100 lines for performance optimization
 */
export const getPotentialLanguageMatches = (content: string, limit: number = 5): Array<{
  id: string;
  name: string;
  score: number;
}> => {
  // Sample content for performance - detectors work with first N lines only
  const sampledContent = sampleContentForDetection(content);
  
  const matches = languageRegistry.getPotentialMatches(sampledContent, limit);
  
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