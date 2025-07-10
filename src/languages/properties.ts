import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";

/**
 * Properties/INI language detector
 */
export class PropertiesLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "ini"; // Monaco uses 'ini' for this type of file (often interchangeable with properties)
  name = "Properties / INI";
  extensions = ["properties", "ini", "cfg", "conf", "config"]; // Common extensions
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
    if (!trimmedContent || trimmedContent.length < 3) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    // patternsMatched is not as useful here as the line structure ratio
    // let patternsMatched = 0;
    let keyValuePairsCount = 0;
    let sectionHeadersCount = 0;
    let commentLinesCount = 0;
    let otherLinesCount = 0; // Count lines that are not comments, sections, or key-value

    const lines = content.split("\n");
    const nonEmptyTrimmedLines = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Require more than 3 lines for properties/INI detection
    if (nonEmptyTrimmedLines.length <= 3) {
      return this.noMatch();
    }

    // Stricter regex for key-value: key can contain dots, hyphens. Value can be empty.
    // Ensures it's not just any colon, but one likely separating a key from a value.
    const keyValueRegex = /^\s*([a-zA-Z0-9_.-]+)\s*([:=])\s*(.*)/;
    const sectionRegex = /^\s*\[([^\]]+)\]\s*$/; // Simpler section regex
    const urlRegex = /https?:\/\/[^\s]+/i; // URL detection regex

    for (const line of nonEmptyTrimmedLines) {
      if (line.startsWith("#") || line.startsWith(";")) {
        commentLinesCount++;
      } else if (sectionRegex.test(line)) {
        sectionHeadersCount++;
      } else if (urlRegex.test(line)) {
        // Lines containing URLs should not be considered key-value pairs
        otherLinesCount++;
      } else if (keyValueRegex.test(line)) {
        keyValuePairsCount++;
      } else {
        otherLinesCount++; // This line doesn't fit INI structure
      }
    }

    // --- Core Heuristic: Ratio of INI-like lines to total non-comment lines ---
    const totalStructuralLines = keyValuePairsCount + sectionHeadersCount;
    const totalNonCommentLines =
      nonEmptyTrimmedLines.length - commentLinesCount;

    if (
      totalNonCommentLines <= 0 &&
      (keyValuePairsCount > 0 || sectionHeadersCount > 0)
    ) {
      // This case means all lines were key-value or sections, which is valid if there are any.
      // Or it implies the file was only comments that also happened to match k/v or section,
      // but our loop structure above should handle this by totalNonCommentLines being 0.
      // If totalNonCommentLines is 0 but we have keyValuePairs/sectionHeaders, it means
      // every non-empty line was one of these structural elements (after stripping comments).
      if (totalStructuralLines > 0) {
        confidenceScore += 0.6; // Good sign if all non-comment lines are structural
      } else {
        return this.noMatch(); // Only comments, or empty after stripping comments
      }
    } else if (totalNonCommentLines > 0) {
      const ratioValidIniLines = totalStructuralLines / totalNonCommentLines;
      // console.log(`INI Detector: RatioValidIniLines=${ratioValidIniLines.toFixed(3)}, Structural=${totalStructuralLines}, NonComment=${totalNonCommentLines}, Other=${otherLinesCount}`);

      if (ratioValidIniLines >= 0.85 && totalStructuralLines >= 1) {
        // Very high percentage must be INI structure
        confidenceScore += 0.6; // Strong boost
      } else if (ratioValidIniLines >= 0.65 && totalStructuralLines >= 2) {
        // Still a good majority
        confidenceScore += 0.3;
      } else if (ratioValidIniLines >= 0.4 && totalStructuralLines >= 1) {
        confidenceScore += 0.1;
      } else if (totalStructuralLines >= 1) {
        // Some INI structure but low ratio means many "other" lines
        confidenceScore -= 0.2 - 0.1 * ratioValidIniLines; // Penalize based on how low the ratio is
      } else {
        // No key-value or sections found among non-comment lines
        return this.noMatch(); // If non-comment lines exist but none are k/v or sections, it's not INI.
      }
    } else {
      // No non-empty, non-comment lines at all
      return this.noMatch();
    }

    // Add small bonuses if specific elements were found, but only if base confidence is okay
    if (confidenceScore > 0) {
      if (keyValuePairsCount > 0)
        confidenceScore += Math.min(keyValuePairsCount, 5) * 0.02;
      if (sectionHeadersCount > 0)
        confidenceScore += Math.min(sectionHeadersCount, 3) * 0.03;
      if (commentLinesCount > 0 && totalStructuralLines > 0)
        confidenceScore += 0.01; // Comments only useful if there's also data
    }

    // Anti-patterns
    const antiPatterns = [
      { pattern: /\{|\}|\[(?![^\]]*\]\s*$)/g, weight: -0.4, threshold: 2 }, // Braces, or non-section brackets (allow more if score is high)
      { pattern: /<\w.*?>/g, weight: -0.5, threshold: 1 },
      {
        pattern:
          /\b(function|class|var|let|const|import|export|def|public|private)\b/i,
        weight: -0.6,
        threshold: 1,
      }, // Programming keywords
      {
        pattern:
          /\b(SELECT|FROM|WHERE|UPDATE|INSERT|CREATE|DROP|ALTER|DELETE)\b/i,
        weight: -0.6,
        threshold: 2,
      }, // SQL keywords - require at least 2
      { pattern: /=>|->|#!/g, weight: -0.5, threshold: 1 },
      { pattern: /https?:\/\/[^\s]+/gi, weight: -0.8, threshold: 1 }, // URLs should strongly indicate this is not a properties file
    ];

    for (const ap of antiPatterns) {
      const matches = content.match(ap.pattern); // Check on original content
      if (matches && matches.length >= ap.threshold) {
        // Only apply anti-pattern if confidence isn't already super high from structure
        if (
          confidenceScore < 0.7 ||
          ap.pattern.source.includes("SELECT") ||
          ap.pattern.source.includes("https")
        ) {
          // Apply SQL and URL anti-patterns more readily
          // For URLs, scale the penalty based on how many URLs there are
          if (ap.pattern.source.includes("https")) {
            confidenceScore += ap.weight * Math.min(matches.length, 3); // Cap at 3x penalty
          } else {
            confidenceScore += ap.weight;
          }
        }
      }
    }

    // Final Adjustments
    // If it has sections, it's more likely INI than simple key-value (like .env might be)
    if (
      sectionHeadersCount > 0 &&
      keyValuePairsCount > 0 &&
      confidenceScore > 0.2
    ) {
      confidenceScore += 0.1;
    }
    // If it's mostly "other" lines despite some matches, penalize heavily
    if (
      totalNonCommentLines > 0 &&
      otherLinesCount > totalNonCommentLines * 0.4 &&
      confidenceScore > 0
    ) {
      // console.log(`INI Detector: High 'otherLinesCount' (${otherLinesCount}/${totalNonCommentLines}), penalizing.`);
      confidenceScore *= 0.3; // Drastic reduction
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status: Now primarily driven by the ratio of valid INI lines
    // A high ratio of structural lines is key.
    let isMatch = false;
    if (confidenceScore >= 0.45 && totalStructuralLines >= 1) {
      // Min confidence and at least one k/v or section
      isMatch = true;
    } else if (
      confidenceScore >= 0.3 &&
      totalStructuralLines >= 2 &&
      sectionHeadersCount > 0
    ) {
      // Slightly lower if sections are present
      isMatch = true;
    }

    // If the text is long and the ratio of INI lines was very poor, ensure it's not a match
    if (
      nonEmptyTrimmedLines.length > 10 &&
      totalNonCommentLines > 0 &&
      totalStructuralLines / totalNonCommentLines < 0.25
    ) {
      isMatch = false;
    }

    // If most lines contain URLs, it's definitely not a properties file
    const urlMatches = content.match(/https?:\/\/[^\s]+/gi);
    if (urlMatches && urlMatches.length >= nonEmptyTrimmedLines.length * 0.5) {
      isMatch = false;
    }

    if (confidenceScore < 0.2) {
      // Absolute floor
      isMatch = false;
    }

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive:
        isMatch &&
        confidenceScore > 0.6 &&
        totalStructuralLines / (totalNonCommentLines + 0.001) > 0.8,
    };
  }

  getFileExtension(): string {
    return "properties"; // Or 'ini'
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'ini'

    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // Monaco has built-in support for 'ini' which works well for .properties too
    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "source.ini", // More specific default
      ignoreCase: true,
      tokenPostfix: ".ini",

      tokenizer: {
        root: [
          [/^\s*[#;].*$/, "comment.ini"],
          [
            /^\s*\[/,
            { token: "metatag.ini", bracket: "@open", next: "@section" },
          ],

          // Regex 1: Key = Value with inline comment
          [
            /^\s*([^#;\s][^:=]*?)(\s*[:=]\s*)(.*?)(\s+[#;].*)$/,
            ["keyword.ini", "delimiter.ini", "string.ini", "comment.ini"],
          ],
          // Regex 2: Key = Value (no inline comment)
          [
            /^\s*([^#;\s][^:=]*?)(\s*[:=]\s*)(.*)$/,
            ["keyword.ini", "delimiter.ini", "string.ini"],
          ],
          // Regex 3: Key only
          [/^\s*([^#;\s][^:=]*?)\s*$/, "keyword.ini"],
        ],

        section: [
          [/[^\]]+/, "type.identifier.ini"],
          [/\]/, { token: "metatag.ini", bracket: "@close", next: "@pop" }],
        ],
      },
    });

    // Define a theme (optional, as 'vs-dark'/'vs' usually style these tokens well)
    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark", // or 'vs'
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" }, // Green for comments
        { token: "delimiter.square", foreground: "c586c0", fontStyle: "bold" }, // Magenta for [ ]
        { token: "type.identifier", foreground: "4EC9B0", fontStyle: "bold" }, // Teal for section names
        { token: "type", foreground: "9CDCFE" }, // Light blue for keys
        { token: "delimiter", foreground: "d4d4d4" }, // Grey for = or :
        { token: "string", foreground: "CE9178" }, // Orange for values
        { token: "source", foreground: "d4d4d4" },
      ],
      colors: {},
    });

    // Basic formatter: aligns '=' or ':' if present on consecutive lines (very heuristic)
    // Proper INI/Properties formatting can have more rules.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let maxKeyLengthBeforeDelim = 0;

        // First pass: find max key length for alignment
        lines.forEach((line: string) => {
          const trimmedLine = line.trim();
          if (!trimmedLine.startsWith("#") && !trimmedLine.startsWith(";")) {
            const match = trimmedLine.match(/^([\w.-]+)\s*([:=])/);
            if (match) {
              maxKeyLengthBeforeDelim = Math.max(
                maxKeyLengthBeforeDelim,
                match[1].length,
              );
            }
          }
        });

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          if (
            !trimmedLine ||
            trimmedLine.startsWith("#") ||
            trimmedLine.startsWith(";")
          ) {
            return line; // Keep comments and empty lines as is (or just trimmedLine for consistency)
          }

          const match = trimmedLine.match(/^([\w.-]+)(\s*[:=]\s*)(.*)$/);
          if (match) {
            const key = match[1];
            const delim = match[2].trim(); // Get just the delimiter
            const value = match[3].trim();
            const padding = " ".repeat(
              Math.max(0, maxKeyLengthBeforeDelim - key.length),
            );
            return `${key}${padding} ${delim} ${value}`;
          }
          return line; // Return original if no match (e.g., section headers)
        });

        return [
          {
            range: model.getFullModelRange(),
            text: formattedLines.join("\n"),
          },
        ];
      },
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
