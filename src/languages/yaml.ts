import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import * as yaml from 'js-yaml';

// --- Constants ---
const MAX_LINES_TO_CHECK = 50; // Check more lines for patterns
const MAX_LINES_TO_PARSE = 25; // Limit parsing depth for performance
const MIN_LINES_FOR_PARSE_ATTEMPT = 2; // Don't parse single lines

// --- Markdown Patterns (for exclusion) ---
// Borrowed/adapted from Markdown detector - focus on unambiguous ones
const MARKDOWN_HEADER_REGEX = /^#{2,6}\s+/m; // H2-H6 are less ambiguous than H1
const MARKDOWN_LINK_REGEX = /\[.+?\]\(.+?\)/m;
const MARKDOWN_IMAGE_REGEX = /!\[.+?\]\(.+?\)/m;
const MARKDOWN_CODE_BLOCK_REGEX = /`{3}/m; // Start or end of code block
const MARKDOWN_TASK_LIST_REGEX = /^- \[[ x]\] /im;
const MARKDOWN_ORDERED_LIST_REGEX = /^\s*\d+\.\s+/m;
const MARKDOWN_BLOCKQUOTE_REGEX = /^>\s+/m;

/**
 * YAML language detector - Stricter checks and Markdown exclusion
 */
export class YamlLanguageDetector extends BaseLanguageDetector {
  id = 'yaml';
  name = 'YAML';
  extensions = ['yaml', 'yml'];
  priority = 4; // Lower than JSON, potentially lower than Markdown if needed

  // --- YAML Specific Regex ---
  private directiveRegex = /^%YAML\s+[\d.]+/m;
  private docStartRegex = /^---\s*(?:$|\n|#)/m; // Document start
  private docEndRegex = /^\.\.\.\s*(?:$|\n|#)/m; // Document end
  private listItemStartRegex = /^\s*-\s+(?:\S|\n\s+\S)/m; // List item (allows multiline values)
  private blockScalarRegex = /:\s*[|>][+-]?\s*(?:#.*)?$/m; // Block scalar indicator
  private keyColonRegex = /^\s*(?:[a-zA-Z0-9_."'-]+|"[^"]+"|'[^']+')\s*:\s*(?:\S|$)/m; // Key followed by colon (quoted or unquoted)

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
   * Check if content is likely YAML, prioritizing structure and excluding Markdown.
   */
  isMatch(content: string): boolean {
    const trimmed = content.trim();
    const lines = content.split('\n');
    const contentToCheck = lines.slice(0, MAX_LINES_TO_CHECK).join('\n');

    // 1. Quick Exits
    if (!trimmed) return false;
    // If it's *only* comments or empty lines, it's not structured YAML
    if (lines.every(line => line.trim().startsWith('#') || line.trim() === '')) return false;

    // 2. Strong YAML Indicators (Quick Wins)
    if (this.directiveRegex.test(trimmed)) return true;
    if (this.blockScalarRegex.test(contentToCheck)) return true; // | or > are very strong

    // 3. Strong Markdown Exclusion (Crucial Step)
    // Count unambiguous Markdown patterns in the first N lines
    let markdownPatternCount = 0;
    if (MARKDOWN_HEADER_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_LINK_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_IMAGE_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_CODE_BLOCK_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_TASK_LIST_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_ORDERED_LIST_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_BLOCKQUOTE_REGEX.test(contentToCheck)) markdownPatternCount++;

    // If multiple strong Markdown patterns exist, reject YAML immediately.
    // Adjust the threshold (e.g., 2 or 3) based on testing.
    if (markdownPatternCount >= 2) {
        // console.log("YAML Detector: Rejected due to strong Markdown patterns:", markdownPatternCount);
        return false;
    }

    // 4. Check for Core YAML Structure (Key:Value or List Items) using Regex
    const hasKeyColon = this.keyColonRegex.test(contentToCheck);
    const hasListItem = this.listItemStartRegex.test(contentToCheck);
    const hasYamlStructure = hasKeyColon || hasListItem;

    // If it has clear YAML structure, it's likely YAML (even if parsing fails later)
    if (hasYamlStructure) {
        // But double-check if it looks exactly like JSON
        if (this.jsonObjectBoundaryRegex.test(trimmed) || this.jsonArrayBoundaryRegex.test(trimmed)) {
            // If it looks like JSON and has YAML structure (e.g. key:),
            // let parsing decide or fall through to heuristics.
            // Don't return true immediately here.
        } else {
            // Has YAML structure, doesn't look like JSON -> Good chance it's YAML
            // console.log("YAML Detector: Matched based on key/list structure.");
            return true;
        }
    }

    // 5. Attempt Parsing (Conditional)
    // Only parse if there are enough lines and we haven't already decided.
    // Parsing is now more of a confirmation or tie-breaker.
    let parsedSuccessfully = false;
    let parsedResultType: string | null = null;
    if (lines.length >= MIN_LINES_FOR_PARSE_ATTEMPT) {
      const contentToParse = lines.slice(0, MAX_LINES_TO_PARSE).join('\n');
      try {
        const result = yaml.load(contentToParse);
        // Check if parsing yielded *something* (null is a valid YAML value)
        if (result !== undefined) {
            parsedSuccessfully = true;
            parsedResultType = typeof result;
            // console.log("YAML Detector: Parsed successfully. Type:", parsedResultType);
        }
      } catch (e) {
        // Parsing failed. Check if it failed *because* it looks like JSON.
        if (this.jsonObjectBoundaryRegex.test(trimmed) || this.jsonArrayBoundaryRegex.test(trimmed)) {
           // console.log("YAML Detector: Parsing failed, looks like JSON. Rejecting.");
           return false; // Failed parsing + looks like JSON = Not YAML
        }
        // Otherwise, parsing failed, but doesn't look like JSON. Continue to fallbacks.
        // console.log("YAML Detector: Parsing failed, but doesn't look like JSON.");
      }
    }

    // 6. Evaluate Parsing Result & Final Heuristics
    if (parsedSuccessfully) {
        // If parsing succeeded:
        // - AND the result is complex (object/array) -> Definitely YAML
        // - OR the input *had* structural elements (key: or -) -> Likely YAML
        // - BUT if result is simple (string/number/boolean) AND input lacked structure AND had Markdown hints -> Likely NOT YAML
        const inputHadStructureInParsedSection = this.keyColonRegex.test(lines.slice(0, MAX_LINES_TO_PARSE).join('\n')) || this.listItemStartRegex.test(lines.slice(0, MAX_LINES_TO_PARSE).join('\n'));
        const inputHadMarkdownHeadings = /^\s*#+\s+/.test(contentToCheck); // Check specifically for headings

        if (parsedResultType === 'object' || parsedResultType === 'boolean' || parsedResultType === null) { // Objects, booleans, null are good indicators
             // console.log("YAML Detector: Accepted based on successful parse to object/boolean/null.");
             return true;
        }
        if (inputHadStructureInParsedSection) {
             // console.log("YAML Detector: Accepted based on successful parse + input structure.");
             return true;
        }
        if ((parsedResultType === 'string' || parsedResultType === 'number') && inputHadMarkdownHeadings && markdownPatternCount > 0) {
             // Parsed to simple type, had no clear YAML structure in parsed section,
             // AND had Markdown headings/patterns -> Reject YAML.
             // console.log("YAML Detector: Rejected. Parsed to simple type but looks like Markdown.");
             return false;
        }
         if (parsedResultType === 'string' || parsedResultType === 'number') {
             // Parsed to simple type, but didn't have strong Markdown conflict signals.
             // Could be very simple YAML (e.g., just 'my_string'). Accept with lower confidence.
             // Check for document separators as a final hint.
             // console.log("YAML Detector: Parsed to simple type. Checking for doc separators.");
             return this.docStartRegex.test(trimmed) || this.docEndRegex.test(trimmed);
         }
    }

    // 7. Final Fallback (if no structure found, parsing failed/skipped, not JSON, not Markdown)
    // At this point, it lacks clear YAML structure and doesn't strongly look like Markdown/JSON.
    // Only accept if it has document separators (`---` or `...`) as a last resort.
    if (!hasYamlStructure && !parsedSuccessfully) {
        const hasDocMarkers = this.docStartRegex.test(trimmed) || this.docEndRegex.test(trimmed);
        // console.log("YAML Detector: Fallback check for doc markers:", hasDocMarkers);
        return hasDocMarkers;
    }

    // 8. Default: Not enough evidence
    // console.log("YAML Detector: All checks failed. Defaulting to false.");
    return false;
  }


  // --- countSpecificPatterns ---
  // This should reflect the confidence based on the isMatch logic
  countSpecificPatterns(content: string): number {
    let score = 0;
    const trimmed = content.trim();
    const lines = content.split('\n');
    const contentToCheck = lines.slice(0, MAX_LINES_TO_CHECK).join('\n');

    // Strong Indicators
    if (this.directiveRegex.test(trimmed)) score += 10;
    if (this.blockScalarRegex.test(contentToCheck)) score += 8;

    // Core Structure Indicators
    const keyMatches = contentToCheck.match(this.keyColonRegex);
    const itemMatches = contentToCheck.match(this.listItemStartRegex);
    if (keyMatches) score += 4 * keyMatches.length; // More keys = higher score
    if (itemMatches) score += 3 * itemMatches.length; // More items = higher score

    // Doc Markers
    if (this.docStartRegex.test(trimmed)) score += 2;
    if (this.docEndRegex.test(trimmed)) score += 1;

    // Markdown Penalty
    let markdownPatternCount = 0;
    if (MARKDOWN_HEADER_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_LINK_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_IMAGE_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_CODE_BLOCK_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_TASK_LIST_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_ORDERED_LIST_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_BLOCKQUOTE_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (markdownPatternCount >= 2) score = Math.max(0, score - 15); // Heavy penalty
    else if (markdownPatternCount === 1) score = Math.max(0, score - 5); // Lighter penalty

    // Parsing Bonus/Penalty
    if (lines.length >= MIN_LINES_FOR_PARSE_ATTEMPT) {
        const contentToParse = lines.slice(0, MAX_LINES_TO_PARSE).join('\n');
        try {
            const result = yaml.load(contentToParse);
            if (result !== undefined) {
                if (typeof result === 'object') score += 10; // Big bonus for complex types
                else if (typeof result === 'boolean' || result === null) score += 5;
                else score += 2; // Small bonus for simple types
            }
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

    return Math.max(0, score); // Ensure score is not negative
  }

  registerProvider(monaco: any): void {
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