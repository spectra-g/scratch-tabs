// File path: bash.ts

import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";

/**
 * Bash/Shell language detector
 */
export class BashLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "shell";
  name = "Bash/Shell";
  extensions = ["sh", "bash", ".profile", ".bashrc", ".zshrc"];
  priority = 4;

  private coreShellKeywordsForRatio: Set<string>;
  private allShellKeywordsForPatterns: Set<string>;
  private commonShellCommandsForLineStart: Set<string>;

  constructor() {
    super();
    const CORE_SHELL_KEYWORDS_FOR_RATIO_LIST = [
      "ELIF",
      "FI",
      "ESAC",
      "GETOPTS",
      "ULIMIT",
      "TYPESET",
      "DECLARE",
      "LOCAL",
      "EXPORT",
      "UNSET",
      "SHIFT",
      "EVAL",
      "EXEC",
      "SOURCE",
      "ALIAS",
      "TRAP",
    ];
    this.coreShellKeywordsForRatio = new Set(
      CORE_SHELL_KEYWORDS_FOR_RATIO_LIST,
    );

    this.commonShellCommandsForLineStart = new Set(
      [
        "ECHO",
        "READ",
        "EXIT",
        "EXPORT",
        "UNSET",
        "SHIFT",
        "EVAL",
        "EXEC",
        "SOURCE",
        "SET",
        "CD",
        "LS",
        "MKDIR",
        "RM",
        "CP",
        "MV",
        "CAT",
        "GREP",
        "AWK",
        "SED",
        "FIND",
        "XARGS",
        "GIT",
        "DOCKER",
        "KUBECTL",
        "NPM",
        "YARN",
        "PIP",
        "SUDO",
        "APT-GET",
        "YUM",
        "BREW",
        "CURL",
        "WGET",
        "TAR",
        "GZIP",
        "BZIP2",
        "SSH",
        "SCP",
        "RSYNC",
        "CHMOD",
        "CHOWN",
      ].map((cmd) => cmd.toUpperCase()),
    );

    const ALL_SHELL_KEYWORDS_FOR_PATTERNS_LIST = [
      ...CORE_SHELL_KEYWORDS_FOR_RATIO_LIST,
      "IF",
      "THEN",
      "ELSE",
      "FOR",
      "WHILE",
      "UNTIL",
      "CASE",
      "SELECT",
      "DONE",
      "FUNCTION",
      "ECHO",
      "READ",
      "EXIT",
      "PRINTF",
      "TEST",
      "TRUE",
      "FALSE",
      "SET",
      "LET",
      "GREP",
      "AWK",
      "SED",
      "XARGS",
      "CUT",
      "TR",
      "SORT",
      "UNIQ",
      "HEAD",
      "TAIL",
      "FIND",
    ];
    this.allShellKeywordsForPatterns = new Set(
      ALL_SHELL_KEYWORDS_FOR_PATTERNS_LIST.map((kw) => kw.toUpperCase()),
    );
  }

  sampleContent(): string {
    /* ... same as before ... */
    return `
#!/bin/bash
# Variable declaration
greeting="Hello"
name="User"
# Function definition
function greet_user {
    echo "$greeting, $1!"
}
# Function to check if a number is even or odd
check_even_odd() { # Another common function syntax
    if (( $1 % 2 == 0 )); then
        echo "$1 is even."
    else
        echo "$1 is odd."
    fi
}
# Print greeting using the function
greet_user "$name"
# While loop example: count from 1 to 5
counter=1
while [ $counter -le 5 ]; do
    echo "Counter is $counter"
    ((counter++))
done
# Read user input
echo "Please enter a number to check if it's even or odd:"
read number
check_even_odd $number
# If-else example
echo "Checking if the number is greater than 10:"
if (( $number > 10 )); then
    echo "The number is greater than 10."
elif [ "$number" -eq 10 ]; then # Added elif for more variety
    echo "The number is exactly 10."
else
    echo "The number is less than 10."
fi
# Array example
numbers=("one" "two" "three" "four")
echo "Array of numbers: \${numbers[@]}"
# For loop example: Iterate through array
echo "Looping through the array:"
for num in "\${numbers[@]}"; do
    echo "Number: $num"
done
# Case example
echo "Enter a day of the week (e.g., Monday, Tuesday):"
read day
case $day in
    Monday)
        echo "Start of the week!"
        ;;
    Tuesday)
        echo "Second day of the week!"
        ;;
    *)
        echo "Unknown day!"
        ;;
esac
# Exit with a status code
echo "Exiting the script."
exit 0
    `;
  }

  detect(content: string): DetectionResult {
    const originalTrimmedContent = content.trim();
    if (!originalTrimmedContent || originalTrimmedContent.length < 3) {
      return this.noMatch();
    }

    let confidenceScore = 0.0; // This will be less critical now
    // `strongSignalFound` will primarily dictate the match
    let hasShellShebang = false;
    let shellSpecificSyntaxHits = 0;
    let coreKeywordTokenCount = 0;
    let linesStartingWithShellCmd = 0;

    let contentWithoutComments = content.replace(/^\s*#.*/gm, "");
    contentWithoutComments = contentWithoutComments.replace(
      /(^|[^#\\])#.*/g,
      "$1",
    );
    const linesForAnalysis = contentWithoutComments
      .split("\n")
      .filter((line) => line.trim().length > 0);
    const nonCommentContent = linesForAnalysis.join("\n");

    if (
      nonCommentContent.trim().length < 2 &&
      originalTrimmedContent.length > 10
    ) {
      return this.noMatch();
    }

    // --- 1. Shebang Check ---
    const trimmedContentStart = content.trimStart();
    if (trimmedContentStart.startsWith("#!")) {
      const firstLine = trimmedContentStart.split("\n")[0].toLowerCase();
      if (
        firstLine.includes("/bash") ||
        firstLine.includes("/sh") ||
        firstLine.includes("/zsh") ||
        firstLine.includes("/ksh") ||
        firstLine.includes("/env bash") ||
        firstLine.includes("/env sh")
      ) {
        hasShellShebang = true;
      } else if (
        firstLine.length > 2 &&
        (firstLine.includes("python") ||
          firstLine.includes("ruby") ||
          firstLine.includes("perl") ||
          firstLine.includes("node") ||
          firstLine.includes("php"))
      ) {
        return this.noMatch(); // Definitive other script
      }
      // An unknown shebang doesn't give a shell point but doesn't disqualify yet
    }

    // --- 2. Strong Anti-Patterns for other languages ---
    // If these are present, it's definitely not shell, even if a keyword matched.
    const langAntiPatterns = [
      /\bimport\s+(?:{[\s\S]*?}|[\w*]+)\s+from\s*['"]/i,
      /\bexport\s+(?:default|const|let|var|function|class)\b/i,
      /=>\s*\{/i, // JS/TS
      /^\s*<\?php/i,
      /(<html|<body|<div|<script|<style)/i, // PHP, HTML
      /^\s*package\s+[\w.]+;/m,
      /System\.out\.println/i, // Java
      /^\s*#include\s*</m, // C/C++
      /\bdef\s+\w+\s*\(.*?\)\s*:/m, // Python func: (colon is key)
      /\b(SELECT\b.*\bFROM\b|\bCREATE\s+TABLE\b)/gi, // SQL
      /^%YAML/m,
      /^\s*[\w.-]+:\s+(?:\||>|&\S+|\*\S+)/m, // YAML directive or block scalar
      /^diff --git/m,
      /^(?:--- a\/|\+\+\+ b\/)/m, // Diff
      /^\s*at\s+[\w$./\\()<>-]+:\d+(?::\d+)?/m,
      /(?:Exception|Error|panic|Traceback)(?:[:\s]|$)/i, // Stacktrace
      /^#{1,6}\s+.+/m,
      /^\s*-\s+\[[ xX]\]\s+.+/m,
      /^\s*>\s*.+/m,
      /!?\[.*?\]\(.*?\)/m, // Markdown structural elements
    ];
    for (const ap of langAntiPatterns) {
      if (ap.test(content)) {
        // console.log(`Shell Detector: Strong anti-pattern matched: ${ap.source}. Not Shell.`);
        return this.noMatch();
      }
    }

    // --- 3. Check for Specific Shell Syntax Elements ---
    const shellSyntaxPatterns = [
      /^\s*(?:function\s+)?\w[\w-]*\s*\(\s*\)\s*\{/, // function name() { (check start of line)
      /\$\([^\)]+\)/, // $(command_substitution)
      /`[^`]+`/, // `command_substitution_backticks`
      /\[\[.*?\]\]/, // [[ ... ]] test
      // More specific [ ... ] test, looking for common operators
      /\[\s+(?:[^\]"]|"[^"]*")+\s+(-eq|-ne|-gt|-lt|-ge|-le|==|!=|=~|!|-z|-n|-f|-d|-e)\s+(?:[^\]"]|"[^"]*")+\s+\]/,
      /\b(?:let|declare|typeset|local)\s+\w+(?:=.*)?/,
      />(?:&[0-9]|>)|<<<?|&\>/, // Redirections, Here strings/docs
      /\$@|\$#|\$\?|\$[0-9]|\$\$|\$\{[^}]+\}/, // Special shell vars and parameter expansion
    ];
    for (const p of shellSyntaxPatterns) {
      if (p.test(nonCommentContent)) {
        // Test on content without comments
        shellSpecificSyntaxHits++;
      }
    }

    // --- 4. Calculate Core Keyword Ratio & Line Starts ---
    if (linesForAnalysis.length > 0 && nonCommentContent.length > 10) {
      const shellTokenRegex =
        /([a-zA-Z_][\w-]*)|([$@#?*0-9]+(?:[=!]=?)?)|([(){};&|<=>!+\-/*`"']|>>|>|<|&&|\|\|)/g;
      const tokensFromContent: string[] = [];
      let matchToken;
      while ((matchToken = shellTokenRegex.exec(nonCommentContent)) !== null) {
        if (matchToken[0]) tokensFromContent.push(matchToken[0]);
      }
      const totalSignificantTokens = tokensFromContent.length;

      if (totalSignificantTokens > 8) {
        tokensFromContent.forEach((token) => {
          if (this.coreShellKeywordsForRatio.has(token.toUpperCase())) {
            coreKeywordTokenCount++;
          }
        });
      }
    }

    if (linesForAnalysis.length > 0) {
      linesForAnalysis.forEach((line) => {
        const firstWord = (
          line.trim().split(/\s+|;|\||&|\(|\)/)[0] || ""
        ).toUpperCase();
        if (this.commonShellCommandsForLineStart.has(firstWord)) {
          linesStartingWithShellCmd++;
        }
      });
    }

    // --- 5. Prose/Markdown Check (if no strong shell signals yet) ---
    // This runs if no shebang, no specific shell syntax, and few core keywords/line starts.
    if (
      !hasShellShebang &&
      shellSpecificSyntaxHits === 0 &&
      coreKeywordTokenCount < 2 &&
      linesStartingWithShellCmd < 2
    ) {
      // console.log("Shell Detector: Entering simplified Prose/MD check.");
      let markdownFeatureCount = 0;
      let sentenceLikeLines = 0;

      const mdHeaderRegex = /^\s*#{1,6}\s+/;
      const mdUnorderedListRegex = /^\s*[-*+]\s+(?!\[[ xX]\])/;
      const mdOrderedListRegex = /^\s*\d+\.\s+/;
      const mdBlockquoteRegex = /^\s*>\s+/;
      const mdFencedCodeStartRegex = /^```(\w+)?/;
      const mdLinkImageRegex = /!?\[[^\]]+\]\([^)]+\)/g;
      const mdBoldItalicStar = /(?:\*\*.*?\*\*|\*.*?\*)/g; // **bold** or *italic*
      const mdBoldItalicUnder = /(?:__.*?__|_.*?_)/g; // __bold__ or _italic_

      let nonCommentLineCountForProseCheck = 0;
      for (const line of linesForAnalysis.slice(0, 35)) {
        // Check up to 35 non-comment lines
        nonCommentLineCountForProseCheck++;
        const trimmedLine = line.trim();
        if (mdHeaderRegex.test(line)) markdownFeatureCount++;
        if (mdUnorderedListRegex.test(line)) markdownFeatureCount++;
        if (mdOrderedListRegex.test(line)) markdownFeatureCount++;
        if (mdBlockquoteRegex.test(line)) markdownFeatureCount++;
        if (mdFencedCodeStartRegex.test(line)) markdownFeatureCount += 2; // Fenced code is stronger MD
        if (trimmedLine.match(mdLinkImageRegex)) markdownFeatureCount += 2;
        if (
          trimmedLine.match(mdBoldItalicStar) ||
          trimmedLine.match(mdBoldItalicUnder)
        )
          markdownFeatureCount++;

        const words = trimmedLine.split(/\s+/);
        if (
          words.length >= 5 &&
          (trimmedLine.endsWith(".") ||
            trimmedLine.endsWith("!") ||
            trimmedLine.endsWith("?"))
        ) {
          sentenceLikeLines++;
        }
      }

      // If several MD features or sentence-like lines are found in a decent sample, it's not shell.
      if (
        nonCommentLineCountForProseCheck > 2 &&
        (markdownFeatureCount >= 3 || sentenceLikeLines >= 2)
      ) {
        // console.log(`Shell Detector: Prose/MD features found (MD: ${markdownFeatureCount}, Sentences: ${sentenceLikeLines}). Not Shell.`);
        return this.noMatch();
      }
    }

    // --- 6. Final Match Decision ---
    // A match requires strong, unambiguous signals.
    if (hasShellShebang) {
      // If shebang is present, and not overwhelmingly contradicted by anti-patterns (already checked), it's a match.
      // Confidence can be adjusted based on other factors if needed, but match is true.
      confidenceScore = 0.8; // Base for shebang
      if (shellSpecificSyntaxHits > 0) confidenceScore += 0.1;
      if (coreKeywordTokenCount > 0) confidenceScore += 0.05;
      return {
        match: true,
        confidence: Math.min(1.0, confidenceScore),
        matchedDefinitive: true,
      };
    }

    // Without shebang, need multiple specific syntax hits OR a good combo of core keywords and line starts.
    if (shellSpecificSyntaxHits >= 2) {
      // e.g., function definition + command substitution
      confidenceScore = 0.6;
      if (shellSpecificSyntaxHits >= 3) confidenceScore += 0.15;
      if (coreKeywordTokenCount > 0) confidenceScore += 0.1;
      return {
        match: true,
        confidence: Math.min(1.0, confidenceScore),
        matchedDefinitive: true,
      };
    }
    if (
      shellSpecificSyntaxHits === 1 &&
      (coreKeywordTokenCount >= 1 || linesStartingWithShellCmd >= 1)
    ) {
      confidenceScore = 0.45;
      if (coreKeywordTokenCount >= 2 || linesStartingWithShellCmd >= 2)
        confidenceScore += 0.1;
      return {
        match: true,
        confidence: Math.min(1.0, confidenceScore),
        matchedDefinitive: true,
      };
    }

    // Case for scripts without explicit functions or complex syntax, but with commands and core keywords
    // Thresholds here are important to avoid matching prose.
    if (
      coreKeywordTokenCount >= 2 &&
      linesStartingWithShellCmd >= 2 &&
      nonCommentContent.length > 20
    ) {
      confidenceScore = 0.35;
      if (coreKeywordTokenCount >= 3) confidenceScore += 0.1;
      if (linesStartingWithShellCmd >= 3) confidenceScore += 0.1;
      // Only match if prose/MD check didn't already rule it out (implied by not returning noMatch() earlier)
      return {
        match: true,
        confidence: Math.min(1.0, confidenceScore),
        matchedDefinitive: false,
      };
    }

    // If it's a short piece of text that happens to have one core keyword or one line start,
    // but no specific syntax and no shebang, it's too weak.
    // The prose/MD check should have caught longer texts.

    return this.noMatch(); // Default to no match if no strong conditions met
  }

  // registerProvider and getFileExtension methods remain the same
  registerProvider(monaco: any): void {
    /* ... same as before ... */
    monaco.languages.registerDocumentFormattingEditProvider("shell", {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let indentLevel = 0;
        const indentSize = 2;

        const formattedLines = lines.map((line: string) => {
          let trimmedLine = line.trim();

          if (trimmedLine.match(/^(fi|done|esac|\})$/)) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          let currentIndent = " ".repeat(indentLevel * indentSize);

          if (trimmedLine.match(/^(else|elif|then)$/) && indentLevel > 0) {
            currentIndent = " ".repeat(
              Math.max(0, indentLevel - 1) * indentSize,
            );
          }

          const formattedLine = currentIndent + trimmedLine;

          if (
            trimmedLine.match(/\b(if|for|while|case|until|select)\b|\{\s*$/) &&
            !trimmedLine.match(/\b(then|do|in)\s*$/) &&
            !trimmedLine.endsWith("}")
          ) {
            if (!trimmedLine.endsWith("do") && !trimmedLine.endsWith("then")) {
              indentLevel++;
            }
          } else if (
            trimmedLine.endsWith("do") ||
            trimmedLine.endsWith("then")
          ) {
            indentLevel++;
          }
          return formattedLine;
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
  getFileExtension(): string {
    return "sh";
  }
}

// Create and register the detector
const bashDetector = new BashLanguageDetector();
languageRegistry.register(bashDetector);

export const registerBashProvider = (monaco: any) => {
  bashDetector.registerProvider(monaco);
};
