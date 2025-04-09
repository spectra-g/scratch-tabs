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
   * Check if content matches this language
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

  /**
   * Get sample content for this language
   * Default implementation returns empty string
   */
  sampleContent(): string {
    return '';
  }

  /**
   * Get status item component for this language
   * Default implementation returns undefined
   */
  getStatusItem?(): React.FC<any> {
    return () => null;
  }

  /**
   * Get options menu component for this language
   * Default implementation returns undefined
   */
  getOptionsMenu?(): React.FC<any> {
    return () => null;
  }
}

//export { BaseLanguageDetector }