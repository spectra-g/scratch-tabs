import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types'; // Import updated types

/**
 * Bash/Shell language detector
 */
export class BashLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'shell'; // Monaco often uses 'shell' for bash/sh
  name = 'Bash/Shell';
  extensions = ['sh', 'bash', '.profile', '.bashrc', '.zshrc']; // Added common shell script file names
  priority = 4; // Adjust priority as needed relative to other languages


  private coreShellKeywordsForRatio: Set<string>;
  private allShellKeywordsForPatterns: Set<string>;
  private commonShellCommandsForLineStart: Set<string>;

  constructor() {
    super();
    // CORE_SHELL_KEYWORDS_FOR_RATIO: *Extremely* unambiguous Shell-specific keywords.
    // These should almost never appear in regular prose.
    const CORE_SHELL_KEYWORDS_FOR_RATIO_LIST = [
        "ELIF", "FI", "ESAC", // Block terminators
        "GETOPTS", "ULIMIT", "TYPESET", // More specific commands/keywords
        // "FUNCTION" removed as "function" is common in prose. `function foo() {` is better handled by structural regex.
        // "DECLARE", "LOCAL", "EXPORT", "UNSET", "SHIFT", "EVAL", "EXEC", "SOURCE", "ALIAS", "TRAP" are okay.
        "DECLARE", "LOCAL", "EXPORT", "UNSET", "SHIFT", "EVAL", "EXEC", "SOURCE", "ALIAS", "TRAP"
    ];
    this.coreShellKeywordsForRatio = new Set(CORE_SHELL_KEYWORDS_FOR_RATIO_LIST);

    this.commonShellCommandsForLineStart = new Set([/* ... same as before ... */
        "ECHO", "READ", "EXIT", "EXPORT", "UNSET", "SHIFT", "EVAL", "EXEC", "SOURCE", "SET",
        "CD", "LS", "MKDIR", "RM", "CP", "MV", "CAT", "GREP", "AWK", "SED", "FIND", "XARGS",
        "GIT", "DOCKER", "KUBECTL", "NPM", "YARN", "PIP", "SUDO", "APT-GET", "YUM", "BREW",
        "CURL", "WGET", "TAR", "GZIP", "BZIP2", "SSH", "SCP", "RSYNC", "CHMOD", "CHOWN",
    ].map(cmd => cmd.toUpperCase()));


    const ALL_SHELL_KEYWORDS_FOR_PATTERNS_LIST = [
        ...CORE_SHELL_KEYWORDS_FOR_RATIO_LIST, // Includes the very core set
        "IF", "THEN", "ELSE", "FOR", "WHILE", "UNTIL", "CASE", "SELECT", "DONE", // Control flow
        "FUNCTION", // The keyword "function"
        "ECHO", "READ", "EXIT", "PRINTF", "TEST", "TRUE", "FALSE", "SET", "LET",
        "GREP", "AWK", "SED", "XARGS", "CUT", "TR", "SORT", "UNIQ", "HEAD", "TAIL", "FIND"
    ];
    this.allShellKeywordsForPatterns = new Set(ALL_SHELL_KEYWORDS_FOR_PATTERNS_LIST.map(kw => kw.toUpperCase()));
  }


  sampleContent(): string {
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

    let confidenceScore = 0.0;
    let patternsMatchedTypeCount = 0; // How many *types* of patterns matched
    let strongSignalFound = false;
    let shellSpecificSyntaxHits = 0;  // Count of hits from specific syntax patterns (like [[...]], $(...), etc.)
    let actualKeywordTokenHits = 0;   // Count of tokens matching allShellKeywordsForPatterns

    let contentWithoutComments = content.replace(/^\s*#.*/gm, '');
    contentWithoutComments = contentWithoutComments.replace(/(^|[^#\\])#.*/g, '$1');
    const linesForAnalysis = contentWithoutComments.split('\n').filter(line => line.trim().length > 0);
    const nonCommentContent = linesForAnalysis.join('\n');

    if (nonCommentContent.trim().length < 2 && originalTrimmedContent.length > 10) { // Min length for original to avoid trivial content
      // console.log("Shell Detector: Content became too short after comment removal.");
      return this.noMatch();
    }

    // --- Shebang Check ---
    let hasShellShebang = false;
    const trimmedContentStart = content.trimStart();
    if (trimmedContentStart.startsWith('#!')) {
      // ... (same shebang logic as before, sets hasShellShebang, adjusts confidenceScore)
      const firstLine = trimmedContentStart.split('\n')[0].toLowerCase();
      if (firstLine.includes('/bash') || firstLine.includes('/sh') || firstLine.includes('/zsh') || firstLine.includes('/ksh') || firstLine.includes('/env bash') || firstLine.includes('/env sh')) {
        confidenceScore += 0.60; // Strong signal, but not absolute
        patternsMatchedTypeCount++;
        strongSignalFound = true;
        hasShellShebang = true;
        actualKeywordTokenHits++;
      } else if (firstLine.length > 2 && (firstLine.includes('python') || firstLine.includes('ruby') || firstLine.includes('perl') || firstLine.includes('node'))) {
        return this.noMatch();
      } else if (firstLine.length > 2) {
        confidenceScore -= 0.5;
      }
    }

    // --- Anti-Patterns (JS/TS, HTML, other languages) ---
    // (Keep your JS anti-patterns, they are good. Add others if needed)
    const langAntiPatterns = [
      // ... same as before, ensure weights are aggressive enough, e.g., -0.7 to -0.9
      { pattern: /\bimport\s+(?:{[\s\S]*?}|[\w*]+)\s+from\s*['"]/i, weight: -0.8 },
      { pattern: /\bexport\s+(?:default|const|let|var|function|class)\b/i, weight: -0.8 },
      { pattern: /=>\s*\{/i, weight: -0.7 },
      { pattern: /^\s*<\?php/i, weight: -0.9 },
      { pattern: /(<html|<body|<div|<script)/i, weight: -0.9 },
      { pattern: /^\s*package\s+[\w.]+;/m, weight: -0.9 },
      { pattern: /System\.out\.println/i, weight: -0.8 },
      { pattern: /^\s*#include\s*</m, weight: -0.9 },
      { pattern: /\bdef\s+\w+\s*\(.*?\):/m, weight: -0.8 },
      { pattern: /\b(SELECT\b.*\bFROM\b|\bCREATE\s+TABLE\b)/gi, weight: -0.5 } // SQL fragments
    ];

    for (const ap of langAntiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches) {
        confidenceScore += ap.weight * Math.min(matches.length, 2);
      }
    }
    if (confidenceScore < -0.6) return { match: false, confidence: 0, matchedDefinitive: false };


    // --- Lines Starting with Shell Keywords/Commands Heuristic ---
    let linesStartingWithShellPattern = 0;
    if (linesForAnalysis.length > 0) {
      // ... (same logic as before using this.coreShellKeywordsForRatio and this.commonShellCommandsForLineStart)
      linesForAnalysis.forEach(line => {
        const firstWord = (line.trim().split(/\s+|;|\||&|\(|\)/)[0] || "").toUpperCase(); // More splitters
        if (this.coreShellKeywordsForRatio.has(firstWord) || this.commonShellCommandsForLineStart.has(firstWord)) {
          linesStartingWithShellPattern++;
        }
      });

      if (linesForAnalysis.length >= 1 && linesStartingWithShellPattern > 0) {
        const ratioLinesStartShell = linesStartingWithShellPattern / linesForAnalysis.length;
        if (ratioLinesStartShell >= 0.3 && linesForAnalysis.length >= 1) { // Stricter: 30% for a good boost
          confidenceScore += 0.20; strongSignalFound = true; patternsMatchedTypeCount++;
        } else if (ratioLinesStartShell >= 0.1 && linesForAnalysis.length >= 2) {
          confidenceScore += 0.10; strongSignalFound = true; patternsMatchedTypeCount++;
        }
      } else if (linesForAnalysis.length > 8 && linesStartingWithShellPattern === 0 && !hasShellShebang) {
        confidenceScore -= 0.25;
      }
    }

    // --- Keyword-to-Token Ratio (using coreShellKeywordsForRatio) ---
    let keywordRatio = -1.0; // Initialize to a value indicating not calculated or not applicable
    let totalSignificantTokens = 0;
    let coreKeywordTokenCountForRatio = 0;

    if (linesForAnalysis.length > 0 && nonCommentContent.length > 10) { // Min length for non-comment content
      const shellTokenRegex = /([a-zA-Z_][\w-]*)|([$@#?*0-9]+(?:[=!]=?)?)|(\$\([^\)]*\))|(`[^`]*`)|(\$\{[^}]*\})|(\[\[.*?\]\])|(\[.*?\])|([(){};&|<=>!+-/*`"']|>>|>|<|&&|\|\|)/g;
      const tokensFromContent: string[] = [];
      let matchToken;
      while ((matchToken = shellTokenRegex.exec(nonCommentContent)) !== null) {
        if (matchToken[0]) tokensFromContent.push(matchToken[0]);
      }
      totalSignificantTokens = tokensFromContent.length;

      if (totalSignificantTokens > 8) { // Min tokens for ratio to be somewhat reliable
        tokensFromContent.forEach(token => {
          if (this.coreShellKeywordsForRatio.has(token.toUpperCase())) {
            coreKeywordTokenCountForRatio++;
          }
        });
        actualKeywordTokenHits = tokensFromContent.filter(t => this.allShellKeywordsForPatterns.has(t.toUpperCase())).length;
        if (hasShellShebang) actualKeywordTokenHits++;

        if (totalSignificantTokens > 0) {
          keywordRatio = coreKeywordTokenCountForRatio / totalSignificantTokens;
          // console.log(`Shell Detector: Ratio (Core)=${keywordRatio.toFixed(3)}, CoreKeys=${coreKeywordTokenCountForRatio}, TotalTokens=${totalSignificantTokens}, AllKeysHit=${actualKeywordTokenHits}`);

          const MIN_SHELL_RATIO_FLOOR = 0.015; // Very strict floor, e.g., 1.5% for core keywords
          const MIN_TOKENS_FOR_SHELL_RATIO_CHECK = 40; // Apply to texts with at least 40 tokens

          if (totalSignificantTokens > MIN_TOKENS_FOR_SHELL_RATIO_CHECK && keywordRatio < MIN_SHELL_RATIO_FLOOR && coreKeywordTokenCountForRatio < 1) {
            // console.log(`Shell Detector: Exit. Very low CORE ratio (${keywordRatio.toFixed(3)}) and 0 core hits.`);
            return this.noMatch();
          }

          if (keywordRatio < 0.02 && totalSignificantTokens > 50 && !strongSignalFound && linesStartingWithShellPattern < 1) {
            confidenceScore *= 0.1; // Massive penalty
          } else if (keywordRatio < 0.04 && totalSignificantTokens > 60) {
            confidenceScore *= 0.4;
          } else if (keywordRatio >= 0.08 && coreKeywordTokenCountForRatio >= 1) { // Needs at least one core keyword
            confidenceScore += 0.15; strongSignalFound = true;
          }
        }
      }
    }
    // --- End Ratio Calculation ---

    // --- Positive Shell Syntax Patterns (on nonCommentContent) ---
    // These patterns should be for syntax elements, not just keywords (keywords are in ratio).
    // Reduce weights if they are very generic.
    const shellSyntaxPatterns = [
      // Control structures with specific shell syntax (fi, esac, done are already in core keywords)
      { pattern: /^\s*(?:function\s+)?\w[\w-]*\s*\(\s*\)\s*\{/gm, weight: 0.15, perMatch: 0.04, specific: true }, // function name() {
      { pattern: /\$\{[^}]+\}/g, weight: 0.05, perMatch: 0.01 }, // ${VAR} - *careful, overlaps with JS template strings if JS anti-pattern fails*
      { pattern: /\$\([^\)]+\)/g, weight: 0.15, perMatch: 0.03, specific: true }, // $(command_substitution)
      { pattern: /`[^`]+`/g, weight: 0.10, perMatch: 0.02, specific: true }, // `command_substitution_backticks`
      { pattern: /\[\[.*?\]\]/g, weight: 0.20, perMatch: 0.04, specific: true }, // [[ ... ]] test
      // POSIX test `[ ... ]` - This is very problematic for prose. Make it very specific or remove.
      // Stricter: requires common test operators inside
      { pattern: /\[\s+(?:[^\]"]|"[^"]*")+\s+(-eq|-ne|-gt|-lt|-ge|-le|==|!=|=~|!|-z|-n|-f|-d|-e)\s+(?:[^\]"]|"[^"]*")+\s+\]/g, weight: 0.15, perMatch: 0.03, specific: true },
      { pattern: /\b(?:let|declare|typeset|local)\s+\w+(?:=.*)?/g, weight: 0.10, perMatch: 0.02, specific: true },
      { pattern: />(?:&[0-9]|>)|<<<?/g, weight: 0.15, perMatch: 0.03, specific: true }, // Redirections, Here strings/docs
      { pattern: /\|\s*\w+/g, weight: 0.05, perMatch: 0.01 }, // Simple pipe `| command`
      { pattern: /\$@|\$#|\$\?|\$[0-9]|\$\$/g, weight: 0.18, perMatch: 0.04, specific: true }, // Special shell vars
    ];

    for (const p of shellSyntaxPatterns) {
      const matches = nonCommentContent.match(p.pattern);
      if (matches) {
        confidenceScore += p.weight;
        if (p.perMatch) {
          confidenceScore += Math.min(matches.length, 3) * p.perMatch; // Reduced cap
        }
        patternsMatchedTypeCount++;
        if (p.specific) {
          shellSpecificSyntaxHits += matches.length;
          strongSignalFound = true;
        }
      }
    }
    if (shellSpecificSyntaxHits > 0) {
      confidenceScore += Math.min(shellSpecificSyntaxHits, 3) * 0.03; // Reduced bonus
    }
    actualKeywordTokenHits = Math.max(actualKeywordTokenHits, shellSpecificSyntaxHits);


    // --- Prose Anti-Pattern (Strengthened) ---
    if (linesForAnalysis.length > 3 && actualKeywordTokenHits < 2 && shellSpecificSyntaxHits < 1 && (keywordRatio === -1.0 || keywordRatio < 0.03) && !hasShellShebang && linesStartingWithShellPattern === 0) {
      let sentenceLikeLines = 0;
      let totalWordsInSample = 0;
      let colonHeavyLines = 0; // Lines like "Feature: description"
      const commonEnglishWords = new Set(['THE', 'A', 'AN', 'IS', 'ARE', 'WAS', 'WERE', 'BE', 'TO', 'OF', 'AND', 'IN', 'IT', 'FOR', 'WITH', 'ON', 'AT', 'BY', 'FROM', 'AS', 'IF', 'OR', 'BUT', 'SO', 'MY', 'YOUR', 'THIS', 'THAT', 'CAN', 'SHOULD', 'USER', 'TAB', 'MODAL', 'VIEW', 'DATA', 'CODE']);

      linesForAnalysis.slice(0, 25).forEach(line => { // Analyze more lines for prose
        const trimmedLine = line.trim();
        if (trimmedLine.length < 15) return; // Ignore very short lines

        const words = trimmedLine.split(/[\s():;,."[]{}]+/); // More splitters for prose
        totalWordsInSample += words.length;

        if (trimmedLine.includes(': ') && words.length < 8 && words.length > 1 && /^[A-Z]/.test(words[0])) {
          // Check if the first word (potential key) is NOT a shell keyword/command
          if (!this.allShellKeywordsForPatterns.has(words[0].toUpperCase()) && !this.commonShellCommandsForLineStart.has(words[0].toUpperCase())) {
            colonHeavyLines++;
          }
        }

        if (words.length >= 5 && (trimmedLine.endsWith('.') || trimmedLine.endsWith(':'))) {
          let commonFound = 0;
          let properNounsOrAcronyms = 0;
          words.forEach(w => {
            const cleanWord = w.replace(/[.,:?]/g, '');
            if (commonEnglishWords.has(cleanWord.toUpperCase())) commonFound++;
            if (cleanWord.length > 1 && /^[A-Z]+$/.test(cleanWord) && cleanWord !== "UI") properNounsOrAcronyms++; // Count ALL CAPS as potential non-prose if too many
          });

          // If many common English words and not too many all-caps "keywords"
          if (commonFound / words.length > 0.35 && properNounsOrAcronyms < words.length * 0.3) {
            sentenceLikeLines++;
          }
        }
      });

      if ((sentenceLikeLines >= 3 || colonHeavyLines >= 3) && totalWordsInSample > 40) {
        // console.log(`Shell Detector: Prose-like (sentences: ${sentenceLikeLines}, colons: ${colonHeavyLines}). Strong penalty. Current score: ${confidenceScore.toFixed(3)}`);
        confidenceScore = Math.max(-1.0, confidenceScore * 0.05); // Very strong penalty
      } else if (sentenceLikeLines >= 2) {
        confidenceScore = Math.max(-0.5, confidenceScore * 0.3);
      }
    }
    // --- End Prose Anti-Pattern ---

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore)); // Max 0 for score before this point.

    let isMatch = false;
    if (hasShellShebang && confidenceScore >= 0.45) {
      isMatch = true;
    } else if (strongSignalFound && shellSpecificSyntaxHits >= 1 && confidenceScore >= 0.25) { // Lowered threshold if truly specific syntax found
      isMatch = true;
    } else if (patternsMatchedTypeCount >= 2 && shellSpecificSyntaxHits >= 1 && confidenceScore >= 0.35) {
      isMatch = true;
    } else if (keywordRatio >= 0.07 && coreKeywordTokenCountForRatio >= 1 && linesStartingWithShellPattern > 0 && confidenceScore >= 0.30) { // Ratio + line starts
      isMatch = true;
    }

    // Final check: if score is positive but very low, and text is long with few distinguishing shell features -> not a match
    if (isMatch && confidenceScore < 0.15 && originalTrimmedContent.length > 300 && actualKeywordTokenHits < 3 && shellSpecificSyntaxHits < 1 && !hasShellShebang) {
      isMatch = false;
    }
    if (confidenceScore < 0.05 && originalTrimmedContent.length > 100) { // Absolute floor for longer texts
      isMatch = false;
    }

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && (hasShellShebang || (strongSignalFound && shellSpecificSyntaxHits >= 1 && confidenceScore > 0.50))
    };
  }

  // registerProvider method can remain the same
  registerProvider(monaco: any): void {
    // Configure Shell formatting provider
    monaco.languages.registerDocumentFormattingEditProvider('shell', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        // Your existing basic formatter logic is a good start.
        // For truly robust shell formatting, you'd typically rely on an external tool
        // or a more sophisticated parser.
        // The provided formatter is a heuristic approach.
        const lines = content.split('\n');
        let indentLevel = 0;
        const indentSize = 2; // Or 4, common in shell

        const formattedLines = lines.map((line: string) => {
          let trimmedLine = line.trim();

          // Handle lines that decrease indent
          if (trimmedLine.match(/^(fi|done|esac|\})$/)) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          let currentIndent = ' '.repeat(indentLevel * indentSize);

          // Handle lines that shouldn't indent further or are part of else/elif
          if (trimmedLine.match(/^(else|elif|then)$/) && indentLevel > 0) {
            currentIndent = ' '.repeat(Math.max(0, indentLevel - 1) * indentSize);
          }


          const formattedLine = currentIndent + trimmedLine;

          // Handle lines that increase indent for the next line
          if (trimmedLine.match(/\b(if|for|while|case|until|select)\b|\{\s*$/) && !trimmedLine.match(/\b(then|do|in)\s*$/) && !trimmedLine.endsWith("}")) {
            if (!trimmedLine.endsWith("do") && !trimmedLine.endsWith("then")) { // Avoid double indent for one-liners
              indentLevel++;
            }
          } else if (trimmedLine.endsWith("do") || trimmedLine.endsWith("then")) {
            indentLevel++;
          }


          return formattedLine;
        });

        return [{
          range: model.getFullModelRange(),
          text: formattedLines.join('\n')
        }];
      }
    });
  }

  getFileExtension(): string {
    return 'sh';
  }
}

// Create and register the detector
const bashDetector = new BashLanguageDetector();
languageRegistry.register(bashDetector);

// Export for backward compatibility if still needed elsewhere, though ideally, all consumers use the registry.
export const registerBashProvider = (monaco: any) => {
  bashDetector.registerProvider(monaco);
};