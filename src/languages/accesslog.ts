import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * Access Log language detector
 * Handles various web server access log formats including Apache, Nginx, IIS, etc.
 */
export class AccessLogLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'accesslog';
  name = 'Access Log';
  extensions = ['log', 'access', 'access.log', 'error.log'];
  priority = 5; // Moderate priority, specific to access log patterns

  sampleContent(): string {
    const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
    const samples = [
      // Apache Common Log Format
      `192.168.1.100 - - [${new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).replace(/,/g, '')}:${new Date().toLocaleTimeString('en-US', { 
        hour12: false 
      })} +0000] "GET /index.html HTTP/1.1" 200 1234`,
      
      // Apache Combined Log Format
      `10.0.0.1 - admin [${new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).replace(/,/g, '')}:${new Date().toLocaleTimeString('en-US', { 
        hour12: false 
      })} +0000] "POST /api/users HTTP/1.1" 201 456 "https://example.com/signup" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`,
      
      // Nginx format
      `203.0.113.195 - - [${new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).replace(/,/g, '')}:${new Date().toLocaleTimeString('en-US', { 
        hour12: false 
      })} +0000] "GET /assets/styles.css HTTP/1.1" 200 8842 "https://www.example.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"`,
      
      // Error log entry
      `[${timestamp}] [error] [client 192.168.1.50] File does not exist: /var/www/favicon.ico`,
      
      // Another access log entry
      `127.0.0.1 - - [${new Date().toLocaleDateString('en-US', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).replace(/,/g, '')}:${new Date().toLocaleTimeString('en-US', { 
        hour12: false 
      })} +0000] "PUT /api/data/123 HTTP/1.1" 404 0 "-" "curl/7.68.0"`
    ];

    return samples.join('\n');
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 20) {
      return this.noMatch();
    }

    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length === 0) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let accessLogPatterns = 0;
    let totalLines = Math.min(lines.length, 20); // Check first 20 lines max
    
    // Common access log patterns
    const logPatterns = [
      // IP address at start of line
      { pattern: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, weight: 0.3 },
      
      // Timestamp in square brackets
      { pattern: /\[\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\]/, weight: 0.4 },
      
      // HTTP method in quotes
      { pattern: /"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s+/, weight: 0.35 },
      
      // HTTP status codes
      { pattern: /\s(1\d{2}|2\d{2}|3\d{2}|4\d{2}|5\d{2})\s/, weight: 0.25 },
      
      // HTTP version
      { pattern: /HTTP\/[12]\.[01]"/, weight: 0.2 },
      
      // Response size (numbers at end or specific positions)
      { pattern: /\s\d+\s*(?:"[^"]*")?(?:\s+"[^"]*")?$/, weight: 0.15 },
      
      // User agent strings
      { pattern: /"Mozilla\/|"curl\/|"wget\/|"Python-|"Java\//, weight: 0.2 },
      
      // Referrer URLs
      { pattern: /"https?:\/\/[^"]*"/, weight: 0.1 },
      
      // Common log separators
      { pattern: /\s-\s/, weight: 0.1 },
      
      // Error log patterns
      { pattern: /\[(error|warn|info|debug|crit|alert|emerg)\]/, weight: 0.3 },
      
      // Client IP in error logs
      { pattern: /\[client\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, weight: 0.25 }
    ];

    for (const line of lines.slice(0, totalLines)) {
      const trimmedLine = line.trim();
      let lineScore = 0;
      let linePatterns = 0;
      
      for (const logPattern of logPatterns) {
        if (logPattern.pattern.test(trimmedLine)) {
          lineScore += logPattern.weight;
          linePatterns++;
        }
      }
      
      // Boost confidence if multiple patterns match on same line
      if (linePatterns >= 2) {
        lineScore *= 1.2;
        accessLogPatterns++;
      }
      
      confidenceScore += lineScore;
    }

    // Normalize confidence score
    confidenceScore = confidenceScore / totalLines;
    
    // Anti-patterns: reduce confidence for certain content types
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      confidenceScore -= 0.5; // HTML content
    }
    
    if (content.includes('function ') || content.includes('const ') || content.includes('let ')) {
      confidenceScore -= 0.3; // JavaScript content
    }
    
    if (content.includes('{"') && content.includes('":')) {
      confidenceScore -= 0.2; // JSON-like content
    }

    // Check for structured log format indicators
    const hasStructuredLogs = lines.some(line => 
      /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}.*\[.*\].*"[A-Z]+\s+.*HTTP\//.test(line)
    );
    
    if (hasStructuredLogs) {
      confidenceScore += 0.2;
    }

    // Check for error log format
    const hasErrorLogs = lines.some(line => 
      /\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\].*\[(error|warn|info|debug)\]/.test(line)
    );
    
    if (hasErrorLogs) {
      confidenceScore += 0.15;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine if it's a match
    const isMatch = confidenceScore >= 0.4 || (accessLogPatterns >= 2 && confidenceScore >= 0.3);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && confidenceScore >= 0.7 && accessLogPatterns >= 3
    };
  }

  getFileExtension(): string {
    return 'log';
  }

  registerProvider(monaco: any): void {
    // Register Access Log as a custom language
    monaco.languages.register({ id: 'accesslog' });
    
    // Set language configuration
    monaco.languages.setLanguageConfiguration('accesslog', {
      brackets: [
        ['[', ']'],
        ['"', '"']
      ],
      autoClosingPairs: [
        { open: '[', close: ']' },
        { open: '"', close: '"' }
      ],
      surroundingPairs: [
        { open: '[', close: ']' },
        { open: '"', close: '"' }
      ]
    });

    // Set up Monarch tokenizer for Access Logs
    monaco.languages.setMonarchTokensProvider('accesslog', {
      defaultToken: '',
      tokenPostfix: '.accesslog',
      
      tokenizer: {
        root: [
          // IP addresses at the start of lines
          [/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, 'ip.accesslog'],
          
          // IP addresses elsewhere
          [/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, 'ip.accesslog'],
          
          // Timestamps in square brackets
          [/\[\d{2}\/\w{3}\/\d{4}:\d{2}:\d{2}:\d{2}\s+[+-]\d{4}\]/, 'timestamp.accesslog'],
          
          // Error log timestamps
          [/\[\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d{3})?\]/, 'timestamp.accesslog'],
          
          // HTTP methods
          [/"(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)/, 'method.accesslog'],
          
          // URLs/paths in quotes
          [/"[^"]*"/, 'path.accesslog'],
          
          // HTTP status codes
          [/\s([1-5]\d{2})\s/, 'status.accesslog'],
          
          // Response sizes (numbers)
          [/\s(\d+)\s/, 'size.accesslog'],
          
          // Log levels
          [/\[(error|warn|warning|info|debug|notice|crit|alert|emerg)\]/, 'level.accesslog'],
          
          // User identifiers
          [/\s-\s/, 'separator.accesslog'],
          
          // Referrer and User-Agent (quoted strings at end)
          [/"[^"]*"$/, 'useragent.accesslog'],
          
          // Generic quoted strings
          [/"[^"]*"/, 'string.accesslog'],
          
          // Numbers
          [/\d+/, 'number.accesslog'],
          
          // Whitespace
          [/\s+/, 'white']
        ]
      }
    });

    // Define color themes for access logs
    monaco.editor.defineTheme('accesslog-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'ip.accesslog', foreground: '4FC1FF', fontStyle: 'bold' },          // Bright cyan for IP addresses
        { token: 'timestamp.accesslog', foreground: 'DCDCAA' },                     // Yellow for timestamps
        { token: 'method.accesslog', foreground: 'C586C0', fontStyle: 'bold' },     // Purple for HTTP methods
        { token: 'path.accesslog', foreground: '9CDCFE' },                          // Light blue for paths
        { token: 'status.accesslog', foreground: 'F44747', fontStyle: 'bold' },     // Red for status codes
        { token: 'size.accesslog', foreground: 'B5CEA8' },                          // Green for response sizes
        { token: 'level.accesslog', foreground: 'FF8C00', fontStyle: 'bold' },      // Orange for log levels
        { token: 'useragent.accesslog', foreground: '808080' },                     // Gray for user agents
        { token: 'string.accesslog', foreground: 'CE9178' },                        // Orange for generic strings
        { token: 'separator.accesslog', foreground: '6A9955' },                     // Green for separators
        { token: 'number.accesslog', foreground: 'B5CEA8' },                        // Green for numbers
      ],
      colors: {}
    });

    // Light theme variant
    monaco.editor.defineTheme('accesslog-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'ip.accesslog', foreground: '0066CC', fontStyle: 'bold' },          // Dark blue for IP addresses
        { token: 'timestamp.accesslog', foreground: '795E26' },                     // Brown for timestamps
        { token: 'method.accesslog', foreground: 'AF00DB', fontStyle: 'bold' },     // Purple for HTTP methods
        { token: 'path.accesslog', foreground: '001080' },                          // Dark blue for paths
        { token: 'status.accesslog', foreground: 'A31515', fontStyle: 'bold' },     // Dark red for status codes
        { token: 'size.accesslog', foreground: '098658' },                          // Dark green for response sizes
        { token: 'level.accesslog', foreground: 'D2691E', fontStyle: 'bold' },      // Dark orange for log levels
        { token: 'useragent.accesslog', foreground: '666666' },                     // Dark gray for user agents
        { token: 'string.accesslog', foreground: 'A31515' },                        // Dark red for generic strings
        { token: 'separator.accesslog', foreground: '008000' },                     // Green for separators
        { token: 'number.accesslog', foreground: '098658' },                        // Dark green for numbers
      ],
      colors: {}
    });

    // Provide formatting support for access logs
    monaco.languages.registerDocumentFormattingEditProvider('accesslog', {
      provideDocumentFormattingEdits: (model: any, _options: any, _token: any) => {
        const text = model.getValue();
        const lines = text.split('\n');
        const formattedLines: string[] = [];

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue; // Skip empty lines

          // Keep access log lines as-is (no reformatting needed)
          // Just clean up extra whitespace
          const cleanedLine = trimmedLine.replace(/\s+/g, ' ');
          formattedLines.push(cleanedLine);
        }

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }];
      }
    });

    // Provide completion items for common access log analysis
    monaco.languages.registerCompletionItemProvider('accesslog', {
      provideCompletionItems: (_model: any, _position: any) => {
        const currentDate = new Date().toLocaleDateString('en-US', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }).replace(/,/g, '');
        const currentTime = new Date().toLocaleTimeString('en-US', { 
          hour12: false 
        });
        const currentTimestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

        const suggestions = [
          {
            label: 'apache-common',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `\${1:127.0.0.1} - - [\${2:${currentDate}:\${3:${currentTime}} +0000] "\${4|GET,POST,PUT,DELETE|} \${5:/path} HTTP/1.1" \${6:200} \${7:1234}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Apache Common Log Format entry'
          },
          {
            label: 'apache-combined',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `\${1:127.0.0.1} - - [\${2:${currentDate}:\${3:${currentTime}} +0000] "\${4|GET,POST,PUT,DELETE|} \${5:/path} HTTP/1.1" \${6:200} \${7:1234} "\${8:referrer}" "\${9:user-agent}"`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Apache Combined Log Format entry'
          },
          {
            label: 'error-log',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `[\${1:${currentTimestamp}}] [\${2|error,warn,info,debug|}] [client \${3:127.0.0.1}] \${4:Error message}`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Error log entry template'
          }
        ];
        
        return { suggestions };
      }
    });
  }
}

// Create instance and register with the language registry
const accessLogDetector = new AccessLogLanguageDetector();
languageRegistry.register(accessLogDetector);

// Export for testing or manual registration
export const registerAccessLogProvider = (monaco: any) => {
  accessLogDetector.registerProvider(monaco);
}; 