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

  /**
   * Detects if the given content matches Bash/Shell and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 3) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false; // To track if a very shell-specific pattern was found

    const trimmedContent = content.trimStart();
    if (trimmedContent.startsWith('#!')) {
      const firstLine = trimmedContent.split('\n')[0].toLowerCase();
      if (firstLine.includes('/bash') || firstLine.includes('/sh') || firstLine.includes('/env bash') || firstLine.includes('/env sh')) {
        confidenceScore += 0.7;
        patternsMatched++;
        strongSignalFound = true;
      } else if (firstLine.length > 2) { // Other shebang
        return this.noMatch(); // If shebang is not for shell, it's definitely not shell
      }
    }

    // --- JavaScript/TypeScript Anti-Patterns (High Negative Weight) ---
    const jsAntiPatterns = [
      // ES6+ module syntax
      { pattern: /\bimport\s+(?:{[\s\S]*?}|[\w*]+)\s+from\s*['"]/i, weight: -0.5 },
      { pattern: /\bexport\s+(?:default|const|let|var|function|class)\b/i, weight: -0.5 },
      // Arrow functions
      { pattern: /=>\s*\{/i, weight: -0.4 },
      // Strict equality (less common in shell scripting)
      { pattern: /===|!==/g, weight: -0.3 },
      // JS-style function keyword with parentheses immediately after name
      { pattern: /\bfunction\s+\w+\s*\(/i, weight: -0.3 }, // Shell 'function name {' or 'name () {'
      // `let` and `const` are strong JS signals if not part of shell's `let` arithmetic
      { pattern: /\blet\s+[a-zA-Z_]\w*\s*=/g, weight: -0.2, except: /\blet\s+\w+\s*=\s*.*[+\-*/%].*/g }, // Penalize 'let x = y' unless it looks like arithmetic
      { pattern: /\bconst\s+\w+\s*=/g, weight: -0.4 },
      // Template literals with ${} are JS/TS, shell uses $VAR or ${VAR} but syntax is different
      { pattern: /`[^`]*\$\{.*?\}[^`]*`/gs, weight: -0.5 },
      // Common browser/Node.js globals
      { pattern: /\b(document|window|console\.log|require\s*\()['"]/i, weight: -0.3 },
      // Class syntax (more JS/TS like if not matching shell function syntax)
      { pattern: /\bclass\s+\w+\s*(?:extends\s+\w+\s*)?\{/i, weight: -0.3 },
    ];

    for (const ap of jsAntiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches) {
          let applyPenalty = true;
          if (ap.except) {
              if (ap.except.test(content)) applyPenalty = false;
          }
          if (applyPenalty) {
            // console.log(`SHELL ANTI-PATTERN HIT: ${ap.pattern.source}`);
            confidenceScore += ap.weight * Math.min(matches.length, 2); // Apply penalty
          }
      }
    }
    // If already very negative, bail early
    if (confidenceScore < -0.3) return this.noMatch();


    // --- Positive Shell Patterns ---
    const shellPatterns = [
      // Keywords and Structures
      { pattern: /\b(if|then|else|elif|fi|esac|done)\b/g, weight: 0.15, perMatch: 0.03, specific: true }, // `fi`, `esac`, `done` are quite specific
      { pattern: /\b(for|while|until|case|select)\s/g, weight: 0.1, perMatch: 0.02 }, // Loop/case keywords
      { pattern: /^\s*(?:function\s+)?\w+\s*\(\s*\)\s*\{/gm, weight: 0.2, perMatch: 0.05, specific: true }, // func_name() { or function func_name() {
      { pattern: /\b(echo|read|exit|export|unset|shift|eval|exec|source|alias|trap|getopts|printf|test|true|false|set|ulimit)\b/g, weight: 0.15, perMatch: 0.01, specific: true },
      { pattern: /\b\.\s+[\w./-]+/g, weight: 0.2, perMatch: 0.05, specific: true }, // Sourcing with `.`

      // Operators and Syntax
      { pattern: /\$@|\$#|\$\?|\$[0-9]|\$\$/g, weight: 0.2, perMatch: 0.05, specific: true },         // Special shell variables
      { pattern: /\$\{[^}]+\}/g, weight: 0.1, perMatch: 0.02 },                                // ${VAR} (can overlap with JS template literals if not careful, but JS specific one is penalized above)
      { pattern: /\$\([^\)]+\)/g, weight: 0.15, perMatch: 0.03, specific: true },                // $(command_substitution)
      { pattern: /`[^`]+`/g, weight: 0.1, perMatch: 0.02, specific: true },                      // `command_substitution_backticks`
      { pattern: /\[\[.*?\]\]/g, weight: 0.25, perMatch: 0.05, specific: true },                  // Bash `[[ ... ]]` test construct
      { pattern: /\[\s+[^\]]+\s+\]/g, weight: 0.15, perMatch: 0.02 },                             // POSIX `[ ... ]` test
      { pattern: /\b(?:let|declare|typeset|local)\s+\w+(?:=.*)?/g, weight: 0.15, perMatch: 0.03 }, // Shell variable declarations
      { pattern: />(?:&[0-9]|>)|<</g, weight: 0.15, perMatch: 0.03, specific: true },             // Redirections `>&1`, `>>`, `<<<` (herestring)
      { pattern: /\|\s*(?:grep|awk|sed|xargs|cut|tr|sort|uniq|head|tail|find)\b/g, weight: 0.2, perMatch: 0.05, specific: true }, // Common piping commands
      { pattern: /^\s*#.*$/gm, weight: 0.02, perMatch: 0.001 }, // Comments (very low weight, only if other signals are present)
    ];

    let shellSpecificHitsThisRound = 0;
    for (const p of shellPatterns) {
      const matches = content.match(p.pattern);
      if (matches) {
        // console.log(`SHELL PATTERN HIT: ${p.pattern.source} - weight: ${p.weight}`);
        confidenceScore += p.weight;
        if (p.perMatch) {
          confidenceScore += Math.min(matches.length, 5) * p.perMatch;
        }
        patternsMatched++;
        if (p.specific) {
          shellSpecificHitsThisRound++;
          strongSignalFound = true;
        }
      }
    }

    if (shellSpecificHitsThisRound > 0) {
      confidenceScore += Math.min(shellSpecificHitsThisRound, 4) * 0.05; // Bonus for variety of specific shell features
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Stricter conditions for shell
    const isMatch = (strongSignalFound && confidenceScore >= 0.40) || // Needs a strong signal
                    (patternsMatched >= 3 && shellSpecificHitsThisRound >=1 && confidenceScore >= 0.50); // Or multiple patterns with at least one specific and higher confidence

    // console.log(`SHELL Final: Score=${confidenceScore.toFixed(3)}, Patterns=${patternsMatched}, Specific=${shellSpecificHitsThisRound}, IsMatch=${isMatch}`);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound && shellSpecificHitsThisRound >=1
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
                 currentIndent = ' '.repeat(Math.max(0, indentLevel -1) * indentSize);
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