import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Bash/Shell language detector
 */
export class BashLanguageDetector extends BaseLanguageDetector {
  id = 'shell';
  name = 'Bash/Shell';
  extensions = ['sh', 'bash'];
  priority = 3;
  
  /**
   * Check if content matches Bash/Shell patterns
   */
  isMatch(content: string): boolean {
    // Check for shebang first
    if (content.trimStart().startsWith('#!')) {
      const firstLine = content.split('\n')[0].toLowerCase();
      if (firstLine.includes('bash') || firstLine.includes('/sh')) {
        return true;
      }
    }
    
    // Check for common shell patterns
    const shellPatterns = [
      /^#.*$/m,                                // Comments
      /\$\{.*?\}/m,                            // Variable substitution
      /export\s+[A-Za-z_][A-Za-z0-9_]*=/m,     // Export statements
      /if\s+\[\s+.*\s+\]\s*;?\s*then/m,        // If statements
      /for\s+.*\s+in\s+.*;\s*do/m,             // For loops
      /while\s+\[\s+.*\s+\]\s*;\s*do/m,        // While loops
      /case\s+.*\s+in/m,                       // Case statements
      /function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/m, // Function declarations
      /echo\s+/m,                              // Echo commands
      /\|\s*grep/m,                            // Pipe to grep
      /\|\s*awk/m,                             // Pipe to awk
      /\|\s*sed/m                              // Pipe to sed
    ];
    
    // Count how many shell patterns match
    const matchCount = shellPatterns.reduce((count, pattern) => 
      count + (pattern.test(content) ? 1 : 0), 0);
    
    // If at least 3 patterns match, consider it a shell script
    return matchCount >= 3;
  }
  
  /**
   * Register Bash/Shell language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Configure Shell formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('shell', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        
        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) return '';
          
          // Don't indent comments
          if (trimmedLine.startsWith('#')) {
            return trimmedLine;
          }
          
          // Indent lines inside blocks
          let indent = 0;
          
          // Determine indentation level based on line content
          if (line.match(/^\s*fi\s*$/) || 
              line.match(/^\s*done\s*$/) || 
              line.match(/^\s*esac\s*$/) || 
              line.match(/^\s*\}\s*$/)) {
            // These keywords end a block, so they should be outdented
            indent = Math.max(0, (line.match(/^\s+/) || [''])[0].length - 2);
          } else if (line.match(/^\s*else\s*$/) || 
                     line.match(/^\s*elif\s+/) || 
                     line.match(/^\s*then\s*$/)) {
            // These keywords continue a block at the same level
            indent = Math.max(0, (line.match(/^\s+/) || [''])[0].length);
          } else {
            // Use the existing indentation
            indent = (line.match(/^\s+/) || [''])[0].length;
          }
          
          return ' '.repeat(indent) + trimmedLine;
        });
        
        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }];
      }
    });
  }
}

// Create and register the detector
const bashDetector = new BashLanguageDetector();
languageRegistry.register(bashDetector);

// Export for backward compatibility
export const registerBashProvider = (monaco: any) => {
  bashDetector.registerProvider(monaco);
};