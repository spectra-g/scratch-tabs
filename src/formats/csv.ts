// File path: csv.ts

import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

// Helper to escape characters for RegExp constructor
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * CSV/TSV language detector (Simplified)
 */
export class CsvFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "csv";
  name = "CSV / TSV";
  extensions = ["csv", "tsv", "txt"];
  priority = 2; // Still relatively low due to potential for false positives with simple text

  sampleContent(): string {
    return `ID,First Name,Last Name,Email
1,John,Doe,john.doe@example.com
2,Jane,Smith,jane.smith@example.com
3,Michael,Johnson,michael.j@example.com`;
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return this.noMatch();
    }

    const lines = content
      .split("\n")
      .map((line) => line.trimEnd()) // Keep leading spaces for tab detection, remove trailing
      .filter((line) => line.trim().length > 0); // Filter out fully empty/whitespace lines

    if (lines.length === 0) {
      return this.noMatch();
    }

    // --- 1. Determine Delimiter from the First Line ---
    const firstLine = lines[0];
    const candidateDelimiters = [",", "\t", ";", "|"];
    let chosenDelimiter: string | null = null;
    let expectedDelimiterCount = -1;

    let maxDelimiterFrequency = 0;

    for (const delim of candidateDelimiters) {
      const occurrences = (
        firstLine.match(new RegExp(escapeRegExp(delim), "g")) || []
      ).length;
      if (occurrences > 0 && occurrences > maxDelimiterFrequency) {
        maxDelimiterFrequency = occurrences;
        chosenDelimiter = delim;
      }
    }

    if (chosenDelimiter) {
      expectedDelimiterCount = maxDelimiterFrequency;
    } else {
      // No common delimiters found in the first line, treat as single-column case
      expectedDelimiterCount = 0;
    }

    // --- 2. Check All Non-Empty Lines for Consistency ---
    for (const line of lines) {
      let currentLineDelimiterCount: number;

      if (chosenDelimiter) {
        currentLineDelimiterCount = (
          line.match(new RegExp(escapeRegExp(chosenDelimiter), "g")) || []
        ).length;
      } else {
        // Single-column case: check if *any* candidate delimiter appears
        const hasAnyCandidateDelimiter = candidateDelimiters.some((d) =>
          line.includes(d),
        );
        currentLineDelimiterCount = hasAnyCandidateDelimiter ? -999 : 0; // -999 to fail the check
      }

      if (currentLineDelimiterCount !== expectedDelimiterCount) {
        // Any inconsistency means it's not CSV by this strict definition
        return this.noMatch();
      }
    }

    // --- 3. Stronger Checks to Prevent False Positives ---

    // Minimum delimiter requirement: Must have at least 3 delimiters to be considered CSV
    if (!chosenDelimiter || expectedDelimiterCount < 3) {
      return this.noMatch();
    }

    // Reject content that looks like JSON, XML, or other structured data
    const fullText = lines.join("\n");

    // Check for JSON-like patterns (braces, brackets)
    if (/^\s*[{[]/.test(fullText) && /[}\]]\s*$/.test(fullText)) {
      return this.noMatch();
    }

    // Check if most of the content consists of braces, brackets
    const braceContent = fullText.replace(/[^{}[\]]/g, "").length;
    const totalContent = fullText.length;
    if (braceContent > 0 && braceContent / totalContent > 0.1) {
      // If more than 10% of content is braces/brackets, likely not CSV
      return this.noMatch();
    }

    // A small check: if it's single-column and only one line, and very long, it's likely prose.
    if (
      lines.length === 1 &&
      firstLine.length > 80 &&
      firstLine.includes(" ")
    ) {
      // Check if it resembles typical prose rather than a single data value
      const wordCount = firstLine.trim().split(/\s+/).length;
      if (wordCount > 5) {
        // Arbitrary threshold: if more than 5 words, likely prose
        return this.noMatch();
      }
    }

    // Adjust confidence based on delimiter count and consistency
    const confidence = Math.min(0.9, 0.5 + expectedDelimiterCount * 0.05);
    return {
      match: true,
      confidence: confidence,
      matchedDefinitive: expectedDelimiterCount > 5, // Only definitive if many delimiters
    };
  }

  getFileExtension(): string {
    return "csv";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id;

    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // Basic Monarch tokenizer for CSV/TSV (same as before, very generic)
    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "text.csv",
      ignoreCase: true,
      tokenizer: {
        root: [
          [/,/, "delimiter.comma.csv"],
          [/\t/, "delimiter.tab.csv"],
          [/;/, "delimiter.semicolon.csv"],
          [/\|/, "delimiter.pipe.csv"],
          [/"([^"\\]|\\.)*"/, "string.quoted.double.csv"],
          [/'([^'\\]|\\.)*'/, "string.quoted.single.csv"],
          [/[^,\t;|"'""\r\n]+/, "identifier.csv"],
          [/["']/, "text.csv"],
        ],
      },
    });

    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        {
          token: "delimiter.comma.csv",
          foreground: "D4D4D4",
          fontStyle: "bold",
        },
        { token: "delimiter.tab.csv", foreground: "6A9955", fontStyle: "bold" },
        {
          token: "delimiter.semicolon.csv",
          foreground: "C586C0",
          fontStyle: "bold",
        },
        {
          token: "delimiter.pipe.csv",
          foreground: "569CD6",
          fontStyle: "bold",
        },
        { token: "string.quoted.double.csv", foreground: "CE9178" },
        { token: "string.quoted.single.csv", foreground: "CE9178" },
        { token: "identifier.csv", foreground: "9CDCFE" },
        { token: "text.csv", foreground: "D4D4D4" },
      ],
      colors: {
        "editor.foreground": "#d4d4d4",
      },
    });

    // Basic CSV formatter
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let detectedDelimiter = ",";

        if (lines.length > 0) {
          const header = lines[0];
          const counts = { ",": 0, "\t": 0, ";": 0, "|": 0 };
          for (const char of header) {
            if (char in counts) counts[char as keyof typeof counts]++;
          }
          let maxCount = 0;
          for (const [delim, count] of Object.entries(counts)) {
            if (count > maxCount) {
              maxCount = count;
              detectedDelimiter = delim;
            }
          }
          if (maxCount === 0 && header.length > 0) detectedDelimiter = ""; // Single column
        }

        const formattedLines = lines.map((line: string) => {
          if (!line.trim()) return line; // Preserve empty lines
          if (!detectedDelimiter) return line.trim();

          return line
            .split(detectedDelimiter)
            .map((field: string) => field.trim())
            .join(detectedDelimiter);
        });

        let finalText = formattedLines.join("\n");
        if (content.endsWith("\n") && finalText.trim() !== "") {
          if (!finalText.endsWith("\n")) {
            finalText += "\n";
          }
        } else {
          finalText = finalText.trimEnd();
        }

        return [
          {
            range: model.getFullModelRange(),
            text: finalText,
          },
        ];
      },
    });
  }
}

// Create and register the detector
const csvDetector = new CsvFormatDetector();
formatRegistry.register(csvDetector);

// Export for backward compatibility (optional)
export const registerCsvProvider = (monaco: any) => {
  csvDetector.registerProvider(monaco);
};
