import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Markdown language detector
 */
export class MarkdownLanguageDetector extends BaseLanguageDetector {
  id = 'markdown';
  name = 'Markdown';
  extensions = ['md', 'markdown'];
  priority = 2;
  
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
   * Check if content matches Markdown patterns
   */
  isMatch(content: string): boolean {
    // Skip if it looks like YAML with document start marker followed by a key
    if (/^---\s*\n[\s]*[a-zA-Z0-9_-]+[\s]*:/m.test(content)) {
      return false;
    }
    
    const markdownPatterns = [
      /^#+ /m,                    // Headers
      /^\s*[-*] /m,               // Unordered lists
      /^\s*\d+\. /m,              // Ordered lists
      /\[.+?\]\(.+?\)/m,          // Links
      /!\[.+?\]\(.+?\)/m,         // Images
      /^>\s/m,                    // Blockquotes
      /`{1,3}[^`]+`{1,3}/m,       // Code blocks/inline code
      /\*\*.+?\*\*/m,             // Bold text
      /_.+?_/m,                   // Italic text
      /^- \[[ x]\] /im,           // Task lists
      /^---$/m                    // Horizontal rules
    ];

    // Count how many Markdown patterns match
    const matchCount = markdownPatterns.reduce((count, pattern) => 
      count + (pattern.test(content) ? 1 : 0), 0);
    
    // If content has "---" but also has key-value pairs, it's likely YAML
    if (/^---$/m.test(content) && /^[\s]*[a-zA-Z0-9_-]+[\s]*:(?:\s.*)?$/m.test(content)) {
      // Only consider it Markdown if it has strong Markdown indicators
      return matchCount >= 3 && this.countSpecificPatterns(content) >= 2;
    }
    
    // Otherwise, require at least one Markdown pattern
    return matchCount >= 1;
  }
  
  /**
   * Count Markdown-specific patterns (patterns that are unlikely to be in YAML)
   */
  countSpecificPatterns(content: string): number {
    const markdownSpecificPatterns = [
      /^#{2,6}\s/m,                  // Headers with more than one #
      /\[.+?\]\(.+?\)/m,             // Links
      /!\[.+?\]\(.+?\)/m,            // Images
      /`{3}[\s\S]+?`{3}/m,           // Code blocks
      /\*\*.+?\*\*/m,                // Bold text
      /_.+?_/m,                      // Italic text
      /^>\s.+/m,                     // Blockquotes
      /^- \[[ x]\] /im,              // Task lists
      /^\d+\.\s/m                    // Ordered lists
    ];
    
    return markdownSpecificPatterns.reduce((count, pattern) => 
      count + (pattern.test(content) ? 1 : 0), 0);
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

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n\n')
        }];
      }
    });
  }
}

// Create and register the detector
const markdownDetector = new MarkdownLanguageDetector();
languageRegistry.register(markdownDetector);

// Export for backward compatibility
export const registerMarkdownProvider = (monaco: any) => {
  markdownDetector.registerProvider(monaco);
};