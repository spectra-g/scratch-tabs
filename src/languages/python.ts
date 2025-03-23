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

  isMatch(content: string): boolean {
    const pythonPatterns = [
      /^def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\):/m,  // Function definition
      /^class\s+[A-Z][a-zA-Z0-9_]*[:(]/m,             // Class definition
      /\bself\.[a-zA-Z_][a-zA-Z0-9_]*/m,              // Self reference
      /\bif\s+__name__\s*==\s*['"]__main__['"]/m,     // Main guard
      /from\s+[a-zA-Z_.]+\s+import\s+/m,              // From import
      /^\s*@[a-zA-Z_][a-zA-Z0-9_]*/m,                 // Decorators
      /\s*->\s*[a-zA-Z_][a-zA-Z0-9_]*/m,              // Type hints
      /\[([a-zA-Z_][a-zA-Z0-9_]*,?\s*)*\]/m,         // List comprehension
    ];

    const matchCount = pythonPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);

    return matchCount >= 3;
  }

  countSpecificPatterns(content: string): number {
    const specificPatterns = [
      /\bif\s+__name__\s*==\s*['"]__main__['"]/m,     // Main guard
      /^\s*@[a-zA-Z_][a-zA-Z0-9_]*/m,                 // Decorators
      /\s*->\s*[a-zA-Z_][a-zA-Z0-9_]*/m,              // Type hints
      /from\s+typing\s+import\s+/m,                    // Typing imports
    ];

    return specificPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);
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