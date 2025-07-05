import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * JSON Log (JSONL/NDJSON) language detector
 * Handles newline-delimited JSON where each line is a separate JSON object
 */
export class JsonLogLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'jsonlog';
  name = 'JSON Log';
  extensions = ['jsonl', 'ndjson', 'log'];
  priority = 6; // Higher than regular JSON for log-specific content

  sampleContent(): string {
    const timestamp = new Date().toISOString();
    const samples = [
      {
        timestamp,
        level: "info",
        message: "Application started successfully",
        service: "web-server",
        version: "1.2.3",
        environment: "production"
      },
      {
        timestamp: new Date(Date.now() + 1000).toISOString(),
        level: "debug",
        message: "Database connection established",
        service: "web-server",
        database: "postgresql",
        connection_pool_size: 10
      },
      {
        timestamp: new Date(Date.now() + 2000).toISOString(),
        level: "warn",
        message: "High memory usage detected",
        service: "web-server",
        memory_usage: "85%",
        threshold: "80%",
        action: "alert_sent"
      },
      {
        timestamp: new Date(Date.now() + 3000).toISOString(),
        level: "error",
        message: "Failed to process request",
        service: "api-gateway",
        error: "Connection timeout",
        request_id: "req_123456789",
        duration_ms: 5000,
        retry_count: 3
      },
      {
        timestamp: new Date(Date.now() + 4000).toISOString(),
        level: "info",
        message: "User authentication successful",
        service: "auth-service",
        user_id: "user_789",
        session_id: "sess_abc123",
        ip_address: "192.168.1.100",
        user_agent: "Mozilla/5.0"
      }
    ];

    return samples.map(obj => JSON.stringify(obj)).join('\n');
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) {
      return this.noMatch();
    }

    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Need at least 2 lines to be considered JSON log format
    if (lines.length < 2) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let validJsonLines = 0;
    let logPatternMatches = 0;
    
    // Common log fields that boost confidence
    const commonLogFields = ['timestamp', 'level', 'message', 'time', 'msg', 'log', 'event', 'severity', 'date'];
    const logLevels = ['debug', 'info', 'warn', 'warning', 'error', 'fatal', 'trace'];

    for (const line of lines.slice(0, Math.min(20, lines.length))) { // Check first 20 lines max
      const trimmedLine = line.trim();
      
      if (!trimmedLine.startsWith('{') || !trimmedLine.endsWith('}')) {
        continue; // Skip non-JSON lines
      }

      try {
        // Safety check: don't parse very large lines
        if (trimmedLine.length > 100_000) {
          console.log(`JSON Log Detector: Line too large (${trimmedLine.length} bytes), skipping parse`); // <<< ADD THIS
          continue; // Skip very large lines
        }
        
        const parsed = JSON.parse(trimmedLine);
        
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          validJsonLines++;
          confidenceScore += 0.15;

          // Check for common log patterns
          const keys = Object.keys(parsed).map(k => k.toLowerCase());
          
          // Check for common log fields
          const hasLogFields = commonLogFields.some(field => keys.includes(field));
          if (hasLogFields) {
            logPatternMatches++;
            confidenceScore += 0.2;
          }

          // Check for log levels in values
          const values = Object.values(parsed).map(v => 
            typeof v === 'string' ? v.toLowerCase() : ''
          );
          const hasLogLevel = logLevels.some(level => 
            values.some(val => val.includes(level))
          );
          if (hasLogLevel) {
            logPatternMatches++;
            confidenceScore += 0.15;
          }

          // Check for timestamp patterns
          const hasTimestamp = values.some(val => 
            /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(val) || // ISO timestamp
            /\d{10,13}/.test(val) // Unix timestamp
          );
          if (hasTimestamp) {
            logPatternMatches++;
            confidenceScore += 0.1;
          }

          // Check for service/component identifiers
          const hasServiceId = keys.some(key => 
            ['service', 'component', 'module', 'app', 'application'].includes(key)
          );
          if (hasServiceId) {
            confidenceScore += 0.05;
          }
        }
      } catch (e) {
        // Invalid JSON line reduces confidence
        confidenceScore -= 0.1;
      }
    }

    // Calculate ratio of valid JSON lines
    const validRatio = validJsonLines / lines.length;
    
    // Anti-patterns: reduce confidence for certain patterns
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      confidenceScore -= 0.5; // HTML content
    }
    
    if (content.includes('function ') || content.includes('const ') || content.includes('let ')) {
      confidenceScore -= 0.3; // JavaScript content
    }

    // Boost confidence if high ratio of valid JSON lines
    if (validRatio >= 0.8) {
      confidenceScore += 0.2;
    } else if (validRatio >= 0.6) {
      confidenceScore += 0.1;
    }

    // Boost if multiple log patterns detected
    if (logPatternMatches >= 3) {
      confidenceScore += 0.15;
    } else if (logPatternMatches >= 2) {
      confidenceScore += 0.1;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine if it's a match
    const isMatch = (validJsonLines >= 2 && validRatio >= 0.5 && confidenceScore >= 0.4) ||
                   (logPatternMatches >= 2 && validRatio >= 0.7);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && logPatternMatches >= 3 && validRatio >= 0.8
    };
  }

  getFileExtension(): string {
    return 'jsonl';
  }

  registerProvider(monaco: any): void {
    // Register JSON Log as a language variant of JSON
    monaco.languages.register({ id: 'jsonlog' });
    
    // Use Monaco's built-in JSON language configuration
    monaco.languages.setLanguageConfiguration('jsonlog', {
      brackets: [
        ['{', '}'],
        ['[', ']']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '"', close: '"' }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '"', close: '"' }
      ]
    });

    // Use Monaco's built-in JSON tokenizer but with custom semantic tokens for keys vs values
    monaco.languages.setMonarchTokensProvider('jsonlog', {
      defaultToken: '',
      tokenPostfix: '.jsonlog',
      
      keywords: [
        'true', 'false', 'null'
      ],
      
      typeKeywords: [],
      operators: [],
      
      symbols: /[=>{}<>=!]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      
      tokenizer: {
        root: [
          // Comments
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          
          // JSON property names (keys) - these should be distinct from string values
          [/"([^"\\]|\\.)*"(?=\s*:)/, 'key.jsonlog'],
          
          // Regular strings (values)
          [/"(?:[^"\\]|\\.)*"/, 'string.jsonlog'],
          
          // Numbers
          [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, 'number.jsonlog'],
          
          // Keywords (true, false, null)
          [/\b(?:true|false|null)\b/, 'keyword.jsonlog'],
          
          // Brackets and delimiters
          [/[{}]/, 'delimiter.bracket.jsonlog'],
          [/[[\]]/, 'delimiter.array.jsonlog'],
          [/:/, 'delimiter.colon.jsonlog'],
          [/,/, 'delimiter.comma.jsonlog'],
          
          [/\s+/, 'white']
        ],
        
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ]
      }
    });

    // Define color theme with distinct key and value colors
    monaco.editor.defineTheme('jsonlog-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'key.jsonlog', foreground: '4FC1FF', fontStyle: 'bold' },           // Bright cyan for keys
        { token: 'string.jsonlog', foreground: 'CE9178' },                          // Orange for string values  
        { token: 'number.jsonlog', foreground: 'B5CEA8' },                          // Light green for numbers
        { token: 'keyword.jsonlog', foreground: '569CD6' },                         // Blue for true/false/null
        { token: 'delimiter.bracket.jsonlog', foreground: 'FFD700' },               // Gold for {}
        { token: 'delimiter.array.jsonlog', foreground: 'FFD700' },                 // Gold for []
        { token: 'delimiter.colon.jsonlog', foreground: 'D4D4D4' },                 // Light gray for :
        { token: 'delimiter.comma.jsonlog', foreground: 'D4D4D4' },                 // Light gray for ,
        { token: 'comment', foreground: '6A9955' }                                  // Green for comments
      ],
      colors: {}
    });

    // Also define a light theme variant
    monaco.editor.defineTheme('jsonlog-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'key.jsonlog', foreground: '0066CC', fontStyle: 'bold' },           // Dark blue for keys
        { token: 'string.jsonlog', foreground: 'A31515' },                          // Dark red for string values
        { token: 'number.jsonlog', foreground: '098658' },                          // Dark green for numbers
        { token: 'keyword.jsonlog', foreground: '0000FF' },                         // Blue for true/false/null
        { token: 'delimiter.bracket.jsonlog', foreground: 'E6A500' },               // Dark gold for {}
        { token: 'delimiter.array.jsonlog', foreground: 'E6A500' },                 // Dark gold for []
        { token: 'delimiter.colon.jsonlog', foreground: '333333' },                 // Dark gray for :
        { token: 'delimiter.comma.jsonlog', foreground: '333333' },                 // Dark gray for ,
        { token: 'comment', foreground: '008000' }                                  // Green for comments
      ],
      colors: {}
    });

    // Provide formatting support to ensure each JSON object is on its own line
    monaco.languages.registerDocumentFormattingEditProvider('jsonlog', {
      provideDocumentFormattingEdits: (model: any, _options: any, _token: any) => {
        const text = model.getValue();
        const lines = text.split('\n');
        const formattedLines: string[] = [];

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue; // Skip empty lines

          // Try to parse and reformat each line as JSON
          try {
            if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
              // Safety check: don't parse very large lines
              if (trimmedLine.length > 100_000) {
                console.log(`JSON Log Format: Line too large (${trimmedLine.length} bytes), skipping format`); // <<< ADD THIS
                formattedLines.push(trimmedLine); // Keep original line
                continue;
              }
              
              const parsed = JSON.parse(trimmedLine);
              // Format as compact JSON (no extra spaces, single line)
              formattedLines.push(JSON.stringify(parsed));
            } else {
              // Keep non-JSON lines as-is
              formattedLines.push(trimmedLine);
            }
          } catch (e) {
            // If parsing fails, keep the original line
            formattedLines.push(trimmedLine);
          }
        }

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }];
      }
    });

    // Provide completion items for common log fields
    monaco.languages.registerCompletionItemProvider('jsonlog', {
      provideCompletionItems: (_model: any, _position: any) => {
        const suggestions = [
          {
            label: 'timestamp',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: '"timestamp": "${1:' + new Date().toISOString() + '}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'ISO timestamp field'
          },
          {
            label: 'level',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: '"level": "${1|info,debug,warn,error,fatal|}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Log level field'
          },
          {
            label: 'message',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: '"message": "${1:Log message}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Log message field'
          },
          {
            label: 'service',
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: '"service": "${1:service-name}"',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Service identifier field'
          },
          {
            label: 'log-entry',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '{"timestamp": "${1:' + new Date().toISOString() + '}", "level": "${2|info,debug,warn,error|}", "message": "${3:Log message}", "service": "${4:service-name}"}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Complete log entry template'
          }
        ];
        
        return { suggestions };
      }
    });
  }
}

// Create instance and register with the language registry
const jsonLogDetector = new JsonLogLanguageDetector();
languageRegistry.register(jsonLogDetector);

// Export for testing or manual registration
export const registerJsonLogProvider = (monaco: any) => {
  jsonLogDetector.registerProvider(monaco);
}; 