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
    let patternsMatched = 0; // Count of distinct features/pattern groups
    let strongCssSignal = false;

    let ruleBlockCount = 0;
    let propertyCount = 0;
    let atRuleCount = 0;
    let scssLessFeatureCount = 0;

    // Regex for a typical CSS selector part (simplified)
    const selectorPartRegex = /(?:[.#@\w*-]|[:\[\(])(?:[^\{\};]*?)/;
    // Regex for a property: value;
    const propertyValueRegex = /^\s*([\w-]+)\s*:\s*([^;{}]+?)(?:;|(?=\s*\}))/; // Property, value, optional semicolon before }


    const lines = content.split('\n');
    let inBlock = false;
    let currentBlockHasProperty = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.includes('{')) {
        // Check if it's a selector block, not a JS object literal or function block
        if (selectorPartRegex.test(trimmedLine.substring(0, trimmedLine.indexOf('{')))) {
          inBlock = true;
          currentBlockHasProperty = false;
          ruleBlockCount++;
        }
      }

      if (inBlock) {
        if (propertyValueRegex.test(trimmedLine)) {
          propertyCount++;
          currentBlockHasProperty = true;
        }
      }

      if (trimmedLine.includes('}')) {
        if (inBlock && currentBlockHasProperty) { // Only count as a valid CSS block if it had properties
          confidenceScore += 0.25; // Base for a rule block with properties
          patternsMatched++;
          strongCssSignal = true;
        }
        inBlock = false;
        currentBlockHasProperty = false;
      }

      // @-rules
      if (/@(?:media|keyframes|font-face|supports|import|charset|namespace)\b/.test(trimmedLine)) {
        atRuleCount++;
        confidenceScore += 0.2;
        patternsMatched++;
        strongCssSignal = true;
      }
      // SCSS/LESS specific
      if (/(?:\$|\@)[\w-]+\s*:/.test(trimmedLine) || /&\s*[:.#\w-]/.test(trimmedLine) || /@(?:mixin|include|extend|function)\b/.test(trimmedLine)) {
        scssLessFeatureCount++;
        confidenceScore += 0.15; // These are quite specific
        patternsMatched++;
        strongCssSignal = true;
      }
    }
    // Add bonuses based on counts collected above
    confidenceScore += Math.min(ruleBlockCount, 5) * 0.05;
    confidenceScore += Math.min(propertyCount, 10) * 0.02;
    confidenceScore += Math.min(atRuleCount, 3) * 0.05;
    confidenceScore += Math.min(scssLessFeatureCount, 3) * 0.05;


    // Comments (very low weight)
    if (/\/\*[\s\S]*?\*\//g.test(content)) { confidenceScore += 0.02; patternsMatched++; }
    if (/\/\/.*/g.test(content) && (this.extensions.includes('scss') || this.extensions.includes('less'))) { confidenceScore += 0.01; }


    // --- Anti-Patterns (More Aggressive for JS/Code like structures) ---
    let antiPatternScore = 0;
    // Count specific JS/Code keywords that are NOT CSS properties
    const jsKeywords = /\b(function|var|let|const|return|await|async|new|constructor|yield|typeof|instanceof)\b/g;
    const jsKeywordMatches = content.match(jsKeywords);
    if (jsKeywordMatches && jsKeywordMatches.length > 2) { // If more than 2 JS keywords
      antiPatternScore += 0.3 + (jsKeywordMatches.length * 0.05);
    }
    if (/\bimport\s+.*\s+from\s*['"]/.test(content)) antiPatternScore += 0.4; // ES6 import
    if (/\b(class|interface)\s+\w+\s*\{/.test(content) && !content.includes("</style>")) antiPatternScore += 0.2; // Class/Interface not in style tag
    if (content.match(/=>/g) && content.match(/=>/g).length > 0) antiPatternScore += 0.3; // Arrow functions
    if (content.match(/===|!==/g) && content.match(/===|!==/g).length > 0) antiPatternScore += 0.2; // Strict equality
    if (content.includes("<?php")) antiPatternScore += 0.7;
    if (content.includes("System.out.println")) antiPatternScore += 0.6;

    confidenceScore -= antiPatternScore;

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = (strongCssSignal && confidenceScore >= 0.30 && patternsMatched >= 1) || // Need at least one strong CSS signal (selector block, @rule, scss/less)
      (confidenceScore >= 0.45 && patternsMatched >= 2);


    // console.log(`CSS: Score=${confidenceScore.toFixed(3)}, Patterns=${patternsMatched}, Rules=${ruleBlockCount}, Props=${propertyCount}, @=${atRuleCount}, SCSS=${scssLessFeatureCount}, Strong=${strongCssSignal}, Match=${isMatch}`);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongCssSignal
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