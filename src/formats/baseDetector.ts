import { FormatDetector, DetectionResult } from "./types";

/**
 * Base class for format detectors
 * Provides common functionality and default implementations
 */
export abstract class BaseFormatDetector implements FormatDetector {
  abstract id: string;
  abstract name: string;
  abstract extensions: string[];
  abstract priority: number;

  abstract detect(content: string): DetectionResult;
  abstract registerProvider(monaco: any): void;
  abstract sampleContent(): string;

  getStatusItem?(): React.FC<any>;
  getOptionsMenu?(): React.FC<any>;

  getFileExtension(): string {
    return this.extensions[0] || "";
  }

  /**
   * Helper method to check if content contains specific patterns
   */
  protected containsPattern(content: string, pattern: RegExp): boolean {
    return pattern.test(content);
  }

  /**
   * Helper method to count occurrences of a pattern
   */
  protected countPattern(content: string, pattern: RegExp): number {
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  /**
   * Helper method to calculate confidence based on pattern matches
   */
  protected calculateConfidence(
    content: string,
    positivePatterns: RegExp[],
    negativePatterns: RegExp[] = [],
  ): number {
    let positiveScore = 0;
    let negativeScore = 0;

    // Count positive pattern matches
    positivePatterns.forEach((pattern) => {
      positiveScore += this.countPattern(content, pattern);
    });

    // Count negative pattern matches
    negativePatterns.forEach((pattern) => {
      negativeScore += this.countPattern(content, pattern);
    });

    // Calculate confidence (0.0 to 1.0)
    const totalScore = positiveScore - negativeScore;
    return Math.max(0, Math.min(1, totalScore / 10)); // Normalize to 0-1 range
  }

  noMatch(): DetectionResult {
    return {
      match: false,
      confidence: 0,
    };
  }

  match(): DetectionResult {
    return {
      match: true,
      confidence: 1,
      matchedDefinitive: true,
    };
  }
}
