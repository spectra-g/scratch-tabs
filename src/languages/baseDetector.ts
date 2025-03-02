import { LanguageDetector } from './types';

/**
 * Base class for language detectors
 */
export abstract class BaseLanguageDetector implements LanguageDetector {
  /**
   * The language ID (e.g., 'json', 'yaml', 'markdown')
   */
  abstract id: string;
  
  /**
   * Display name for the language
   */
  abstract name: string;
  
  /**
   * File extensions associated with this language (without the dot)
   */
  abstract extensions: string[];
  
  /**
   * Priority for ambiguity resolution (higher wins in ambiguous cases)
   * Default is 0
   */
  priority: number = 0;
  
  /**
   * Check if the content matches this language
   */
  abstract isMatch(content: string): boolean;
  
  /**
   * Count specific patterns that strongly indicate this language
   * Used for ambiguity resolution
   * Default implementation returns 0
   */
  countSpecificPatterns(content: string): number {
    return 0;
  }
  
  /**
   * Register language provider with Monaco editor
   * Default implementation does nothing
   */
  registerProvider(monaco: any): void {
    // Default implementation does nothing
  }
} 