import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Scala language detector
 */
export class ScalaLanguageDetector extends BaseLanguageDetector {
  id = 'scala';
  name = 'Scala';
  extensions = ['scala'];
  priority = 4;

  sampleContent(): string {
    return `object HelloWorld extends App {
  println("Hello, Scala!")
}`;
  }

  isMatch(content: string): boolean {
    if (!content) return false;
    return /\bobject\s+\w+/.test(content) && /\bextends\s+\w+/.test(content);
  }

  registerProvider(monaco: any): void {
    // No Monaco provider for Scala by default
  }
}

const scalaDetector = new ScalaLanguageDetector();
languageRegistry.register(scalaDetector);
export const registerScalaProvider = (monaco: any) => {
  scalaDetector.registerProvider(monaco);
}; 