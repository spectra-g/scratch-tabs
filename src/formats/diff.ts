import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * Diff/patch language detector
 */
export class DiffFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "diff"; // Monaco's built-in ID for diff files
  name = "Diff / Patch";
  extensions = ["diff", "patch", "rej"]; // .rej for rejected patches
  priority = 6; // Give it a good priority as its syntax is quite unique

  sampleContent(): string {
    return `diff --git a/example.txt b/example.txt
index 83db48f..bf269f1 100644
--- a/example.txt
+++ b/example.txt
@@ -1,3 +1,4 @@
-Line one removed
+Line one added
 Line two (context)
 Line three (context)
+Another added line
\\ No newline at end of file
diff --git a/another.txt b/another.txt
new file mode 100644
index 0000000..e69de29
--- /dev/null
+++ b/another.txt`;
  }

  /**
   * Detects if the given content matches Diff/Patch patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) {
      // Diff files usually have some header info
      return this.noMatch();
    }

    const trimmedContent = content.trim();
    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // 1. Strong, Definitive Diff/Patch Headers
    const definitiveHeaders = [
      { pattern: /^diff --git\s+a\/.*?b\/.*/m, weight: 0.6 }, // Git diff header (very strong)
      { pattern: /^--- \S+\s*(?:\(.*\)|$)/m, weight: 0.3 }, // --- a/file or --- /dev/null
      { pattern: /^\+\+\+ \S+\s*(?:\(.*\)|$)/m, weight: 0.3 }, // +++ b/file
      { pattern: /^@@\s*-\d+(?:,\d+)?\s*\+\d+(?:,\d+)?\s*@@/m, weight: 0.4 }, // Hunk header
      { pattern: /^Index:\s+\S+/m, weight: 0.25 }, // Index header (SVN, other diffs)
      { pattern: /^diff -u\s/m, weight: 0.3 }, // Unified diff header
      { pattern: /^diff -c\s/m, weight: 0.3 }, // Context diff header
      { pattern: /^Only in .*?: .*$/m, weight: 0.2 }, // "Only in" header for directory diffs
    ];

    for (const dp of definitiveHeaders) {
      if (dp.pattern.test(trimmedContent)) {
        confidenceScore += dp.weight;
        patternsMatched++;
        strongSignalFound = true;
      }
    }

    // 2. Line Change Indicators (-, +, space at the beginning of lines)
    // We need to be careful here as many files can have lines starting with these.
    // We look for a significant proportion of lines starting this way.
    const lines = trimmedContent.split("\n");
    if (lines.length > 1) {
      let diffLineCount = 0;
      let contextLineCount = 0;
      let otherLineCount = 0;
      const maxLinesToSample = Math.min(lines.length, 50); // Sample up to 50 lines

      for (let i = 0; i < maxLinesToSample; i++) {
        const line = lines[i];
        if (line.startsWith("+") && !line.startsWith("+++")) {
          diffLineCount++;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          diffLineCount++;
        } else if (line.startsWith(" ")) {
          // Context line
          contextLineCount++;
        } else if (
          !line.startsWith("diff ") &&
          !line.startsWith("index ") &&
          !line.startsWith("@@") &&
          line.trim() !== ""
        ) {
          // Exclude known headers from "other" lines to avoid penalizing valid diff files
          otherLineCount++;
        }
      }

      const totalSampledLines =
        diffLineCount + contextLineCount + otherLineCount;
      if (totalSampledLines > 0) {
        const diffLineRatio = diffLineCount / totalSampledLines;
        const contextLineRatio = contextLineCount / totalSampledLines;

        if (
          diffLineCount >= 1 &&
          (diffLineRatio > 0.2 ||
            (diffLineRatio + contextLineRatio > 0.5 && contextLineCount > 0))
        ) {
          // If more than 20% are +/- lines, or more than 50% are diff/context lines
          confidenceScore += Math.min(
            0.3,
            diffLineRatio * 0.5 + contextLineRatio * 0.2,
          );
          patternsMatched++;
          if (diffLineRatio > 0.1) strongSignalFound = true;
        } else if (diffLineRatio > 0.05 && lines.length < 10) {
          // For very short diffs
          confidenceScore += 0.1;
        }

        // Penalize if there are too many "other" lines without strong headers
        if (
          !strongSignalFound &&
          otherLineCount > (diffLineCount + contextLineCount) * 2 &&
          lines.length > 5
        ) {
          confidenceScore -= 0.2;
        }
      }
    }

    // 3. Special "No newline at end of file" indicator
    if (/^\\ No newline at end of file/m.test(trimmedContent)) {
      confidenceScore += 0.15;
      patternsMatched++;
    }

    // 4. Anti-patterns (Code that might have +/- but isn't a diff)
    const antiPatterns = [
      {
        pattern: /\b(function|class|var|let|const|import|export)\b/i,
        weight: -0.3,
      }, // JS/TS
      { pattern: /<\w+(\s+[\w-]+="[^"]*")*\s*\/?>/i, weight: -0.4 }, // HTML/XML tags
      { pattern: /public\s+static\s+void\s+main/i, weight: -0.4 }, // Java main
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(trimmedContent)) {
        // Only apply penalty if there weren't very strong diff signals already
        if (confidenceScore < 0.6) {
          confidenceScore += ap.weight;
        }
      }
    }

    // 5. Normalization and Clamping
    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    // Requires at least one strong signal or a good combination of weaker ones.
    const isMatch =
      (strongSignalFound && confidenceScore >= 0.35) ||
      (patternsMatched >= 2 && confidenceScore >= 0.5);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound,
    };
  }

  getFileExtension(): string {
    return "diff";
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

    // Use Monaco's built-in diff editor styling by assigning standard tokens.
    // The Monarch tokenizer should focus on identifying these standard categories.
    monaco.languages.setMonarchTokensProvider(languageId, {
      tokenizer: {
        root: [
          // Git diff headers
          [/^diff --git .*/, "keyword.diff.git"], // Custom or use 'keyword'
          [
            /^index [0-9a-fA-F]+\.\.[0-9a-fA-F]+(\s+\d+)?$/,
            "metatag.diff.index",
          ], // Custom or use 'metatag'
          [/^--- (a\/|\/dev\/null).*/, "comment.doc.diff.old"], // Custom or use 'comment.doc' or 'markup.deleted'
          [/^\+\+\+ b\/.*/, "comment.doc.diff.new"], // Custom or use 'comment.doc' or 'markup.inserted'

          // Unified/Context diff headers
          [/^--- \S+.*/, "comment.doc.diff.old"], // Generic --- old_file
          [/^\*\*\* \S+.*/, "comment.doc.diff.old"], // Context diff old file
          [/^\+\+\+ \S+.*/, "comment.doc.diff.new"], // Generic +++ new_file

          // Hunk headers
          [/^@@ .* @@.*/, "meta.diff.range"], // Standard for hunk header styling

          // Line changes
          [/^\+(?!\+\+).*/, "markup.inserted.diff"], // Added line (not +++)
          [/^-(?!-{2}).*/, "markup.deleted.diff"], // Removed line (not ---)
          [/^ .*/, ""], // Context line (no specific token, default styling)
          [/^!.*/, "emphasis.diff"], // Changed line in context diff (often ! prefix)

          // Special indicators
          [/^\\ No newline at end of file$/, "comment.diff.special"], // Custom or 'comment'

          // Other diff headers / lines
          [/^Index: .*/, "metatag.diff.index"],
          [/^=====/m, "delimiter.diff"], // Separator
          [/^RCS file:.*/, "comment"],
          [/^retrieving revision.*/, "comment"],
          [/^diff -[crNuUpaq]\s.*/, "keyword.diff.command"], // diff command options
          [/^Only in .*/, "comment.diff.only"],
          [/^Binary files .* differ$/, "comment.diff.binary"],

          // Comments that might appear in patches
          [/^#.*$/, "comment"],
        ],
      },
    });

    // Define a theme (optional, as 'vs-dark'/'vs' usually style diff tokens well)
    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark", // or 'vs'
      inherit: true,
      rules: [
        { token: "keyword.diff.git", foreground: "c586c0" }, // Magenta/Purple
        { token: "metatag.diff.index", foreground: "9cdcfe" }, // Light blue
        { token: "comment.doc.diff.old", foreground: "ce9178" }, // Orange-ish
        { token: "comment.doc.diff.new", foreground: "b5cea8" }, // Green-ish
        { token: "meta.diff.range", foreground: "569cd6", fontStyle: "bold" }, // Blue, bold
        // markup.inserted.diff and markup.deleted.diff are usually handled well by default themes
        { token: "emphasis.diff", foreground: "dcdcaa" }, // Yellowish for changed lines
        {
          token: "comment.diff.special",
          foreground: "6a9955",
          fontStyle: "italic",
        },
        { token: "delimiter.diff", foreground: "808080" },
        { token: "keyword.diff.command", foreground: "c586c0" },
        { token: "comment.diff.only", foreground: "6a9955" },
        { token: "comment.diff.binary", foreground: "6a9955" },
        { token: "comment", foreground: "6a9955" },
      ],
      colors: {},
    });

    // No specific formatter for diff, as its structure is rigid.
    // Formatting usually means ensuring line prefixes are correct, which is part of generation.
  }
}

// --- Registration ---
const diffDetector = new DiffFormatDetector();
formatRegistry.register(diffDetector);

// Optional: Export for explicit registration if needed elsewhere
export const registerDiffProvider = (monaco: any) => {
  diffDetector.registerProvider(monaco);
};
