import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';
import { MarkdownStatusItem } from "../components/StatusBar/LanguageStatusItems/markdown";

const MAX_LINES_TO_ANALYZE_MD_FOR_YAML = 20;
const MIN_MARKDOWN_FEATURES_FOR_CONFIDENCE = 2; // Need at least 2 distinct MD features for good confidence

// YAML patterns (for exclusion/penalty in Markdown detector)
const YAML_KEY_VALUE_REGEX = /^\s*(?:[\w.-]+|"[^"]*"|'[^']*')\s*:\s*(?:\||>|&|\*|\S.*|$)/m;
const YAML_LIST_ITEM_REGEX = /^\s*-\s+(?!\[[ xX]\]).+/m; // YAML list item, excluding MD task list
const YAML_DOC_START_REGEX = /^---\s*$/m; // THIS WILL BE USED NOW
const YAML_DIRECTIVE_REGEX = /^%YAML\s+[\d.]+\s*$/m; // Added for completeness

export class MarkdownLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'markdown';
  name = 'Markdown';
  extensions = ['md', 'markdown', 'mdown', 'mkd'];
  priority = 4;

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
      } else if (endFrontmatterIndex !== -1) { // Only frontmatter was present
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

    // 1. Check for YAML frontmatter
    let frontmatterPresent = false;
    const contentForMainAnalysis = this.getContentWithoutFrontmatter(content);

    if (contentForMainAnalysis !== content) {
        frontmatterPresent = true;
        confidenceScore += 0.15;
        patternsMatched++;
        strongMarkdownSignal = true;
    }

    // 2. Analyze content *after* potential frontmatter for YAML-like structure
    const mainLinesToAnalyze = contentForMainAnalysis.split('\n').slice(0, MAX_LINES_TO_ANALYZE_MD_FOR_YAML);
    const firstMainLineTrimmed = mainLinesToAnalyze[0]?.trim();

    let yamlLikeLineCount = 0;
    let nonCommentNonEmptyMainLines = 0;

    if (contentForMainAnalysis.trim().length > 0) {
        for (const line of mainLinesToAnalyze) {
            const currentLineTrimmed = line.trim();
            if (!currentLineTrimmed || currentLineTrimmed.startsWith('#')) continue;
            nonCommentNonEmptyMainLines++;
            if (YAML_KEY_VALUE_REGEX.test(currentLineTrimmed) || YAML_LIST_ITEM_REGEX.test(currentLineTrimmed)) {
                yamlLikeLineCount++;
            }
        }

        if (nonCommentNonEmptyMainLines > 1) {
            const yamlLikeRatio = yamlLikeLineCount / nonCommentNonEmptyMainLines;
            if (yamlLikeRatio > 0.65 && yamlLikeLineCount >= 2) {
                yamlLikePenalty += 0.5;
            } else if (yamlLikeRatio > 0.45 && yamlLikeLineCount >= 1) {
                yamlLikePenalty += 0.25;
            }
        }

        if (firstMainLineTrimmed && (YAML_DIRECTIVE_REGEX.test(firstMainLineTrimmed) || (YAML_DOC_START_REGEX.test(firstMainLineTrimmed) && !frontmatterPresent))) {
            yamlLikePenalty += 0.6;
        }
    }
    confidenceScore -= yamlLikePenalty;


    // 3. Markdown Pattern Matching (on the full original content)
    const markdownPatterns = [
      { pattern: /^(#{1,6})\s+.+/gm, weight: 0.25, perMatch: 0.05, specific: true, maxMatches: 5 },
      { pattern: /\[[^\]]+?\]\([^\)]+?\)/g, weight: 0.20, perMatch: 0.04, specific: true, maxMatches: 5 },
      { pattern: /!\[[^\]]*?\]\([^\)]+?\)/g, weight: 0.20, perMatch: 0.04, specific: true, maxMatches: 3 },
      { pattern: /`{3,}(\w*\s*)?\n[\s\S]*?\n`{3,}/g, weight: 0.25, perMatch: 0.05, specific: true, maxMatches: 3 },
      { pattern: /^- \[([ xX])\]\s+.+/gm, weight: 0.20, perMatch: 0.05, specific: true, maxMatches: 5 },
      { pattern: /^(?:---|\*\*\*|___)\s*$/gm, weight: 0.15, perMatch: 0.05, specific: true, maxMatches: 2 },
      { pattern: /^\s*>\s+.*/gm, weight: 0.15, perMatch: 0.03, maxMatches: 5 },
      { pattern: /^\s*([-*+])\s+(?!\[[ xX]\]).+/gm, weight: 0.1, perMatch: 0.02, maxMatches: 10 },
      { pattern: /^\s*\d+\.\s+.*/gm, weight: 0.1, perMatch: 0.02, maxMatches: 10 },
      { pattern: /\*\*([^\s*](?:[^*]*[^\s*])?)\*\*|\_\_([^\s_](?:[^_]*[^\s_])?)\_\_/g, weight: 0.05, perMatch: 0.01, maxMatches: 10 },
      { pattern: /(?<![\*_])\*([^\s*](?:[^*]*[^\s*])?)\*(?![\*_])|(?<![\*_])_([^\s_](?:[^_]*[^\s_])?)_(?![\*_])/g, weight: 0.05, perMatch: 0.01, maxMatches: 10 },
      { pattern: /`([^`\n]+?)`/g, weight: 0.05, perMatch: 0.01, maxMatches: 10 },
      { pattern: /<https?:\/\/[^\s>]+>/g, weight: 0.1, perMatch: 0.02, maxMatches: 3},
      { pattern: /^\s*\|(?:[^|\n]+\|)+/gm, weight: 0.15, perMatch: 0.03, specific: true, maxMatches: 3 },
    ];

    let specificMarkdownFeaturesFound = 0;
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
    } else if (patternsMatched > 0 && specificMarkdownFeaturesFound < MIN_MARKDOWN_FEATURES_FOR_CONFIDENCE && yamlLikePenalty < 0.1) {
        confidenceScore *= 0.7;
    }

    const lines = content.split('\n');
    if (lines.length > 5 && patternsMatched < 2 && specificMarkdownFeaturesFound === 0 && yamlLikePenalty < 0.1) {
        const avgLineLength = trimmedContent.length / lines.length;
        if (avgLineLength > 30 && avgLineLength < 120) {
            confidenceScore = Math.max(0.05, confidenceScore - 0.15);
        }
    }
    
    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = (strongMarkdownSignal && confidenceScore >= 0.30 && yamlLikePenalty < 0.3) ||
                    (confidenceScore >= 0.40 && patternsMatched >= 2 && specificMarkdownFeaturesFound >=1 && yamlLikePenalty < 0.2) ||
                    (confidenceScore >= 0.20 && frontmatterPresent && patternsMatched >=1 && yamlLikePenalty < 0.4);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongMarkdownSignal && confidenceScore > 0.55 && yamlLikePenalty < 0.2
    };
  }

  getFileExtension(): string {
    return 'md';
  }

  // registerProvider and getStatusItem remain the same
  registerProvider(monaco: any): void {
    const languageId = this.id;
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }
    // Monaco has excellent built-in Markdown support, including a decent tokenizer.
    // A custom formatter can be useful for consistency.
    monaco.languages.registerDocumentFormattingEditProvider('markdown', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        // Basic Markdown formatting - this is a simplified heuristic.
        // For robust formatting, consider integrating a library like Prettier or remark-format.
        let formatted = content;

        // Ensure space after headers
        formatted = formatted.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');

        // Ensure space after list markers
        formatted = formatted.replace(/^(\s*[-*+]\s*)([^\s])/gm, '$1 $2');
        formatted = formatted.replace(/^(\s*\d+\.\s*)([^\s])/gm, '$1 $2');

        // Ensure space around task list checkboxes
        formatted = formatted.replace(/^- \[( ?[xX]? ?)\]([^\s])/gmi, '- [$1] $2');
        formatted = formatted.replace(/^- \[( ?[xX]? ?)\](\S)/gmi, '- [$1] $2');


        // Normalize horizontal rules
        formatted = formatted.replace(/^\s*([-*_])\s*\1\s*\1\s*$/gm, '---');

        // Add blank lines around fenced code blocks if missing
        formatted = formatted.replace(/(\S)\n(```)/g, '$1\n\n$2');
        formatted = formatted.replace(/(```)\n(\S)/g, '$1\n\n$2');

        // Consistent newlines: Ensure single blank line between paragraphs/blocks, no more than one.
        formatted = formatted.replace(/\n{3,}/g, '\n\n');


        return [{
          range: model.getFullModelRange(),
          text: formatted.trim() + (content.endsWith('\n') && formatted.trim() !== '' ? '\n' : '')
        }];
      }
    });
  }

  getStatusItem(): React.FC<{ content?: string }> {
    return MarkdownStatusItem;
  }
}

// Create and register the detector
const markdownDetector = new MarkdownLanguageDetector();
languageRegistry.register(markdownDetector);

// Preload samples for future use
// markdownDetector.preloadDynamicSample(); // If you implement dynamic samples for MD

// Export for backward compatibility
export const registerMarkdownProvider = (monaco: any) => {
  markdownDetector.registerProvider(monaco);
};