import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * cURL language detector
 */
export class CurlLanguageDetector extends BaseLanguageDetector {
    id = 'curl';
    name = 'cURL';
    extensions = ['curl'];
    priority = 4;

    /**
     * Get sample content for cURL
     */
    sampleContent(): string {
        return `# Basic GET request
curl https://api.example.com/users

# POST request with JSON data
curl -X POST https://api.example.com/users \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer token123" \\
  -d '{ "name": "John Doe", "email": "john@example.com", "role": "admin" }'

# File upload with form data
curl -X POST https://api.example.com/upload \\
  -H "Authorization: Bearer token123" \\
  -F "file=@/path/to/file.pdf" \\
  -F "description=Project documentation"

# Download file with progress bar
curl -# -O https://example.com/large-file.zip

# Follow redirects and show headers
curl -IL https://example.com

# Custom request with query parameters
curl -X GET "https://api.example.com/search?q=test&page=1" \\
  -H "Accept: application/json" \\
  --compressed

# Multiple form fields
curl -X POST https://api.example.com/form \\
  -F "username=johndoe" \\
  -F "password=secret123" \\
  -F "profile_image=@photo.jpg" \\
  -F "bio=Full stack developer"

# PUT request with custom headers
curl -X PUT https://api.example.com/users/123 \\
  -H "Content-Type: application/json" \\
  -H "X-API-Version: 2.0" \\
  -d '{ "status": "active", "preferences": { "theme": "dark", "notifications": true } }'`;
    }

    /**
     * Check if content matches cURL patterns
     */
    isMatch(content: string): boolean {
        // Skip if content is too short
        if (content.trim().length < 4) return false;

        const curlPatterns = [
            /^curl\s+/im,                           // Basic curl command
            /-X\s+(GET|POST|PUT|DELETE|PATCH)/i,    // HTTP methods
            /-H\s+["'][\w-]+:\s*[^"']+["']/,       // Headers
            /-d\s+['"].*["']/,                      // Data payload
            /-F\s+["'][\w-]+=.*["']/,              // Form data
            /--data(-raw|-urlencode|-binary)?/,     // Data flags
            /-[IL#]/,                               // Common flags
            /\\$/m,                                 // Line continuation
        ];

        // Count how many cURL patterns match
        const matchCount = curlPatterns.reduce((count, pattern) =>
            count + (pattern.test(content) ? 1 : 0), 0);

        // If at least 2 patterns match, consider it cURL
        return matchCount >= 2;
    }

    /**
     * Count cURL-specific patterns
     */
    countSpecificPatterns(content: string): number {
        const specificPatterns = [
            /^curl\s+/im,                           // Basic curl command
            /-X\s+(GET|POST|PUT|DELETE|PATCH)/i,    // HTTP methods
            /-H\s+["'][\w-]+:\s*[^"']+["']/,       // Headers
            /-d\s+['"].*["']/,                      // Data payload
            /-F\s+["'][\w-]+=.*["']/,              // Form data
        ];

        return specificPatterns.reduce((count, pattern) =>
            count + (pattern.test(content) ? 1 : 0), 0);
    }

    /**
     * Register cURL language provider with Monaco
     */
    registerProvider(monaco: any): void {
        // Register cURL language if not already registered
        if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'curl')) {
            monaco.languages.register({ id: 'curl' });

            // Define cURL syntax highlighting
            monaco.languages.setMonarchTokensProvider('curl', {
                tokenizer: {
                    root: [
                        // Comments
                        [/#.*$/, 'comment'],

                        // curl command
                        [/^curl\b/, 'keyword'],

                        // HTTP methods
                        [/-X\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/, ['keyword', 'string']],

                        // Common flags
                        [/\s-[a-zA-Z#](?=\s|$)/, 'keyword'],
                        [/\s--[a-zA-Z-]+(?=\s|$)/, 'keyword'],

                        // Headers
                        [/(-H\s+)(['"])([\w-]+)(:)/, ['keyword', 'string', 'type', 'delimiter']],
                        [/(['"])[^'"]+(['"])/, 'string'],

                        // URLs
                        [/https?:\/\/[^\s'"]+/, 'string.link'],

                        // JSON in data payloads
                        [/({)/, { token: 'delimiter.curly', next: '@json' }],
                        [/(})/, { token: 'delimiter.curly', next: '@pop' }],

                        // Line continuation
                        [/\\$/, 'keyword'],

                        // Form data
                        [/(-F\s+)(['"])([\w-]+)(=)/, ['keyword', 'string', 'type', 'delimiter']],

                        // Other strings
                        [/["'][^"']*["']/, 'string'],
                    ],

                    json: [
                        // JSON string
                        [/"[^"]*"/, 'string'],
                        // JSON number
                        [/\d+/, 'number'],
                        // JSON boolean and null
                        [/\b(true|false|null)\b/, 'keyword'],
                        // JSON object key
                        [/("[^"]*")\s*:/, 'type'],
                        // JSON punctuation
                        [/[,{}[\]]/, 'delimiter'],
                        // Whitespace
                        [/\s+/, 'white'],
                    ],
                }
            });

            // Define cURL theme
            monaco.editor.defineTheme('curl-theme', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'keyword', foreground: '569cd6' },     // Commands and flags
                    { token: 'type', foreground: '4ec9b0' },        // Header names
                    { token: 'string', foreground: 'ce9178' },      // Strings and URLs
                    { token: 'string.link', foreground: '9cdcfe' }, // URLs
                    { token: 'comment', foreground: '6a9955' },     // Comments
                    { token: 'delimiter', foreground: '808080' },   // Punctuation
                    { token: 'number', foreground: 'b5cea8' },      // Numbers in JSON
                ],
                colors: {
                    'editor.foreground': '#d4d4d4',
                    'editor.background': '#1e1e1e',
                }
            });
        }

        // Configure cURL formatting provider
        monaco.languages.registerDocumentFormattingEditProvider('curl', {
            provideDocumentFormattingEdits(model: any) {
                const content = model.getValue();
                const lines = content.split('\n');

                const formattedLines = lines.map((line: string) => {
                    const trimmedLine = line.trim();

                    // Skip empty lines and comments
                    if (!trimmedLine || trimmedLine.startsWith('#')) {
                        return trimmedLine;
                    }

                    // If line starts with curl, it's a new command
                    if (trimmedLine.startsWith('curl')) {
                        return trimmedLine;
                    }

                    // If line starts with a flag (-X, -H, etc.) or has a line continuation,
                    // indent it with 2 spaces
                    if (trimmedLine.startsWith('-') || trimmedLine.endsWith('\\')) {
                        return '  ' + trimmedLine;
                    }

                    // For JSON data, add appropriate indentation
                    if (trimmedLine.startsWith('{') || trimmedLine.startsWith('}')) {
                        return '  ' + trimmedLine;
                    }

                    return trimmedLine;
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
const curlDetector = new CurlLanguageDetector();
languageRegistry.register(curlDetector);

// Export for backward compatibility
export const registerCurlProvider = (monaco: any) => {
    curlDetector.registerProvider(monaco);
};