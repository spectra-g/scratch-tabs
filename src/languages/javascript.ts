import { DetectionResult, LanguageDetector } from "./types";
import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";

/**
 * JavaScript/TypeScript language detector
 */
export class JavaScriptLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "javascript";
  name = "JavaScript";
  extensions = ["js", "jsx", "mjs"];
  priority = 6; // Higher priority than CSV

  sampleContent(): string {
    return `
// Variable declaration
let greeting = "Hello";
let name = "User";

// Function definition
function greetUser(name) {
    console.log(\`\${greeting}, \${name}!\`);
}

// Function to check if a number is even or odd
function checkEvenOdd(number) {
    if (number % 2 === 0) {
        console.log(\`\${number} is even.\`);
    } else {
        console.log(\`\${number} is odd.\`);
    }
}

// Call the greetUser function
greetUser(name);

// While loop example: count from 1 to 5
let counter = 1;
while (counter <= 5) {
    console.log(\`Counter is \${counter}\`);
    counter++;
}

// Read user input (using prompt in the browser or Node.js readline module in Node.js)
let number = parseInt(prompt("Please enter a number to check if it's even or odd:"));
checkEvenOdd(number);

// If-else example
console.log("Checking if the number is greater than 10:");
if (number > 10) {
    console.log("The number is greater than 10.");
} else {
    console.log("The number is 10 or less.");
}

// Array example
let numbers = ["one", "two", "three", "four"];
console.log("Array of numbers:", numbers);

// For loop example: Iterate through array
console.log("Looping through the array:");
for (let i = 0; i < numbers.length; i++) {
    console.log(\`Number: \${numbers[i]}\`);
}

// Switch statement example
let day = prompt("Enter a day of the week (e.g., Monday, Tuesday):");

switch (day) {
    case "Monday":
        console.log("Start of the week!");
        break;
    case "Tuesday":
        console.log("Second day of the week!");
        break;
    case "Wednesday":
        console.log("Midweek!");
        break;
    case "Thursday":
        console.log("Almost there!");
        break;
    case "Friday":
        console.log("It's Friday!");
        break;
    default:
        console.log("Unknown day!");
}

// End of the script
console.log("Exiting the script.");    
    `;
  }

  /**
   * Check if content matches JavaScript patterns
   */
  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 5) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false; // Track if a definitive JS feature was found
    let specificJsHits = 0;

    // 1. Definitive/Highly Specific JavaScript Patterns
    const definitivePatterns = [
      {
        pattern: /\bimport\s+[\w{}*\s,]+from\s*['"]/g,
        weight: 0.35,
        perMatch: 0.1,
        specific: true,
      }, // import {x} from 'y' or import * as x from 'y'
      {
        pattern:
          /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\b/g,
        weight: 0.35,
        perMatch: 0.1,
        specific: true,
      },
      {
        pattern: /\basync\s+function\b/g,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
      },
      {
        pattern: /\bawait\s+\w+/g,
        weight: 0.25,
        perMatch: 0.05,
        specific: true,
      },
      {
        pattern: /=>\s*(?:\{|[^({])?/g,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
      }, // Arrow functions (block or implicit return)
      {
        pattern: /\bclass\s+\w+(?:\s+extends\s+\w+)?\s*\{/g,
        weight: 0.25,
        perMatch: 0.05,
        specific: true,
      },
      {
        pattern: /`[^`]*\$\{.*?\}[^`]*`/g,
        weight: 0.4,
        perMatch: 0.1,
        specific: true,
      }, // Template literals with interpolation
      {
        pattern: /\b\w+\.(?:then|catch|finally)\s*\(/g,
        weight: 0.25,
        perMatch: 0.05,
        specific: true,
      }, // Promise chains
      {
        pattern:
          /\b(?:document|window)\.(?:getElementById|querySelector|addEventListener|fetch|localStorage|sessionStorage)\b/g,
        weight: 0.2,
        perMatch: 0.03,
        specific: true,
      }, // Browser APIs
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore += Math.min(matches.length, 3) * dp.perMatch;
        }
        patternsMatched++;
        if (dp.specific) specificJsHits++;
        strongSignalFound = true; // Any of these is a strong signal
      }
    }

    // 2. Common JavaScript Patterns
    const commonPatterns = [
      { pattern: /\bfunction\s+\w+\s*\(/g, weight: 0.5, perMatch: 0.05 },
      { pattern: /\b(const|let)\s+\w+\s*=/g, weight: 0.15, perMatch: 0.02 },
      { pattern: /\bvar\s+\w+\s*=/g, weight: 0.05, perMatch: 0.01 }, // Less distinct
      { pattern: /\bnew\s+\w+\s*\(/g, weight: 0.05, perMatch: 0.01 },
      {
        pattern:
          /\b(if|for|while|switch|case|default|break|continue|return)\s*\(?/g,
        weight: 0.03,
        perMatch: 0.005,
      }, // Very common, lower weight
      {
        pattern: /\bconsole\.(log|warn|error|info|debug|table)\s*\(/g,
        weight: 0.1,
        perMatch: 0.02,
      },
      { pattern: /typeof\s+\w+/g, weight: 0.05, perMatch: 0.01 },
      { pattern: /JSON\.(parse|stringify)\s*\(/g, weight: 0.1, perMatch: 0.02 },
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

    // 3. Anti-Patterns (Syntax strongly indicating OTHER languages)
    const antiPatterns = [
      { pattern: /^\s*package\s+[\w.]+;/m, weight: -0.6 }, // Java package
      { pattern: /System\.out\.println/i, weight: -0.5 }, // Java print
      { pattern: /#include\s*</i, weight: -0.6 }, // C/C++ include
      { pattern: /^\s*def\s+\w+\s*\(.*?\)\s*:/m, weight: -0.5 }, // Python def func():
      { pattern: /^\s*<\?php/m, weight: -0.7 }, // PHP tag
      { pattern: /^\s*#!\/bin\/(bash|sh|zsh|ksh)/m, weight: -0.7 }, // Shell shebang
      { pattern: /^\s*@(?:Grab|Override|Test)\b/m, weight: -0.4 }, // Java/Groovy annotations
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        // console.log(`JS ANTI-PATTERN HIT: ${ap.pattern.source}`);
        confidenceScore += ap.weight;
      }
    }

    // 4. Adjustments and Clamping
    if (strongSignalFound && specificJsHits >= 1) {
      confidenceScore += 0.2; // Boost if at least one truly specific JS feature was found
    }
    if (specificJsHits === 0 && patternsMatched > 2 && confidenceScore > 0.2) {
      // If many common patterns but no highly specific ones, slightly temper confidence
      confidenceScore *= 0.8;
    }
    if (content.includes("use strict")) {
      // "use strict" is a good JS signal
      confidenceScore += 0.1;
      strongSignalFound = true;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Final match decision
    // Needs either a strong signal with decent confidence, or multiple patterns with higher confidence
    // OR a simple function declaration with reasonable confidence
    const isMatch =
      (strongSignalFound && confidenceScore >= 0.45 && specificJsHits >= 1) ||
      (patternsMatched >= 3 && confidenceScore >= 0.55) ||
      (patternsMatched >= 1 && confidenceScore >= 0.12 && /\bfunction\s+\w+\s*\(/.test(content));

    // console.log(`JS: Score=${confidenceScore.toFixed(3)}, Patterns=${patternsMatched}, Specific=${specificJsHits}, Strong=${strongSignalFound}, Match=${isMatch}`);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound && specificJsHits >= 1, // Or just strongSignalFound
    };
  }

  /**
   * Register JavaScript language provider with Monaco
   */
  registerProvider(monaco: any): void {
    // Configure JavaScript formatting provider
    monaco.languages.registerDocumentFormattingEditProvider("javascript", {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();

        // Basic JavaScript formatting
        let formattedJs = content;

        // Format with proper indentation
        const indentSize = 2;
        let indentLevel = 0;
        let inString = false;
        let stringChar = "";

        const lines = formattedJs.split("\n");

        formattedJs = lines
          .map((line: string) => {
            const trimmedLine = line.trim();

            // Skip empty lines
            if (!trimmedLine) return "";

            // Count opening and closing braces in this line
            let openBraces = 0;
            let closeBraces = 0;

            // Process each character to track string context and braces
            for (let i = 0; i < trimmedLine.length; i++) {
              const char = trimmedLine[i];
              const prevChar = i > 0 ? trimmedLine[i - 1] : "";

              // Handle string context
              if (
                (char === '"' || char === "'" || char === "`") &&
                prevChar !== "\\"
              ) {
                if (!inString) {
                  inString = true;
                  stringChar = char;
                } else if (char === stringChar) {
                  inString = false;
                }
              }

              // Only count braces outside of strings
              if (!inString) {
                if (char === "{" || char === "(" || char === "[") {
                  openBraces++;
                } else if (char === "}" || char === ")" || char === "]") {
                  closeBraces++;
                }
              }
            }

            // Adjust indent level based on closing braces at the start of the line
            if (trimmedLine.match(/^[})\]]/)) {
              indentLevel = Math.max(0, indentLevel - 1);
            }

            // Apply current indentation
            const formattedLine =
              " ".repeat(indentLevel * indentSize) + trimmedLine;

            // Adjust indent level for the next line based on opening/closing braces
            indentLevel += openBraces - closeBraces;
            indentLevel = Math.max(0, indentLevel);

            return formattedLine;
          })
          .join("\n");

        return [
          {
            range: model.getFullModelRange(),
            text: formattedJs,
          },
        ];
      },
    });
  }
}

/**
 * TypeScript language detector
 */
export class TypeScriptLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "typescript";
  name = "TypeScript";
  extensions = ["ts", "tsx"];
  // Priority should be higher than JavaScript if it's a distinct check,
  // or it can be lower if JS detector is very broad and TS detector just adds specificity.
  // Let's make it slightly higher than JS for now, assuming TS features are strong indicators.
  priority = 7;

  sampleContent(): string {
    return `
import { Component, OnInit } from '@angular/core'; // Example import

// Type alias
type Point = {
    x: number;
    y: number;
};

// Interface definition
interface Shape {
    id: string;
    area(): number;
    perimeter(): number;
}

// Enum definition
enum Color {
    Red = "RED",
    Green = "GREEN",
    Blue = "BLUE"
}

// Class with generic, implements interface, and access modifiers
class Circle<T extends Shape> implements Shape {
    public readonly id: string; // readonly modifier
    private _radius: number;
    protected _color: Color = Color.Red; // Default value

    constructor(id: string, radius: number) {
        this.id = id;
        this._radius = radius;
    }

    // Getter
    get radius(): number {
        return this._radius;
    }

    // Setter with type annotation
    set radius(value: number) {
        if (value < 0) throw new Error("Radius cannot be negative");
        this._radius = value;
    }

    area(): number {
        return Math.PI * this._radius * this._radius;
    }

    perimeter(): number {
        return 2 * Math.PI * this._radius;
    }

    // Generic method
    transform<U>(fn: (item: T) => U, originalShape: T): U {
        return fn(originalShape);
    }
}

// Function with type annotations for parameters and return type
function addNumbers(a: number, b: number): number {
    return a + b;
}

// Using declared types
let pointA: Point = { x: 10, y: 20 };
let myCircle: Circle<any> = new Circle("circle1", 5.0);

console.log(\`Circle area: \${myCircle.area().toFixed(2)}\`);

// Declare a variable with a union type
let input: string | number;
input = "hello";
input = 123;

// Namespace example
namespace MyMath {
    export const PI = 3.14159;
    export function circumference(radius: number): number {
        return 2 * PI * radius;
    }
}

console.log(MyMath.circumference(10));
    `;
  }

  /**
   * Detects if the given content matches TypeScript patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trimStart();
    if (!trimmedContent || trimmedContent.trim().length < 10) {
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }

    // --- STRONG ANTI-PATTERNS FOR OTHER LANGUAGES ---
    if (
      trimmedContent.startsWith("<?php") ||
      trimmedContent.startsWith("<?=") ||
      trimmedContent.startsWith("<?=")
    ) {
      return { match: false, confidence: 0.0, matchedDefinitive: false }; // PHP
    }
    if (/^\s*#![^\r\n]*python/i.test(trimmedContent)) {
      return { match: false, confidence: 0.0, matchedDefinitive: false }; // Python Shebang
    }
    if (
      /^\s*package\s+[\w.]+;/m.test(content) ||
      /System\.out\.println/.test(content)
    ) {
      return { match: false, confidence: 0.0, matchedDefinitive: false }; // Java
    }
    // --- RUST ANTI-PATTERNS (NEW and CRITICAL) ---
    if (/\bfn\s+\w/.test(content) && !/\bfunction\b/.test(content)) {
      // `fn name` but not `function`
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    if (
      /\b(struct|enum|trait|impl|mod)\s+\w/.test(content) &&
      !/\b(class|interface|enum)\s+\w+\s*\{/.test(content)
    ) {
      // Rust keywords vs TS/JS class/interface/enum
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    if (/#\[derive\(/.test(content)) {
      // Rust derive macro
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    if (/\buse\s+[\w:]+;/.test(content) && !/\bimport\b/.test(content)) {
      // Rust `use some::path;` vs JS/TS `import`
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    if (
      /\w+!\(/.test(content) &&
      !content.includes("document.getElementById")
    ) {
      // Rust macro calls like println!(...) - avoid simple function calls
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    if (/->\s*\w/.test(content) && !/=>/.test(content)) {
      // Rust return type arrow `->` vs JS/TS fat arrow `=>`
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    if (/\b(let\s+mut)\b/.test(content)) {
      // `let mut` is very Rust specific
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }
    // --- End Rust Anti-Patterns ---

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;
    let tsSpecificMatches = 0;

    // 1. Leverage JavaScript detector's result
    const jsDetector = languageRegistry.getById("javascript") as
      | JavaScriptLanguageDetector
      | undefined;
    let jsConfidence = 0.0;
    if (jsDetector) {
      const jsResult = jsDetector.detect(content); // Pass original content
      if (jsResult.match) {
        jsConfidence = jsResult.confidence;
        confidenceScore += jsConfidence * 0.4;
        if (jsConfidence > 0.3) patternsMatched++;
        if (jsResult.matchedDefinitive) strongSignalFound = true;
      }
    }

    // 2. TypeScript-specific patterns
    const tsPatterns = [
      {
        pattern:
          /:\s*(?:string|number|boolean|any|void|never|unknown|symbol|bigint)\b(?![=:(])/g,
        weight: 0.35,
        perMatch: 0.05,
        specific: true,
        maxMatches: 5,
      },
      {
        pattern: /\binterface\s+[A-Z_][\w]*\s*(?:<[^>]+>)?\s*\{/g,
        weight: 0.4,
        perMatch: 0.1,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern: /\btype\s+[A-Z_][\w]*\s*=/g,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern: /\benum\s+[A-Z_][\w]*\s*(?:=\s*\S+\s*)?\{/g,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
        maxMatches: 2,
      },
      {
        pattern:
          /<\s*[A-Z_][\w]*(?:\s*extends\s*[\w.<>]+)?(?:\s*,\s*[A-Z_][\w]*)*\s*>/g,
        weight: 0.25,
        perMatch: 0.03,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern:
          /\b(public|private|protected|readonly)\s+(?:static\s+)?\w+(?:\??:|\s*=)/g,
        weight: 0.25,
        perMatch: 0.03,
        specific: true,
        maxMatches: 5,
      },
      {
        pattern: /\bimplements\s+[\w,.<>\s]+/g,
        weight: 0.2,
        perMatch: 0.03,
        specific: true,
        maxMatches: 2,
      },
      {
        pattern:
          /\bdeclare\s+(?:module|global|function|class|var|let|const|enum|type|interface)\b/g,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern: /\bnamespace\s+[A-Z_][\w]*\s*\{/g,
        weight: 0.2,
        perMatch: 0.03,
        specific: true,
        maxMatches: 2,
      },
      {
        pattern:
          /\w+\s*as\s+(?:const|string|number|boolean|any|unknown|[\w.]+)\b/g,
        weight: 0.15,
        perMatch: 0.02,
        maxMatches: 3,
      },
      {
        pattern: /<\s*(?:string|number|boolean|any|unknown|[\w.]+)\s*>\s*\w+/g,
        weight: 0.15,
        perMatch: 0.02,
        maxMatches: 3,
      },
      {
        pattern: /\b(abstract\s+class|abstract\s+\w+\s*\()/g,
        weight: 0.2,
        perMatch: 0.05,
        specific: true,
        maxMatches: 2,
      },
    ];

    for (const p of tsPatterns) {
      const matches = content.match(p.pattern);
      if (matches) {
        confidenceScore += p.weight;
        if (p.perMatch) {
          confidenceScore +=
            Math.min(matches.length, p.maxMatches || 3) * p.perMatch;
        }
        patternsMatched++;
        if (p.specific) tsSpecificMatches++;
      }
    }

    if (tsSpecificMatches > 0) {
      strongSignalFound = true;
    }

    // 3. Other Anti-patterns (already had some, ensure they don't conflict with Rust ones)
    const otherAntiPatterns = [
      // PHP, Java, C/C++, Python shebangs are handled at the top
      { pattern: /System\.out\.println/i, weight: -0.6 },
      { pattern: /^\s*package\s+[\w.]+;/m, weight: -0.7 },
      { pattern: /^\s*#include\s*<.+>/m, weight: -0.7 },
      {
        pattern: /^\s*def\s+\w+\s*\(.*?\)\s*:/m,
        weight: -0.6,
        except: /\bfunction\b/,
      }, // Python def, ensure not confused with JS function
    ];

    for (const ap of otherAntiPatterns) {
      if (ap.except && ap.except.test(content)) continue; // Skip if exception matches
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 4. Adjustments and Clamping
    if (jsConfidence > 0.5 && tsSpecificMatches === 0) {
      confidenceScore = jsConfidence * 0.3;
    } else if (
      tsSpecificMatches >= 1 &&
      jsConfidence < 0.2 &&
      patternsMatched > tsSpecificMatches
    ) {
      confidenceScore += 0.15;
    } else if (tsSpecificMatches >= 2) {
      confidenceScore += 0.25;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch =
      (strongSignalFound && tsSpecificMatches >= 1 && confidenceScore >= 0.4) ||
      (tsSpecificMatches >= 2 && confidenceScore >= 0.55);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive:
        isMatch &&
        strongSignalFound &&
        tsSpecificMatches >= 2 &&
        confidenceScore > 0.65,
    };
  }

  getFileExtension(): string {
    return "ts";
  }

  // registerProvider for TypeScript can reuse or adapt the JavaScript one,
  // or rely on Monaco's excellent built-in TypeScript support (preferred).
  registerProvider(monaco: any): void {
    const languageId = this.id; // 'typescript'

    // Monaco has excellent built-in support for 'typescript'.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // For formatting, Monaco's built-in TypeScript/JavaScript language service
    // usually provides good formatting.
    // The formatter from your JavaScriptLanguageDetector could be reused if needed,
    // but often it's better to rely on Monaco's defaults for TS.
    // Example from your JS formatter (can be used if Monaco's default isn't sufficient or for consistency):
    /*
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        let formattedText = content; // Placeholder for actual formatting logic
        // ... (reuse or adapt the JS formatting logic here) ...
        // For example, you could call a shared formatting utility
        // formattedText = formatJavaScriptLikeCode(content, { indentSize: 2 });

        return [{
          range: model.getFullModelRange(),
          text: formattedText
        }];
      }
    });
    */
  }
}

const jsDetector = new JavaScriptLanguageDetector();
const tsDetector = new TypeScriptLanguageDetector();
languageRegistry.register(jsDetector);
languageRegistry.register(tsDetector);

// Export for backward compatibility (optional)
export const registerTypeScriptProvider = (monaco: any) => {
  tsDetector.registerProvider(monaco);
};
