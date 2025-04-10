import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import * as yaml from 'js-yaml'; // Import the library

// --- Constants ---
const MAX_LINES_TO_PARSE = 15; // How many lines to feed the parser initially
const MIN_LINES_FOR_PARSE_ATTEMPT = 3; // Don't bother parsing very short snippets

/**
 * YAML language detector - Using js-yaml for validation
 */
export class YamlLanguageDetector extends BaseLanguageDetector {
  id = 'yaml';
  name = 'YAML';
  extensions = ['yaml', 'yml'];
  priority = 4; // Lower than JSON

  // --- Keep some basic Regex for quick checks/scoring ---
  private directiveRegex = /^%YAML\s+[\d.]+/m;
  private docStartRegex = /^---\s*(?:$|\n|#)/m;
  private docEndRegex = /^\.\.\.\s*(?:$|\n|#)/m;
  private listItemStartRegex = /^\s*-\s+\S/m;
  private blockScalarRegex = /:\s*[|>][+-]?\s*(?:#.*)?$/m;
  private unquotedKeyRegex = /^\s*[a-zA-Z_][a-zA-Z0-9_-]*\s*:/m; // Still useful for scoring/hints

  // --- JSON Boundary Regex (for exclusion/penalty) ---
  private jsonObjectBoundaryRegex = /^\s*\{[\s\S]*\}\s*$/;
  private jsonArrayBoundaryRegex = /^\s*\[[\s\S]*\]\s*$/;

  sampleContent(): string {
    // ... (sampleContent remains the same)
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
   * Check if content is likely YAML, prioritizing validation via js-yaml.
   */
  isMatch(content: string): boolean {
    const trimmed = content.trim();
    const lines = content.split('\n'); // Use original content for line splitting

    // 1. Quick Exits
    if (!trimmed) return false;
    if (lines.every(line => line.trim().startsWith('#') || line.trim() === '')) return false;

    // 2. Quick Wins - Strongest Indicators (Avoid parsing if unnecessary)
    if (this.directiveRegex.test(trimmed)) return true;
    // --- is very strong, but could be frontmatter. Let parser confirm structure.
    // if (this.docStartRegex.test(trimmed)) return true;
    if (this.blockScalarRegex.test(content)) return true; // | or > are quite unique

    // 3. Attempt Parsing (The Core Logic)
    // Only parse if there are enough lines to be meaningful
    if (lines.length >= MIN_LINES_FOR_PARSE_ATTEMPT) {
      // Take the first N lines to avoid performance issues on huge files
      const contentToParse = lines.slice(0, MAX_LINES_TO_PARSE).join('\n');
      try {
        // Use safeLoad to prevent potential code execution from malicious YAML
        // Use loadAll if multiple documents (separated by ---) are expected often
        yaml.load(contentToParse);
        return true;
      } catch (e) {
        // Parsing failed. This means the first N lines are *not* valid YAML.
        // It *could* still be intended as YAML, but it's broken.

        // **Crucial Check:** If parsing failed AND it looks like JSON, strongly reject it.
        if (this.jsonObjectBoundaryRegex.test(trimmed) || this.jsonArrayBoundaryRegex.test(trimmed)) {
           // Check if the *reason* for failure might be JSON-like syntax errors
           if (e instanceof yaml.YAMLException && /mapping values are not allowed here|unexpected token/i.test(e.message)) {
               return false;
           }
        }
        // If parsing failed but it doesn't look like JSON, it might be broken YAML.
        // Fall through to weaker checks below, but with lower confidence.
      }
    }

    // 4. Fallback - Weaker Heuristics (if parsing failed or wasn't attempted)
    // These are now less important but can catch *intended* but broken YAML
    // or very small snippets where parsing wasn't attempted.

    const hasUnquotedKey = this.unquotedKeyRegex.test(content);
    const hasListItem = this.listItemStartRegex.test(content);
    const hasDocStart = this.docStartRegex.test(trimmed);
    const hasDocEnd = this.docEndRegex.test(trimmed);

    // Require at least *some* structure if parsing failed
    // Unquoted key OR list item is a decent sign of *intent*
    if (hasUnquotedKey || hasListItem) {
        // Avoid the specific failing case: {} boundaries + unquoted keys + parse failure
        if ((this.jsonObjectBoundaryRegex.test(trimmed) || this.jsonArrayBoundaryRegex.test(trimmed)) && lines.length >= MIN_LINES_FOR_PARSE_ATTEMPT) {
             // We already tried parsing and it failed, and it looks like JSON. Reject.
             return false;
        }
        // Otherwise, if parsing failed but it has these features, maybe accept?
        // Let's be conservative: only accept if it *also* has multiple keys/items or doc markers
        const keyMatches = content.match(this.unquotedKeyRegex);
        const itemMatches = content.match(this.listItemStartRegex);
        const hasMultipleStructure = (keyMatches && keyMatches.length >= 2) || (itemMatches && itemMatches.length >= 2) || (hasUnquotedKey && hasListItem);

        if (hasMultipleStructure || hasDocStart || hasDocEnd) {
             return true; // Accept broken YAML if it has enough structure hints
        }
    }

    // If it has --- but parsing failed (maybe invalid structure after ---)
    if (hasDocStart) {
        return true; // Lower confidence match
    }

    // 5. Default: Not enough evidence
    // console.log("YAML Detector: All checks failed. Defaulting to false.");
    return false;
  }


  countSpecificPatterns(content: string): number {
    // Scoring can still use regex for speed, but parsing success should grant a huge bonus.
    let score = 0;
    const lines = content.split('\n');
    const trimmed = content.trim();

    // Base score from regex patterns
    if (this.directiveRegex.test(trimmed)) score += 5;
    if (this.docStartRegex.test(trimmed)) score += 3;
    if (this.blockScalarRegex.test(content)) score += 4;
    if (this.unquotedKeyRegex.test(content)) score += 2 * (content.match(this.unquotedKeyRegex)?.length || 0); // Score per key
    if (this.listItemStartRegex.test(content)) score += 1 * (content.match(this.listItemStartRegex)?.length || 0); // Score per item
    if (this.docEndRegex.test(trimmed)) score += 2;

    // Parsing Bonus/Penalty
    if (lines.length >= MIN_LINES_FOR_PARSE_ATTEMPT) {
        const contentToParse = lines.slice(0, MAX_LINES_TO_PARSE).join('\n');
        try {
            yaml.load(contentToParse);
            score += 15; // Big bonus for successful parse
        } catch (e) {
            // Penalize if parsing failed AND it looks like JSON
            if (this.jsonObjectBoundaryRegex.test(trimmed) || this.jsonArrayBoundaryRegex.test(trimmed)) {
                 score = Math.max(0, score - 10); // Significant penalty
            } else {
                 score = Math.max(0, score - 3); // Smaller penalty for other parse failures
            }
        }
    } else {
        // Penalize JSON lookalikes even if not parsed
         if (this.jsonObjectBoundaryRegex.test(trimmed) || this.jsonArrayBoundaryRegex.test(trimmed)) {
             score = Math.max(0, score - 5);
         }
    }

    return score;
  }

  // registerProvider remains the same
  registerProvider(monaco: any): void {
    // ... (no changes needed here)
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'yaml')) {
      monaco.languages.register({ id: 'yaml' });
    }
    monaco.languages.registerDocumentFormattingEditProvider('yaml', {
      provideDocumentFormattingEdits(model: any) {
         console.warn("YAML formatting requires a proper parser. Basic formatting disabled.");
        return [];
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
