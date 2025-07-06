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
    console.time('[LanguageRegistry] detectLanguage');
    console.log(`[LanguageRegistry] Starting detection for content length: ${content.length}`);

    // Early return for very large content to prevent performance issues
    if (content.length > 100000) {
      console.log(`[LanguageRegistry] Content too large (${content.length} bytes), returning plaintext`);
      console.timeEnd('[LanguageRegistry] detectLanguage');
      return 'plaintext';
    }

    const detectionResults: Array<{ detector: LanguageDetector; result: DetectionResult }> = [];

    // Run all detectors
    for (const detector of this.detectors) {
      console.log(`[LanguageRegistry] Running detector "${detector.id}"`);
      console.time(`[LanguageRegistry] detector ${detector.id}`);
      try {
        const result = detector.detect(content);
        detectionResults.push({ detector, result });
        console.timeEnd(`[LanguageRegistry] detector ${detector.id}`);
      } catch (error) {
        console.error(`[LanguageRegistry] Error in detector ${detector.id}:`, error);
        console.timeEnd(`[LanguageRegistry] detector ${detector.id}`);
      }
    }

    // Find the best result
    let bestResult = 'plaintext';
    let bestConfidence = 0;

    for (const { detector, result } of detectionResults) {
      if (result.confidence > bestConfidence) {
        bestConfidence = result.confidence;
        bestResult = detector.id;
      }
    }

    const finalResult = bestConfidence > 0.5 ? bestResult : 'plaintext';
    console.log(`[LanguageRegistry] Final result is "${finalResult}" with confidence ${bestConfidence}`);
    console.timeEnd('[LanguageRegistry] detectLanguage');
    return finalResult;
  }
  
  /**
   * Check if content is ambiguous (matches multiple languages)
   */
  isAmbiguous(content: string): boolean {
    if (!content || !content.trim()) return false;
    
    if (content.length > 1_000_000) {
      return false;
    }

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
  
  /**
   * Get potential language matches for content
   */
  getPotentialMatches(content: string, limit: number = 5): Array<{
    id: string;
    name: string;
    score: number;
  }> {
    if (!content || !content.trim()) {
      // For empty content, return plaintext as the only match
      const plaintext = this.getById('plaintext');
      if (plaintext) {
        return [{
          id: 'plaintext',
          name: plaintext.name,
          score: 1.0
        }];
      }
      return [];
    }

    const detectionResults: Array<{
      id: string;
      name: string;
      score: number;
    }> = [];

    // Get matches from all detectors
    for (const detector of this.detectors) {
      const result = detector.detect(content);
      if (result.match) {
        detectionResults.push({
          id: detector.id,
          name: detector.name,
          score: result.confidence
        });
      }
    }

    // Sort by confidence (descending)
    detectionResults.sort((a, b) => b.score - a.score);

    // Return the top N matches
    return detectionResults.slice(0, limit);
  }
}

// Create and export a singleton instance
export const languageRegistry = new LanguageRegistryImpl(); 