import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";
import * as yaml from "js-yaml";

const MAX_LINES_TO_ANALYZE_FOR_YAML = 50;
const MIN_STRUCTURAL_LINES_FOR_CONFIDENCE = 2; // Minimum distinct YAML structural lines
const MIN_KEY_VALUE_PAIRS_FOR_STRONG_YAML = 2; // Require at least a few key:value for it to be strongly YAML-like

// --- Markdown Patterns (for exclusion/penalty in YAML detector) ---
const MARKDOWN_HEADER_REGEX = /^\s*#{1,6}\s+.+/m;
const MARKDOWN_LIST_ITEM_REGEX = /^\s*(?:[-*+]|[0-9]+\.)\s+(?!\[[ xX]\])/m; // Exclude task lists for this check
const MARKDOWN_FENCED_CODE_REGEX = /^```(\w*\s*)?$/m;
const MARKDOWN_BLOCKQUOTE_REGEX = /^\s*>\s*.*/m;
const MARKDOWN_LINK_IMAGE_REGEX = /!?\[.*?\]\(.*?\)/m;
const MARKDOWN_TABLE_PIPE_REGEX = /^\s*\|.*\|.*\|/m; // Simple table row indicator
const MARKDOWN_TASK_LIST_REGEX = /^\s*-\s+\[[ xX]\]\s+.*/m;

// --- JSON Boundary Regex (for exclusion) ---
const JSON_START_END_REGEX = /^\s*(?:\{[\s\S]*\}|\[[\s\S]*\])\s*$/;

export class YamlLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "yaml";
  name = "YAML";
  extensions = ["yaml", "yml"];
  priority = 5;

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

  private directiveLineRegex = /^%YAML\s+[\d.]+\s*$/m;
  private docStartLineRegex = /^---\s*$/m;
  private docEndLineRegex = /^\.\.\.\s*$/m;
  // Key: unquoted, or quoted. Value: can be empty, or start with indicators, or be a plain scalar.
  // Crucially, ensure there's a space after the colon for common YAML, or it's the end of the line.
  // Updated to be more restrictive and avoid matching JSON patterns
  private keyValueLineRegex =
    /^\s*(?:[\w.-]+|"[^"]*"|'[^']*')\s*:\s*(?:\||>|&|\*|[^{[\]},].*|$)$/m;
  private listItemLineRegex = /^\s*-\s+(?:.+)?$/m; // Requires something after "- " or just "- "
  private commentLineRegex = /^\s*#/;
  private emptyLineRegex = /^\s*$/m;
  private cssPropertyLikelyRegex = /^\s*[\w-]+\s*:\s*[^;{]+;\s*$/m;

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 2) {
      return { match: false, confidence: 0.0 };
    }

    let confidenceScore = 0.0;
    let patternsMatchedCount = 0; // How many *distinct types* of YAML patterns were found
    let strongYAMLSignal = false;
    let structuralYamlLineCount = 0; // Lines that are key-value, list items, directives, or doc separators
    let keyValueCount = 0;
    let listItemCount = 0;
    let nonCommentNonEmptyLinesInSample = 0;

    const allLines = content.split("\n");
    const linesToAnalyze = allLines.slice(0, MAX_LINES_TO_ANALYZE_FOR_YAML);

    if (linesToAnalyze.length === 0) {
      return { match: false, confidence: 0.0 };
    }

    const potentialYamlLines: string[] = [];
    let cssLikeLineCount = 0;

    for (const line of linesToAnalyze) {
      const currentLineTrimmed = line.trim();
      if (this.cssPropertyLikelyRegex.test(currentLineTrimmed)) {
        cssLikeLineCount++;
        continue; // Skip this line for YAML structural analysis
      }
      potentialYamlLines.push(line);
    }

    if (
      linesToAnalyze.length > 3 &&
      cssLikeLineCount > linesToAnalyze.length * 0.5
    ) {
      confidenceScore -= 0.5; // Penalize heavily if most lines look like CSS
    }

    for (const line of potentialYamlLines) {
      const currentLineTrimmed = line.trim();
      if (this.emptyLineRegex.test(currentLineTrimmed)) {
        continue;
      }
      nonCommentNonEmptyLinesInSample++;

      if (this.commentLineRegex.test(currentLineTrimmed)) {
        confidenceScore += 0.01; // Very minor boost for comments
        continue;
      }

      let lineIsStructuralYAML = false;
      if (this.directiveLineRegex.test(currentLineTrimmed)) {
        confidenceScore += 0.6;
        strongYAMLSignal = true;
        lineIsStructuralYAML = true;
        patternsMatchedCount++;
      } else if (this.docStartLineRegex.test(currentLineTrimmed)) {
        confidenceScore += 0.5;
        strongYAMLSignal = true;
        lineIsStructuralYAML = true;
        patternsMatchedCount++;
      } else if (this.docEndLineRegex.test(currentLineTrimmed)) {
        confidenceScore += 0.15;
        lineIsStructuralYAML = true;
        patternsMatchedCount++;
      } else if (this.keyValueLineRegex.test(currentLineTrimmed)) {
        // Ensure it's not a Markdown header with a colon, or a URL
        if (
          !currentLineTrimmed.startsWith("#") &&
          !/https?:\/\//.test(currentLineTrimmed)
        ) {
          // Additional check: exclude JSON-specific patterns
          const isJsonPattern =
            currentLineTrimmed.match(/^"[^"]*":\s*[{[\]},]/) || // "key": { or [ or } or ,
            currentLineTrimmed.match(/^"[^"]*":\s*\d+\.?\d*,?\s*$/) || // "key": number (with optional comma)
            currentLineTrimmed.match(/^"[^"]*":\s*(true|false|null),?\s*$/) || // "key": boolean/null
            currentLineTrimmed.match(/^"[^"]*":\s*"[^"]*",?\s*$/) || // "key": "string value" (with optional comma)
            currentLineTrimmed.match(/^"[^"]*":\s*"[^"]*"$/); // "key": "string value" (no comma)

          if (!isJsonPattern) {
            confidenceScore += 0.2;
            lineIsStructuralYAML = true;
            patternsMatchedCount++;
            keyValueCount++;
            if (currentLineTrimmed.includes(": ")) strongYAMLSignal = true; // Space after colon is common
          }
        }
      } else if (this.listItemLineRegex.test(currentLineTrimmed)) {
        // Ensure it's not a Markdown task list item or other MD list-like structures
        if (
          !MARKDOWN_TASK_LIST_REGEX.test(currentLineTrimmed) &&
          !currentLineTrimmed.match(/^\s*[*+]\s/) &&
          !currentLineTrimmed.match(/^\s*\d+\.\s/)
        ) {
          confidenceScore += 0.15;
          lineIsStructuralYAML = true;
          patternsMatchedCount++;
          listItemCount++;
          if (currentLineTrimmed.startsWith("- ")) strongYAMLSignal = true;
        }
      }

      if (lineIsStructuralYAML) {
        structuralYamlLineCount++;
      }
    }

    // --- Penalties for other formats based on the *original* content (first few lines) ---
    const firstFewOriginalLines = linesToAnalyze.join("\n");

    if (JSON_START_END_REGEX.test(trimmedContent)) {
      try {
        JSON.parse(trimmedContent); // Check if it's valid JSON
        // Strong penalty if it's valid JSON - this should take precedence over YAML signals
        confidenceScore -= 1.5; // Increased penalty to ensure JSON always wins
        strongYAMLSignal = false; // Always reset YAML signal for valid JSON
      } catch (e) {
        /* Not valid JSON, no penalty from this rule */
      }
    }

    let markdownFeatureCount = 0;
    if (MARKDOWN_HEADER_REGEX.test(firstFewOriginalLines))
      markdownFeatureCount++;
    if (
      MARKDOWN_LIST_ITEM_REGEX.test(firstFewOriginalLines) &&
      listItemCount === 0
    )
      markdownFeatureCount++; // Count MD list if YAML list items weren't primary
    if (MARKDOWN_FENCED_CODE_REGEX.test(firstFewOriginalLines))
      markdownFeatureCount++;
    if (MARKDOWN_BLOCKQUOTE_REGEX.test(firstFewOriginalLines))
      markdownFeatureCount++;
    if (MARKDOWN_LINK_IMAGE_REGEX.test(firstFewOriginalLines))
      markdownFeatureCount++;
    if (MARKDOWN_TABLE_PIPE_REGEX.test(firstFewOriginalLines))
      markdownFeatureCount++;

    if (markdownFeatureCount >= 2 && !strongYAMLSignal) {
      confidenceScore -= 0.4; // Penalize if multiple MD features are present and YAML signals are weak
    }
    if (
      markdownFeatureCount >= 1 &&
      keyValueCount === 0 &&
      listItemCount < 2 &&
      !strongYAMLSignal
    ) {
      confidenceScore -= 0.2; // Penalize if some MD and very little YAML structure
    }

    // --- Score Adjustments based on YAML structure ---
    if (nonCommentNonEmptyLinesInSample > 0) {
      const structuralRatio =
        structuralYamlLineCount / nonCommentNonEmptyLinesInSample;
      if (
        structuralRatio > 0.6 &&
        structuralYamlLineCount >= MIN_STRUCTURAL_LINES_FOR_CONFIDENCE
      ) {
        confidenceScore += 0.3;
        strongYAMLSignal = true;
      } else if (structuralRatio > 0.35 && structuralYamlLineCount >= 1) {
        confidenceScore += 0.15;
      }
    }

    // If it looks like frontmatter but nothing else YAML-like, reduce confidence
    if (
      this.docStartLineRegex.test(linesToAnalyze[0]) &&
      structuralYamlLineCount <= 1 &&
      linesToAnalyze.length > 3 &&
      markdownFeatureCount === 0 &&
      keyValueCount === 0
    ) {
      confidenceScore = Math.max(0.05, confidenceScore - 0.3); // Could be just '---' in plain text or simple MD rule
    }

    // Boost if there's consistent indentation (a hallmark of YAML)
    const indentedLines = potentialYamlLines.filter(
      (l) => l.match(/^\s{2,}[^\s#]/) && !this.emptyLineRegex.test(l),
    ).length;
    if (
      indentedLines > nonCommentNonEmptyLinesInSample * 0.3 &&
      structuralYamlLineCount >= 1
    ) {
      confidenceScore += 0.2;
      strongYAMLSignal = true;
    }

    // Try parsing with js-yaml as a final strong signal, but only if confidence isn't already very low or very high
    if (
      confidenceScore > 0.15 &&
      confidenceScore < 0.75 &&
      nonCommentNonEmptyLinesInSample > 1 &&
      (keyValueCount > 0 || listItemCount > 0)
    ) {
      try {
        const parsed = yaml.load(potentialYamlLines.join("\n"));
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          Object.keys(parsed).length > 0
        ) {
          confidenceScore += 0.35;
          strongYAMLSignal = true;
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          confidenceScore += 0.3;
          strongYAMLSignal = true;
        }
      } catch (e) {
        // Parsing failed, penalize if we had some structural elements suggesting it *should* have parsed
        if (structuralYamlLineCount >= MIN_STRUCTURAL_LINES_FOR_CONFIDENCE)
          confidenceScore -= 0.15;
        else if (nonCommentNonEmptyLinesInSample > 0) confidenceScore -= 0.25;
      }
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Final match decision: requires stronger signals for YAML
    const isMatch =
      (strongYAMLSignal &&
        confidenceScore >= 0.45 &&
        (structuralYamlLineCount >= MIN_STRUCTURAL_LINES_FOR_CONFIDENCE ||
          keyValueCount >= MIN_KEY_VALUE_PAIRS_FOR_STRONG_YAML)) ||
      (confidenceScore >= 0.6 &&
        patternsMatchedCount >= 1 &&
        structuralYamlLineCount >= 1);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongYAMLSignal && confidenceScore > 0.6, // More concrete "definitive"
    };
  }

  registerProvider(monaco: any): void {
    // Monaco has built-in YAML support, usually no custom formatter needed.
  }
}

// Create and register the detector
const yamlDetector = new YamlLanguageDetector();
languageRegistry.register(yamlDetector);

// Export for backward compatibility (optional)
export const registerYamlProvider = (monaco: any) => {
  yamlDetector.registerProvider(monaco);
};
