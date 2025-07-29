import { FormatDetector, FormatRegistry, DetectionResult } from "./types";

/**
 * Implementation of the format registry
 * Manages all registered format detectors and provides detection functionality
 */
class FormatRegistryImpl implements FormatRegistry {
  private detectors: FormatDetector[] = [];

  register(detector: FormatDetector): void {
    // Remove existing detector with same ID if it exists
    this.detectors = this.detectors.filter((d) => d.id !== detector.id);
    this.detectors.push(detector);
  }

  getAll(): FormatDetector[] {
    return [...this.detectors];
  }

  getById(id: string): FormatDetector | undefined {
    return this.detectors.find((detector) => detector.id === id);
  }

  detectFormat(content: string): string {
    if (!content || content.trim().length === 0) {
      return "plaintext";
    }

    let bestMatch: FormatDetector | null = null;
    let bestConfidence = 0;
    let bestPriority = -1;

    for (const detector of this.detectors) {
      try {
        const result = detector.detect(content);
        if (result.match) {
          // If we have a definitive match, return it immediately
          if (result.matchedDefinitive) {
            return detector.id;
          }

          // Otherwise, track the best match based on confidence and priority
          if (
            result.confidence > bestConfidence ||
            (result.confidence === bestConfidence &&
              detector.priority > bestPriority)
          ) {
            bestMatch = detector;
            bestConfidence = result.confidence;
            bestPriority = detector.priority;
          }
        }
      } catch (error) {
        console.warn(
          `Error detecting format with detector "${detector.id}":`,
          error,
        );
      }
    }

    return bestMatch ? bestMatch.id : "plaintext";
  }

  isAmbiguous(content: string): boolean {
    const matches: Array<{
      detector: FormatDetector;
      confidence: number;
    }> = [];

    for (const detector of this.detectors) {
      try {
        const result = detector.detect(content);
        if (result.match && result.confidence > 0.5) {
          matches.push({
            detector,
            confidence: result.confidence,
          });
        }
      } catch (error) {
        console.warn(
          `Error checking ambiguity with detector "${detector.id}":`,
          error,
        );
      }
    }

    // Consider ambiguous if we have multiple high-confidence matches
    return matches.length > 1;
  }

  getPotentialMatches(
    content: string,
    limit: number = 5,
  ): Array<{
    id: string;
    name: string;
    score: number;
  }> {
    const matches: Array<{
      detector: FormatDetector;
      confidence: number;
    }> = [];

    for (const detector of this.detectors) {
      try {
        const result = detector.detect(content);
        if (result.match) {
          matches.push({
            detector,
            confidence: result.confidence,
          });
        }
      } catch (error) {
        console.warn(
          `Error getting potential matches with detector "${detector.id}":`,
          error,
        );
      }
    }

    // Sort by confidence and priority, then take top N
    return matches
      .sort((a, b) => {
        if (a.confidence !== b.confidence) {
          return b.confidence - a.confidence;
        }
        return b.detector.priority - a.detector.priority;
      })
      .slice(0, limit)
      .map((match) => ({
        id: match.detector.id,
        name: match.detector.name,
        score: match.confidence,
      }));
  }

  initializeProviders(monaco: any): void {
    this.detectors.forEach((detector) => {
      try {
        if (typeof detector.registerProvider === "function") {
          detector.registerProvider(monaco);
        }
      } catch (error) {
        console.error(
          `Error initializing provider for format "${detector.id}":`,
          error,
        );
      }
    });
  }
}

// Export singleton instance
export const formatRegistry = new FormatRegistryImpl();
