import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types";

/**
 * Go language detector
 */
export class GoFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "go"; // Monaco's built-in ID for Go
  name = "Go";
  extensions = ["go"];
  priority = 7; // High priority due to distinctive syntax (e.g., package, func, import style)

  sampleContent(): string {
    return `package main

import (
    "fmt"
    "log"
    "net/http"
    "time"
)

// Message struct
type Message struct {
    Text string \`json:"text"\` // Struct tag example
}

// GreetHandler handles HTTP requests
func GreetHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, Go Web App! The time is %s", time.Now().Format(time.Kitchen))
}

func main() {
    // Simple variable declaration and usage
    message := Message{Text: "Starting server..."}
    fmt.Println(message.Text)

    // Goroutine example
    go func() {
        for i := 0; i < 5; i++ {
            log.Printf("Goroutine printing: %d\\n", i)
            time.Sleep(500 * time.Millisecond)
        }
    }()

    // Channel example (simple)
    done := make(chan bool)
    go func() {
        time.Sleep(1 * time.Second)
        done <- true
    }()

    http.HandleFunc("/", GreetHandler)
    log.Println("Server starting on :8080")

    // Start the server
    err := http.ListenAndServe(":8080", nil)
    if err != nil {
        log.Fatal("ListenAndServe: ", err)
    }

    <-done // Wait for the simple goroutine to complete (for demo)
    log.Println("Server and goroutine finished.")
}`;
  }

  /**
   * Detects if the given content matches Go patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) {
      return { match: false, confidence: 0.0 };
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // 1. Core Go Keywords and Structure (Definitive)
    const definitivePatterns = [
      { pattern: /^\s*package\s+[a-zA-Z_][a-zA-Z0-9_]*/m, weight: 0.4 },
      { pattern: /^\s*import\s+\(/m, weight: 0.3 },
      { pattern: /^\s*import\s+["'][\w./-]+["']/m, weight: 0.25 },
      {
        pattern: /\bfunc\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/g,
        weight: 0.25,
        perMatch: 0.05,
      },
      {
        pattern: /\btype\s+[A-Z][a-zA-Z0-9_]*\s+(?:struct|interface)\b/g,
        weight: 0.2,
        perMatch: 0.05,
      },
      {
        pattern: /\bfunc\s*\(\s*[\w\s*]+\s+[A-Z][\w*]*\s*\)\s+[a-zA-Z_]/g,
        weight: 0.25,
        perMatch: 0.05,
      },
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore += Math.min(matches.length, 3) * dp.perMatch;
        }
        patternsMatched++;
        strongSignalFound = true;
      }
    }

    // 2. Common Go Keywords and Idioms
    const commonPatterns = [
      { pattern: /\b(var|const)\s+\w+/g, weight: 0.1, perMatch: 0.02 },
      { pattern: /:=/g, weight: 0.15, perMatch: 0.03 },
      {
        pattern: /\b(if|for|switch|case|default|select|goto|defer|go|range)\b/g,
        weight: 0.1,
        perMatch: 0.02,
      },
      { pattern: /\bmake\s*\(/g, weight: 0.1, perMatch: 0.03 },
      {
        pattern: /\b(chan|map|slice|append|cap|len|new|close|panic|recover)\b/g,
        weight: 0.15,
        perMatch: 0.03,
      },
      {
        pattern: /\bfmt\.(Print|Scan|Error|Fprint|Sprint|Sscan)/g,
        weight: 0.15,
        perMatch: 0.03,
      },
      { pattern: /\blog\.(Print|Fatal|Panic)/g, weight: 0.1, perMatch: 0.02 },
      { pattern: /^\s*}\s*(else|elseif)\b/m, weight: 0.05 }, // Go only has `else if` or `else`
      { pattern: /`[^`]*`/g, weight: 0.05, perMatch: 0.01 },
    ];

    for (const cp of commonPatterns) {
      const matches = content.match(cp.pattern);
      if (matches) {
        confidenceScore += cp.weight;
        if (cp.perMatch) {
          confidenceScore += Math.min(matches.length, 5) * cp.perMatch;
        }
        patternsMatched++;
      }
    }

    // 3. Struct tags (very Go-specific)
    if (/\w+\s+`\w*:".*?"`/g.test(content)) {
      confidenceScore += 0.2;
      patternsMatched++;
      strongSignalFound = true; // This is a fairly strong signal for Go
    }

    // 4. Anti-patterns
    const antiPatterns = [
      { pattern: /#include\s*</i, weight: -0.5 },
      { pattern: /class\s+\w+/i, weight: -0.4 },
      { pattern: /System\.out\.println/i, weight: -0.4 },
      { pattern: /console\.log/i, weight: -0.3 },
      { pattern: /=>/i, weight: -0.4 }, // Adjusted from -0.5 as it could appear in comments.
      { pattern: /@\w+/i, weight: -0.3 },
      { pattern: /public\s+|private\s+|protected\s+/i, weight: -0.3 },
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 5. Final Adjustments and Clamping
    if (patternsMatched > 3 && strongSignalFound) {
      confidenceScore += 0.1;
    }
    // Corrected logic for main package and function:
    if (
      content.includes("package main") &&
      /\bfunc\s+main\s*\(\s*\)/m.test(content)
    ) {
      confidenceScore += 0.15; // Strong indication of a runnable Go program
      strongSignalFound = true; // This combination is a very strong signal
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch =
      (strongSignalFound && confidenceScore >= 0.4) ||
      (patternsMatched >= 3 && confidenceScore >= 0.5);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
    };
  }

  // countSpecificPatterns is now effectively part of detect's confidence calculation.
  // If you still need it for some other ambiguity resolution logic, you can keep it,
  // but ensure its patterns are distinct and meaningful for that purpose.
  // For now, I'll comment it out as its logic is integrated into detect().
  /*
  countSpecificPatterns(content: string): number {
    const specificPatterns = [
      /^package\s+main/m,
      /func\s+main\s*\(\s*\)/m,
      /type\s+[a-zA-Z_][a-zA-Z0-9_]*\s+struct/m,
      /func\s+\([^)]+\)\s+[a-zA-Z_]/m,
    ];
    return specificPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);
  }
  */

  getFileExtension(): string {
    return "go";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id;

    // Monaco has excellent built-in support for 'go'
    // Typically, no custom Monarch tokenizer or formatter is needed.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // If you needed to register a formatter (though gofmt via LSP is standard):
    // The basic indentation formatter you had is a reasonable heuristic for a simple scratchpad.
    // However, `gofmt` is the standard and is usually handled by an LSP.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        // A truly good Go formatter would invoke `gofmt` or a similar tool.
        // This is a placeholder for a very basic heuristic indentation.
        const content = model.getValue();
        const lines = content.split("\n");
        let indentLevel = 0;
        const indentChar = "\t"; // Go typically uses tabs

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          let currentIndent = "";

          // Handle lines that decrease indent (heuristic)
          if (
            trimmedLine.startsWith("}") ||
            trimmedLine.startsWith(")") ||
            trimmedLine.startsWith("]")
          ) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          // Handle 'case' and 'default' which often align with switch or previous case
          if (trimmedLine.match(/^(case\b|default\b)/) && indentLevel > 0) {
            currentIndent = indentChar.repeat(Math.max(0, indentLevel - 1));
          } else {
            currentIndent = indentChar.repeat(indentLevel);
          }

          const formattedLine = trimmedLine ? currentIndent + trimmedLine : "";

          // Handle lines that increase indent (heuristic)
          if (
            trimmedLine.endsWith("{") ||
            trimmedLine.endsWith("(") ||
            trimmedLine.endsWith("[")
          ) {
            indentLevel++;
          }
          // Specific for Go's switch/select cases
          if (trimmedLine.match(/^(case\b|default\b).*:/)) {
            indentLevel++;
          }

          return formattedLine;
        });

        return [
          {
            range: model.getFullModelRange(),
            text:
              formattedLines.join("\n").trimEnd() +
              (content.endsWith("\n") ? "\n" : ""), // Preserve trailing newline if present
          },
        ];
      },
    });
  }
}

// Create and register the detector
const goDetector = new GoFormatDetector();
formatRegistry.register(goDetector);

// Export for backward compatibility (optional)
export const registerGoProvider = (monaco: any) => {
  goDetector.registerProvider(monaco);
};
