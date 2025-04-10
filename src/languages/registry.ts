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
   * Resolve ambiguity between multiple matching languages (Priority First)
   */
  resolveAmbiguity(content: string, matches: LanguageDetector[]): string {
    if (matches.length === 0) {
        // Should not happen if called correctly, but handle defensively
        return 'plaintext';
    }
    if (matches.length === 1) {
        return matches[0].id;
    }

    // 1. Sort by Priority (descending)
    const sortedByPriority = [...matches].sort((a, b) => b.priority - a.priority);

    const highestPriority = sortedByPriority[0].priority;
    const topPriorityMatches = sortedByPriority.filter(match => match.priority === highestPriority);

    // 2. If only one detector has the highest priority, use it.
    if (topPriorityMatches.length === 1) {
        return topPriorityMatches[0].id;
    }

    // 3. Tie in Priority: Use scores as a tie-breaker among the top priority matches
    if (topPriorityMatches.length > 1) {
        const withPatternCounts = topPriorityMatches.map(detector => ({
            detector,
            // Ensure countSpecificPatterns is called only on the tied matches
            count: detector.countSpecificPatterns(content)
        }));

        // Sort the tied matches by score (descending)
        withPatternCounts.sort((a, b) => b.count - a.count);

        // Return the one with the highest score among the priority ties
        // Optional: Add logic here if scores are *also* tied (e.g., return the first alphabetically?)
        return withPatternCounts[0].detector.id;
    }

    // Fallback (should ideally not be reached with the logic above)
    // If something went wrong, return the absolute highest priority one found initially.
    return sortedByPriority[0].id;
  }
}

// Create and export a singleton instance
export const languageRegistry = new LanguageRegistryImpl(); 