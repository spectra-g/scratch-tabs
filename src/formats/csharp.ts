// In languages/csharp.ts (or your equivalent file)

import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule  } from "./types"; // Import updated types

/**
 * C# language detector
 */
export class CsharpFormatDetector extends BaseFormatDetector implements FormatModule
{
  id = "csharp";
  name = "C#";
  extensions = ["cs", "csx"]; // csx for C# scripts
  priority = 6; // Higher than generic JS/Java, adjust as needed

  sampleContent(): string {
    return `using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MyAwesomeApp
{
    // Define an interface
    public interface IGreeter
    {
        string GetGreeting(string name);
    }

    // Define a class that implements the interface
    public class Greeter : IGreeter
    {
        public string GetGreeting(string name)
        {
            return $"Hello, {name} from C#!"; // String interpolation
        }
    }

    // Record type (C# 9+)
    public record Person(string FirstName, string LastName);

    internal class Program
    {
        // Async Main method (C# 7.1+)
        static async Task Main(string[] args)
        {
            Console.WriteLine("Starting C# Application...");

            var greeter = new Greeter();
            Console.WriteLine(greeter.GetGreeting("Developer"));

            var person = new Person("John", "Doe");
            Console.WriteLine($"Person: {person.FirstName} {person.LastName}");

            // List and LINQ example
            List<int> numbers = new List<int> { 1, 2, 3, 4, 5, 6 };
            var evenNumbers = numbers.Where(n => n % 2 == 0).ToList();

            Console.Write("Even numbers: ");
            foreach (var num in evenNumbers)
            {
                Console.Write(num + " ");
            }
            Console.WriteLine();

            // Properties
            MyData data = new MyData { Value = 42 };
            Console.WriteLine($"Data Value: {data.Value}");

            // Async operation
            await Task.Delay(100); // Simulate some async work
            Console.WriteLine("Application finished.");
        }
    }

    public class MyData
    {
        // Auto-implemented property
        public int Value { get; set; }

        // Property with backing field
        private string _name;
        public string Name
        {
            get { return _name; }
            set { _name = value ?? "Default"; } // Null-coalescing operator
        }
    }
}
`;
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 5) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let definitiveMatchFound = false;

    // 1. Definitive C# patterns (higher weights)
    const definitivePatterns = [
      { pattern: /^\s*using\s+[\w.]+;/gm, weight: 0.35, perMatch: 0.1 }, // `using System;`
      {
        pattern: /^\s*namespace\s+[\w.]+\s*\{?/gm,
        weight: 0.3,
        perMatch: 0.05,
      }, // `namespace MyApp {`
      {
        pattern: /\bpublic\s+(sealed\s+)?class\s+\w+/g,
        weight: 0.25,
        perMatch: 0.05,
      },
      {
        pattern:
          /\b(public|private|protected|internal)\s+(static\s+)?(readonly\s+)?\w+\s+\w+\s*\{.*(get;|set;).*?\}/g,
        weight: 0.35,
        perMatch: 0.1,
      }, // Properties ` { get; set; }`
      {
        pattern: /\b(public|private|protected|internal)\s+event\s+\w+/g,
        weight: 0.25,
        perMatch: 0.05,
      }, // Events
      {
        pattern: /\b(async\s+)?Task(\s*<[^>]+>)?\b/g,
        weight: 0.3,
        perMatch: 0.05,
      }, // `Task`, `Task<T>`, `async Task`
      { pattern: /\bstring\[\]\s+args\b/g, weight: 0.2 }, // `string[] args` in Main
      { pattern: /Console\.Write(Line)?\s*\(/g, weight: 0.2, perMatch: 0.05 }, // `Console.WriteLine`
      {
        pattern: /\b(List|Dictionary|IEnumerable)<[^>]+>/g,
        weight: 0.2,
        perMatch: 0.05,
      }, // Common generic collections
      { pattern: /\.Where\s*\(\w+\s*=>/g, weight: 0.25, perMatch: 0.05 }, // LINQ Where clause
      { pattern: /\.Select\s*\(\w+\s*=>/g, weight: 0.2, perMatch: 0.05 }, // LINQ Select clause
      { pattern: /\$\s*"/g, weight: 0.15, perMatch: 0.03 }, // String interpolation `$"..."`
      { pattern: /@"/g, weight: 0.1, perMatch: 0.02 }, // Verbatim string literal `@"..."`
      {
        pattern:
          /\b(var|dynamic|nameof|yield|get|set|value|add|remove|async|await|delegate|event|interface|enum|struct|record|sealed|virtual|override|abstract|partial|params|ref|out|in|is|as|typeof|sizeof|checked|unchecked|unsafe|stackalloc|lock|fixed|volatile|implicit|explicit|operator)\b/g,
        weight: 0.02,
        perMatch: 0.01,
        maxMatches: 20,
      }, // C# specific keywords (low individual weight, but many add up)
      { pattern: /\[AttributeUsage\(.*\)\]/g, weight: 0.2, perMatch: 0.05 }, // Attributes
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore +=
            Math.min(matches.length, dp.maxMatches || 5) * dp.perMatch; // Cap per-match bonus
        }
        patternsMatched++;
        definitiveMatchFound = true;
      }
    }

    // 2. Anti-patterns (from Java, JS, C++)
    const antiPatterns = [
      { pattern: /\bimport\s+[\w.*]+;/i, weight: -0.5 }, // Java import
      { pattern: /\bimport\s+.*\s+from\s+['"]/i, weight: -0.5 }, // JS import
      { pattern: /^\s*#include\s+<[^>]+>/m, weight: -0.4 }, // C/C++ include
      { pattern: /System\.out\.println\(/i, weight: -0.4 }, // Java print
      { pattern: /=>\s*\{/i, weight: -0.3 }, // JS arrow function
      { pattern: /\b(let|const)\s+\w+\s*=/i, weight: -0.3 }, // JS variable declaration
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // Boost if multiple core C# elements are present
    if (
      content.includes("using System;") &&
      content.includes("namespace") &&
      content.includes("class") &&
      content.includes("static void Main")
    ) {
      confidenceScore += 0.25;
    }

    // 3. Normalization and Clamping
    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status based on confidence threshold
    const isMatch = confidenceScore >= 0.45; // Adjust threshold based on testing

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
    };
  }

  getFileExtension(): string {
    return "cs";
  }

  registerProvider(monaco: any): void {
    // Monaco Editor has built-in support for C# (language ID 'csharp').
    // It typically doesn't require manual registration of basic language features like syntax highlighting.
    // However, you might register a formatting provider if you want custom formatting behavior
    // beyond what Monaco might offer by default (or if it doesn't offer one for C# out-of-the-box).
    // Example: Registering a NO-OP formatter if you don't want to implement one
    // monaco.languages.registerDocumentFormattingEditProvider('csharp', {
    //   provideDocumentFormattingEdits(model: any, options: any, token: any) {
    //     // Return null or an empty array if you don't want to make changes
    //     return [];
    //   }
    // });
  }
}

// Create and register the detector
const csharpDetector = new CsharpFormatDetector();
formatRegistry.register(csharpDetector);

// Export for backward compatibility (optional)
export const registerCsharpProvider = (monaco: any) => {
  csharpDetector.registerProvider(monaco);
};
