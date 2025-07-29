import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * Rust language detector
 */
export class RustFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "rust"; // Monaco's built-in ID for Rust
  name = "Rust";
  extensions = ["rs"];
  priority = 7; // High priority due to its very distinctive syntax

  sampleContent(): string {
    return `// main.rs
use std::collections::HashMap;
use std::error::Error;
use std::fmt;

// Derive a Debug implementation for our struct
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct Point {
    x: i32,
    y: i32,
}

// Implement methods for the Point struct
impl Point {
    // Constructor-like function
    fn new(x: i32, y: i32) -> Self {
        Point { x, y }
    }

    fn distance_from_origin(&self) -> f64 {
        ((self.x.pow(2) + self.y.pow(2)) as f64).sqrt()
    }
}

// Trait definition
trait Describable {
    fn describe(&self) -> String;
}

// Implement trait for Point
impl Describable for Point {
    fn describe(&self) -> String {
        format!("Point at ({}, {})", self.x, self.y)
    }
}

// Generic function with lifetime specifier
fn get_first<'a, T>(slice: &'a [T]) -> Option<&'a T> {
    slice.get(0)
}

// Enum with variants
enum Message {
    Quit,
    Write(String),
    Move { x: i32, y: i32 },
    ChangeColor(i32, i32, i32),
}

fn main() -> Result<(), Box<dyn Error>> {
    println!("Hello, Rustaceans!");

    let p1 = Point::new(3, 4);
    let p2 = Point { x: 5, y: 12 }; // Struct literal

    println!("P1: {:?}, Distance: {:.2}", p1, p1.distance_from_origin());
    println!("P2 Description: {}", p2.describe());

    let mut points_map: HashMap<Point, String> = HashMap::new();
    points_map.insert(p1.clone(), "Origin Neighbor".to_string());
    points_map.insert(p2, "Further Point".to_string());

    for (point, name) in &points_map {
        println!("Found '{}' at {:?}", name, point);
    }

    // Using the generic function
    let numbers = vec![10, 20, 30];
    if let Some(first_num) = get_first(&numbers) {
        println!("First number is: {}", first_num);
    }

    // Pattern matching with 'match'
    let msg = Message::Write(String::from("Hello via message"));
    match msg {
        Message::Quit => println!("Quitting..."),
        Message::Write(text) => println!("Message: {}", text),
        Message::Move { x, y } => println!("Moving to ({}, {})", x, y),
        Message::ChangeColor(r, g, b) => println!("Changing color to R:{}, G:{}, B:{}", r, g, b),
    }
    
    // Asynchronous example (needs tokio or async-std typically)
    // async fn fetch_something() -> String { "data".to_string() }
    // let _data = async { fetch_something().await };
    // tokio::spawn(async { ... });

    Ok(()) // Return Ok for Result<(), ...>
}`;
  }

  /**
   * Detects if the given content matches Rust patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;
    let specificRustHits = 0;

    // 0. Early bail out if strong JS/other definitive markers are present
    if (
      /\bimport\s+.*\s+from\s+['"]/.test(content) &&
      !/\buse\s+/.test(content)
    ) {
      // JS/TS import but not Rust 'use'
      return this.noMatch(); // Likely JS/TS module
    }
    if (/=>\s*\{/.test(content) && !/\bmatch\b/.test(content)) {
      // JS arrow, not Rust match arm
      return this.noMatch();
    }

    // 1. Highly Definitive Rust Keywords and Syntax
    const definitivePatterns = [
      // fn, let, attributes, core types, use, ::, lifetimes, macros, Option/Result, match
      {
        pattern:
          /\bfn\s+[a-zA-Z_][\w]*\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?:->\s*[\w&:'<>., ()[\]]+)?\s*\{/g,
        weight: 0.4,
        perMatch: 0.05,
        specific: true,
      },
      {
        pattern: /\b(let\s+(mut\s+)?[a-zA-Z_]\w*\s*:\s*[\w&:'<>., ()[\]]+)/g,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
      }, // `let (mut) name: Type` (with type hint)
      {
        pattern: /\b(let\s+(mut\s+)?[a-zA-Z_]\w*\s*=)/g,
        weight: 0.15,
        perMatch: 0.03,
      }, // `let (mut) name =` (without type hint, weaker signal due to JS overlap)
      {
        pattern:
          /#\[(?:derive|cfg|test|allow|warn|deny|forbid|macro_export|macro_use|inline|cold|no_mangle|link)\b[^\]]*\]/g,
        weight: 0.35,
        perMatch: 0.05,
        specific: true,
      },
      {
        pattern:
          /\b(struct|enum|trait|impl|union)\s+[A-Z_][\w]*(?:<[^>]*>)?(?:\s*for\s+[\w:]+)?\s*\{?/g,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
      },
      {
        pattern: /\buse\s+(?:std|crate|super|self)?::(?:[\w*{} ,]+;)?/g,
        weight: 0.3,
        perMatch: 0.04,
        specific: true,
      },
      {
        pattern: /(?<!\w)::\w+(?!\s*\()/g,
        weight: 0.15,
        perMatch: 0.01,
        specific: true,
      }, // Path separator `::` not followed by ( to avoid C++ static method calls
      {
        pattern: /['][a-zA-Z_]\w*\b/g,
        weight: 0.2,
        perMatch: 0.03,
        specific: true,
      }, // Lifetimes `'a`
      { pattern: /\b\w+!\s*\(/g, weight: 0.25, perMatch: 0.03, specific: true }, // Macros `println!(...` (ending with !)
      {
        pattern: /\b(Some|None)\s*\(|\bOk\s*\(|\bErr\s*\(/g,
        weight: 0.25,
        perMatch: 0.03,
        specific: true,
      },
      {
        pattern: /\bmatch\s+[\s\S]*?\{[\s\S]*?\}/gm,
        weight: 0.25,
        perMatch: 0.05,
        specific: true,
      },
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore += Math.min(matches.length, 5) * dp.perMatch;
        }
        patternsMatched++;
        if (dp.specific) {
          strongSignalFound = true;
          specificRustHits++;
        }
      }
    }

    // 2. Common Rust Keywords and constructs
    const commonPatterns = [
      {
        pattern:
          /\b(pub(?:\((?:self|super|crate|in\s+[\w:]+)\))?|mod|const|static|type|unsafe|extern|as|move|loop|break|continue|return|async|await|yield|dyn|impl)\b/g,
        weight: 0.08,
        perMatch: 0.005,
      },
      {
        pattern: /\b(if|else|while|for)\b(?:\s*\{|\s+\w+\s+in)/g,
        weight: 0.05,
        perMatch: 0.002,
      }, // Control flow typical for Rust
      { pattern: /->\s*[\w&:'<>., ()[\]]+/g, weight: 0.1, perMatch: 0.01 }, // Return type arrow
      {
        pattern: /&\s*(?:'[\w]+\s+)?(mut\s+)?[\w:]+/g,
        weight: 0.15,
        perMatch: 0.02,
      }, // References `&foo`, `&mut bar`, `&'a T`
      { pattern: /'\w+:/g, weight: 0.1, perMatch: 0.02 }, // Labeled loops/blocks: 'label: loop {
    ];
    for (const cp of commonPatterns) {
      // ... (same matching logic as definitivePatterns)
      const matches = content.match(cp.pattern);
      if (matches) {
        confidenceScore += cp.weight;
        if (cp.perMatch) {
          confidenceScore += Math.min(matches.length, 10) * cp.perMatch;
        }
        patternsMatched++;
      }
    }

    // 3. Comments
    if (
      /\/\//.test(content) &&
      !content.includes("http://") &&
      !content.includes("https://")
    ) {
      // Avoid matching URLs
      confidenceScore += 0.02; // // is common in many languages
    }
    if (/\/\*[\s\S]*?\*\//.test(content)) {
      confidenceScore += 0.02;
    }
    if (/\/\/\/|\/\/!|\/\*\*!|\/\*\*[^!]/.test(content)) {
      // Rustdoc comments
      confidenceScore += 0.15;
      patternsMatched++;
      strongSignalFound = true;
      specificRustHits++;
    }

    // 4. Anti-patterns (more aggressive against JS)
    const antiPatterns = [
      { pattern: /<\?php/i, weight: -0.8 },
      { pattern: /^\s*package\s+[\w.]+;/m, weight: -0.7 }, // Java package
      { pattern: /System\.out\.println/i, weight: -0.6 }, // Java print
      { pattern: /console\.log\s*\(/g, weight: -0.5 }, // JavaScript console.log (very common)
      { pattern: /\bfunction\s+\w+\s*\(/g, weight: -0.6 }, // JS function keyword
      // { pattern: /\bvar\s+\w+\s*=/g, weight: -0.3 }, // 'var' is too generic, might appear in comments/strings
      { pattern: /#include\s*</i, weight: -0.7 }, // C/C++ include
      { pattern: /<\w.*?>/g, weight: -0.6 }, // HTML/XML tags
      { pattern: /^\s*def\s+\w+\s*\(.*?\)\s*:/m, weight: -0.7 }, // Python def func():
      { pattern: /@ Grab\b/i, weight: -0.8 }, // Groovy @Grab
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        // console.log(`RUST ANTI-PATTERN HIT: ${ap.pattern.source}`);
        confidenceScore += ap.weight;
      }
    }

    // 5. Final Adjustments
    if (strongSignalFound && specificRustHits >= 2) {
      confidenceScore += 0.25;
    }
    if (
      content.includes("fn main()") &&
      (content.includes("let ") || content.includes("println!"))
    ) {
      confidenceScore += 0.2;
      strongSignalFound = true; // Re-affirm strong signal
    }
    // If it looks like JS but has no Rust-specific type annotations or lifetimes, penalize Rust more
    if (
      content.includes("let ") &&
      !content.match(/:\s*[\w&:'<>., ()[\]]+/) &&
      !content.match(/[']\w/)
    ) {
      if (content.match(/\bfunction\b|\bconsole\.log\b/)) {
        // And has JS keywords
        confidenceScore -= 0.2;
      }
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch =
      (strongSignalFound && specificRustHits >= 1 && confidenceScore >= 0.4) ||
      (specificRustHits >= 2 && confidenceScore >= 0.5) ||
      (patternsMatched >= 4 && confidenceScore >= 0.6);

    // console.log(`RUST: Score=${confidenceScore.toFixed(3)}, Patterns=${patternsMatched}, Specific=${specificRustHits}, Strong=${strongSignalFound}, Match=${isMatch}`);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound && specificRustHits >= 1,
    };
  }

  getFileExtension(): string {
    return "rs";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'rust'

    // Monaco has excellent built-in support for 'rust'.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // Rust formatting is almost exclusively done by `rustfmt`, usually via an LSP.
    // A simple regex-based formatter would be highly inadequate.
  }
}

// Create and register the detector
const rustDetector = new RustFormatDetector();
formatRegistry.register(rustDetector);

// Export for backward compatibility (optional)
export const registerRustProvider = (monaco: any) => {
  rustDetector.registerProvider(monaco);
};
