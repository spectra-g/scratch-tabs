import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * Properties/INI language detector
 */
export class PropertiesLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'ini'; // Monaco uses 'ini' for this type of file (often interchangeable with properties)
  name = 'Properties / INI';
  extensions = ['properties', 'ini', 'cfg', 'conf', 'config']; // Common extensions
  priority = 3; // Lower priority as simple key=value can appear in other contexts

  sampleContent(): string {
    return `# This is a global comment
app.name = My Application
app.version = 1.0.3
debug_mode = true ; Inline comment

[database]
host = localhost
port = 5432
user = db_user
password = secret_password # Passwords should ideally not be stored like this

# Multiline values are sometimes supported (though not standard in basic .properties)
# multiline.key = This is a \\
#                 long value that spans \\
#                 multiple lines.

[user_preferences]
theme = dark
notifications.enabled = true
font.size = 12
path.to.something = C:\\Users\\Default\\My Documents
`;
  }

  /**
   * Detects if the given content matches Properties/INI patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 3) { // e.g., "a=b"
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let keyValuePairsCount = 0;
    let sectionHeadersCount = 0;
    let commentLinesCount = 0;

    const lines = content.split('\n');
    const nonEmptyLines = lines.map(l => l.trim()).filter(l => l.length > 0);

    if (nonEmptyLines.length < 1) {
      return this.noMatch();
    }

    // 1. Check for key-value pairs (key = value or key : value)
    //    Allows for spaces around '=' or ':'
    //    Ignores lines starting with comment characters '#' or ';'
    const keyValueRegex = /^\s*[^#;\s][\w.-]+\s*[:=]\s*(.*)/;
    for (const line of nonEmptyLines) {
      if (keyValueRegex.test(line)) {
        keyValuePairsCount++;
      } else if (line.startsWith('#') || line.startsWith(';')) {
        commentLinesCount++;
      } else if (/^\s*\[.*\]\s*$/.test(line)) { // [section_header]
        sectionHeadersCount++;
      }
    }

    if (keyValuePairsCount > 0) {
      confidenceScore += 0.3; // Base score for finding any key-value pairs
      confidenceScore += Math.min(keyValuePairsCount, 10) * 0.04; // Bonus for more pairs
      patternsMatched++;
    }

    // 2. Check for section headers (e.g., [database]) - common in INI files
    if (sectionHeadersCount > 0) {
      confidenceScore += 0.25;
      confidenceScore += Math.min(sectionHeadersCount, 5) * 0.05;
      patternsMatched++;
    }

    // 3. Presence of comments (# or ;)
    if (commentLinesCount > 0) {
      confidenceScore += Math.min(commentLinesCount, 5) * 0.02; // Small bonus for comments
      patternsMatched++;
    }

    // 4. Check line structure consistency
    //    If most non-empty/non-comment lines are key-value or sections, it's a good sign.
    const totalSignificantLines = keyValuePairsCount + sectionHeadersCount;
    if (nonEmptyLines.length > 0 && totalSignificantLines > 0) {
      const ratioValidLines = totalSignificantLines / nonEmptyLines.filter(l => !l.startsWith('#') && !l.startsWith(';')).length;
      if (ratioValidLines >= 0.75) { // At least 75% of non-comment lines are key-value or sections
        confidenceScore += 0.2;
      } else if (ratioValidLines >= 0.5) {
        confidenceScore += 0.1;
      }
    }

    // 5. Anti-patterns (syntax from other languages)
    const antiPatterns = [
      { pattern: /[{}[\]]/g, weight: -0.3 }, // Braces/brackets (JSON, code blocks) - penalize if not within value and many
      { pattern: /<\w.*?>/g, weight: -0.4 }, // HTML/XML tags
      { pattern: /\b(function|class|var|let|const|import|export|def|public|private)\b/i, weight: -0.5 }, // Code keywords
      { pattern: /=>|->/g, weight: -0.3 }    // Arrow/pointer like syntax
    ];

    let antiPatternHitCount = 0;
    for (const ap of antiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches) {
        // Apply penalty more carefully for braces/brackets, as they might appear in values
        if (ap.pattern.source.includes('[{}]') && matches.length < 3 && keyValuePairsCount > 0) {
          // Allow a few braces/brackets if key-value pairs are present
        } else {
          confidenceScore += ap.weight;
          antiPatternHitCount++;
        }
      }
    }
    if (antiPatternHitCount > 1) confidenceScore -= 0.1; // Extra penalty for multiple anti-pattern types

    // 6. Final Adjustments and Clamping
    if (keyValuePairsCount > 0 && (sectionHeadersCount > 0 || commentLinesCount > 0)) {
      confidenceScore += 0.1; // Bonus for mixed characteristic elements
    }
    if (keyValuePairsCount === 0 && sectionHeadersCount === 0) { // No actual data, just comments or empty
      return this.noMatch();
    }


    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    const isMatch = confidenceScore >= 0.4; // Adjust this threshold

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
    };
  }

  getFileExtension(): string {
    return 'properties'; // Or 'ini'
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'ini'

    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    // Monaco has built-in support for 'ini' which works well for .properties too
    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: 'source.ini', // More specific default
      ignoreCase: true,
      tokenPostfix: '.ini',
    
      tokenizer: {
        root: [
          [/^\s*[#;].*$/, 'comment.ini'],
          [/^\s*\[/, { token: 'metatag.ini', bracket: '@open', next: '@section' }],
      
          // Regex 1: Key = Value with inline comment
          [/^\s*([^#;\s][^:=]*?)(\s*[:=]\s*)(.*?)(\s+[#;].*)$/,
            [ 'keyword.ini', 'delimiter.ini', 'string.ini', 'comment.ini' ]
          ],
          // Regex 2: Key = Value (no inline comment)
          [/^\s*([^#;\s][^:=]*?)(\s*[:=]\s*)(.*)$/,
            [ 'keyword.ini', 'delimiter.ini', 'string.ini']
          ],
          // Regex 3: Key only
          [/^\s*([^#;\s][^:=]*?)\s*$/, 'keyword.ini'],
        ],
    
        section: [
          [/[^\]]+/, 'type.identifier.ini'],
          [/\]/, { token: 'metatag.ini', bracket: '@close', next: '@pop' }]
        ],
      },
    });

    // Define a theme (optional, as 'vs-dark'/'vs' usually style these tokens well)
    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: 'vs-dark', // or 'vs'
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955' }, // Green for comments
        { token: 'delimiter.square', foreground: 'c586c0', fontStyle: 'bold' }, // Magenta for [ ]
        { token: 'type.identifier', foreground: '4EC9B0', fontStyle: 'bold' },  // Teal for section names
        { token: 'type', foreground: '9CDCFE' },          // Light blue for keys
        { token: 'delimiter', foreground: 'd4d4d4' },     // Grey for = or :
        { token: 'string', foreground: 'CE9178' },       // Orange for values
        { token: 'source', foreground: 'd4d4d4' },
      ],
      colors: {}
    });

    // Basic formatter: aligns '=' or ':' if present on consecutive lines (very heuristic)
    // Proper INI/Properties formatting can have more rules.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        let maxKeyLengthBeforeDelim = 0;

        // First pass: find max key length for alignment
        lines.forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith('#') && !trimmedLine.startsWith(';')) {
            const match = trimmedLine.match(/^([\w.-]+)\s*([:=])/);
            if (match) {
              maxKeyLengthBeforeDelim = Math.max(maxKeyLengthBeforeDelim, match[1].length);
            }
          }
        });

        const formattedLines = lines.map(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith(';')) {
            return line; // Keep comments and empty lines as is (or just trimmedLine for consistency)
          }

          const match = trimmedLine.match(/^([\w.-]+)(\s*[:=]\s*)(.*)$/);
          if (match) {
            const key = match[1];
            const delim = match[2].trim(); // Get just the delimiter
            const value = match[3].trim();
            const padding = ' '.repeat(Math.max(0, maxKeyLengthBeforeDelim - key.length));
            return `${key}${padding} ${delim} ${value}`;
          }
          return line; // Return original if no match (e.g., section headers)
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
const propertiesDetector = new PropertiesLanguageDetector();
languageRegistry.register(propertiesDetector);

// Export for backward compatibility (optional)
export const registerPropertiesProvider = (monaco: any) => {
  propertiesDetector.registerProvider(monaco);
};