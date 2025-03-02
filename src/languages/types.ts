/**
 * Interface for language detector implementations
 */
export interface LanguageDetector {
  /**
   * The language ID (e.g., 'json', 'yaml', 'markdown')
   */
  id: string;
  
  /**
   * Display name for the language
   */
  name: string;
  
  /**
   * File extensions associated with this language (without the dot)
   */
  extensions: string[];
  
  /**
   * Priority for ambiguity resolution (higher wins in ambiguous cases)
   */
  priority: number;
  
  /**
   * Check if the content matches this language
   */
  isMatch: (content: string) => boolean;
  
  /**
   * Count specific patterns that strongly indicate this language
   * Used for ambiguity resolution
   */
  countSpecificPatterns: (content: string) => number;
  
  /**
   * Register language provider with Monaco editor
   */
  registerProvider: (monaco: any) => void;
}

/**
 * Interface for language registry
 */
export interface LanguageRegistry {
  /**
   * Register a language detector
   */
  register: (detector: LanguageDetector) => void;
  
  /**
   * Get all registered language detectors
   */
  getAll: () => LanguageDetector[];
  
  /**
   * Get a language detector by ID
   */
  getById: (id: string) => LanguageDetector | undefined;
  
  /**
   * Detect the language of content
   */
  detectLanguage: (content: string) => string;
  
  /**
   * Check if content is ambiguous (matches multiple languages)
   */
  isAmbiguous: (content: string) => boolean;
  
  /**
   * Initialize all language providers with Monaco
   */
  initializeProviders: (monaco: any) => void;
} 