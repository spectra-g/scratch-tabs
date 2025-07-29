import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * cURL language detector
 */
export class CurlFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "curl"; // Keep 'curl' as the Monaco language ID, or use 'shell' if you want shell highlighting
  name = "cURL Command";
  extensions = ["curl", "sh", "bash"]; // cURL commands are often in shell scripts
  priority = 4; // Mid-range priority

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
  -F "file=@/path/to/file.pdf" \\
  -F "description=Project documentation"

# Custom request with query parameters and user agent
curl -A "MyCustomClient/1.0" "https://api.example.com/search?q=test&page=1" \\
  -H "Accept: application/json" \\
  --compressed`;
  }

  /**
   * Detects if the given content matches cURL patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 4) {
      // "curl"
      return this.noMatch();
    }

    const trimmedContent = content.trim();
    let confidenceScore = 0.0;
    let patternsMatched = 0;

    // 1. Presence of "curl" command at the start of a line (strongest indicator)
    //    Allowing for leading whitespace or comments
    const curlCommandPattern = /^\s*(?:#.*?\n\s*)*curl\s+/m;
    if (curlCommandPattern.test(trimmedContent)) {
      confidenceScore += 0.5; // High base for starting with "curl"
      patternsMatched++;
    } else {
      // If it doesn't even start with 'curl' (after potential comments), it's very unlikely
      return this.noMatch();
    }

    // 2. Common cURL options and structures
    const curlOptionsPatterns = [
      // HTTP methods
      {
        pattern: /\s-X\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/gi,
        weight: 0.2,
        perMatch: 0.1,
      },
      // Headers
      {
        pattern: /\s-H\s+["'][^"':]+:[^"']+["']/g,
        weight: 0.15,
        perMatch: 0.05,
      },
      // Data payloads
      { pattern: /\s-d\s+(["'])/g, weight: 0.15, perMatch: 0.05 }, // Check for -d " or -d '
      {
        pattern: /\s--data(?:-raw|-urlencode|-binary)?\s+/g,
        weight: 0.15,
        perMatch: 0.05,
      },
      // Form data
      { pattern: /\s-F\s+["']?\w+=/g, weight: 0.15, perMatch: 0.05 },
      // Common single-letter flags (grouped for efficiency)
      {
        pattern: /\s-(?:[A-Za-z#%*@\[\]!$(),.;?_`{}~|<>^&+-=/]|\[|\])/g,
        weight: 0.05,
        perMatch: 0.01,
      }, // Any single letter flag
      // Common long-form flags
      {
        pattern:
          /\s--(?:request|header|form|data|user|user-agent|cookie|url|output|upload-file|insecure|cacert|cert|key|compressed|silent|show-error|verbose|include|location|head|get|http1\.1|http2)\b/gi,
        weight: 0.1,
        perMatch: 0.03,
      },
      // URLs (look for http(s):// not immediately after -d or similar data flags)
      // This is tricky because URLs can be part of data payloads.
      // We look for URLs that are likely the main target URL.
      {
        pattern:
          /(?<!-d\s["']|--data[^=]*=)(?<!-F\s["']\w+=)(https?:\/\/[^\s\\'"]+)/g,
        weight: 0.1,
        perMatch: 0.03,
      },
      // Line continuation (common in multi-line cURL commands)
      { pattern: /\\\s*$/m, weight: 0.1, perMatch: 0.02 },
    ];

    for (const p of curlOptionsPatterns) {
      const matches = content.match(p.pattern);
      if (matches) {
        confidenceScore += p.weight;
        confidenceScore += Math.min(matches.length, 3) * p.perMatch; // Cap per-match bonus
        patternsMatched++;
      }
    }

    // 3. Anti-patterns (syntax from other languages that's not typical in cURL lines)
    //    cURL is often part of shell scripts, so be careful not to penalize valid shell syntax too much.
    const antiPatterns = [
      // { pattern: /^\s*(function|class|if|for|while)\s+\w+/m, weight: -0.1 }, // Shell script constructs
      { pattern: /<\w.*?>/g, weight: -0.3 }, // HTML/XML tags
      { pattern: /\{\s*".*"\s*:\s*".*"\s*\}\s*(?:,|$)/g, weight: -0.05 }, // JSON outside of a -d flag (can be tricky)
    ];

    for (const ap of antiPatterns) {
      const antiMatches = content.match(ap.pattern);
      if (antiMatches) {
        confidenceScore += ap.weight * Math.min(antiMatches.length, 2); // Penalize more for multiple occurrences
      }
    }

    // 4. Boost if many different types of cURL options are present
    if (patternsMatched >= 3 && confidenceScore > 0.3) {
      confidenceScore += 0.15;
    }
    if (patternsMatched >= 5 && confidenceScore > 0.5) {
      confidenceScore += 0.1;
    }

    // 5. Normalization and Clamping
    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    // Requires the initial "curl" and a decent confidence score from options.
    const isMatch =
      curlCommandPattern.test(trimmedContent) && confidenceScore >= 0.45;

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
    };
  }

  getFileExtension(): string {
    return "sh"; // cURL commands are often saved in .sh or .curl files
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'curl'

    // cURL commands are essentially shell commands.
    // You could reuse or adapt the 'shell' language tokenizer if you have one,
    // or define a specific one for cURL highlighting its options.
    // The one you provided in the original example is a good starting point.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });

      monaco.languages.setMonarchTokensProvider(languageId, {
        ignoreCase: true, // cURL flags are case-sensitive, but methods often not. Adjust as needed.
        defaultToken: "invalid",
        keywords: [
          // For common cURL flags
          "-X",
          "GET",
          "POST",
          "PUT",
          "DELETE",
          "PATCH",
          "HEAD",
          "OPTIONS",
          "-H",
          "-d",
          "-F",
          "--data",
          "--data-raw",
          "--data-urlencode",
          "--data-binary",
          "-I",
          "-L",
          "-#",
          "-A",
          "-o",
          "-O",
          "--output",
          "--user-agent",
          "--header",
          "--form",
          "--request",
          "--get",
          "--user",
          "--cookie",
          "--url",
          "--upload-file",
          "--insecure",
          "--cacert",
          "--cert",
          "--key",
          "--compressed",
          "--silent",
          "--show-error",
          "--verbose",
          "--include",
          "--location",
          "--http1.1",
          "--http2",
          "--http1.0",
        ],
        tokenizer: {
          root: [
            [/^curl\b/, "keyword.main"], // The curl command itself
            [/#.*$/, "comment"], // Comments

            // Flags (short and long)
            [
              /\s-[a-zA-Z#%*@\[\]!$(),.;?_`{}~|<>^&+-=\/\\](?=\s|$)/,
              "keyword.flag.short",
            ], // Single-dash flags
            [/\s--[\w-]+(?=\s|=|$)/, "keyword.flag.long"], // Double-dash flags

            // HTTP Methods after -X or --request
            [
              /(?:-X|--request)\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/,
              ["keyword.flag.short", "keyword.httpmethod"],
            ],

            // Headers: -H "Name: Value"
            [/(-H|--header)\s+/, "keyword.flag.short"],
            [/["'][^"':\s]+["']\s*:/, "type.headerkey"], // Header key in quotes
            // /([\w-]+)\s*:/, 'type.headerkey'],           // Header key without quotes - might be too greedy

            // Data payloads: -d '{"json": "data"}' or --data "param=value"
            [
              /(-d|--data|--data-raw|--data-urlencode|--data-binary)\s+/,
              "keyword.flag.short",
            ],

            // Form data: -F "name=value" or -F "file=@filepath"
            [/(-F|--form)\s+/, "keyword.flag.short"],
            [/["']?\w+=@/, "type.formkey.fileprefix"], // For "file=@" part
            [/["']?\w+=/, "type.formkey"],

            // URLs (simplified, could be more robust)
            [/\bhttps?:\/\/[^\s\\'"]+/, "string.link"],

            // Strings (for header values, data, etc.)
            [/"([^"\\]|\\.)*$/, "string.invalid"], // Unterminated string
            [
              /"/,
              {
                token: "string.quote",
                bracket: "@open",
                next: "@string_double",
              },
            ],
            [/'([^'\\]|\\.)*$/, "string.invalid"], // Unterminated string
            [
              /'/,
              {
                token: "string.quote",
                bracket: "@open",
                next: "@string_single",
              },
            ],

            // Line continuation
            [/\\$/, "keyword.escape"],
          ],

          string_double: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
          ],

          string_single: [
            [/[^\\']+/, "string"],
            [/\\./, "string.escape"],
            [/'/, { token: "string.quote", bracket: "@close", next: "@pop" }],
          ],

          // JSON content within data payloads (if you want to go this deep)
          // This would require a state push like your original example:
          // [/{/, { token: 'delimiter.curly', bracket: '@open', next: '@json_state' }],
        },
      });

      monaco.editor.defineTheme(`${languageId}-theme`, {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword.main", foreground: "c586c0", fontStyle: "bold" }, // Purple for 'curl'
          { token: "keyword.flag.short", foreground: "9cdcfe" }, // Light blue for short flags
          { token: "keyword.flag.long", foreground: "9cdcfe" }, // Light blue for long flags
          {
            token: "keyword.httpmethod",
            foreground: "4ec9b0",
            fontStyle: "bold",
          }, // Teal for HTTP methods
          { token: "type.headerkey", foreground: "4ec9b0" }, // Teal for header keys
          { token: "type.formkey", foreground: "4ec9b0" },
          { token: "type.formkey.fileprefix", foreground: "d7ba7d" }, // Yellowish for file prefix
          { token: "string", foreground: "ce9178" }, // Orange-ish for strings
          {
            token: "string.link",
            foreground: "569cd6",
            fontStyle: "underline",
          }, // Blue for URLs
          { token: "string.quote", foreground: "ce9178" },
          { token: "string.escape", foreground: "d7ba7d" },
          { token: "string.invalid", foreground: "ff0000" },
          { token: "comment", foreground: "6a9955" }, // Green for comments
          { token: "delimiter", foreground: "d4d4d4" }, // Default delimiter color
          { token: "keyword.escape", foreground: "d7ba7d" }, // Backslash for line continuation
        ],
        colors: {
          "editor.foreground": "#d4d4d4",
        },
      });
    }

    // cURL formatting is tricky because it's often multi-line shell.
    // A simple formatter might align backslashes or indent continued lines.
    // Your existing basic formatter idea is a good start for simple cases.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let indentNext = false;
        const indent = "  "; // Two spaces for indentation

        const formattedLines = lines.map((line: string) => {
          let trimmedLine = line.trim();
          let currentLineIndent = "";

          if (indentNext) {
            currentLineIndent = indent;
            trimmedLine = currentLineIndent + trimmedLine; // Apply indent
          }

          // Determine if next line should be indented
          if (trimmedLine.endsWith("\\")) {
            indentNext = true;
            // Optionally align backslashes (more complex)
          } else {
            indentNext = false;
          }
          return trimmedLine; // Return the (potentially) indented trimmed line
        });

        // Filter out potentially empty lines created if original lines were only whitespace
        const finalFormatted = formattedLines
          .filter((line) => line.trim().length > 0 || line.length === 0)
          .join("\n");

        return [
          {
            range: model.getFullModelRange(),
            text: finalFormatted,
          },
        ];
      },
    });
  }
}

// Create and register the detector
const curlDetector = new CurlFormatDetector();
formatRegistry.register(curlDetector);

// Export for backward compatibility (optional)
export const registerCurlProvider = (monaco: any) => {
  curlDetector.registerProvider(monaco);
};
