import { LanguageDetector, LanguageRegistry, DetectionResult } from './types';

/**
 * Registry for language detectors
 */
class LanguageRegistryImpl implements LanguageRegistry {
  private detectors: LanguageDetector[] = [];
  
  /**
   * Register a language detector
   */
  register(detector: LanguageDetector): void {
    const exists = this.detectors.some(d => d.id === detector.id);
    if (!exists) {
      this.detectors.push(detector);
      this.detectors.sort((a, b) => b.priority - a.priority);
    }
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
  
  detectLanguage(content: string): string {
    if (!content || !content.trim()) return 'plaintext';

    const detectionResults: Array<{ detector: LanguageDetector; result: DetectionResult }> = [];

    for (const detector of this.detectors) {
      const result = detector.detect(content);
      if (result.match) {
        detectionResults.push({ detector, result });
      }
    }

    // Sort by confidence (descending), then by priority (descending) as a tie-breaker
    detectionResults.sort((a, b) => {
      if (b.result.confidence !== a.result.confidence) {
        return b.result.confidence - a.result.confidence;
      }
      return b.detector.priority - a.detector.priority; // Higher priority wins in a confidence tie
    });

    // Optional: Add a check for ambiguity if top scores are too close
    // if (detectionResults.length > 1 &&
    //     (detectionResults[0].result.confidence - detectionResults[1].result.confidence < 0.1) && // Example threshold
    //     detectionResults[0].detector.priority === detectionResults[1].detector.priority) {
    //    console.warn("Ambiguous detection, top two are very close:", detectionResults[0], detectionResults[1]);
    //    // Could return plaintext, or the highest priority one even if confidence is close.
    //    // For now, we'll just return the top one from the sort.
    // }

    return detectionResults[0]?.detector.id ?? 'plaintext';
  }
  
  /**
   * Check if content is ambiguous (matches multiple languages)
   */
  isAmbiguous(content: string): boolean {
    if (!content || !content.trim()) return false;

    const detectionResults: Array<{ detector: LanguageDetector; result: DetectionResult }> = [];
    for (const detector of this.detectors) {
      const result = detector.detect(content);
      if (result.match && result.confidence > 0.3) { // Only consider reasonably confident matches
        detectionResults.push({ detector, result });
      }
    }

    if (detectionResults.length <= 1) {
      return false; // Not ambiguous if 0 or 1 reasonably confident match
    }

    // Sort by confidence
    detectionResults.sort((a, b) => b.result.confidence - a.result.confidence);

    // Ambiguous if the top two (or more) have very similar high confidence scores
    const topMatch = detectionResults[0];
    const secondMatch = detectionResults[1];

    // Example ambiguity criteria:
    // 1. Top match confidence is high enough (e.g., > 0.5)
    // 2. Second match confidence is also reasonably high (e.g., > 0.4)
    // 3. The difference in confidence is small (e.g., < 0.15)
    if (topMatch.result.confidence > 0.5 &&
        secondMatch.result.confidence > 0.4 &&
        (topMatch.result.confidence - secondMatch.result.confidence) < 0.15) {
      // Further tie-breaking by priority if confidence is extremely close
      if (Math.abs(topMatch.result.confidence - secondMatch.result.confidence) < 0.05 &&
          topMatch.detector.priority !== secondMatch.detector.priority) {
          return false; // Priority breaks the tie
      }
      return true;
    }

    return false;
  }
  
  /**
   * Initialize all language providers with Monaco
   */
  initializeProviders(monaco: any): void {
    this.detectors.forEach(detector => {
      detector.registerProvider(monaco);
    });
  }
  
}

// Create and export a singleton instance
export const languageRegistry = new LanguageRegistryImpl(); 