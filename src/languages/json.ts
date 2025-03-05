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
   * Check if content is valid JSON or matches JSON patterns
   * Works with both complete and partial content
   */
  isMatch(content: string): boolean {
    // First try to parse as JSON if it seems complete
    // This is the most accurate method but requires complete content
    if (this.looksLikeCompleteJson(content)) {
      try {
        JSON.parse(content);
        return true;
      } catch {
        // If parsing fails, fall back to pattern matching
      }
    }
    
    // Pattern matching approach for partial content
    return this.matchesJsonPatterns(content);
  }
  
  /**
   * Check if content looks like it might be complete JSON
   * This helps avoid trying to parse obviously incomplete JSON
   */
  private looksLikeCompleteJson(content: string): boolean {
    const trimmed = content.trim();
    
    // Check if it starts with { or [ and ends with matching } or ]
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if content matches common JSON patterns
   * This works with partial content
   */
  private matchesJsonPatterns(content: string): boolean {
    const trimmed = content.trim();
    
    // Must start with { or [
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
    }
    
    // Check for common JSON patterns
    const jsonPatterns = [
      /"[^"]*"\s*:/,                  // "key": pattern
      /\[\s*(?:"[^"]*"|[\d.]+|true|false|null|{)/,  // Array with valid JSON values
      /{\s*"[^"]*"\s*:/,              // Object with key
      /,\s*"[^"]*"\s*:/,              // Property separator pattern
      /"[^"]*"\s*:\s*(?:"[^"]*"|[\d.]+|true|false|null|\[|{)/  // Key-value pair with valid JSON value
    ];
    
    // Count how many JSON patterns match
    const matchCount = jsonPatterns.reduce((count, pattern) => 
      count + (pattern.test(trimmed) ? 1 : 0), 0);
    
    // If at least 2 patterns match, consider it JSON
    return matchCount >= 2;
  }
  
  /**
   * Register JSON language provider with Monaco
   */
  registerProvider(_monaco: any): void {
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