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
  isMatch(content: string): boolean {
    // Check for document start marker followed by a key-value pair
    if (/^---\s*\n[\s]*[a-zA-Z0-9_-]+[\s]*:/m.test(content)) {
      return true;
    }
    
    const yamlPatterns = [
      /^[\s]*[a-zA-Z0-9_-]+[\s]*:(?:\s.*)?$/m,  // key: value
      /^[\s]*-[\s]+.*$/m,                        // - list item
      /^---$/m                                    // document separator
    ];
    
    // Count how many YAML patterns match
    const matchCount = yamlPatterns.reduce((count, pattern) => 
      count + (pattern.test(content) ? 1 : 0), 0);
    
    // If we have a key-value pattern and at least one other pattern, it's likely YAML
    const hasKeyValue = /^[\s]*[a-zA-Z0-9_-]+[\s]*:(?:\s.*)?$/m.test(content);
    
    return (hasKeyValue && matchCount >= 2) &&
           !content.includes('{') &&                  // Avoid confusion with JSON
           !content.includes('}');
  }
  
  /**
   * Count YAML-specific patterns (patterns that are unlikely to be in Markdown)
   */
  countSpecificPatterns(content: string): number {
    const yamlSpecificPatterns = [
      /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*[a-zA-Z0-9_-]+:$/m,  // nested keys like "key1: key2:"
      /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*\d+$/m,              // key: number
      /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*true|false$/m,       // key: boolean
      /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*\[.*\]$/m,           // key: [array]
      /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*\{.*\}$/m,           // key: {object}
      /^[\s]*[a-zA-Z0-9_-]+[\s]*:[\s]*$/m,                 // key with empty value followed by indented content
      /^[\s]*-[\s]+[a-zA-Z0-9_-]+[\s]*:[\s]*/m             // list item with key
    ];
    
    // Count matches
    const patternCount = yamlSpecificPatterns.reduce((count, pattern) => 
      count + (pattern.test(content) ? 1 : 0), 0);
    
    // Add extra points for document start marker followed by a key
    if (/^---\s*\n[\s]*[a-zA-Z0-9_-]+[\s]*:/m.test(content)) {
      return patternCount + 2;
    }
    
    return patternCount;
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