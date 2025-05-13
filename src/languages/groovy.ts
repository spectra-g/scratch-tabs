import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Detector for Groovy language files
 */
export class GroovyDetector extends BaseLanguageDetector {
    id = 'groovy';
    name = 'Groovy';
    extensions = ['groovy', 'gvy', 'gy', 'gsh'];
    priority = 10; // Increase priority to help win against JavaScript
    
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
        const nonCommentLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*');
        });
        // If no real content, not a match
        if (nonCommentLines.length === 0) {
            return false;
        }
        
        // Heuristic: Average characters per line
        // Natural language text tends to have longer lines than code
        const avgCharsPerLine = nonCommentLines.reduce((sum, l) => sum + l.length, 0) / nonCommentLines.length;
        if (avgCharsPerLine > 70) {
            return false; // Lines too long on average - likely prose, not code
        }
        
        // Define common Groovy patterns (moved from earlier in the file)
        const patterns = [
            { regex: /\bclass\s+\w+(\s+extends\s+\w+)?\s*\{/, weight: 1 },      // Class definition
            { regex: /\bdef\s+\w+\s*=\s*/, weight: 2 },                        // def variable assignment
            { regex: /\bdef\s+\w+\s*\([^)]*\)\s*\{/, weight: 2.5 },                // def method definition
            { regex: /\@Grab\(.*\)/, weight: 2 },                                // Grape annotations
            { regex: /\bpackage\s+[\w.]+;?/, weight: 0.5 },                      // package declaration
            { regex: /\bimport\s+[\w.]+;?/, weight: 0.5 },                       // import statements
            { regex: /\$\{.*?\}/, weight: 2.5 },                                   // String interpolation
            { regex: /"[^"]*\$\{.*?\}[^"]*"/, weight: 3 },                       // String interpolation in double quotes (very Groovy-specific)
            { regex: /['"].*?['"]\.each\s*\{/, weight: 1.5 },                    // String.each method
            { regex: /\bfor\s*\(\s*\w+\s+in\s+.+?\)/, weight: 1 },               // Groovy for loop
            { regex: /\s*<<\s*/, weight: 0.5 },                                  // Left shift operator
            { regex: /\[\s*.*?\s*\]\s*\.collect\s*\{/, weight: 1.5 },            // List.collect method
            { regex: /\?\.|(?<!\w)\*\.(?!\w)|\.\&/, weight: 2 },                 // Groovy-specific operators
            { regex: /\bprintln\s+[^(]/, weight: 3 },                            // println without parentheses (very Groovy-specific)
            { regex: /\bnew\s+\w+\(.*?:[^,}]+.*?\)/, weight: 2.5 }               // Named parameters in constructor (Groovy-specific)
        ];

        // Check for specific keywords
        const keywords = [
            'groovy', 'def', 'trait', 'delegate', 'Closure', 'println'
        ];
       
        const wordRegex = /\b\w+\b/g;
        let totalTokens = 0;
        let keywordTokens = 0;
        
        for (const line of nonCommentLines) {
            const tokens = line.match(wordRegex);
            if (!tokens) continue;
        
            totalTokens += tokens.length;
            for (const token of tokens) {
                if (keywords.includes(token)) {
                    keywordTokens++;
                }
            }
        }
        
        const keywordRatio = keywordTokens / (totalTokens || 1);  // Prevent divide by zero
        
        // If too few keywords overall, it's probably not Groovy
        if (keywordRatio < 0.08) {
            return false;
        }
        
        // Calculate weighted match score
        let matchScore = 0;
        let groovySpecificHits = 0;

        for (const line of lines) {
            for (const pattern of patterns) {
                if (pattern.regex.test(line)) {
                    matchScore += pattern.weight;
                    
                    // Count Groovy-specific patterns (those with weight ≥ 2.5)
                    if (pattern.weight >= 2.5) {
                        groovySpecificHits++;
                    }
                }
            }

            for (const keyword of keywords) {
                if (new RegExp(`\\b${keyword}\\b`).test(line)) {
                    matchScore += 0.5;
                }
            }
        }
        
        // Boost score based on keyword ratio - the higher the ratio, the more likely it's Groovy
        if (keywordRatio > 0.15) {
            matchScore += 2;
        } else if (keywordRatio > 0.1) {
            matchScore += 1;
        }
        
        // Additional check: If we have enough Groovy-specific hits, it's almost certainly Groovy
        if (groovySpecificHits >= 2) {
            matchScore += 3;
        }
        
        // If we see def, println, and string interpolation together, it's very likely Groovy
        const hasDefKeyword = content.match(/\bdef\b/) !== null;
        const hasPrintln = content.match(/\bprintln\b/) !== null;
        const hasStringInterpolation = content.match(/"\$\{/) !== null;
        
        if (hasDefKeyword && hasPrintln && hasStringInterpolation) {
            matchScore += 5; // Very strong boost for this combination
        } else if ((hasDefKeyword && hasPrintln) || (hasDefKeyword && hasStringInterpolation)) {
            matchScore += 3; // Strong boost for these combinations
        }

        // Require a higher threshold to reduce false positives
        return matchScore >= 3;
    }

    /**
     * Register Groovy language provider with Monaco
     */
    registerProvider(monaco: any): void {
        // Register Groovy language if not already registered
        if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'groovy')) {
            monaco.languages.register({ id: 'groovy' });

            // Define Groovy keywords
            const keywords = [
                'abstract', 'as', 'assert', 'boolean', 'break', 'byte',
                'case', 'catch', 'char', 'class', 'const', 'continue',
                'def', 'default', 'do', 'double', 'else', 'enum',
                'extends', 'false', 'final', 'finally', 'float', 'for',
                'goto', 'if', 'implements', 'import', 'in', 'instanceof',
                'int', 'interface', 'it', 'long', 'native', 'new',
                'null', 'package', 'private', 'protected', 'public', 'return',
                'short', 'static', 'strictfp', 'super', 'switch', 'synchronized',
                'this', 'threadsafe', 'throw', 'throws', 'trait', 'transient',
                'true', 'try', 'void', 'volatile', 'while'
            ];

            // Define Groovy built-in types
            const types = [
                'BigDecimal', 'BigInteger', 'Boolean', 'Byte', 'Character',
                'CharSequence', 'Class', 'Collection', 'Date', 'Double',
                'Enum', 'Float', 'Iterable', 'Integer', 'List',
                'Long', 'Map', 'Object', 'Set', 'Short',
                'String', 'StringBuffer', 'StringBuilder'
            ];

            // Define common annotations
            const annotations = [
                'Bindable', 'Delegate', 'Grab', 'GrabConfig', 'GrabExclude',
                'GrabResolver', 'Immutable', 'Lazy', 'Mixin', 'Newify',
                'Singleton', 'TypeChecked', 'CompileStatic'
            ];

            // Define Groovy syntax highlighting
            monaco.languages.setMonarchTokensProvider('groovy', {
                // Set defaultToken to invalid to see what you do not tokenize yet
                defaultToken: 'invalid',

                keywords: keywords,
                typeKeywords: types,
                annotations: annotations,

                operators: [
                    '=', '>', '<', '!', '~', '?', ':',
                    '==', '<=', '>=', '!=', '&&', '||', '++', '--',
                    '+', '-', '*', '/', '&', '|', '^', '%', '<<',
                    '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=',
                    '^=', '%=', '<<=', '>>=', '>>>='
                ],

                symbols: /[=><!~?:&|+\-*\/\^%]+/,

                // Groovy specific operators
                groovyOperators: ['?:', '?.',  '*.', '.&', '.@'],

                // Escapes
                escapes: /\\(?:[abfnrtv\\"'`]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

                // The main tokenizer
                tokenizer: {
                    root: [
                        // Identifiers and keywords
                        [/[a-zA-Z_$][\w$]*/, {
                            cases: {
                                '@keywords': 'keyword',
                                '@typeKeywords': 'type',
                                '@default': 'identifier'
                            }
                        }],

                        // Annotations (@ prefixed identifiers)
                        [/@\s*[a-zA-Z_$][\w$]*/, {
                            cases: {
                                '@annotations': 'annotation',
                                '@default': 'annotation'
                            }
                        }],

                        // Whitespace
                        { include: '@whitespace' },

                        // Delimiters and operators
                        [/[{}()\[\]]/, '@brackets'],
                        [/[<>](?!@symbols)/, '@brackets'],
                        [/@symbols/, {
                            cases: {
                                '@groovyOperators': 'operator.special',
                                '@operators': 'operator',
                                '@default': 'delimiter'
                            }
                        }],

                        // Numbers
                        [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
                        [/0[xX][0-9a-fA-F]+[lL]?/, 'number.hex'],
                        [/0[bB][01]+[lL]?/, 'number.binary'],
                        [/\d+[lL]?/, 'number'],

                        // Strings
                        [/'([^'\\]|\\.)*$/, 'string.invalid'], // Non-terminated string
                        [/'/, 'string', '@string_single'],
                        [/"/, 'string', '@string_double'],
                        [/'''/, 'string', '@string_triple_single'],
                        [/"""/, 'string', '@string_triple_double'],
                        [/\/\*\*(?!\/)/, 'comment.doc', '@groovydoc'],
                        [/\/\*/, 'comment', '@comment'],
                        [/\/\/.*$/, 'comment'],
                        [/\$\//, 'regexp', '@regexp']
                    ],

                    string_single: [
                        [/[^\\']+/, 'string'],
                        [/@escapes/, 'string.escape'],
                        [/\\./, 'string.escape.invalid'],
                        [/'/, 'string', '@pop']
                    ],

                    string_double: [
                        [/[^\\"$]+/, 'string'],
                        [/\$\{/, 'delimiter.bracket', '@stringExpression'],
                        [/\$[a-zA-Z_][\w$]*/, 'variable'],
                        [/@escapes/, 'string.escape'],
                        [/\\./, 'string.escape.invalid'],
                        [/"/, 'string', '@pop']
                    ],

                    string_triple_single: [
                        [/[^\\']+/, 'string'],
                        [/@escapes/, 'string.escape'],
                        [/\\./, 'string.escape.invalid'],
                        [/'''/, 'string', '@pop']
                    ],

                    string_triple_double: [
                        [/[^\\"$]+/, 'string'],
                        [/\$\{/, 'delimiter.bracket', '@stringExpression'],
                        [/\$[a-zA-Z_][\w$]*/, 'variable'],
                        [/@escapes/, 'string.escape'],
                        [/\\./, 'string.escape.invalid'],
                        [/"""/, 'string', '@pop']
                    ],

                    stringExpression: [
                        [/[{}]/, 'delimiter.bracket'],
                        [/[a-zA-Z_][\w$]*/, 'identifier'],
                        [/[.]+/, 'delimiter'],
                        [/->/, 'delimiter'],
                        { include: '@root' },
                        [/\}/, 'delimiter.bracket', '@pop']
                    ],

                    regexp: [
                        [/(\{)(\d+(?:,\d*)?)(\})/, ['regexp.escape.control', 'regexp.escape.control', 'regexp.escape.control']],
                        [/(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/, ['regexp.escape.control', { token: 'regexp.escape.control', next: '@regexrange' }]],
                        [/(\()(\?:|\?=|\?!)/, ['regexp.escape.control', 'regexp.escape.control']],
                        [/[()]/, 'regexp.escape.control'],
                        [/@escapes/, 'regexp.escape'],
                        [/\\\$/, 'regexp.escape'],
                        [/\$\/$/, 'regexp', '@pop'],
                        [/\$\\/, 'regexp.escape'],
                        [/(\.)(\*)(?!\?)/, ['regexp.escape.control', 'regexp.escape.control']],
                        [/(?:[^\\\/]|\\.)+\/[dgimsuy]*/, 'regexp', '@pop'],
                        [/\*\?|\+\?|\?\?/, 'regexp.escape.control'],
                        [/[\\$]/, 'regexp.escape'],
                        [/\/\*(?!\/)/, 'comment', '@comment'],
                        [/\/\/.*$/, 'comment'],
                        [/\//, 'regexp']
                    ],

                    regexrange: [
                        [/-/, 'regexp.escape.control'],
                        [/\^/, 'regexp.invalid'],
                        [/@escapes/, 'regexp.escape'],
                        [/[^\]]/, 'regexp'],
                        [/\]/, 'regexp.escape.control', '@pop']
                    ],

                    comment: [
                        [/[^/*]+/, 'comment'],
                        [/\*\//, 'comment', '@pop'],
                        [/[/*]/, 'comment']
                    ],

                    groovydoc: [
                        [/[^/*]+/, 'comment.doc'],
                        [/\*\//, 'comment.doc', '@pop'],
                        [/[/*]/, 'comment.doc']
                    ],

                    whitespace: [
                        [/[ \t\r\n]+/, 'white'],
                        [/\/\*\*(?!\/)/, 'comment.doc', '@groovydoc'],
                        [/\/\*/, 'comment', '@comment'],
                        [/\/\/.*$/, 'comment']
                    ]
                }
            });

            // Define Groovy theme
            monaco.editor.defineTheme('groovy-theme', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'keyword', foreground: '569cd6' },
                    { token: 'type', foreground: '4ec9b0' },
                    { token: 'identifier', foreground: '9cdcfe' },
                    { token: 'string', foreground: 'ce9178' },
                    { token: 'comment', foreground: '6a9955' },
                    { token: 'comment.doc', foreground: '6a9955' },
                    { token: 'number', foreground: 'b5cea8' },
                    { token: 'regexp', foreground: 'd16969' },
                    { token: 'annotation', foreground: 'cc9077' },
                    { token: 'operator', foreground: 'd4d4d4' },
                    { token: 'operator.special', foreground: 'dcdcaa' },
                    { token: 'delimiter', foreground: 'd4d4d4' },
                    { token: 'delimiter.bracket', foreground: '808080' },
                    { token: 'variable', foreground: '9cdcfe' }
                ],
                colors: {
                    'editor.background': '#1e1e1e',
                    'editor.foreground': '#d4d4d4'
                }
            });
        }
    }

    sampleContent(): string {
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