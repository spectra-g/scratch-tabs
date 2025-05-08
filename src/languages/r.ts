import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * R language detector
 */
export class RLanguageDetector extends BaseLanguageDetector {
  id = 'r';
  name = 'R';
  extensions = ['r'];
  priority = 3;

  sampleContent(): string {
    return `x <- 42
library(ggplot2)`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    // Detect R assignment or library calls
    return /<-\s*/.test(content)
        || /\blibrary\s*\(\s*['"]?\w+/.test(content);
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for R by default
  }
}

const rDetector = new RLanguageDetector();
languageRegistry.register(rDetector);
export const registerRProvider = (monaco: any) => {
  rDetector.registerProvider(monaco);
}; 