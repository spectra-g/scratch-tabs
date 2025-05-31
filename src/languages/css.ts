import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * CSS language detector
 */
export class CssLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'css';
  name = 'CSS';
  extensions = ['css', 'scss', 'less'];
  priority = 4;

  sampleContent(): string {
    return `/* Global styles */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f0f0f0;
  color: #333;
}

/* Header styles */
.header {
  background-color: #333;
  color: white;
  padding: 1em 0;
  text-align: center;
}

#main-nav ul {
  list-style-type: none;
  padding: 0;
}

#main-nav ul li {
  display: inline;
  margin-right: 20px;
}

a:hover {
  text-decoration: underline;
  color: #007bff;
}

/* Media query for responsiveness */
@media screen and (max-width: 600px) {
  .header {
    font-size: 1.2em;
  }

  #main-nav ul li {
    display: block;
    margin-bottom: 10px;
  }
}

/* Animation example */
@keyframes slidein {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0%);
  }
}

.animated-element {
  animation: slidein 3s ease-in-out infinite alternate;
}
`;
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 5) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongCssSignal = false;

    // Simple patterns as specified
    const selectorLineRegex = /^\s*\w[\w\-]*\s*\{$/; // h1 {
    const declarationLineRegex = /^\s*[\w\-]+\s*:\s*[^;]+;\s*$/; // color: red;
    const commentLineRegex = /^\s*\/\*.*\*\/\s*$/; // /* comment */
    
    // Common CSS properties (almost always CSS)
    const commonCssProperties = new Set([
      'color', 'background', 'background-color', 'margin', 'padding', 
      'font-size', 'font-family', 'font-weight', 'text-align', 'display',
      'width', 'height', 'border', 'position', 'top', 'left', 'right', 'bottom'
    ]);
    
    // Split into lines and analyze
    const lines = content.split('\n');
    let selectorLineCount = 0;
    let declarationLineCount = 0;
    let commonPropertyCount = 0;
    let hyphenatedPropertyCount = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Skip comments (don't count them for or against)
      if (commentLineRegex.test(trimmedLine)) {
        continue;
      }

      // Skip closing braces (don't count them as they're common in many languages)
      if (trimmedLine === '}') {
        continue;
      }

      // Check for selector lines: h1 {
      if (selectorLineRegex.test(trimmedLine)) {
        selectorLineCount++;
        confidenceScore += 0.3; // Strong signal
        patternsMatched++;
        strongCssSignal = true;
      }

      // Check for declaration lines: color: red;
      if (declarationLineRegex.test(trimmedLine)) {
        declarationLineCount++;
        confidenceScore += 0.2; // Good signal
        
        // Extract property name to check if it's common CSS
        const propertyMatch = trimmedLine.match(/^\s*([\w\-]+)\s*:/);
        if (propertyMatch) {
          const propertyName = propertyMatch[1].toLowerCase();
          
          // Check for common CSS properties
          if (commonCssProperties.has(propertyName)) {
            commonPropertyCount++;
            confidenceScore += 0.15; // Bonus for common CSS properties
            strongCssSignal = true;
          }
          
          // Check for hyphenated property names (common in CSS)
          if (propertyName.includes('-')) {
            hyphenatedPropertyCount++;
            confidenceScore += 0.1; // Bonus for hyphenated properties
          }
        }
        
        patternsMatched++;
      }
    }

    // Bonus for multiple declarations (CSS rules usually have multiple properties)
    if (declarationLineCount >= 2) {
      confidenceScore += 0.1;
      patternsMatched++;
    }

    // Bonus for having both selectors and declarations
    if (selectorLineCount >= 1 && declarationLineCount >= 1) {
      confidenceScore += 0.2;
      strongCssSignal = true;
    }

    // Anti-patterns: Strong indicators this is NOT CSS
    if (/\b(function|var|let|const|return|import|export)\b/.test(content)) {
      confidenceScore -= 0.4; // JavaScript keywords
    }
    
    if (/"[\w\-]+"\s*:/.test(content) && !selectorLineCount) {
      confidenceScore -= 0.3; // JSON-like quoted keys without CSS selectors
    }

    if (/<\/?\w+[^>]*>/.test(content) && !selectorLineCount) {
      confidenceScore -= 0.3; // HTML tags without CSS selectors
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Simple matching criteria
    const isMatch = (selectorLineCount >= 1 && declarationLineCount >= 1) || // At least one selector and one declaration
                   (declarationLineCount >= 3 && commonPropertyCount >= 1) ||  // Multiple declarations with common CSS properties
                   (strongCssSignal && confidenceScore >= 0.4);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongCssSignal && selectorLineCount >= 1 && commonPropertyCount >= 1
    };
  }

  getFileExtension(): string {
    return 'css';
  }

  registerProvider(monaco: any): void {
    // Monaco has built-in support for CSS, SCSS, and LESS.
    // Usually, you don't need to register a custom formatter unless you want very specific behavior.
    // For basic formatting, Monaco's default should work well.
    // If you *do* want to override or provide a custom one:
    /*
    monaco.languages.registerDocumentFormattingEditProvider('css', {
      provideDocumentFormattingEdits(model: any, options: any, token: any) {
        // Your custom formatting logic here.
        // This can be complex. A simple example:
        const text = model.getValue();
        // Example: Basic indentation (very naive for CSS)
        let formatted = "";
        let indentLevel = 0;
        const indentChar = "  "; // Two spaces
        text.split('\n').forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine.endsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          formatted += indentChar.repeat(indentLevel) + trimmedLine + '\n';
          if (trimmedLine.endsWith('{')) {
            indentLevel++;
          }
        });
        return [{
          range: model.getFullModelRange(),
          text: formatted.trim(),
        }];
      }
    });
    */
  }
}

// Create and register the detector
const cssDetector = new CssLanguageDetector();
languageRegistry.register(cssDetector);

// Export for backward compatibility (optional)
export const registerCssProvider = (monaco: any) => {
  cssDetector.registerProvider(monaco);
};