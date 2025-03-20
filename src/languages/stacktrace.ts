import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Stacktrace language detector
 */
export class StacktraceLanguageDetector extends BaseLanguageDetector {
    id = 'stacktrace';
    name = 'Stack Trace';
    extensions = ['stacktrace', 'stack'];
    priority = 4;

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
            // Error type and message pattern
            /^(?:(?:Uncaught\s+)?(?:Error|TypeError|ReferenceError|SyntaxError|RangeError):|Error:)/m,

            // Stack frame patterns
            /^\s+at\s+(?:\w+\s+)?\(?[^)]+\)$/m,
            /^\s+at\s+(?:\w+\.)*\w+\s+\(.*:\d+:\d+\)$/m,
            /^\s+at\s+(?:\w+\.)*\w+\s+\[.*\]$/m,

            // Async stack frame patterns
            /^\s+at\s+async\s+/m,

            // File path patterns in stack frames
            /\([^()]+:\d+:\d+\)/m,
            /\s+\(?(?:file|https?|webpack):\/\/[^)]+:\d+:\d+\)?/m,

            // Common stack frame components
            /\b(?:node_modules|src|dist|build)\b/m,
            /\b(?:index|bundle|main|app)\.[jt]sx?:/m
        ];

        // Count how many stacktrace patterns match
        const matchCount = stacktracePatterns.reduce((count, pattern) =>
            count + (pattern.test(content) ? 1 : 0), 0);

        // If at least 2 patterns match, consider it a stacktrace
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

                        // Stack frame components
                        [/^\s+at\s+/, 'keyword'],
                        [/\basync\b/, 'keyword'],
                        [/\b(?:node_modules|src|dist|build)\b/, 'string'],
                        [/\b\w+\.[jt]sx?\b/, 'string'],
                        [/\b(?:\w+\.)*\w+(?=\s*\()/, 'function'],
                        [/:\d+:\d+/, 'number'],
                        [/\([^)]+\)/, 'string'],

                        // File paths
                        [/(?:file|https?|webpack):\/\/[^)\s]+/, 'string'],

                        // Function names
                        [/\b(?:\w+\.)*\w+(?=\s+\()/, 'function'],
                        [/\b(?:\w+\.)*\w+(?=@)/, 'function'],

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
                    // First, replace '\n' escape sequences with actual new lines
                    // Replace all occurrences of ' at ' with a line break and ensure it correctly splits
                    const formattedTrace = stackTrace.replace(/ at /g, '\n at ');

                    // Now, split the string into an array of frames based on new lines
                    let stackFrames = formattedTrace.split('\n');

                    // Trim extra spaces from each line and filter out any empty lines
                    stackFrames = stackFrames.map(frame => frame.trim()).filter(frame => frame.length > 0);

                    // Format each frame with indentation (tab) for lines starting with 'at'
                    const indentedStackTrace = stackFrames.map((frame, index) => {
                        // For the first line (error message), don't add indentation
                        if (index === 0) {
                            return frame;
                        }
                        // For subsequent lines (frames), add a tab for indentation
                        return `\t${frame}`; // Adding a tab character (\t) for indentation
                    }).join('\n');

                    return indentedStackTrace;
                }

                return [{
                    range: model.getFullModelRange(),
                    text: formatStackTrace(content)
                }];
            }
        });
    }
}

// Create and register the detector
const stacktraceDetector = new StacktraceLanguageDetector();
languageRegistry.register(stacktraceDetector);

// Export for backward compatibility
export const registerStacktraceProvider = (monaco: any) => {
    stacktraceDetector.registerProvider(monaco);
};