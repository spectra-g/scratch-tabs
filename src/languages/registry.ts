import { LanguageDetector, LanguageRegistry } from './types';

/**
 * Registry for language detectors
 */
class LanguageRegistryImpl implements LanguageRegistry {
  private detectors: LanguageDetector[] = [];
  
  /**
   * Register a language detector
   */
  register(detector: LanguageDetector): void {
    this.detectors.push(detector);
  }
  
  /**
   * Get all registered language detectors
   */
  getAll(): LanguageDetector[] {
    return [...this.detectors];
  }
  
  /**
   * Get a language detector by ID
   */
  getById(id: string): LanguageDetector | undefined {
    return this.detectors.find(detector => detector.id === id);
  }
  
  /**
   * Detect the language of content
   */
  detectLanguage(content: string): string {
    if (!content.trim()) return 'plaintext';
    
    // Find all matching languages
    const matches = this.detectors.filter(detector => detector.isMatch(content));
    
    // If no matches, return plaintext
    if (matches.length === 0) return 'plaintext';
    
    // If only one match, return it
    if (matches.length === 1) return matches[0].id;
    
    // If multiple matches, resolve ambiguity
    return this.resolveAmbiguity(content, matches);
  }
  
  /**
   * Check if content is ambiguous (matches multiple languages)
   */
  isAmbiguous(content: string): boolean {
    if (!content.trim()) return false;
    
    // Find all matching languages
    const matches = this.detectors.filter(detector => detector.isMatch(content));
    
    // Content is ambiguous if it matches multiple languages
    return matches.length > 1;
  }
  
  /**
   * Initialize all language providers with Monaco
   */
  initializeProviders(monaco: any): void {
    this.detectors.forEach(detector => {
      detector.registerProvider(monaco);
    });
  }
  
  /**
   * Resolve ambiguity between multiple matching languages
   */
  private resolveAmbiguity(content: string, matches: LanguageDetector[]): string {
    // First try to resolve by counting specific patterns
    const withPatternCounts = matches.map(detector => ({
      detector,
      count: detector.countSpecificPatterns(content)
    }));
    
    // Sort by pattern count (descending)
    withPatternCounts.sort((a, b) => b.count - a.count);
    
    // If the highest count is significantly higher than the second highest,
    // use that language
    if (withPatternCounts.length > 1 && 
        withPatternCounts[0].count > withPatternCounts[1].count) {
      return withPatternCounts[0].detector.id;
    }
    
    // If pattern counts don't resolve ambiguity, use priority
    const sortedByPriority = [...matches].sort((a, b) => b.priority - a.priority);
    return sortedByPriority[0].id;
  }
}

// Create and export a singleton instance
export const languageRegistry = new LanguageRegistryImpl(); 