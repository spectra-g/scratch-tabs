import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * JavaScript/TypeScript language detector
 */
export class JavaScriptLanguageDetector extends BaseLanguageDetector {
  id = 'javascript';
  name = 'JavaScript';
  extensions = ['js', 'jsx', 'mjs'];
  priority = 6; // Higher priority than CSV

  /**
   * Check if content matches JavaScript patterns
   */
  isMatch(content: string): boolean {
    // First check for definitive JavaScript patterns
    const definitivePatterns = [
      /\bimport\s+.*\s+from\s+['"]/i,          // Import statements
      /\bexport\s+(default\s+)?\w+/i,          // Export statements
      /\basync\s+function/i,                   // Async functions
      /\bawait\s+\w+/i,                        // Await expressions
      /=>\s*{/i,                               // Arrow functions
      /\bclass\s+\w+(\s+extends\s+\w+)?\s*\{/i // Class declarations
    ];

    // If any definitive pattern matches, it's definitely JavaScript
    if (definitivePatterns.some(pattern => pattern.test(content))) {
      return true;
    }

    // Check for common JavaScript patterns
    const jsPatterns = [
      /\bfunction\s+\w+\s*\(/i,                // Function declarations
      /\bconst\s+\w+\s*=/i,                    // Const declarations
      /\blet\s+\w+\s*=/i,                      // Let declarations
      /\bvar\s+\w+\s*=/i,                      // Var declarations
      /\bnew\s+\w+\(/i,                        // Object instantiation
      /\b(if|for|while|switch)\s*\(/i,         // Control structures
      /\b(return|break|continue)\b/i,           // Flow control
      /\b\w+\s*\.\s*\w+/i,                     // Object property access
      /\bdocument\s*\.\s*\w+/i,                // DOM manipulation
      /\bconsole\s*\.\s*log\(/i,               // Console logging
    ];
    
    // Count how many JavaScript patterns match
    const matchCount = jsPatterns.reduce((count, pattern) => 
      count + (pattern.test(content) ? 1 : 0), 0);
    
    // If at least 3 patterns match, consider it JavaScript
    return matchCount >= 3;
  }
  
  /**
   * Count JavaScript-specific patterns
   */
  countSpecificPatterns(content: string): number {
    const specificPatterns = [
      /\bimport\s+.*\s+from\s+['"]/i,          // Import statements
      /\bexport\s+(default\s+)?\w+/i,          // Export statements
      /\basync\s+function/i,                   // Async functions
      /\bawait\s+\w+/i,                        // Await expressions
      /=>\s*{/i,                               // Arrow functions
      /\bclass\s+\w+(\s+extends\s+\w+)?\s*\{/i // Class declarations
    ];
    
    return specificPatterns.reduce((count, pattern) => 
      count + (pattern.test(content) ? 1 : 0), 0);
  }

  /**
   * Register JavaScript language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Configure JavaScript formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('javascript', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        
        // Basic JavaScript formatting
        let formattedJs = content;
        
        // Format with proper indentation
        const indentSize = 2;
        let indentLevel = 0;
        let inString = false;
        let stringChar = '';
        
        const lines = formattedJs.split('\n');
        
        formattedJs = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) return '';
          
          // Count opening and closing braces in this line
          let openBraces = 0;
          let closeBraces = 0;
          
          // Process each character to track string context and braces
          for (let i = 0; i < trimmedLine.length; i++) {
            const char = trimmedLine[i];
            const prevChar = i > 0 ? trimmedLine[i - 1] : '';
            
            // Handle string context
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
              if (!inString) {
                inString = true;
                stringChar = char;
              } else if (char === stringChar) {
                inString = false;
              }
            }
            
            // Only count braces outside of strings
            if (!inString) {
              if (char === '{' || char === '(' || char === '[') {
                openBraces++;
              } else if (char === '}' || char === ')' || char === ']') {
                closeBraces++;
              }
            }
          }
          
          // Adjust indent level based on closing braces at the start of the line
          if (trimmedLine.match(/^[})\]]/)) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          
          // Apply current indentation
          const formattedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;
          
          // Adjust indent level for the next line based on opening/closing braces
          indentLevel += openBraces - closeBraces;
          indentLevel = Math.max(0, indentLevel);
          
          return formattedLine;
        }).join('\n');
        
        return [{
          range: model.getFullModelRange(),
          text: formattedJs
        }];
      }
    });
  }
}

/**
 * TypeScript language detector
 */
export class TypeScriptLanguageDetector extends BaseLanguageDetector {
  id = 'typescript';
  name = 'TypeScript';
  extensions = ['ts', 'tsx'];
  priority = 5;
  
  /**
   * Check if content matches TypeScript patterns
   */
  isMatch(content: string): boolean {
    // First check if it matches JavaScript patterns
    const jsDetector = new JavaScriptLanguageDetector();
    if (!jsDetector.isMatch(content)) {
      return false;
    }
    
    // Normalize content for better detection
    const normalizedContent = content.trim();
    
    // Check for TypeScript-specific patterns
    const tsPatterns = [
      /:\s*(string|number|boolean|any|void|never|unknown)\b/i,  // Type annotations
      /\binterface\s+\w+\s*\{/i,                               // Interface declarations
      /\btype\s+\w+\s*=/i,                                     // Type aliases
      /\benum\s+\w+\s*\{/i,                                    // Enum declarations
      /<\w+(\[\])?(,\s*\w+(\[\])?)*>/i,                        // Generic types
      /\bimport\s+\{\s*.*\s*\}\s+from/i,                       // TypeScript imports
      /\bnamespace\s+\w+\s*\{/i,                               // Namespaces
      /\bprivate\s+\w+/i,                                      // Access modifiers
      /\bprotected\s+\w+/i,
      /\bpublic\s+\w+/i,
      /\breadonly\s+\w+/i,                                     // Readonly modifier
      /\bimplements\s+\w+/i,                                   // Class implements
      /\bdeclare\s+/i                                          // Declarations
    ];
    
    // Count how many TypeScript patterns match
    const matchCount = tsPatterns.reduce((count, pattern) => 
      count + (pattern.test(normalizedContent) ? 1 : 0), 0);
    
    // If at least 2 TypeScript-specific patterns match, consider it TypeScript
    return matchCount >= 2;
  }
  
  /**
   * Register TypeScript language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Configure TypeScript formatting provider - reuse JavaScript formatter
    monaco.languages.registerDocumentFormattingEditProvider('typescript', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        
        // Basic TypeScript formatting (same as JavaScript)
        let formattedTs = content;
        
        // Format with proper indentation
        const indentSize = 2;
        let indentLevel = 0;
        let inString = false;
        let stringChar = '';
        
        const lines = formattedTs.split('\n');
        
        formattedTs = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) return '';
          
          // Count opening and closing braces in this line
          let openBraces = 0;
          let closeBraces = 0;
          
          // Process each character to track string context and braces
          for (let i = 0; i < trimmedLine.length; i++) {
            const char = trimmedLine[i];
            const prevChar = i > 0 ? trimmedLine[i - 1] : '';
            
            // Handle string context
            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
              if (!inString) {
                inString = true;
                stringChar = char;
              } else if (char === stringChar) {
                inString = false;
              }
            }
            
            // Only count braces outside of strings
            if (!inString) {
              if (char === '{' || char === '(' || char === '[') {
                openBraces++;
              } else if (char === '}' || char === ')' || char === ']') {
                closeBraces++;
              }
            }
          }
          
          // Adjust indent level based on closing braces at the start of the line
          if (trimmedLine.match(/^[})\]]/)) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          
          // Apply current indentation
          const formattedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine;
          
          // Adjust indent level for the next line based on opening/closing braces
          indentLevel += openBraces - closeBraces;
          indentLevel = Math.max(0, indentLevel);
          
          return formattedLine;
        }).join('\n');
        
        return [{
          range: model.getFullModelRange(),
          text: formattedTs
        }];
      }
    });
  }
}

// Create and register the detectors
const jsDetector = new JavaScriptLanguageDetector();
const tsDetector = new TypeScriptLanguageDetector();
languageRegistry.register(jsDetector);
languageRegistry.register(tsDetector);

// Export for backward compatibility
export const registerJavaScriptProvider = (monaco: any) => {
  jsDetector.registerProvider(monaco);
};

export const registerTypeScriptProvider = (monaco: any) => {
  tsDetector.registerProvider(monaco);
};