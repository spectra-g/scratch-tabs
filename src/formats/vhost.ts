import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * VHost (Apache Virtual Host) language detector
 */
export class VhostFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "vhost";
  name = "VHost";
  extensions = ["vhost", "conf", "config"];
  priority = 5; // Higher priority since vhost files have distinctive patterns

  // Apache-specific directives (strong indicators)
  private apacheDirectives = [
    "ServerName",
    "ServerAlias",
    "DocumentRoot",
    "ErrorLog",
    "CustomLog",
    "SSLEngine",
    "SSLCertificateFile",
    "SSLCertificateKeyFile",
    "SSLCertificateChainFile",
    "Options",
    "AllowOverride",
    "Require",
    "Header",
    "Redirect",
    "RewriteEngine",
    "DirectoryIndex",
    "LoadModule",
    "Listen",
  ];

  sampleContent(): string {
    return `# Apache Virtual Host Configuration
# Example configuration for domain.com

<VirtualHost *:80>
    ServerName domain.com
    ServerAlias www.domain.com
    DocumentRoot /var/www/domain.com/public_html
    
    # Logging
    ErrorLog /var/log/apache2/domain.com_error.log
    CustomLog /var/log/apache2/domain.com_access.log combined
    
    # Directory settings
    <Directory /var/www/domain.com/public_html>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    # SSL Redirect (optional)
    # Redirect permanent / https://domain.com/
</VirtualHost>

# SSL Virtual Host
<VirtualHost *:443>
    ServerName domain.com
    ServerAlias www.domain.com
    DocumentRoot /var/www/domain.com/public_html
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/domain.com.crt
    SSLCertificateKeyFile /etc/ssl/private/domain.com.key
    SSLCertificateChainFile /etc/ssl/certs/chain.crt
    
    # Security headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    
    # Error and access logs
    ErrorLog /var/log/apache2/domain.com_ssl_error.log
    CustomLog /var/log/apache2/domain.com_ssl_access.log combined
</VirtualHost>`;
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongVhostSignal = false;

    // VHost-specific patterns
    const vhostOpenTagRegex = /<VirtualHost\s+[^>]*>/i;
    const vhostCloseTagRegex = /<\/VirtualHost>/i;
    const directoryTagRegex = /<Directory\s+[^>]*>/i;
    const commentRegex = /^\s*#/;

    // Check for VirtualHost tags (strongest indicator)
    if (vhostOpenTagRegex.test(content)) {
      confidenceScore += 0.4;
      patternsMatched++;
      strongVhostSignal = true;

      // Bonus if also has closing tag
      if (vhostCloseTagRegex.test(content)) {
        confidenceScore += 0.2;
        patternsMatched++;
      }
    }

    // Check for Directory tags
    if (directoryTagRegex.test(content)) {
      confidenceScore += 0.2;
      patternsMatched++;
      strongVhostSignal = true;
    }

    // Count Apache directives
    let directiveCount = 0;
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Skip comments
      if (commentRegex.test(trimmedLine)) {
        continue;
      }

      // Check for common Apache directives
      for (const directive of this.apacheDirectives) {
        const directiveRegex = new RegExp(`^\\s*${directive}\\s+`, "i");
        if (directiveRegex.test(trimmedLine)) {
          directiveCount++;
          confidenceScore += 0.1;
          patternsMatched++;
          if (["ServerName", "DocumentRoot", "SSLEngine"].includes(directive)) {
            strongVhostSignal = true;
          }
          break; // Only count each line once
        }
      }
    }

    // Bonus for multiple directives
    if (directiveCount >= 3) {
      confidenceScore += 0.1;
      strongVhostSignal = true;
    }

    // Check for common VHost patterns
    if (/ServerName\s+[\w.-]+/i.test(content)) {
      confidenceScore += 0.15;
      patternsMatched++;
      strongVhostSignal = true;
    }

    if (/DocumentRoot\s+[\/\w.-]+/i.test(content)) {
      confidenceScore += 0.15;
      patternsMatched++;
      strongVhostSignal = true;
    }

    // Check for SSL-related content
    if (/SSL(Engine|Certificate)/i.test(content)) {
      confidenceScore += 0.1;
      patternsMatched++;
    }

    // Check for log file patterns
    if (/ErrorLog|CustomLog.*\.log/i.test(content)) {
      confidenceScore += 0.1;
      patternsMatched++;
    }

    // Anti-patterns: Strong indicators this is NOT a VHost file
    if (/<html|<body|<div|<p>/i.test(content)) {
      confidenceScore -= 0.5; // HTML content
    }

    if (/function|var|let|const|import|export|class/i.test(content)) {
      confidenceScore -= 0.4; // Programming language keywords
    }

    if (/[{}\[\]]/g.test(content) && !/<VirtualHost/.test(content)) {
      confidenceScore -= 0.3; // JSON/JavaScript-like brackets without VHost context
    }

    if (/SELECT|FROM|WHERE|INSERT|UPDATE|DELETE/i.test(content)) {
      confidenceScore -= 0.4; // SQL keywords
    }

    // Require at least some Apache-specific content
    if (!strongVhostSignal && patternsMatched < 2) {
      confidenceScore -= 0.3;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine if it's a match
    const isMatch =
      (strongVhostSignal && confidenceScore >= 0.4) ||
      (directiveCount >= 3 && confidenceScore >= 0.3) ||
      (vhostOpenTagRegex.test(content) && confidenceScore >= 0.3);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive:
        isMatch && strongVhostSignal && vhostOpenTagRegex.test(content),
    };
  }

  getFileExtension(): string {
    return "vhost";
  }

  registerProvider(monaco: any): void {
    // Register VHost as a custom language
    monaco.languages.register({ id: "vhost" });

    // Set up basic tokenization for VHost files
    monaco.languages.setMonarchTokensProvider("vhost", {
      tokenizer: {
        root: [
          // Comments
          [/#.*$/, "comment"],

          // VirtualHost tags
          [/<VirtualHost\s+[^>]*>/, "tag.vhost"],
          [/<\/VirtualHost>/, "tag.vhost"],

          // Directory tags
          [/<Directory\s+[^>]*>/, "tag.directory"],
          [/<\/Directory>/, "tag.directory"],

          // Other Apache tags
          [/<[\/]?\w+[^>]*>/, "tag"],

          // Apache directives (keywords)
          [
            /\b(ServerName|ServerAlias|DocumentRoot|ErrorLog|CustomLog|SSLEngine|SSLCertificateFile|SSLCertificateKeyFile|Options|AllowOverride|Require|Header|Redirect|RewriteEngine|DirectoryIndex|LoadModule|Listen)\b/,
            "keyword",
          ],

          // File paths
          [/\/[\w\/.-]*/, "string.path"],

          // Domain names and URLs
          [
            /\b[\w.-]+\.(com|org|net|edu|gov|mil|int|co|uk|de|fr|jp|au|ca)\b/,
            "string.domain",
          ],

          // IP addresses and ports
          [/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/, "number.ip"],
          [/\*:\d+/, "number.port"],

          // Numbers
          [/\d+/, "number"],

          // Strings in quotes
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@string"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/'/, "string", "@string_single"],
        ],

        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],

        string_single: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"],
        ],
      },
    });

    // Set up theme colors for VHost
    monaco.editor.defineTheme("vhost-theme", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "tag.vhost", foreground: "FF6B6B", fontStyle: "bold" },
        { token: "tag.directory", foreground: "FF9F43", fontStyle: "bold" },
        { token: "tag", foreground: "FFA500" },
        { token: "keyword", foreground: "569CD6", fontStyle: "bold" },
        { token: "string.path", foreground: "CE9178" },
        { token: "string.domain", foreground: "4EC9B0" },
        { token: "number.ip", foreground: "B5CEA8" },
        { token: "number.port", foreground: "B5CEA8" },
        { token: "string", foreground: "CE9178" },
      ],
      colors: {},
    });

    // Provide completion items for VHost directives
    monaco.languages.registerCompletionItemProvider("vhost", {
      provideCompletionItems: (_model: any, _position: any) => {
        const suggestions = [
          {
            label: "VirtualHost",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "<VirtualHost *:80>\n\tServerName ${1:example.com}\n\tDocumentRoot ${2:/var/www/html}\n\t$0\n</VirtualHost>",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Create a new VirtualHost block",
          },
          {
            label: "Directory",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "<Directory ${1:/var/www/html}>\n\tOptions ${2:Indexes FollowSymLinks}\n\tAllowOverride ${3:All}\n\tRequire ${4:all granted}\n</Directory>",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "Create a Directory block",
          },
          ...this.apacheDirectives.map((directive: string) => ({
            label: directive,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: directive + " ",
            documentation: `Apache directive: ${directive}`,
          })),
        ];

        return { suggestions };
      },
    });

    // Add folding support for tags
    monaco.languages.registerFoldingRangeProvider("vhost", {
      provideFoldingRanges: (model: any) => {
        const ranges: any[] = [];
        const lines = model.getLinesContent();
        const stack: Array<{ line: number; tag: string }> = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const openMatch = line.match(/<(VirtualHost|Directory)[^>]*>/i);
          const closeMatch = line.match(/<\/(VirtualHost|Directory)>/i);

          if (openMatch) {
            stack.push({ line: i, tag: openMatch[1].toLowerCase() });
          } else if (closeMatch && stack.length > 0) {
            const lastOpen = stack.pop();
            if (lastOpen && lastOpen.tag === closeMatch[1].toLowerCase()) {
              ranges.push({
                start: lastOpen.line + 1,
                end: i + 1,
                kind: monaco.languages.FoldingRangeKind.Region,
              });
            }
          }
        }

        return ranges;
      },
    });
  }
}

// Create instance and register with the language registry
const vhostDetector = new VhostFormatDetector();
formatRegistry.register(vhostDetector);

// Export for testing or manual registration
export const registerVhostProvider = (monaco: any) => {
  vhostDetector.registerProvider(monaco);
};
