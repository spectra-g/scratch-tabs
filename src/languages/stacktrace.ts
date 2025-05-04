import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Stacktrace language detector
 */
export class StacktraceLanguageDetector extends BaseLanguageDetector {
    id = 'stacktrace';
    name = 'Stack Trace';
    extensions = ['stacktrace', 'stack'];
    priority = 10;

    /**
     * Get sample content for stacktrace
     */
    sampleContent(): string {
        return `
Error: Cannot read properties of undefined (reading 'length')
    at processItems (/app/src/utils/dataProcessor.ts:42:23)
    at async Function.handleRequest (/app/src/controllers/itemController.ts:156:12)
    at async /app/src/middleware/errorHandler.ts:24:7
    at async /app/node_modules/express/lib/router/layer.js:95:5

TypeError: Cannot read property 'map' of null
    at UserComponent.render (UserComponent.tsx:28:31)
    at renderWithHooks (react-dom.development.js:16305:18)
    at updateFunctionComponent (react-dom.development.js:19588:20)
    at beginWork (react-dom.development.js:21601:16)
    at beginWork$1 (react-dom.development.js:27426:14)
    at performUnitOfWork (react-dom.development.js:26557:12)
    at workLoopSync (react-dom.development.js:26466:5)
    at renderRootSync (react-dom.development.js:26434:7)
    at performSyncWorkOnRoot (react-dom.development.js:26085:20)
    at scheduleUpdateOnFiber (react-dom.development.js:25321:7)

ReferenceError: fetch is not defined
    at Object.<anonymous> (/app/src/services/api.js:12:3)
    at Module._compile (internal/modules/cjs/loader.js:999:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1027:10)
    at Module.load (internal/modules/cjs/loader.js:863:32)
    at Function.Module._load (internal/modules/cjs/loader.js:708:14)
    at Module.require (internal/modules/cjs/loader.js:887:19)
    at require (internal/modules/cjs/helpers.js:74:18)
`;
    }

    /**
     * Check if content matches stacktrace patterns
     */
    isMatch(content: string): boolean {
        // Skip if content is too short
        if (content.trim().length < 10) return false;

        const stacktracePatterns = [
            // Error type and message pattern (can be at the start of a line)
            /(?:Uncaught\s+)?(?:Error|TypeError|ReferenceError|SyntaxError|RangeError):|Error:/,

            // Stack frame patterns (must be at the start of a line, potentially with leading whitespace)
            /\s+at\s+(?:\w+\s+)?\(?[^)]+\)?/, // e.g., " at Function.handleRequest (...)" or " at (...)"
            /\s+at\s+(?:\w+\.)*\w+\s+\(.*:\d+:\d+\)/, // e.g., " at Object.method (file:line:col)"
            /\s+at\s+(?:\w+\.)*\w+\s+\[.*\]/, // e.g., " at Object.method [as _method]"
            /\s+at\s+async\s+/, // e.g., " at async Function.handleRequest"

            // File path patterns in stack frames (can appear anywhere in a line)
            /\([^()]+:\d+:\d+\)/, // e.g., "(file:line:col)"
            /\s+\(?(?:file|https?|webpack):\/\/[^)]+:\d+:\d+\)?/, // e.g., "(webpack://...)"

            // Common stack frame components (can appear anywhere in a line)
            /\b(?:node_modules|src|dist|build)\b/,
            /\b(?:index|bundle|main|app)\.[jt]sx?:/,
            /\b\d+:\d+\b/ // Simple line:column number pattern
        ];

        // Split into non-empty lines
        const lines = content.split('\n').filter(line => line.trim().length > 0);
        if (lines.length === 1) {
            // Single non-empty line: relax matching, count how many patterns match this line
            const line = lines[0];
            const matchCount = stacktracePatterns.reduce((count, pattern) =>
                count + (pattern.test(line) ? 1 : 0), 0);
            return matchCount >= 2;
        }

        // Multi-line: use original logic (apply patterns to the whole content)
        const matchCount = stacktracePatterns.reduce((count, pattern) =>
            count + (pattern.test(content) ? 1 : 0), 0);
        return matchCount >= 2;
    }

    /**
     * Register stacktrace language provider with Monaco
     */
    registerProvider(monaco: any): void {
        // Register stacktrace language if not already registered
        if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'stacktrace')) {
            monaco.languages.register({ id: 'stacktrace' });

            // Define stacktrace syntax highlighting
            monaco.languages.setMonarchTokensProvider('stacktrace', {
                tokenizer: {
                    root: [
                        // Error type and message
                        [/^(?:Uncaught\s+)?(?:Error|TypeError|ReferenceError|SyntaxError|RangeError):/, 'error'],
                        [/^Error:.*$/, 'error'],

                        // Stack frame components (ensure these match the start of a line)
                        [/^\s*at\s+/, 'keyword'], // Added \s* to handle potential leading space variations
                        [/\basync\b/, 'keyword'],
                        [/\b(?:node_modules|src|dist|build)\b/, 'string'],
                        [/\b\w+\.[jt]sx?\b/, 'string'],
                        [/\b(?:\w+\.)*\w+(?=\s*\()/, 'function'],
                        [/:\d+:\d+/, 'number'],
                        [/\([^)]+\)/, 'string'],

                        // File paths
                        [/(?:file|https?|webpack):\/\/[^)\s]+/, 'string'],

                        // Function names (handle cases without file/line info)
                        [/\b(?:\w+\.)*\w+(?=\s+at\s)/, 'function'], // e.g., "at Function.handleRequest"
                        [/\b(?:\w+\.)*\w+(?=@)/, 'function'], // e.g., "at Object.method@"

                        // Line and column numbers
                        [/\b\d+\b/, 'number'],

                        // Special syntax
                        [/[[\]{}()]/, 'delimiter.bracket'],
                        [/\./, 'delimiter'],

                        // Everything else
                        [/[^]/, 'text']
                    ]
                }
            });

            // Define stacktrace theme
            monaco.editor.defineTheme('stacktrace-theme', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'error', foreground: 'ff4444', fontStyle: 'bold' },
                    { token: 'keyword', foreground: '569cd6' },
                    { token: 'function', foreground: 'dcdcaa' },
                    { token: 'string', foreground: 'ce9178' },
                    { token: 'number', foreground: 'b5cea8' },
                    { token: 'delimiter.bracket', foreground: '808080' },
                    { token: 'delimiter', foreground: '808080' },
                    { token: 'text', foreground: 'd4d4d4' }
                ],
                colors: {
                    'editor.background': '#1e1e1e',
                    'editor.foreground': '#d4d4d4'
                }
            });
        }

        // Configure stacktrace formatting provider
        monaco.languages.registerDocumentFormattingEditProvider('stacktrace', {
            provideDocumentFormattingEdits(model: any) {
                const content = model.getValue();

                const formatStackTrace = (stackTrace: string) => {
                    // If it's a single line (or all lines are very long), try to split at ' at '
                    const lines = stackTrace.split('\n');
                    let processedLines: string[] = [];
                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine) {
                            processedLines.push('');
                            continue;
                        }
                        // If the line contains multiple stack frames (single-line stacktrace), split at ' at '
                        if (/ at /.test(trimmedLine) && !/^\s*at\s+/.test(trimmedLine)) {
                            // Split at ' at ', but keep the first part as the error message
                            const parts = trimmedLine.split(/(?= at )/g);
                            if (parts.length > 1) {
                                processedLines.push(parts[0].trim());
                                for (let i = 1; i < parts.length; i++) {
                                    processedLines.push('\t' + parts[i].trim());
                                }
                                continue;
                            }
                        }
                        // If it starts with 'at', indent it
                        if (/^\s*at\s+/i.test(trimmedLine)) {
                            processedLines.push(`\t${trimmedLine}`);
                        } else {
                            processedLines.push(trimmedLine);
                        }
                    }
                    return processedLines.join('\n');
                }

                return [{
                    range: model.getFullModelRange(),
                    text: formatStackTrace(content)
                }];
            }
        });
    }

    countSpecificPatterns(content: string): number {
        // Use the same patterns as isMatch
        const stacktracePatterns = [
            /(?:Uncaught\s+)?(?:Error|TypeError|ReferenceError|SyntaxError|RangeError):|Error:/,
            /\s+at\s+(?:\w+\s+)?\(?[^)]+\)?/,
            /\s+at\s+(?:\w+\.)*\w+\s+\(.*:\d+:\d+\)/,
            /\s+at\s+(?:\w+\.)*\w+\s+\[.*\]/,
            /\s+at\s+async\s+/, 
            /\([^()]+:\d+:\d+\)/,
            /\s+\(?(?:file|https?|webpack):\/\/[^)]+:\d+:\d+\)?/,
            /\b(?:node_modules|src|dist|build)\b/,
            /\b(?:index|bundle|main|app)\.[jt]sx?:/,
            /\b\d+:\d+\b/
        ];
        // Count total matches across all lines
        let score = 0;
        for (const line of content.split('\n')) {
            for (const pattern of stacktracePatterns) {
                if (pattern.test(line)) score++;
            }
        }
        return score;
    }
}

// Create and register the detector
const stacktraceDetector = new StacktraceLanguageDetector();
languageRegistry.register(stacktraceDetector);

// Export for backward compatibility
export const registerStacktraceProvider = (monaco: any) => {
    stacktraceDetector.registerProvider(monaco);
};