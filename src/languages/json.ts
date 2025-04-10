import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { registerJsonValidationProvider } from './json/validation';
import { JsonStatusItem } from './json/StatusItem';
import { JsonOptionsMenu } from './json/JsonOptionsMenu';
import * as monaco from 'monaco-editor';

/**
 * JSON language detector
 */
export class JsonLanguageDetector extends BaseLanguageDetector {
  id = 'json';
  name = 'JSON';
  extensions = ['json'];
  priority = 5; // Higher priority because JSON is unambiguous when valid
  
  patterns = () => [
    /"[^"]*"\s*:/,                  // "key": pattern
    /\[\s*(?:"[^"]*"|[\d.]+|true|false|null|{)/,  // Array with valid JSON values
    /{\s*"[^"]*"\s*:/,              // Object with key
    /,\s*"[^"]*"\s*:/,              // Property separator pattern
    /"[^"]*"\s*:\s*(?:"[^"]*"|[\d.]+|true|false|null|\[|{)/  // Key-value pair with valid JSON value
  ];

  /**
   * Get sample content for JSON
   */
  sampleContent(): string {
    return `{
  "name": "John Doe",
  "age": 30,
  "isStudent": false,
  "hobbies": ["reading", "music", "sports"],
  "address": {
    "street": "123 Main St",
    "city": "Anytown",
    "country": "USA"
  },
  "contact": {
    "email": "john@example.com",
    "phone": "+1-555-555-5555"
  }
}`;
  }
  
/**
 * Check if content is valid JSON or matches JSON patterns
 * Works with both complete and partial content
 */
isMatch(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false; // Added empty check

  // Quick check for starting characters - Strong indicator
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return false;
  }

  // If it looks complete, try parsing first (most reliable)
  if (this.looksLikeCompleteJson(trimmed)) {
      try {
          JSON.parse(trimmed);
          return true; // Valid JSON
      } catch {
          // Parsing failed, but it might still be partial JSON. Fall through.
      }
  }

  // --- NEW: Handle incomplete structures ---
  // If it starts with { or [ and isn't just the brace/bracket itself,
  // consider it a potential match, especially if other detectors fail.
  // This helps keep JSON selected while typing.
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 1) {
       // Check for things that are definitely NOT JSON within the first few lines
       const lines = content.split('\n').slice(0, 5); // Check first 5 lines
       const hasYamlIndicators = lines.some(line =>
          /^\s*-\s+\S/.test(line) || // Starts with `- `
          /^\s*[a-zA-Z_][a-zA-Z0-9_-]*\s*:/.test(line) // Starts with unquoted key:
       );
       if (!hasYamlIndicators) {
           // It starts like JSON and doesn't immediately contain obvious YAML block features
           return true; // Assume it's intended JSON for now
       }
  }
  // --- End NEW ---


  // Original pattern matching as a fallback (less critical now)
  return this.matchesJsonPatterns(content); // Keep this for slightly more complex partials
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
    
    // Count how many JSON patterns match
    const matchCount = this.patterns().reduce((count, pattern) => 
      count + (pattern.test(trimmed) ? 1 : 0), 0);
    
    // If at least 2 patterns match, consider it JSON
    return matchCount >= 2;
  }

  /**
   * Count Json-specific patterns (patterns that are unlikely to be in YAML)
   */
  countSpecificPatterns(content: string): number {
    return this.patterns().reduce((count, pattern) =>
        count + (pattern.test(content) ? 1 : 0), 0);
  }
  
  /**
   * Register JSON language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Register validation provider
    registerJsonValidationProvider(monaco);
  }

  /**
   * Get status item component for JSON
   */
  getStatusItem(): React.FC<{ content?: string }> {
    return JsonStatusItem;
  }

  /**
   * Get Options menu
   */
  getOptionsMenu(): React.FC<{ editor: monaco.editor.IStandaloneCodeEditor }> {
    return JsonOptionsMenu;
  }
}

// Create and register the detector
const jsonDetector = new JsonLanguageDetector();
languageRegistry.register(jsonDetector);

// Export for backward compatibility
export const registerJsonProvider = (monaco: any) => {
  jsonDetector.registerProvider(monaco);
};