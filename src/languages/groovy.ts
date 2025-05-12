import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Detector for Groovy language files
 */
export class GroovyDetector extends BaseLanguageDetector {
    id = 'groovy';
    name = 'Groovy';
    extensions = ['groovy', 'gvy', 'gy', 'gsh'];
    
    getFileExtension(): string {
        return 'groovy';
    }

    isMatch(content: string): boolean {
        return this.detect(content);
    }

    detect(content: string): boolean {
        // Skip empty content
        if (!content || content.trim().length === 0) {
            return false;
        }

        // Check for Groovy shebang - immediate match if found
        if (/^\s*#!.*?groovy\b/.test(content)) {
            return true;
        }

        const lines = content.split('\n');
        let matchScore = 0;

        // Check for common Groovy patterns
        const patterns = [
            /\bclass\s+\w+(\s+extends\s+\w+)?\s*\{/,      // Class definition
            /\bdef\s+\w+\s*=\s*/,                          // def variable assignment
            /\bdef\s+\w+\s*\([^)]*\)\s*\{/,                // def method definition
            /\@Grab\(.*\)/,                                 // Grape annotations
            /\bpackage\s+[\w.]+;?/,                         // package declaration
            /\bimport\s+[\w.]+;?/,                          // import statements
            /\$\{.*?\}/,                                    // String interpolation
            /['"].*?['"]\.each\s*\{/,                       // String.each method
            /\bfor\s*\(\s*\w+\s+in\s+.+?\)/,               // Groovy for loop
            /\s*<<\s*/,                                     // Left shift operator
            /\[\s*.*?\s*\]\s*\.collect\s*\{/,               // List.collect method
        ];

        // Check for specific keywords
        const keywords = [
            'groovy', 'def', 'as', 'trait', 'delegate', 'it', 'with', 'Closure'
        ];

        for (const line of lines) {
            for (const pattern of patterns) {
                if (pattern.test(line)) {
                    matchScore += 1;
                }
            }

            for (const keyword of keywords) {
                if (new RegExp(`\\b${keyword}\\b`).test(line)) {
                    matchScore += 0.5;
                }
            }
        }

        // If the file has a high score of Groovy patterns, it's likely Groovy
        return matchScore >= 2;
    }

    getInitialContent(): string {
        return `#!/usr/bin/env groovy

// Groovy script example
def greeting = "Hello, World!"
println greeting

// Define a class
class Example {
    String name
    
    void sayHello() {
        println "Hello, \${name}!"
    }
}

// Create an instance and use it
def example = new Example(name: "Groovy")
example.sayHello()
`;
    }
}

// Create and register an instance
const detector = new GroovyDetector();
languageRegistry.register(detector);

// Export the detector instance as default
export default detector; 