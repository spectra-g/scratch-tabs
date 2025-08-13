import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * INI format detector - focuses on section-based configuration files
 */
export class IniFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "ini";
  name = "INI";
  extensions = ["ini", "cfg", "conf", ".gitconfig"];
  priority = 5; // Strong format when sections are present

  sampleContent(): string {
    return `# INI Configuration File
; Alternative comment style

[database]
host = localhost
port = 5432
user = db_user
password = secret_password

[application]
name = My Application
version = 1.0.0
debug_mode = false

[logging]
level = INFO
file = /var/log/app.log

[user_preferences]
theme = dark
notifications = true
font_size = 12
`;
  }

  /**
   * Detects INI files by looking for [section] headers as primary signal
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 3) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let keyValuePairsCount = 0;
    let sectionHeadersCount = 0;
    let commentLinesCount = 0;
    let otherLinesCount = 0;

    const lines = content.split("\n");
    const nonEmptyTrimmedLines = lines
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // Allow fewer lines for sections-only INI files
    if (nonEmptyTrimmedLines.length <= 2) {
      return this.noMatch();
    }

    const keyValueRegex = /^\s*([a-zA-Z0-9_.-]+)\s*([:=])\s*(.*)/;
    const sectionRegex = /^\s*\[([^\]]+)\]\s*$/;
    const urlRegex = /https?:\/\/[^\s]+/i;

    for (const line of nonEmptyTrimmedLines) {
      if (line.startsWith("#") || line.startsWith(";")) {
        commentLinesCount++;
      } else if (sectionRegex.test(line)) {
        sectionHeadersCount++;
      } else if (urlRegex.test(line)) {
        otherLinesCount++;
      } else if (keyValueRegex.test(line)) {
        keyValuePairsCount++;
      } else {
        otherLinesCount++;
      }
    }

    // CRITICAL: Must have at least one section header for INI format
    if (sectionHeadersCount === 0) {
      return this.noMatch();
    }

    // Primary signal: presence of sections gives high base confidence
    confidenceScore += 0.7;

    const totalNonCommentLines = nonEmptyTrimmedLines.length - commentLinesCount;
    const totalStructuralLines = keyValuePairsCount + sectionHeadersCount;

    if (totalNonCommentLines > 0) {
      const ratioValidIniLines = totalStructuralLines / totalNonCommentLines;
      
      if (ratioValidIniLines >= 0.85) {
        confidenceScore += 0.2;
      } else if (ratioValidIniLines >= 0.65) {
        confidenceScore += 0.1;
      } else if (ratioValidIniLines < 0.4) {
        confidenceScore -= 0.3;
      }
    }

    // Bonus for having key-value pairs after sections
    if (keyValuePairsCount > 0 && sectionHeadersCount > 0) {
      confidenceScore += 0.05;
    }

    // Penalty if key-value pairs appear before first section
    let foundFirstSection = false;
    let preferenceSectionPenalty = 0;
    for (const line of nonEmptyTrimmedLines) {
      if (line.startsWith("#") || line.startsWith(";")) {
        continue;
      }
      if (sectionRegex.test(line)) {
        foundFirstSection = true;
      } else if (!foundFirstSection && keyValueRegex.test(line)) {
        preferenceSectionPenalty += 0.1;
      }
    }
    confidenceScore -= Math.min(preferenceSectionPenalty, 0.3);

    // Anti-patterns
    const antiPatterns = [
      { pattern: /\{|\}/g, weight: -0.4, threshold: 2 },
      { pattern: /<\w.*?>/g, weight: -0.5, threshold: 1 },
      {
        pattern: /\b(function|class|var|let|const|import|export|def|public|private)\b/i,
        weight: -0.6,
        threshold: 1,
      },
      {
        pattern: /\b(SELECT|FROM|WHERE|UPDATE|INSERT|CREATE|DROP|ALTER|DELETE)\b/i,
        weight: -0.6,
        threshold: 2,
      },
      { pattern: /=>|->|#!/g, weight: -0.5, threshold: 1 },
      { pattern: /https?:\/\/[^\s]+/gi, weight: -0.8, threshold: 1 },
    ];

    for (const ap of antiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches && matches.length >= ap.threshold) {
        // Be more lenient with URLs in INI files (they can appear in git configs)
        if (ap.pattern.source.includes("https")) {
          // Only penalize heavily if there are many URLs relative to total lines
          const urlRatio = matches.length / nonEmptyTrimmedLines.length;
          if (urlRatio > 0.3) {
            confidenceScore += ap.weight * Math.min(matches.length, 2);
          }
        } else if (confidenceScore < 0.7 || ap.pattern.source.includes("SELECT")) {
          confidenceScore += ap.weight;
        }
      }
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match: must have sections and reasonable confidence
    // Allow sections-only files with lower confidence threshold
    const isMatch = sectionHeadersCount >= 1 && 
      (confidenceScore >= 0.5 || (keyValuePairsCount === 0 && confidenceScore >= 0.4));

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && confidenceScore > 0.7 && sectionHeadersCount >= 1,
    };
  }

  getFileExtension(): string {
    return "ini";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id;

    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });
    }

    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "source.ini",
      ignoreCase: true,
      tokenPostfix: ".ini",

      tokenizer: {
        root: [
          [/^\s*[#;].*$/, "comment.ini"],
          [
            /^\s*\[/,
            { token: "metatag.ini", bracket: "@open", next: "@section" },
          ],
          [
            /^\s*([^#;\s][^:=]*?)(\s*[:=]\s*)(.*?)(\s+[#;].*)$/,
            ["keyword.ini", "delimiter.ini", "string.ini", "comment.ini"],
          ],
          [
            /^\s*([^#;\s][^:=]*?)(\s*[:=]\s*)(.*)$/,
            ["keyword.ini", "delimiter.ini", "string.ini"],
          ],
          [/^\s*([^#;\s][^:=]*?)\s*$/, "keyword.ini"],
        ],

        section: [
          [/[^\]]+/, "type.identifier.ini"],
          [/\]/, { token: "metatag.ini", bracket: "@close", next: "@pop" }],
        ],
      },
    });

    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "delimiter.square", foreground: "c586c0", fontStyle: "bold" },
        { token: "type.identifier", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "type", foreground: "9CDCFE" },
        { token: "delimiter", foreground: "d4d4d4" },
        { token: "string", foreground: "CE9178" },
        { token: "source", foreground: "d4d4d4" },
      ],
      colors: {},
    });

    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let maxKeyLengthBeforeDelim = 0;

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
            return line;
          }

          const match = trimmedLine.match(/^([\w.-]+)(\s*[:=]\s*)(.*)$/);
          if (match) {
            const key = match[1];
            const delim = match[2].trim();
            const value = match[3].trim();
            const padding = " ".repeat(
              Math.max(0, maxKeyLengthBeforeDelim - key.length),
            );
            return `${key}${padding} ${delim} ${value}`;
          }
          return line;
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
const iniDetector = new IniFormatDetector();
formatRegistry.register(iniDetector);

// Export for backward compatibility
export const registerIniProvider = (monaco: any) => {
  iniDetector.registerProvider(monaco);
};