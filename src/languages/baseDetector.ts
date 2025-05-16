import { DetectionResult, LanguageDetector } from './types';

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
  abstract detect(content: string): DetectionResult;
  
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

  /**
   * Get the file extension for this language
   * Default implementation returns the first extension or 'txt'
   */
  getFileExtension(): string {
    // Special cases for common languages
    switch (this.id) {
      case 'plaintext':
        return 'txt';
      case 'javascript':
        return 'js';
      case 'typescript':
        return 'ts';
      case 'markdown':
        return 'md';
      default:
        // Use the first defined extension or fallback to the language ID
        return this.extensions[0] || this.id;
    }
  }

  noMatch(): DetectionResult {
    return {
      match: false,
      confidence: 0
    };
  }

  match(): DetectionResult {
    return {
      match: true,
      confidence: 1,
      matchedDefinitive: true
    };
  }
}
