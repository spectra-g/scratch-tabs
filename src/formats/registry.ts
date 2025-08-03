import { FormatModule, FormatRegistry, DetectionResult } from "./types";

/**
 * Implementation of the format registry
 * Manages all registered format modules and provides detection functionality
 */
class FormatRegistryImpl implements FormatRegistry {
  private modules: FormatModule[] = [];

  register(module: FormatModule): void {
    // Remove existing module with same ID if it exists
    this.modules = this.modules.filter((m) => m.id !== module.id);
    this.modules.push(module);
  }

  getAll(): FormatModule[] {
    return [...this.modules];
  }

  getById(id: string): FormatModule | undefined {
    return this.modules.find((module) => module.id === id);
  }

  detectFormat(content: string): string {
    if (!content || content.trim().length === 0) {
      return "plaintext";
    }

    let bestMatch: FormatModule | null = null;
    let bestConfidence = 0;
    let bestPriority = -1;
    let bestDefinitiveMatch: FormatModule | null = null;
    let bestDefinitivePriority = -1;

    // First pass: check all modules and collect results
    for (const module of this.modules) {
      try {
        const result = module.detect(content);
        if (result.match) {
          // Track definitive matches by priority
          if (result.matchedDefinitive) {
            if (module.priority > bestDefinitivePriority) {
              bestDefinitiveMatch = module;
              bestDefinitivePriority = module.priority;
            }
          }

          // Track best overall match based on confidence and priority
          if (
            result.confidence > bestConfidence ||
            (result.confidence === bestConfidence &&
              module.priority > bestPriority)
          ) {
            bestMatch = module;
            bestConfidence = result.confidence;
            bestPriority = module.priority;
          }
        }
      } catch (error) {
        console.warn(
          `Error detecting format with module "${module.id}":`,
          error,
        );
      }
    }

    // If we have definitive matches, use the highest priority one
    if (bestDefinitiveMatch) {
      return bestDefinitiveMatch.id;
    }

    return bestMatch ? bestMatch.id : "plaintext";
  }

  isAmbiguous(content: string): boolean {
    const matches: Array<{
      module: FormatModule;
      confidence: number;
    }> = [];

    for (const module of this.modules) {
      try {
        const result = module.detect(content);
        if (result.match && result.confidence > 0.5) {
          matches.push({
            module,
            confidence: result.confidence,
          });
        }
      } catch (error) {
        console.warn(
          `Error checking ambiguity with module "${module.id}":`,
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
      module: FormatModule;
      confidence: number;
    }> = [];

    for (const module of this.modules) {
      try {
        const result = module.detect(content);
        if (result.match) {
          matches.push({
            module,
            confidence: result.confidence,
          });
        }
      } catch (error) {
        console.warn(
          `Error getting potential matches with module "${module.id}":`,
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
        return b.module.priority - a.module.priority;
      })
      .slice(0, limit)
      .map((match) => ({
        id: match.module.id,
        name: match.module.name,
        score: match.confidence,
      }));
  }

  initializeProviders(monaco: any): void {
    this.modules.forEach((module) => {
      try {
        if (typeof module.registerProvider === "function") {
          module.registerProvider(monaco);
        }
      } catch (error) {
        console.error(
          `Error initializing provider for format "${module.id}":`,
          error,
        );
      }
    });
  }
}

// Export singleton instance
export const formatRegistry = new FormatRegistryImpl();
