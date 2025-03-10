import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Java language detector
 */
export class JavaLanguageDetector extends BaseLanguageDetector {
    id = 'java';
    name = 'Java';
    extensions = ['java'];
    priority = 7; // Higher priority than JavaScript to handle ambiguous cases

    /**
     * Check if content matches Java patterns
     */
    isMatch(content: string): boolean {
        // Skip if content is too short
        if (content.trim().length < 10) return false;

        // First check for definitive Java patterns
        const definitivePatterns = [
            /\bpublic\s+class\s+\w+/i,                    // Public class declaration
            /\bprivate\s+static\s+final\s+\w+/i,          // Private static final fields
            /\bpackage\s+[\w.]+;/i,                       // Package declaration
            /\bimport\s+[\w.]+;/i,                        // Java-style imports
            /\bpublic\s+static\s+void\s+main\s*\(/i,      // Main method
            /\b@Override\b/i,                             // Override annotation
            /\bSystem\.out\.println\(/i,                  // System.out.println
            /\bextends\s+\w+(\s+implements\s+\w+)?/i,     // Class inheritance
            /\bthrows\s+\w+Exception/i,                   // Exception handling
            /\binterface\s+\w+/i                          // Interface declaration
        ];

        // If any definitive pattern matches, it's definitely Java
        if (definitivePatterns.some(pattern => pattern.test(content))) {
            return true;
        }

        // Check for common Java patterns
        const javaPatterns = [
            /\b(public|private|protected)\s+\w+/i,         // Access modifiers
            /\b(int|boolean|String|void)\s+\w+\s*\(/i,     // Method declarations
            /\bnew\s+\w+\s*\([^)]*\)/i,                   // Object instantiation
            /\btry\s*\{[\s\S]*\}\s*catch\s*\(/i,          // Try-catch blocks
            /\bfor\s*\(\s*int\s+\w+/i,                    // For loops with int
            /\bArrayList<\w+>/i,                          // Generic collections
            /\bthis\.\w+/i,                               // This keyword usage
            /\bsuper\.\w+/i,                              // Super keyword usage
            /\bfinal\s+\w+/i,                             // Final keyword
            /\bstatic\s+\w+/i                             // Static keyword
        ];

        // Count how many Java patterns match
        const matchCount = javaPatterns.reduce((count, pattern) =>
            count + (pattern.test(content) ? 1 : 0), 0);

        // If at least 3 patterns match, consider it Java
        return matchCount >= 3;
    }

    /**
     * Count Java-specific patterns for ambiguity resolution
     */
    countSpecificPatterns(content: string): number {
        const specificPatterns = [
            /\bpublic\s+class\s+\w+/i,                    // Public class declaration
            /\bpackage\s+[\w.]+;/i,                       // Package declaration
            /\bimport\s+[\w.]+;/i,                        // Java-style imports
            /\bpublic\s+static\s+void\s+main\s*\(/i,      // Main method
            /\b@Override\b/i,                             // Override annotation
            /\bSystem\.out\.println\(/i,                  // System.out.println
            /\bthrows\s+\w+Exception/i,                   // Exception handling
            /\bArrayList<\w+>/i,                          // Generic collections
            /\bString\[\]\s+args/i                        // Command line arguments
        ];

        return specificPatterns.reduce((count, pattern) =>
            count + (pattern.test(content) ? 1 : 0), 0);
    }

    /**
     * Register Java language provider with Monaco
     */
    registerProvider(monaco: any): void {
        // Configure Java formatting provider
        monaco.languages.registerDocumentFormattingEditProvider('java', {
            provideDocumentFormattingEdits(model: any) {
                const content = model.getValue();

                // Basic Java formatting
                let formattedJava = content;

                // Format with proper indentation
                const indentSize = 4; // Java typically uses 4 spaces
                let indentLevel = 0;
                let inComment = false;
                let inString = false;

                const lines = formattedJava.split('\n');

                formattedJava = lines.map((line: string) => {
                    const trimmedLine = line.trim();

                    // Skip empty lines
                    if (!trimmedLine) return '';

                    // Handle multi-line comments
                    if (trimmedLine.startsWith('/*')) {
                        inComment = true;
                    }
                    if (trimmedLine.endsWith('*/')) {
                        inComment = false;
                    }

                    // Don't modify indentation in comments
                    if (inComment) {
                        return line;
                    }

                    // Count opening and closing braces
                    let openBraces = 0;
                    let closeBraces = 0;

                    // Process each character
                    for (let i = 0; i < trimmedLine.length; i++) {
                        const char = trimmedLine[i];
                        const prevChar = i > 0 ? trimmedLine[i - 1] : '';

                        // Handle string context
                        if (char === '"' && prevChar !== '\\') {
                            inString = !inString;
                            continue;
                        }

                        if (!inString) {
                            if (char === '{') openBraces++;
                            if (char === '}') closeBraces++;
                        }
                    }

                    // Adjust indent level for lines starting with closing brace
                    if (trimmedLine.startsWith('}')) {
                        indentLevel = Math.max(0, indentLevel - 1);
                    }

                    // Apply indentation
                    const indent = ' '.repeat(indentLevel * indentSize);
                    const formattedLine = indent + trimmedLine;

                    // Adjust indent level for next line
                    indentLevel += openBraces - closeBraces;
                    indentLevel = Math.max(0, indentLevel);

                    return formattedLine;
                }).join('\n');

                return [{
                    range: model.getFullModelRange(),
                    text: formattedJava
                }];
            }
        });
    }
}

// Create and register the detector
const javaDetector = new JavaLanguageDetector();
languageRegistry.register(javaDetector);

// Export for backward compatibility
export const registerJavaProvider = (monaco: any) => {
    javaDetector.registerProvider(monaco);
};