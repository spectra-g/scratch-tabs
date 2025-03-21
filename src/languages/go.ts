import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Go language detector
 */
export class GoLanguageDetector extends BaseLanguageDetector {
  id = 'go';
  name = 'Go';
  extensions = ['go'];
  priority = 5;

  sampleContent(): string {
    return `package main

import (
    "fmt"
    "time"
)

type Task struct {
    ID        int
    Title     string
    Completed bool
    CreatedAt time.Time
}

func (t *Task) MarkCompleted() {
    t.Completed = true
}

func (t Task) String() string {
    status := " "
    if t.Completed {
        status = "✓"
    }
    return fmt.Sprintf("[%s] %d. %s", status, t.ID, t.Title)
}

func main() {
    // Create some tasks
    tasks := []Task{
        {ID: 1, Title: "Learn Go", CreatedAt: time.Now()},
        {ID: 2, Title: "Write tests", CreatedAt: time.Now()},
        {ID: 3, Title: "Build project", CreatedAt: time.Now()},
    }

    // Mark a task as completed
    tasks[0].MarkCompleted()

    // Print tasks
    fmt.Println("Task List:")
    fmt.Println("----------")
    for _, task := range tasks {
        fmt.Println(task)
    }
}`;
  }

  isMatch(content: string): boolean {
    const goPatterns = [
      /^package\s+[a-zA-Z_][a-zA-Z0-9_]*/m,     // Package declaration
      /import\s+\([^)]*\)/m,                     // Import block
      /func\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(/m,    // Function declaration
      /type\s+[a-zA-Z_][a-zA-Z0-9_]*\s+struct/m, // Struct declaration
      /func\s+\([^)]+\)\s+[a-zA-Z_]/m,          // Method declaration
      /make\s*\([^)]+\)/m,                       // make function
      /range\s+[a-zA-Z_]/m,                      // range keyword
      /fmt\.(Print|Scan)[^(]*\(/m,               // fmt package usage
    ];

    const matchCount = goPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);

    return matchCount >= 2;
  }

  countSpecificPatterns(content: string): number {
    const specificPatterns = [
      /^package\s+main/m,                        // Main package
      /func\s+main\s*\(\s*\)/m,                  // Main function
      /type\s+[a-zA-Z_][a-zA-Z0-9_]*\s+struct/m, // Struct definition
      /func\s+\([^)]+\)\s+[a-zA-Z_]/m,          // Method definition
    ];

    return specificPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);
  }

  registerProvider(monaco: any): void {
    monaco.languages.registerDocumentFormattingEditProvider('go', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        let indentLevel = 0;

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();

          // Decrease indent for closing braces
          if (trimmedLine.startsWith('}')) {
            indentLevel = Math.max(0, indentLevel - 1);
          }

          // Calculate current line's indentation
          const indent = '\t'.repeat(indentLevel);
          const formattedLine = trimmedLine ? indent + trimmedLine : '';

          // Increase indent after opening braces
          if (trimmedLine.endsWith('{')) {
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
}

// Create and register the detector
const goDetector = new GoLanguageDetector();
languageRegistry.register(goDetector);

// Export for backward compatibility
export const registerGoProvider = (monaco: any) => {
  goDetector.registerProvider(monaco);
};