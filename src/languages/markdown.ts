import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { MarkdownStatusItem } from "../components/StatusBar/LanguageStatusItems/markdown.tsx";
import React from 'react';
import * as yaml from 'js-yaml'; // Import js-yaml here too

// --- Constants ---
const MAX_LINES_TO_PARSE_YAML = 15; // Limit YAML parsing check

/**
 * Markdown language detector
 */
export class MarkdownLanguageDetector extends BaseLanguageDetector {
  id = 'markdown';
  name = 'Markdown';
  extensions = ['md', 'markdown'];
  priority = 3;
  
  /**
   * Get sample content for Markdown
   */
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

[Visit StackBlitz](https://stackblitz.com)

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
  
  /**
   * Check if content matches Markdown patterns, excluding likely YAML.
   */
  isMatch(content: string): boolean {
    const trimmed = content.trim();
    if (!trimmed) return false;

    // --- YAML Exclusion ---
    // 1. Check for YAML frontmatter structure more reliably
    if (/^---\s*$/.test(trimmed.split('\n')[0]) && /^\s*([a-zA-Z0-9_.-]+|"([^"]*)"|'([^']*)')\s*:\s*(?:\S|$)/m.test(content)) {
        // Starts with --- and contains key: value pattern -> Likely YAML frontmatter
        // We might still want to detect this as Markdown *if* there's significant Markdown content *after* potential frontmatter.
        // Let's check for YAML structure beyond just the frontmatter start.
        try {
            const docs = yaml.loadAll(content.slice(0, 1000)); // Parse first 1KB
            if (docs.length > 0 && typeof docs[0] === 'object' && Object.keys(docs[0] || {}).length > 0) {
                 // If the first part parses as a non-empty object, lean towards YAML unless strong MD follows.
                 // This is tricky. For now, let's be conservative and reject MD if valid frontmatter object is found.
                 // console.log("Markdown Detector: Rejected due to likely YAML frontmatter object.");
                 // return false; // Re-evaluate this rule based on desired behavior for MD with frontmatter
            }
        } catch (e) { /* Ignore YAML parsing errors here */ }
    }

    // 2. Check if the content parses as complex YAML (object/array)
    // This helps prevent classifying structured YAML as Markdown
    try {
        const lines = content.split('\n');
        if (lines.length >= 2) { // Only check if more than one line
            const contentToParse = lines.slice(0, MAX_LINES_TO_PARSE_YAML).join('\n');
            // Check for minimal YAML structure first to avoid unnecessary parsing
             if (/^\s*([a-zA-Z0-9_.-]+|"([^"]*)"|'([^']*)')\s*:\s*(?:\S|$)/m.test(contentToParse) || /^\s*-\s+(?:\S|\n\s+\S)/m.test(contentToParse)) {
                const result = yaml.load(contentToParse);
                if (typeof result === 'object' && result !== null) {
                    // If it parses successfully into an object or array, it's unlikely Markdown.
                    // console.log("Markdown Detector: Rejected due to successful complex YAML parse.");
                    return false;
                }
            }
        }
    } catch (e) { /* Ignore YAML parsing errors */ }
    // --- End YAML Exclusion ---


    // --- Original Markdown Pattern Matching ---
    const markdownPatterns = [
      /^#+\s+/m,                  // Headers (H1 included here, YAML check handles ambiguity)
      /^\s*[-*+]\s+/m,            // Unordered lists (allow +)
      /^\s*\d+\.\s+/m,            // Ordered lists
      /\[.+?\]\(.+?\)/m,          // Links
      /!\[.+?\]\(.+?\)/m,         // Images
      /^>\s+/m,                   // Blockquotes
      /`{1,3}[^`\n]+`{1,3}/m,     // Inline code / simple code blocks
      /`{3}[\s\S]*?`{3}/m,        // Multiline code blocks
      /(\*\*|__).+?\1/m,          // Bold text (** or __)
      /(\*|_)[^\*\s_].*?\1/m,     // Italic text (* or _) - avoid matching **/__
      /^- \[[ x]\] /im,           // Task lists
      /^(?:---|\*\*\*|___)\s*$/m  // Horizontal rules
    ];

    // Count how many Markdown patterns match
    const matchCount = markdownPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);

    // Require at least 2 distinct Markdown patterns. Adjust as needed.
    // console.log("Markdown Detector: Match count =", matchCount);
    return matchCount >= 2;
  }

  // ... (countSpecificPatterns can remain similar, focusing on MD patterns) ...
  countSpecificPatterns(content: string): number {
     // Use a similar list as in isMatch, maybe weight some higher?
     const markdownSpecificPatterns = [
       /^#{1,6}\s+/m,             // Headers H1-H6
       /\[.+?\]\(.+?\)/m,         // Links
       /!\[.+?\]\(.+?\)/m,        // Images
       /`{3}[\s\S]+?`{3}/m,       // Multi-line code blocks
       /^- \[[ x]\] /im,          // Task lists
       /^\s*\d+\.\s+/m,           // Ordered lists
       /^(?:---|\*\*\*|___)\s*$/m,// Horizontal rules
       /^\s*[-*+]\s+/m,           // Unordered lists
       /^>\s+/m,                  // Blockquotes
       /(\*\*|__).+?\1/m,         // Bold
       /(\*|_)[^\*\s_].*?\1/m,    // Italic
     ];

     let score = markdownSpecificPatterns.reduce((count, pattern) =>
       count + (pattern.test(content) ? (content.match(new RegExp(pattern.source, 'gm'))?.length || 0) : 0), // Count occurrences
       0);

     // Optional: Penalize if it parses as complex YAML
     try {
         const lines = content.split('\n');
         if (lines.length >= 2) {
             const contentToParse = lines.slice(0, MAX_LINES_TO_PARSE_YAML).join('\n');
              if (/^\s*([a-zA-Z0-9_.-]+|"([^"]*)"|'([^']*)')\s*:\s*(?:\S|$)/m.test(contentToParse) || /^\s*-\s+(?:\S|\n\s+\S)/m.test(contentToParse)) {
                 const result = yaml.load(contentToParse);
                 if (typeof result === 'object' && result !== null) {
                     score = Math.max(0, score - 10); // Penalize YAML structure
                 }
             }
         }
     } catch (e) { /* Ignore */ }

     return score;
   }

  /**
   * Register Markdown language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Configure Markdown formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('markdown', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        
        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) return '';

          // Format headings (ensure space after #)
          if (trimmedLine.startsWith('#')) {
            const match = trimmedLine.match(/^(#+)(.*)$/);
            if (match) {
              return `${match[1]} ${match[2].trim()}`;
            }
          }

          // Format list items (ensure space after - * >)
          if (trimmedLine.match(/^[-*>]/)) {
            const match = trimmedLine.match(/^([-*>])(.*)$/);
            if (match) {
              return `${match[1]} ${match[2].trim()}`;
            }
          }

          // Format task lists
          if (trimmedLine.match(/^- \[[ x]\]/i)) {
            const match = trimmedLine.match(/^(- \[[ x]\])(.*)$/i);
            if (match) {
              return `${match[1]} ${match[2].trim()}`;
            }
          }

          return trimmedLine;
        });

        const removeConsecutiveEmptyLines = (lines: string[]) => {
          return lines.reduce((result, current) => {
            // If the current element is an empty string, check if the last added element is not empty
            if (current === '' && result[result.length - 1] === '') {
              return result; // Skip this empty string as it's consecutive
            }
            // Otherwise, add the current element to the result array
            result.push(current);
            return result;
          }, []);
        };

        return [{
          range: model.getFullModelRange(),
          text: removeConsecutiveEmptyLines(formattedLines).join('\n')
        }];
      }
    });
  }

  /**
   * Get status item component for JSON
   */
  getStatusItem(): React.FC<{ content?: string }> {
    return MarkdownStatusItem;
  }
}

// Create and register the detector
const markdownDetector = new MarkdownLanguageDetector();
languageRegistry.register(markdownDetector);

// Export for backward compatibility
export const registerMarkdownProvider = (monaco: any) => {
  markdownDetector.registerProvider(monaco);
};