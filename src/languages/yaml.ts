import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

// --- Constants ---
const MAX_LINES_TO_CHECK = 50; // How many lines to analyze

// --- Markdown Patterns (for exclusion) ---
const MARKDOWN_HEADER_REGEX = /^#{2,6}\s+/m;
const MARKDOWN_LINK_REGEX = /\[.+?\]\(.+?\)/m;
const MARKDOWN_IMAGE_REGEX = /!\[.+?\]\(.+?\)/m;
const MARKDOWN_CODE_BLOCK_REGEX = /`{3}/m;
const MARKDOWN_TASK_LIST_REGEX = /^- \[[ x]\] /im;
const MARKDOWN_ORDERED_LIST_REGEX = /^\s*\d+\.\s+/m;
const MARKDOWN_BLOCKQUOTE_REGEX = /^>\s+/m;

// --- JSON Boundary Regex (for exclusion) ---
const JSON_OBJECT_BOUNDARY_REGEX = /^\s*\{[\s\S]*\}\s*$/;
const JSON_ARRAY_BOUNDARY_REGEX = /^\s*\[[\s\S]*\]\s*$/;


/**
 * YAML language detector - Purely Regex-based approach
 */
export class YamlLanguageDetector extends BaseLanguageDetector {
  id = 'yaml';
  name = 'YAML';
  extensions = ['yaml', 'yml'];
  priority = 4;

  // --- YAML Line Pattern Regexes ---
  // More specific regexes for line classification
  private directiveLineRegex = /^%YAML\s+[\d.]+\s*$/;
  private docStartLineRegex = /^---\s*$/;
  private docEndLineRegex = /^\.\.\.\s*$/;
  // Key-Value: Allows quoted/unquoted keys, requires colon, allows empty value.
  // Key part: `(?:[^#\s:"'][^:]*|"[^"]*"|'[^']*')` - Starts with non-#/space/quote OR is quoted. Avoids matching comments as keys.
  private keyValueLineRegex = /^\s*(?:[^#\s:"'][^:]*|"[^"]*"|'[^']*')\s*:\s*(?:.*)?$/;
  // List Item: Starts with '- ', requires some content after space.
  private listItemLineRegex = /^\s*-\s+(?:\S.*)?$/;
  private commentLineRegex = /^\s*#/;
  private emptyLineRegex = /^\s*$/;

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
   * Check if content is likely YAML based on line patterns and thresholds.
   */
  isMatch(content: string): boolean {
    const trimmed = content.trim();
    if (!trimmed) return false;

    const lines = content.split('\n').slice(0, MAX_LINES_TO_CHECK);
    if (lines.length === 0) return false;

    // --- Early Exclusions ---
    // 1. JSON Exclusion
    if (JSON_OBJECT_BOUNDARY_REGEX.test(trimmed) || JSON_ARRAY_BOUNDARY_REGEX.test(trimmed)) {
      // If it looks like JSON, it's not YAML unless it *also* has strong YAML markers
      if (!this.directiveLineRegex.test(lines[0]) && !this.docStartLineRegex.test(lines[0]) && !lines.some(line => this.listItemLineRegex.test(line))) {
         // console.log("YAML Detector: Rejected due to JSON structure without strong YAML markers.");
        return false;
      }
    }

    // 2. Markdown Exclusion
    let markdownPatternCount = 0;
    const contentToCheck = lines.join('\n'); // Use only checked lines for MD check
    if (MARKDOWN_HEADER_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_LINK_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_IMAGE_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_CODE_BLOCK_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_TASK_LIST_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_ORDERED_LIST_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (MARKDOWN_BLOCKQUOTE_REGEX.test(contentToCheck)) markdownPatternCount++;
    if (markdownPatternCount >= 2) { // Require multiple MD patterns
       // console.log("YAML Detector: Rejected due to strong Markdown patterns:", markdownPatternCount);
      return false;
    }
    // --- End Exclusions ---


    let yamlLineCount = 0;
    let structuralLineCount = 0;
    let nonEmptyCommentLineCount = 0;
    const structuralPatternsFound = new Set<string>();

    for (const line of lines) {
      let isYamlLine = false;
      let isStructural = false;
      let patternType = '';

      if (this.emptyLineRegex.test(line)) {
        // Empty lines don't contribute positively or negatively unless checking strictness
        continue;
      }
      if (this.commentLineRegex.test(line)) {
        isYamlLine = true; // Comments are valid YAML lines
        patternType = 'comment';
        // Don't count comments as structural
      } else if (this.directiveLineRegex.test(line)) {
        isYamlLine = true; isStructural = true; patternType = 'directive';
      } else if (this.docStartLineRegex.test(line)) {
        isYamlLine = true; isStructural = true; patternType = 'docStart';
      } else if (this.docEndLineRegex.test(line)) {
         isYamlLine = true; isStructural = true; patternType = 'docEnd'; // Count docEnd as structural
      } else if (this.keyValueLineRegex.test(line)) {
        isYamlLine = true; isStructural = true; patternType = 'keyValue';
      } else if (this.listItemLineRegex.test(line)) {
        isYamlLine = true; isStructural = true; patternType = 'listItem';
      }

      if (isYamlLine) {
        yamlLineCount++;
        if (patternType !== 'comment' && patternType !== '') {
             nonEmptyCommentLineCount++; // Count non-empty, non-comment lines
        }
      }
      if (isStructural) {
        structuralLineCount++;
        structuralPatternsFound.add(patternType);
      }
    }

    // --- Apply Rules ---

    // Rule 0: Quick wins for very strong indicators
    if (structuralPatternsFound.has('directive')) return true;
    // --- might be frontmatter, don't return true immediately

    // Rule 4 Check (Variety): Must have at least 2 different structural patterns
    const hasVariety = structuralPatternsFound.size >= 2;

    // Rule 2 Logic (< 4 non-empty/non-comment lines)
    if (nonEmptyCommentLineCount > 0 && nonEmptyCommentLineCount < 4) {
      // All non-empty/non-comment lines must be structural
      const allStructural = structuralLineCount === nonEmptyCommentLineCount;
      // console.log(`YAML Detector (<4 lines): NonEmptyComment=${nonEmptyCommentLineCount}, Structural=${structuralLineCount}, Variety=${hasVariety}`);
      return allStructural && hasVariety;
    }

    // Rule 3 Logic (>= 4 non-empty/non-comment lines)
    if (nonEmptyCommentLineCount >= 4) {
      // Calculate required percentage (example: starts at 60%, drops to 25%)
      const totalSignificantLines = lines.filter(l => !this.emptyLineRegex.test(l)).length; // Count non-empty lines for percentage base
      if (totalSignificantLines === 0) return false; // Avoid division by zero

      let requiredPercentage = 0.25 + (0.60 - 0.25) * Math.exp(-0.1 * (totalSignificantLines - 4));
      requiredPercentage = Math.max(0.25, Math.min(0.60, requiredPercentage)); // Clamp percentage

      const actualPercentage = yamlLineCount / totalSignificantLines; // Percentage of *any* valid YAML line (incl comments)

      // console.log(`YAML Detector (>=4 lines): TotalSig=${totalSignificantLines}, YamlLines=${yamlLineCount}, ActualPerc=${actualPercentage.toFixed(2)}, ReqPerc=${requiredPercentage.toFixed(2)}, Variety=${hasVariety}`);

      // Require meeting percentage AND having variety
      return actualPercentage >= requiredPercentage && hasVariety;
    }

    // Default: If none of the above conditions were met (e.g., only comments, few lines but not all structural)
    // console.log("YAML Detector: Defaulting to false, conditions not met.");
    return false;
  }


  // --- countSpecificPatterns ---
  // Score based on the regex matches and rules
  countSpecificPatterns(content: string): number {
    let score = 0;
    const lines = content.split('\n').slice(0, MAX_LINES_TO_CHECK);
    if (lines.length === 0) return 0;

    // Penalize early for JSON/Markdown
    const trimmed = content.trim();
    if (JSON_OBJECT_BOUNDARY_REGEX.test(trimmed) || JSON_ARRAY_BOUNDARY_REGEX.test(trimmed)) score -= 15;
    // Add markdown penalty logic similar to isMatch if needed

    let yamlLineCount = 0;
    let structuralLineCount = 0;
    const structuralPatternsFound = new Set<string>();

    lines.forEach(line => {
      let isStructural = false;
      let patternType = '';

       if (this.emptyLineRegex.test(line)) return;
       if (this.commentLineRegex.test(line)) {
           yamlLineCount++;
           score += 0.5; // Small score for comments
           return;
       }
       if (this.directiveLineRegex.test(line)) { isStructural = true; patternType = 'directive'; score += 10; }
       else if (this.docStartLineRegex.test(line)) { isStructural = true; patternType = 'docStart'; score += 5; }
       else if (this.docEndLineRegex.test(line)) { isStructural = true; patternType = 'docEnd'; score += 2; }
       else if (this.keyValueLineRegex.test(line)) { isStructural = true; patternType = 'keyValue'; score += 3; }
       else if (this.listItemLineRegex.test(line)) { isStructural = true; patternType = 'listItem'; score += 2; }

       if (patternType) yamlLineCount++;
       if (isStructural) {
           structuralLineCount++;
           structuralPatternsFound.add(patternType);
       }
    });

    // Bonus for variety
    if (structuralPatternsFound.size >= 2) {
        score += 5;
    }

    // Bonus/Penalty based on percentage rule (simplified check)
    const totalSignificantLines = lines.filter(l => !this.emptyLineRegex.test(l)).length;
    if (totalSignificantLines >= 4) {
        const actualPercentage = totalSignificantLines > 0 ? yamlLineCount / totalSignificantLines : 0;
        if (actualPercentage > 0.4) score += 5; // Bonus if > 40% YAML lines
        else if (actualPercentage < 0.2) score -= 5; // Penalty if < 20%
    } else if (totalSignificantLines > 0) {
        // For < 4 lines, check if all are structural
        if (structuralLineCount === totalSignificantLines) score += 5; // Bonus if all structural
        else score -= 5; // Penalty if not all structural
    }

    return Math.max(0, Math.round(score)); // Return non-negative integer score
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