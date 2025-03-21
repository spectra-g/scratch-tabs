import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';

/**
 * Rust language detector
 */
export class RustLanguageDetector extends BaseLanguageDetector {
  id = 'rust';
  name = 'Rust';
  extensions = ['rs'];
  priority = 7; // Higher priority than JavaScript

  sampleContent(): string {
    return `use std::collections::HashMap;

#[derive(Debug)]
struct Task {
    id: u32,
    title: String,
    completed: bool,
}

impl Task {
    fn new(id: u32, title: &str) -> Self {
        Task {
            id,
            title: title.to_string(),
            completed: false,
        }
    }

    fn mark_completed(&mut self) {
        self.completed = true;
    }
}

struct TaskManager {
    tasks: HashMap<u32, Task>,
    next_id: u32,
}

impl TaskManager {
    fn new() -> Self {
        TaskManager {
            tasks: HashMap::new(),
            next_id: 1,
        }
    }

    fn add_task(&mut self, title: &str) -> u32 {
        let id = self.next_id;
        self.tasks.insert(id, Task::new(id, title));
        self.next_id += 1;
        id
    }

    fn complete_task(&mut self, id: u32) -> Option<&Task> {
        if let Some(task) = self.tasks.get_mut(&id) {
            task.mark_completed();
            Some(task)
        } else {
            None
        }
    }

    fn list_tasks(&self) {
        println!("\\nTask List:");
        println!("{}", "-".repeat(40));
        for task in self.tasks.values() {
            let status = if task.completed { "✓" } else { " " };
            println!("[{}] {}. {}", status, task.id, task.title);
        }
    }
}

fn main() {
    let mut manager = TaskManager::new();

    // Add some tasks
    manager.add_task("Learn Rust");
    manager.add_task("Write documentation");
    let task_id = manager.add_task("Build project");

    // Complete a task
    manager.complete_task(task_id);

    // Display all tasks
    manager.list_tasks();
}`;
  }

  isMatch(content: string): boolean {
    // First check for the definitive Rust fn keyword pattern
    if (/\bfn\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)/m.test(content)) {
      return true;
    }

    // Then check for other definitive Rust patterns
    const definitivePatterns = [
      /#\[derive\([^)]+\)\]/m,                   // Derive attribute
      /impl\s+[A-Z][a-zA-Z0-9_]*/m,             // Implementation block
      /let\s+mut\s+[a-zA-Z_][a-zA-Z0-9_]*/m,    // Mutable variable declaration
      /use\s+std::/m,                           // Standard library imports
      /:\s*&mut\s+[a-zA-Z_]/m,                  // Mutable reference type
      /Option<[^>]+>/m,                         // Option type
      /Result<[^>]+>/m,                         // Result type
    ];

    // If any definitive pattern matches, it's definitely Rust
    if (definitivePatterns.some(pattern => pattern.test(content))) {
      return true;
    }

    const rustPatterns = [
      /struct\s+[A-Z][a-zA-Z0-9_]*/m,           // Struct definition
      /:\s*[A-Z][a-zA-Z0-9_]*/m,                // Type annotations
      /Vec<[^>]+>/m,                            // Generic Vec
      /String::from\(/m,                        // String::from
      /println!\(/m,                            // println! macro
      /\bpub\s+/m,                              // pub keyword
      /\bself\b/m,                              // self keyword
      /\bmatch\s+/m,                            // match expression
    ];

    const matchCount = rustPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);

    return matchCount >= 3;
  }

  countSpecificPatterns(content: string): number {
    const specificPatterns = [
      /\bfn\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\([^)]*\)/m, // Function definition
      /#\[derive\([^)]+\)\]/m,                   // Derive attribute
      /impl\s+[a-zA-Z_][a-zA-Z0-9_]*/m,         // Implementation block
      /let\s+mut\s+[a-zA-Z_][a-zA-Z0-9_]*/m,    // Mutable variable
      /use\s+std::/m,                           // Standard library imports
      /:\s*&mut\s+[a-zA-Z_]/m,                  // Mutable reference type
      /Option<[^>]+>/m,                         // Option type
      /Result<[^>]+>/m,                         // Result type
    ];

    return specificPatterns.reduce((count, pattern) =>
      count + (pattern.test(content) ? 1 : 0), 0);
  }

  registerProvider(monaco: any): void {
    monaco.languages.registerDocumentFormattingEditProvider('rust', {
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
          const indent = '    '.repeat(indentLevel);
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
const rustDetector = new RustLanguageDetector();
languageRegistry.register(rustDetector);

// Export for backward compatibility
export const registerRustProvider = (monaco: any) => {
  rustDetector.registerProvider(monaco);
};