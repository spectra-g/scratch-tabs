import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * HTML language detector
 */
export class HtmlLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'html'; // Monaco's built-in ID for HTML
  name = 'HTML';
  extensions = ['html', 'htm', 'xhtml'];
  priority = 5; // HTML is quite distinct, give it a good priority

  sampleContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sample HTML Page</title>
    <link rel="stylesheet" href="style.css">
    <style>
        body { font-family: sans-serif; }
    </style>
</head>
<body>
    <header>
        <h1>Page Title</h1>
    </header>
    <main class="container">
        <p>This is a paragraph with a <a href="#">link</a>.</p>
        <img src="image.jpg" alt="Sample Image">
        <!-- This is an HTML comment -->
        <div id="app"></div>
    </main>
    <footer>
        <p>© ${new Date().getFullYear()} My Website</p>
    </footer>
    <script src="script.js"></script>
</body>
</html>`;
  }

  /**
   * Detects if the given content matches HTML patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) { // e.g., "<html></html>"
      return this.noMatch();
    }

    const normalizedContent = content.trim(); // Used for some initial checks
    let confidenceScore = 0.0;
    let patternsMatched = 0; // Count of distinct pattern types hit
    let strongSignalFound = false;

    // 1. DOCTYPE declaration (very strong signal)
    if (/^\s*<!DOCTYPE\s+html\s*>/i.test(normalizedContent)) {
      confidenceScore += 0.7;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 2. Core HTML tags (<html>, <head>, <body> are very strong)
    const coreTagPatterns = [
      { pattern: /<html[\s>]/i, weight: 0.35 },
      { pattern: /<head[\s>][\s\S]*?<\/head>/i, weight: 0.25 }, // Presence of head block
      { pattern: /<body[\s>][\s\S]*?<\/body>/i, weight: 0.3 },   // Presence of body block
      { pattern: /<title[\s>][\s\S]*?<\/title>/i, weight: 0.15 },
      { pattern: /<meta[\s>]/i, weight: 0.1 },
    ];

    for (const tp of coreTagPatterns) {
      if (tp.pattern.test(content)) { // Test on original content for multi-line matches
        confidenceScore += tp.weight;
        patternsMatched++;
        strongSignalFound = true;
      }
    }

    // 3. Common HTML tags and structures
    const commonHtmlPatterns = [
      { pattern: /<div[\s>]/gi, weight: 0.05, perMatch: 0.01 },
      { pattern: /<span[\s>]/gi, weight: 0.05, perMatch: 0.01 },
      { pattern: /<p[\s>]/gi, weight: 0.05, perMatch: 0.01 },
      { pattern: /<a\s+[^>]*href=/gi, weight: 0.1, perMatch: 0.02 },
      { pattern: /<img\s+[^>]*src=/gi, weight: 0.1, perMatch: 0.02 },
      { pattern: /<form[\s>]/gi, weight: 0.1, perMatch: 0.02 },
      { pattern: /<input[\s>]/gi, weight: 0.08, perMatch: 0.01 },
      { pattern: /<button[\s>]/gi, weight: 0.08, perMatch: 0.01 },
      { pattern: /<h[1-6][\s>]/gi, weight: 0.08, perMatch: 0.01 },
      { pattern: /<ul[\s>]|<\/ul>|<ol[\s>]|<\/ol>|<li[\s>]|<\/li>/gi, weight: 0.1, perMatch: 0.01 },
      { pattern: /<table[\s>]|<\/table>|<tr[\s>]|<\/tr>|<td[\s>]|<\/td>|<th[\s>]|<\/th>/gi, weight: 0.1, perMatch: 0.01 },
      { pattern: /<\/[a-zA-Z0-9]+>/g, weight: 0.1, perMatch: 0.005 }, // Generic closing tags
      { pattern: /&[a-zA-Z0-9#]+;/g, weight: 0.05, perMatch: 0.005 }, // HTML entities
    ];

    for (const p of commonHtmlPatterns) {
      const matches = content.match(p.pattern);
      if (matches) {
        confidenceScore += p.weight;
        if (p.perMatch) {
          confidenceScore += Math.min(matches.length, 10) * p.perMatch; // Cap per-match bonus
        }
        patternsMatched++;
      }
    }

    // 4. Embedded <script> and <style> tags (common in HTML, but can also appear elsewhere)
    if (/<script[\s>]/.test(content) && /<\/script>/i.test(content)) {
      confidenceScore += 0.05; // Small boost
      patternsMatched++;
    }
    if (/<style[\s>]/.test(content) && /<\/style>/i.test(content)) {
      confidenceScore += 0.05; // Small boost
      patternsMatched++;
    }

    // 5. HTML Comments <!-- ... -->
    if (/<!--[\s\S]*?-->/g.test(content)) {
      confidenceScore += 0.1;
      patternsMatched++;
    }

    // 6. Anti-patterns (syntax strongly indicating other languages)
    // Be careful as HTML can embed JS and CSS
    const antiPatterns = [
      { pattern: /^package\s+\w+;/im, weight: -0.6 },             // Java package
      { pattern: /^\s*#include\s+<.+>/m, weight: -0.6 },         // C/C++ include
      // If there are many JS keywords *outside* <script> tags, it's less likely pure HTML
      // This is harder to do perfectly with regex. A simpler check:
      { pattern: /\b(function|class|const|let|var)\s+\w+\s*=/g, weight: -0.1, threshold: 3 }, // Penalize if many JS assignments outside script
      { pattern: /^\s*(FROM|RUN|CMD|EXPOSE)\s+/mi, weight: -0.7 } // Dockerfile instructions
    ];

    for (const ap of antiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches) {
        if (ap.threshold && matches.length < ap.threshold) continue; // Apply penalty only if threshold met
        confidenceScore += ap.weight * (matches.length > 1 ? 1.5 : 1); // Heavier penalty for multiple occurrences
      }
    }

    // 7. Final Adjustments and Clamping
    if (patternsMatched >= 3 && strongSignalFound) {
      confidenceScore += 0.1;
    }
    // If it has html, head, and body tags, it's very likely HTML.
    if (/<html[\s>]/.test(content) && /<head[\s>]/.test(content) && /<body[\s>]/.test(content)) {
        confidenceScore += 0.2;
        strongSignalFound = true;
    }


    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    const isMatch = (strongSignalFound && confidenceScore >= 0.5) || (patternsMatched >= 3 && confidenceScore >= 0.6);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound
    };
  }

  getFileExtension(): string {
    return 'html';
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'html'

    // Monaco has excellent built-in support for 'html'.
    // You usually don't need to register a custom Monarch tokenizer or formatter.
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    // For formatting, you can enable Monaco's built-in HTML formatter if it's not on by default,
    // or integrate an external library like Prettier via a language server or directly if feasible.
    // The basic formatter you had is a good heuristic starting point for simple indentation.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        // Using Monaco's built-in formatter is preferred if available and suitable.
        // This is a placeholder for a more complex external formatter or a very basic heuristic.
        // The one you provided was a good attempt for a basic indenter.
        // For simplicity, and because Monaco's HTML support is good, we might not need a custom one.
        // However, if you want to ensure *your* specific basic formatting:

        const content = model.getValue();
        let formattedHtml = "";
        let indentLevel = 0;
        const indentSize = 2; // Common for HTML
        let inTag = false;
        let inPreTag = false;

        const lines = content.split('\n');

        lines.forEach((line, index) => {
            const trimmedLine = line.trim();

            if (!trimmedLine) {
                formattedHtml += '\n';
                return;
            }
            
            // Handle <pre> tags
            if (trimmedLine.match(/<pre\b.*?>/i)) inPreTag = true;
            if (inPreTag && trimmedLine.match(/<\/pre\b.*?>/i)) {
                 // Line with closing pre tag is still part of pre content
                 formattedHtml += line + '\n'; // Keep original line including its indent
                 inPreTag = false;
                 return;
            }
            if (inPreTag) {
                formattedHtml += line + '\n'; // Keep original line including its indent
                return;
            }

            // Closing tags decrease indent before printing the line
            // unless it's a self-closing tag or a void element on the same line
            if (trimmedLine.startsWith('</') || 
                (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) || // For embedded template syntax (e.g., Vue/Angular)
                (trimmedLine.startsWith('(') && trimmedLine.endsWith(')'))) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            formattedHtml += ' '.repeat(indentLevel * indentSize) + trimmedLine + '\n';

            // Opening tags (not self-closing, not void) increase indent for next line
            if (trimmedLine.startsWith('<') &&
                !trimmedLine.startsWith('</') && // Not a closing tag
                !trimmedLine.endsWith('/>') &&    // Not a self-closing tag
                !trimmedLine.match(/<(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)\b/i) // Not a void element
                ) {
                 if(!trimmedLine.endsWith('>')) { // If tag spans multiple lines, only indent if it's a new opening tag.
                     // This logic is still simple and might fail for complex multi-line tags
                 } else if (trimmedLine.includes('</') && trimmedLine.indexOf('</') < trimmedLine.indexOf('>')) {
                    // Contains a closing tag before its own closing > (e.g. <p>text</p>) - no indent change for next line
                 } else {
                    indentLevel++;
                 }
            }
        });

        return [{
          range: model.getFullModelRange(),
          text: formattedHtml.trimEnd() + (content.endsWith('\n') && formattedHtml.trimEnd() !== '' ? '\n' : ''),
        }];
      }
    });
  }
}

// Create and register the detector
const htmlDetector = new HtmlLanguageDetector();
languageRegistry.register(htmlDetector);

// Export for backward compatibility (optional)
export const registerHtmlProvider = (monaco: any) => {
  htmlDetector.registerProvider(monaco);
};