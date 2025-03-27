import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Python language detector
 */
export class PythonLanguageDetector extends BaseLanguageDetector {
  id = 'python';
  name = 'Python';
  extensions = ['py'];
  priority = 6;

  sampleContent(): string {
    return `from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional

@dataclass
class Task:
    title: str
    priority: int
    completed: bool = False
    due_date: Optional[datetime] = None
    
    def mark_completed(self) -> None:
        self.completed = True
    
    def __str__(self) -> str:
        status = "✓" if self.completed else " "
        due = f", Due: {self.due_date:%Y-%m-%d}" if self.due_date else ""
        return f"[{status}] {self.title} (Priority: {self.priority}){due}"

class TaskManager:
    def __init__(self):
        self.tasks: List[Task] = []
    
    def add_task(self, task: Task) -> None:
        self.tasks.append(task)
    
    def get_pending_tasks(self) -> List[Task]:
        return [task for task in self.tasks if not task.completed]
    
    def display_tasks(self) -> None:
        print("\\nTask List:")
        print("-" * 40)
        for task in sorted(self.tasks, key=lambda x: x.priority, reverse=True):
            print(task)

def main():
    # Create task manager
    manager = TaskManager()
    
    # Add some tasks
    manager.add_task(Task("Learn Python", 3))
    manager.add_task(Task("Write tests", 2))
    manager.add_task(Task("Document code", 1))
    
    # Mark a task as completed
    manager.tasks[0].mark_completed()
    
    # Display all tasks
    manager.display_tasks()
    
    # Show pending tasks count
    pending = len(manager.get_pending_tasks())
    print(f"\\nPending tasks: {pending}")

if __name__ == "__main__":
    main()`;
  }

  // Patterns for isMatch - Aim for common constructs
  private getGeneralPatterns(): RegExp[] {
    return [
      // --- Definitions ---
      /^def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)\s*:/m,  // Function definition (requires colon)
      /^class\s+[A-Z][a-zA-Z0-9_]*(\([^)]*\))?\s*:/m,   // Class definition (requires colon, allows inheritance)

      // --- Imports ---
      /^\s*import\s+[a-zA-Z_][a-zA-Z0-9_.]*(\s+as\s+[a-zA-Z_][a-zA-Z0-9_]*)?/m, // import foo / import foo as bar
      /^\s*from\s+[a-zA-Z_][a-zA-Z0-9_.]+\s+import\s+(?:\*|\w+|\([^)]+\))/m, // from foo import bar / * / (baz, qux)

      // --- Control Flow & Keywords (with colons where applicable) ---
      /^\s*if\s+.+:/m,        // If statement
      /^\s*elif\s+.+:/m,      // Elif statement
      /^\s*else:/m,         // Else statement
      /^\s*for\s+\w+\s+in\s+.+:/m, // For loop
      /^\s*while\s+.+:/m,     // While loop
      /^\s*try:/m,          // Try block
      /^\s*except(\s+[\w.]+)?(\s+as\s+\w+)?:/m, // Except block
      /^\s*finally:/m,       // Finally block
      /^\s*with\s+.+(\s+as\s+\w+)?:/m, // With statement

      // --- Common Idioms / Keywords ---
      /\bself\.[a-zA-Z_][a-zA-Z0-9_]*/m,          // Self reference (still useful indicator)
      /\bif\s+__name__\s*==\s*(['"])__main__\1/m, // Main guard (improved quotes)
      /\b(True|False|None)\b/,                   // Boolean/None literals
      /\b(in|is|not|and|or)\b/,                 // Common operators/keywords

      // --- Other Features ---
      /^\s*@[a-zA-Z_][a-zA-Z0-9_.]*/m,            // Decorators (at line start)
      /\s*->\s*[\w\[\], .]+/m,                    // Type hints for return (more flexible type)
      /\w+\s*:\s*[\w\[\], .]+/,                  // Type hints for variables/args
      /f(['"])/,                                 // f-string prefix
    ];
  }

  // Patterns for countSpecificPatterns - Aim for highly distinctive features
  private getSpecificPatterns(): RegExp[] {
    return [
      /\bif\s+__name__\s*==\s*(['"])__main__\1/m, // Main guard (very specific)
      /^\s*@[a-zA-Z_][a-zA-Z0-9_.]+/m,            // Decorators (strong indicator)
      /^\s*from\s+[\w.]+\s+import\s+\(/m,        // from ... import ( ... ) multiline import syntax
      /^\s*async\s+def\b/m,                     // Async function definition
      /\bawait\s+/m,                            // Await keyword
      /\byield\s+/m,                            // Yield keyword (generators)
      /^\s*with\s+.+\s+as\s+\w+:/m,             // With...as...: statement (specific form)
      /\s*->\s*[\w\[\], .]+/,                    // Function return type hints
      /^\s*"""|'''/,                            // Docstring start (at beginning of line, possibly indented)
      /\{\s*f?(['"]).*?\{.*?}.*?\1\s*\}/,       // Looks for dict with f-string-like interpolation (heuristic)
      /\[.+for\s+\w+\s+in\s+.+(if\s+.+)?\]/,     // List comprehension (more complete structure)
      /\{.+for\s+\w+\s+in\s+.+(if\s+.+)?\}/,     // Set/Dict comprehension
    ];
  }

  isMatch(content: string): boolean {
    // Avoid matching if it looks *strongly* like JSON or YAML first
    // (This might be better handled in the central registry logic, but can add safety here)
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      // If it looks like complete JSON, parse it. If it parses, it's not Python.
      try {
        JSON.parse(trimmed);
        return false; // It's valid JSON
      } catch { /* Ignore parsing error */ }
    }
    // Basic check for YAML structure (key: value at start of line)
    if (/^\s*[\w.-]+:\s+/.test(trimmed.split('\n')[0])) {
      // Could be YAML, be more cautious
      // Maybe require a higher match count? For now, proceed.
    }


    const patterns = this.getGeneralPatterns();
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        matchCount++;
      }
    }

    // Require a reasonable number of general Python patterns
    // Adjust this threshold based on testing. 3 seems like a decent starting point.
    const requiredMatches = 3;
    return matchCount >= requiredMatches;
  }

  countSpecificPatterns(content: string): number {
    const patterns = this.getSpecificPatterns();
    let count = 0;
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        count++;
      }
    }
    return count;
  }

  registerProvider(monaco: any): void {
    monaco.languages.registerDocumentFormattingEditProvider('python', {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split('\n');
        let indentLevel = 0;

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          
          // Skip empty lines
          if (!trimmedLine) return '';

          // Calculate current line's indentation
          const indent = '    '.repeat(indentLevel);
          const formattedLine = indent + trimmedLine;

          // Adjust indent level for next line
          if (trimmedLine.endsWith(':')) {
            indentLevel++;
          } else if (indentLevel > 0 && line.match(/^[\s]*(return|break|continue|pass|raise)/)) {
            indentLevel = Math.max(0, indentLevel - 1);
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
const pythonDetector = new PythonLanguageDetector();
languageRegistry.register(pythonDetector);

// Export for backward compatibility
export const registerPythonProvider = (monaco: any) => {
  pythonDetector.registerProvider(monaco);
};