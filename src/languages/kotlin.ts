import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Kotlin language detector
 */
export class KotlinLanguageDetector extends BaseLanguageDetector {
  id = 'kotlin';
  name = 'Kotlin';
  extensions = ['kt'];
  priority = 5;

  sampleContent(): string {
    return `fun main() {
  println("Hello, Kotlin!")
}`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    return /\bfun\s+\w+\s*\(/.test(content)
        || /\b(val|var)\s+\w+\s*=/.test(content);
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for Kotlin by default
  }
}

const kotlinDetector = new KotlinLanguageDetector();
languageRegistry.register(kotlinDetector);
export const registerKotlinProvider = (monaco: any) => {
  kotlinDetector.registerProvider(monaco);
}; 