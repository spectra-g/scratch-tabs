// File path: markdown.ts

import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';
import { MarkdownStatusItem } from "../components/StatusBar/LanguageStatusItems/markdown"; // Assuming this path is correct

const MAX_LINES_TO_ANALYZE_MD_FOR_YAML = 20;
const MIN_MARKDOWN_FEATURES_FOR_CONFIDENCE = 2; // Need at least 2 distinct MD features for good confidence

// YAML patterns (for exclusion/penalty in Markdown detector)
const YAML_KEY_VALUE_REGEX = /^\s*(?:[\w.-]+|"[^"]*"|'[^']*')\s*:\s*(?:\||>|&|\*|\S.*|$)/m;
const YAML_LIST_ITEM_REGEX = /^\s*-\s+(?!\[[ xX]\]).+/m; // YAML list item, excluding MD task list
const YAML_DOC_START_REGEX = /^---\s*$/m;
const YAML_DIRECTIVE_REGEX = /^%YAML\s+[\d.]+\s*$/m;

export class MarkdownLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'markdown';
  name = 'Markdown';
  extensions = ['md', 'markdown', 'mdown', 'mkd'];
  priority = 4; // Lower than YAML (5)

  sampleContent(): string {
    return `# Sample Markdown Document

## Introduction

This is a sample Markdown document that demonstrates various Markdown features.

### Text Formatting

You can make text **bold**, *italic*, or ***both***. You can also add ~~strikethrough~~.

### Lists

Unordered list:
- Item 1
- Item 2
  - Subitem 2.1
  - Subitem 2.2
- Item 3

Ordered list:
1. First item
2. Second item
3. Third item

### Links and Images
[Visit OpenAI](https://www.openai.com)
![Sample Image](https://picsum.photos/200/300)

### Code

Inline code: \`console.log('Hello World');\`

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Blockquotes

> This is a blockquote.
> It can span multiple lines.
> - You can even include lists

### Task List

- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

---

That's all for this sample!`;
  }

  private getContentWithoutFrontmatter(content: string): string {
    const lines = content.split('\n');
    if (lines[0]?.trim() === '---') {
      let endFrontmatterIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '---') {
          endFrontmatterIndex = i;
          break;
        }
      }
      if (endFrontmatterIndex !== -1 && endFrontmatterIndex + 1 < lines.length) {
        return lines.slice(endFrontmatterIndex + 1).join('\n');
      } else if (endFrontmatterIndex !== -1) {
        return "";
      }
    }
    return content;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongMarkdownSignal = false;
    let yamlLikePenalty = 0.0;

    let frontmatterPresent = false;
    const contentForMainAnalysis = this.getContentWithoutFrontmatter(content);

    if (contentForMainAnalysis !== content) {
        frontmatterPresent = true;
        confidenceScore += 0.15;
        patternsMatched++;
        strongMarkdownSignal = true; // Frontmatter is a specific MD (or Jekyll/etc.) feature
    }

    const mainLinesToAnalyze = contentForMainAnalysis.split('\n').slice(0, MAX_LINES_TO_ANALYZE_MD_FOR_YAML);
    const firstMainLineTrimmed = mainLinesToAnalyze[0]?.trim();

    let yamlLikeLineCount = 0;
    let nonCommentNonEmptyMainLines = 0;

    if (contentForMainAnalysis.trim().length > 0) {
        for (const line of mainLinesToAnalyze) {
            const currentLineTrimmed = line.trim();
            if (!currentLineTrimmed || currentLineTrimmed.startsWith('#')) continue; // YAML comments too
            nonCommentNonEmptyMainLines++;
            if (YAML_KEY_VALUE_REGEX.test(currentLineTrimmed) || YAML_LIST_ITEM_REGEX.test(currentLineTrimmed)) {
                yamlLikeLineCount++;
            }
        }
        if (nonCommentNonEmptyMainLines > 1) {
            const yamlLikeRatio = yamlLikeLineCount / nonCommentNonEmptyMainLines;
            if (yamlLikeRatio > 0.65 && yamlLikeLineCount >= 2) yamlLikePenalty += 0.5;
            else if (yamlLikeRatio > 0.45 && yamlLikeLineCount >= 1) yamlLikePenalty += 0.25;
        }
        if (firstMainLineTrimmed && (YAML_DIRECTIVE_REGEX.test(firstMainLineTrimmed) || (YAML_DOC_START_REGEX.test(firstMainLineTrimmed) && !frontmatterPresent))) {
            yamlLikePenalty += 0.6;
        }
    }
    confidenceScore -= yamlLikePenalty;

    // --- MODIFIED markdownPatterns ---
    const markdownPatterns = [
      // Strong, specific structural elements
      { pattern: /^(#{1,6})\s+.+/gm, weight: 0.25, perMatch: 0.05, specific: true, maxMatches: 5 },
      { pattern: /\[[^\]]+?\]\([^\)]+?\)/g, weight: 0.25, perMatch: 0.04, specific: true, maxMatches: 5 },
      { pattern: /!\[[^\]]*?\]\([^\)]+?\)/g, weight: 0.25, perMatch: 0.04, specific: true, maxMatches: 3 },
      { pattern: /`{3,}(\w*\s*)?\n[\s\S]*?\n`{3,}/g, weight: 0.30, perMatch: 0.05, specific: true, maxMatches: 3 },
      { pattern: /^- \[([ xX])\]\s+.+/gm, weight: 0.25, perMatch: 0.05, specific: true, maxMatches: 5 },
      { pattern: /^(?:---|\*\*\*|___)\s*$/gm, weight: 0.20, perMatch: 0.05, specific: true, maxMatches: 2 },
      { pattern: /^\s*\|(?:[^|\n]+\|)+/gm, weight: 0.25, perMatch: 0.03, specific: true, maxMatches: 3 },

      // Common, fairly specific elements
      { pattern: /^\s*>\s+.*/gm, weight: 0.20, perMatch: 0.03, specific: true, maxMatches: 5 },
      { pattern: /^\s*([-*+])\s+(?!\[[ xX]\]).+/gm, weight: 0.20, perMatch: 0.02, specific: true, maxMatches: 10 },
      { pattern: /^\s*\d+\.\s+.*/gm, weight: 0.20, perMatch: 0.02, specific: true, maxMatches: 10 },

      // Inline elements
      // Corrected bold regex to not be overly greedy with initial/trailing spaces
      { pattern: /\*\*([^\s*].*?[^\s*])\*\*|\_\_([^\s_].*?[^\s_])\_\_/g, weight: 0.15, perMatch: 0.01, specific: true, maxMatches: 10 },
      // Corrected italic regex
      { pattern: /(?<![\w*_])\*([^\s*].*?[^\s*])\*(?![\w*_])|(?<![\w*_])_([^\s_].*?[^\s_])_(?![\w*_])/g, weight: 0.15, perMatch: 0.01, specific: true, maxMatches: 10 },
      { pattern: /`([^`\n]+?)`/g, weight: 0.10, perMatch: 0.01, specific: true, maxMatches: 10 },
      { pattern: /<https?:\/\/[^\s>]+>/g, weight: 0.15, perMatch: 0.02, specific: true, maxMatches: 3}, // Made specific
    ];

    let specificMarkdownFeaturesFound = 0;
    if (frontmatterPresent) specificMarkdownFeaturesFound++; // Frontmatter counts as one specific feature

    for (const p of markdownPatterns) {
      const matches = content.match(p.pattern);
      if (matches) {
        confidenceScore += p.weight;
        if (p.perMatch) {
            confidenceScore += Math.min(matches.length, p.maxMatches || 5) * p.perMatch;
        }
        patternsMatched++;
        if (p.specific) {
            specificMarkdownFeaturesFound++;
        }
      }
    }

    if (specificMarkdownFeaturesFound > 0) strongMarkdownSignal = true;

    // Adjustments
    if (specificMarkdownFeaturesFound >= MIN_MARKDOWN_FEATURES_FOR_CONFIDENCE) {
        confidenceScore += 0.25;
    } else if (patternsMatched > 0 && specificMarkdownFeaturesFound < MIN_MARKDOWN_FEATURES_FOR_CONFIDENCE && yamlLikePenalty < 0.1 && !frontmatterPresent) {
        // Only penalize if no frontmatter and low specific features, even if some general patterns matched
        confidenceScore *= 0.7;
    }

    const lines = content.split('\n');
    // If it's many lines but very few MD patterns were found (and not much YAML penalty), it's likely prose.
    if (lines.length > 10 && patternsMatched < 2 && specificMarkdownFeaturesFound === 0 && yamlLikePenalty < 0.1 && !frontmatterPresent) {
        const avgLineLength = trimmedContent.length / lines.length;
        // Average line length for English prose is around 15-20 words, assume ~5 chars/word + spaces = 75-120 chars
        if (avgLineLength > 30 && avgLineLength < 150) { // Heuristic for prose-like lines
            confidenceScore = Math.max(0.05, confidenceScore - 0.25); // More aggressive penalty
        }
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = (strongMarkdownSignal && confidenceScore >= 0.30 && yamlLikePenalty < 0.4) || // Lowered YAML penalty threshold here
                    (confidenceScore >= 0.45 && patternsMatched >= 2 && specificMarkdownFeaturesFound >=1 && yamlLikePenalty < 0.3) || // General case
                    (confidenceScore >= 0.25 && frontmatterPresent && patternsMatched >=1 && yamlLikePenalty < 0.5); // Frontmatter case

    // console.log(`Markdown detect: score=${confidenceScore.toFixed(3)}, patternsMatched=${patternsMatched}, specificFound=${specificMarkdownFeaturesFound}, yamlPenalty=${yamlLikePenalty.toFixed(3)}, isMatch=${isMatch}`);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongMarkdownSignal && confidenceScore > 0.55 && yamlLikePenalty < 0.25 // Adjusted definitive
    };
  }

  getFileExtension(): string {
    return 'md';
  }

  registerProvider(monaco: any): void {
    const languageId = this.id;
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }
    monaco.languages.registerDocumentFormattingEditProvider('markdown', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        let formatted = content;
        formatted = formatted.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
        formatted = formatted.replace(/^(\s*[-*+]\s*)([^\s])/gm, '$1 $2');
        formatted = formatted.replace(/^(\s*\d+\.\s*)([^\s])/gm, '$1 $2');
        formatted = formatted.replace(/^- \[( ?[xX]? ?)\]([^\s])/gmi, '- [$1] $2');
        formatted = formatted.replace(/^- \[( ?[xX]? ?)\](\S)/gmi, '- [$1] $2');
        formatted = formatted.replace(/^\s*([-*_])\s*\1\s*\1\s*$/gm, '---');
        // Ensure single blank line between paragraphs/blocks, no more than one.
        // More careful: don't add blank lines inside code blocks or list items that might be multi-line.
        // This is a simple version:
        formatted = formatted.replace(/\n{3,}/g, '\n\n');

        // Add blank lines around fenced code blocks if missing
        // This should be done carefully to avoid breaking indentation inside the block
        // Using a function for replacement to check context would be safer, but for simplicity:
        formatted = formatted.replace(/(\S)\n(```)/g, (match, p1, p2) => {
            if (p1.match(/^\s*$/)) return match; // If p1 is already whitespace, don't add more
            return `${p1}\n\n${p2}`;
        });
        formatted = formatted.replace(/(```)\n(\S)/g, (match, p1, p2) => {
            if (p2.match(/^\s*$/)) return match;
            return `${p1}\n\n${p2}`;
        });

        let finalFormatted = formatted.trim();
        if (content.endsWith('\n') && finalFormatted !== '') {
             finalFormatted += '\n';
        }

        return [{
          range: model.getFullModelRange(),
          text: finalFormatted
        }];
      }
    });
  }

  getStatusItem(): React.FC<{ content?: string }> {
    return MarkdownStatusItem;
  }
}

const markdownDetector = new MarkdownLanguageDetector();
languageRegistry.register(markdownDetector);

export const registerMarkdownProvider = (monaco: any) => {
  markdownDetector.registerProvider(monaco);
};