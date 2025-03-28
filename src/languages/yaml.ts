import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * YAML language detector
 */
export class YamlLanguageDetector extends BaseLanguageDetector {
  id = 'yaml';
  name = 'YAML';
  extensions = ['yaml', 'yml'];
  priority = 4;
  
  /**
   * Get sample content for YAML
   */
  sampleContent(): string {
    return `# Project Configuration
name: my-awesome-project
version: 1.0.0

# Development settings
development:
  port: 3000
  database:
    host: localhost
    port: 5432
    name: dev_db
    credentials:
      username: admin
      password: secret

# Environment variables
environment:
  - NODE_ENV=development
  - DEBUG=true
  - LOG_LEVEL=info

# Dependencies
dependencies:
  frontend:
    - react: ^18.0.0
    - typescript: ^4.8.0
  backend:
    - express: ^4.17.0
    - postgres: ^8.7.0

# Deployment configuration
deployment:
  provider: aws
  regions:
    - us-east-1
    - eu-west-1
  services:
    - name: web
      instances: 2
      memory: 512Mi
    - name: worker
      instances: 1
      memory: 1Gi

# Feature flags
features:
  darkMode: true
  betaFeatures: false
  analytics:
    enabled: true
    provider: google
`;
  }

  /**
   * Check if content matches YAML patterns
   */

      // Basic key pattern (simple key, colon, optional space/value/comment)
      // Allows simple unquoted keys or basic quoted keys.
  private basicKeyRegex = /^\s*([a-zA-Z0-9_-]+|"[^"]+"|'[^']+')\s*:\s*(?:.*)?$/m;

  // Key followed immediately by newline, then indented content (strong indicator)
  // Captures indent after key: \n(indentation)non-whitespace
  private indentedBlockRegex = /^\s*([a-zA-Z0-9_-]+|"[^"]+"|'[^']+')\s*:\s*(?:#.*)?\n(\s+)\S/m;

  // List item pattern (less ambiguous if looking for significant content or nested structure)
  private listItemRegex = /^\s*-\s+\S+/m; // Simple list item start `- value`

  // List item that contains a key (list of dictionaries - strong indicator)
  private listDictItemRegex = /^\s*-\s+([a-zA-Z0-9_-]+|"[^"]+"|'[^']+')\s*:\s+/m;

  // --- Specific Feature Patterns ---
  private directiveRegex = /^%YAML\s+[\d.]+/m;
  private docStartRegex = /^---(?:\s|$)/m; // Document start (allowing comment after ---)
  private docEndRegex = /^\.\.\.(?:\s|$)/m; // Document end
  private blockScalarRegex = /:\s*([|>])[+-]?\s*(?:#.*)?$/m; // key: | or key: >
  private anchorRegex = /:\s+&\w+/m; // : &anchor
  private aliasRegex = /:\s+\*\w+/m; // : *alias
  private flowSequenceRegex = /:\s+\[.*?\]/m; // key: [item1, item2]
  private flowMapRegex = /:\s+\{.*?:.*?\}/m; // key: {k: v}


  isMatch(content: string): boolean {
    // Quick exit for empty or comment-only content
    const trimmed = content.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      // Handle case where entire file might be comments, technically could be YAML
      // but unlikely to be the *intended* format unless other YAML syntax exists.
      // Check for deeper patterns if needed. For now, let's say no if ONLY comments.
      if (!trimmed.includes('\n')) return false; // Single comment line
      const lines = trimmed.split('\n');
      if (lines.every(line => line.trim().startsWith('#') || line.trim() === '')) {
        return false;
      }
    }

    // --- Strong Indicators ---
    // 1. Directive at the start
    if (this.directiveRegex.test(trimmed)) {
      return true;
    }
    // 2. Document start marker followed by a key or nested content
    if (this.docStartRegex.test(trimmed)) {
      // Check if content after --- looks like YAML structure
      const contentAfterDocStart = trimmed.substring(trimmed.indexOf('---') + 3);
      if (this.basicKeyRegex.test(contentAfterDocStart) || this.listItemRegex.test(contentAfterDocStart)) {
        return true;
      }
      // If just ---, could be Markdown, so don't return true yet
    }
    // 3. Key followed by an indented block
    if (this.indentedBlockRegex.test(content)) {
      return true;
    }
    // 4. List item that is clearly a dictionary entry
    if (this.listDictItemRegex.test(content)) {
      return true;
    }

    // --- Weaker Indicators (Require Combination) ---
    const hasBasicKey = this.basicKeyRegex.test(content);
    const hasListItem = this.listItemRegex.test(content); // Basic list item

    // Require at least one key: value pair
    if (!hasBasicKey) {
      return false;
    }

    // If it has keys, also require either:
    // - multiple keys OR
    // - a list item OR
    // - document start/end markers
    const keyMatches = content.match(this.basicKeyRegex);
    const hasMultipleKeys = keyMatches && keyMatches.length >= 2;
    const hasDocMarker = this.docStartRegex.test(content) || this.docEndRegex.test(content);

    if (hasMultipleKeys || hasListItem || hasDocMarker) {
      // Basic structure looks plausible. Avoid obvious JSON structure just in case.
      // This JSON check is weak, priority should handle most cases.
      const probablyNotJson = !(/^\s*\{/.test(trimmed) && /\}\s*$/.test(trimmed)) &&
          !(/^\s*\[/.test(trimmed) && /\]\s*$/.test(trimmed));
      return probablyNotJson;
    }

    // Default to false if only one basic key found and no other structure
    return false;
  }


  countSpecificPatterns(content: string): number {
    let count = 0;
    const patterns = [
      this.indentedBlockRegex,  // Key followed by indent (very specific structure)
      this.listDictItemRegex,   // List of dictionaries (very specific structure)
      this.directiveRegex,      // %YAML directive
      this.blockScalarRegex,    // | or > block scalars
      this.anchorRegex,         // &anchor
      this.aliasRegex,          // *alias
      this.flowSequenceRegex,   // [flow sequence]
      this.flowMapRegex,        // {flow map}
      this.docStartRegex,       // --- doc start
      this.docEndRegex          // ... doc end
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Give more weight to highly structural patterns
        if (pattern === this.indentedBlockRegex || pattern === this.listDictItemRegex) {
          count += 2 * matches.length; // Count each occurrence, weighted higher
        } else if (pattern === this.directiveRegex) {
          count += 3; // Very specific
        } else {
          count += matches.length; // Count each occurrence
        }
      }
    }

    // Bonus points if a document start marker is followed by structure
    if (/^---\s*\n(\s*([a-zA-Z0-9_-]+|"[^"]+"|'[^']+')\s*:|\s*-)/m.test(content)) {
      count += 2;
    }

    return count;
  }

  /**
   * Register YAML language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Register YAML language if not already registered
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'yaml')) {
      monaco.languages.register({ id: 'yaml' });
    }

    // Configure YAML formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('yaml', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        let indentLevel = 0;
        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Decrease indent for closing indicators
          if (trimmedLine.startsWith(']') || trimmedLine.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          // Calculate the current line's indentation
          const indent = '  '.repeat(indentLevel);
          
          // Increase indent after opening indicators
          if (trimmedLine.endsWith(':') || trimmedLine.endsWith('[') || trimmedLine.endsWith('{')) {
            indentLevel++;
          }

          // Skip empty lines
          if (!trimmedLine) return '';
          
          return indent + trimmedLine;
        });

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }];
      }
    });
  }
}

// Create and register the detector
const yamlDetector = new YamlLanguageDetector();
languageRegistry.register(yamlDetector);

// Export for backward compatibility
export const registerYamlProvider = (monaco: any) => {
  yamlDetector.registerProvider(monaco);
};