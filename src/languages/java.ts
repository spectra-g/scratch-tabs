import { DetectionResult } from './types';
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
     * Get sample content for Java
     */
    sampleContent(): string {
        return `public class HelloWorld {
    // Instance variables
    private String message;
    
    // Constructor
    public HelloWorld(String message) {
        this.message = message;
    }
    
    // Main method
    public static void main(String[] args) {
        HelloWorld hello = new HelloWorld("Hello, World!");
        hello.printMessage();
        
        // Example of different data types
        int number = 42;
        double pi = 3.14159;
        boolean isJava = true;
        
        // Array example
        String[] colors = {"Red", "Green", "Blue"};
        
        // For loop example
        for (String color : colors) {
            System.out.println("Color: " + color);
        }
        
        // If statement example
        if (isJava) {
            System.out.println("Number: " + number);
            System.out.println("Pi: " + pi);
        }
    }
    
    // Instance method
    public void printMessage() {
        System.out.println(message);
    }
}`;
    }

    /**
     * Check if content matches Java patterns
     */
    detect(content: string): DetectionResult {
        if (!content || content.trim().length < 5) {
            return this.noMatch();
        }
        // Exclude non-Java code: require at least one semicolon or brace
        if (!/[;{}]/.test(content)) {
            return this.noMatch();
        }
    
        // Anti-patterns for JavaScript/TypeScript (strong signals it's NOT Java)
        const jsAntiPatterns = [
            /\bimport\s+[\w{}*\s,]+from\s*['"]/i, // ES6 import
            /\bexport\s+(default\s+)?(async\s+)?(function|class|const|let|var)\b/i, // ES6 export
            /=>\s*[{]/i, // Arrow function with block
            /=>\s*[^({]/i, // Arrow function with implicit return
            /\b(const|let)\s+\w+\s*=/i, // const/let
            /`.*?\$\{.*?\}.*?`/s, // Template literals
        ];
        if (jsAntiPatterns.some(pattern => pattern.test(content))) {
          // If strong JS syntax is found, significantly reduce confidence or bail
          return this.noMatch();
        }
    
        let confidenceScore = 0.0;
        let definitiveMatch = false;
    
        const definitivePatterns = [
          { pattern: /\bpublic\s+class\s+\w+/i, weight: 0.4 },
          { pattern: /\bpackage\s+[\w.]+;/i, weight: 0.35 },
          { pattern: /\bimport\s+[\w.*]+;/i, weight: 0.3 }, // Java-style imports
          { pattern: /\bpublic\s+static\s+void\s+main\s*\(String(?:\[\]|\s*\.\.\.)\s+\w+\)/i, weight: 0.5 },
          { pattern: /\b@Override\b/i, weight: 0.25 },
          { pattern: /\bSystem\.out\.print(ln)?\(/i, weight: 0.2 }, // Can be in JS comments, so slightly lower
          { pattern: /\b(?:extends|implements)\s+\w+/i, weight: 0.2 },
          { pattern: /\bthrows\s+\w+Exception/i, weight: 0.2 },
          { pattern: /\binterface\s+\w+/i, weight: 0.3 }
        ];
    
        for (const dp of definitivePatterns) {
          if (dp.pattern.test(content)) {
            confidenceScore += dp.weight;
            definitiveMatch = true;
          }
        }
        
        // If a very strong definitive pattern matched, we can boost confidence
        if (definitiveMatch && confidenceScore > 0.4) {
            return { match: true, confidence: Math.min(1.0, 0.6 + confidenceScore * 0.5) };
        }
    
    
        // Common Java patterns
        const commonPatterns = [
          { pattern: /\b(public|private|protected)\s+(static\s+)?(final\s+)?\w+\s+\w+\s*\(.*\)\s*\{/i, weight: 0.15 }, // Method signature
          { pattern: /\b(int|boolean|String|void|double|float|long|char|byte)\s+\w+(\s*\[\])?\s*;/i, weight: 0.15 }, // Variable declaration with types
          { pattern: /\bnew\s+\w+\s*\([^)]*\)/i, weight: 0.1 },
          { pattern: /\btry\s*\{[\s\S]*\}\s*catch\s*\((\w+Exception|\w+)\s+\w+\)/i, weight: 0.15 }, // Try-catch
          { pattern: /\bfor\s*\(\s*(int|String)\s+\w+\s*:\s*\w+\s*\)/i, weight: 0.1 }, // Enhanced for loop
          { pattern: /\b(ArrayList|HashMap|List|Map|Set)<\w*>/i, weight: 0.2 }, // Generic collections
          { pattern: /\bthis\.\w+/i, weight: 0.05 },
          { pattern: /\b(final|static)\s+\w+/i, weight: 0.05 },
        ];
    
        let commonMatches = 0;
        for (const cp of commonPatterns) {
          if (cp.pattern.test(content)) {
            confidenceScore += cp.weight;
            commonMatches++;
          }
        }
    
        if (commonMatches > 0) {
          // If we had some definitive matches, add to that, otherwise base on common
          const base = definitiveMatch ? (0.4 + confidenceScore) : (0.1 + confidenceScore);
          return { match: true, confidence: Math.min(0.9, Math.max(0, base)) };
        }
        
        // If only one definitive pattern matched with low base score (e.g. only System.out.println)
        if (definitiveMatch && confidenceScore <= 0.4) {
            return { match: true, confidence: Math.min(0.5, confidenceScore) };
        }
    
        return this.noMatch();
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