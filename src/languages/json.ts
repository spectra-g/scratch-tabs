import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * JSON language detector
 */
export class JsonLanguageDetector extends BaseLanguageDetector {
  id = 'json';
  name = 'JSON';
  extensions = ['json'];
  priority = 5; // Higher priority because JSON is unambiguous when valid
  
  /**
   * Check if content is valid JSON
   */
  isMatch(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Register JSON language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // JSON formatting is built into Monaco, so we don't need to register a custom provider
    // This method exists for consistency and future customization if needed
  }
}

// Create and register the detector
const jsonDetector = new JsonLanguageDetector();
languageRegistry.register(jsonDetector);

// Export for backward compatibility
export const registerJsonProvider = (monaco: any) => {
  jsonDetector.registerProvider(monaco);
};