import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";

export class PythonLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "python";
  name = "Python";
  extensions = ["py", "pyw", "pyi", "gyp", "gypi"]; // Added .pyi (stub files), .gyp/i (build)
  priority = 6; // Give Python a good priority

  sampleContent(): string {
    return `#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import asyncio
from typing import List, Dict, Any, Tuple, Union, Callable

# Global constant
MAX_RETRIES: int = 3

@dataclass(frozen=True)
class Config:
    api_key: str
    timeout_seconds: float = 10.0

class DataProcessor:
    """
    A class to process data from various sources.
    This is a multi-line docstring.
    """
    def __init__(self, config: Config):
        self.config = config
        self._data_cache: Dict[str, Any] = {}

    async def fetch_data(self, url: str) -> Union[Dict, List, None]:
        """Fetches data from a URL with retries."""
        for attempt in range(MAX_RETRIES):
            try:
                # In a real app, you'd use a library like httpx or aiohttp
                print(f"Attempting to fetch {url}, attempt {attempt + 1}")
                await asyncio.sleep(0.1) # Simulate network request
                if "error" in url:
                    raise ConnectionError("Simulated network error")
                return {"url": url, "content": f"Mock content for {url}"}
            except ConnectionError as e:
                print(f"Error fetching {url}: {e}")
                if attempt == MAX_RETRIES - 1:
                    return None
                await asyncio.sleep(2 ** attempt) # Exponential backoff
        return None

    def process_item(self, item_id: str, transform_func: Callable[[Any], Any]) -> Any:
        if item_id in self._data_cache:
            return transform_func(self._data_cache[item_id])
        
        raw_data = {"id": item_id, "value": os.urandom(5).hex()} # Example raw data
        self._data_cache[item_id] = raw_data
        return transform_func(raw_data)

    def __repr__(self) -> str:
        return f"<DataProcessor with config: {self.config.api_key[:5]}...>"

def generate_report(data_points: List[float]) -> str:
    if not data_points:
        return "No data to report."
    
    # List comprehension
    squared_points = [x*x for x in data_points if x > 0]
    
    # f-string
    return f"Report: Count={len(data_points)}, Sum={sum(data_points)}, Positive Squared Sum={sum(squared_points):.2f}"

async def main():
    print("Python script starting...")
    
    my_config = Config(api_key="your_secret_api_key_here")
    processor = DataProcessor(my_config)
    
    urls_to_fetch = [
        "https://api.example.com/data1",
        "https://api.example.com/error_prone_data",
        "https://api.example.com/data2"
    ]
    
    # Gather results from async functions
    results = await asyncio.gather(*(processor.fetch_data(url) for url in urls_to_fetch))
    
    for i, result in enumerate(results):
        if result:
            print(f"Fetched data for {urls_to_fetch[i]}: {str(result)[:50]}...")
        else:
            print(f"Failed to fetch data for {urls_to_fetch[i]}")

    report = generate_report([1.0, -2.5, 3.0, 0.0, 5.2])
    print(report)
    
    # Using a lambda
    transformed = processor.process_item("item123", lambda data: data.get("value", "").upper())
    print(f"Transformed item: {transformed}")

    # Example of try-except
    try:
        num = int("abc")
    except ValueError as e:
        print(f"Caught expected error: {e}")
    finally:
        print("Finally block executed.")

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  // Helper to get patterns with weights
  private getPatterns(): Array<{
    pattern: RegExp;
    weight: number;
    perMatch?: number;
    specific?: boolean;
    anti?: boolean;
    maxMatches?: number;
  }> {
    return [
      // --- Definitive Python Syntax (High Weights) ---
      {
        pattern: /^\s*def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\((?:[^)]|\n)*?\)\s*:/gm,
        weight: 0.35,
        perMatch: 0.05,
        specific: true,
        maxMatches: 5,
      }, // Function definition (handles multiline args)
      {
        pattern: /^\s*class\s+[A-Z_][a-zA-Z0-9_]*(\((?:[^)]|\n)*?\))?\s*:/gm,
        weight: 0.35,
        perMatch: 0.05,
        specific: true,
        maxMatches: 3,
      }, // Class definition
      {
        pattern:
          /^\s*import\s+[\w.]+(?:\s+as\s+\w+)?(?:,\s*[\w.]+(?:\s+as\s+\w+)?)*$/gm,
        weight: 0.3,
        perMatch: 0.04,
        specific: true,
        maxMatches: 5,
      },
      {
        pattern: /^\s*from\s+[\w.]+\s+import\s+(?:\*|\w+|\([\w\s,()]*\))$/gm,
        weight: 0.3,
        perMatch: 0.04,
        specific: true,
        maxMatches: 5,
      }, // Handles `from foo import (bar, baz)`
      {
        pattern: /\bif\s+__name__\s*==\s*(['"])__main__\1\s*:/m,
        weight: 0.5,
        specific: true,
        maxMatches: 1,
      }, // Main guard - very strong
      {
        pattern: /^\s*@[\w.]+/gm,
        weight: 0.25,
        perMatch: 0.03,
        specific: true,
        maxMatches: 3,
      }, // Decorators
      {
        pattern: /^\s*async\s+(def|for|with)\b/gm,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern: /\bawait\s+\w+/g,
        weight: 0.25,
        perMatch: 0.03,
        specific: true,
        maxMatches: 5,
      },
      {
        pattern: /\byield\s+(?:from\s+)?/g,
        weight: 0.2,
        perMatch: 0.03,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern: /^\s*"""[\s\S]*?"""\s*$|^\s*'''[\s\S]*?'''\s*$/m,
        weight: 0.15,
        perMatch: 0.03,
        specific: true,
        maxMatches: 2,
      }, // Module/class/func docstrings

      // --- Common Python Idioms (Medium Weights) ---
      {
        pattern: /\bself\.[a-zA-Z_][a-zA-Z0-9_]*/g,
        weight: 0.15,
        perMatch: 0.01,
        maxMatches: 10,
      },
      {
        pattern: /\s*->\s*([\w\[\],.:\s|]+?)(?:\s*#.*)?$/gm,
        weight: 0.15,
        perMatch: 0.02,
        maxMatches: 5,
      }, // Return type hints `-> Type:`
      {
        pattern:
          /\b\w+\s*:\s*([\w\[\],.:\s|]+?)(?:\s*=\s*[^#\n]+?)?(?:\s*#.*)?$/gm,
        weight: 0.1,
        perMatch: 0.01,
        maxMatches: 10,
      }, // Variable/arg type hints `var: Type` or `var: Type = val`
      {
        pattern: /\bf(["']{1,3})/g,
        weight: 0.2,
        perMatch: 0.02,
        maxMatches: 5,
      }, // f-string prefix
      {
        pattern: /\[.+?\s+for\s+\w+\s+in\s+.+?(?:\s+if\s+.+?)?\]/g,
        weight: 0.2,
        perMatch: 0.05,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern: /\{.+?\s+for\s+\w+\s+in\s+.+?(?:\s+if\s+.+?)?\}/g,
        weight: 0.2,
        perMatch: 0.05,
        specific: true,
        maxMatches: 3,
      },
      {
        pattern: /\b(True|False|None)\b/g,
        weight: 0.15,
        perMatch: 0.02,
        maxMatches: 10,
      },
      {
        pattern:
          /\b(in|is|not|and|or|elif|else|try|except|finally|with|as|pass|break|continue|lambda|del|global|nonlocal|assert|async|await|yield|raise)\b/g,
        weight: 0.1,
        perMatch: 0.005,
        maxMatches: 20,
      },

      // --- Indentation (very heuristic, low weight) ---
      // Python relies on indentation, but it's hard to detect reliably with regex alone without context.
      // This looks for lines starting with common Python indent levels (multiples of 2 or 4 spaces).
      {
        pattern: /^(?: {4}| {8}| {12}| {2}| {6}| {10})\S/m,
        weight: 0.03,
        perMatch: 0.002,
        maxMatches: 10,
      },

      // --- Comments ---
      { pattern: /^\s*#.*$/gm, weight: 0.02, perMatch: 0.001, maxMatches: 20 }, // # comments

      // --- Anti-Patterns (Syntax strongly indicating OTHER languages) ---
      { pattern: /<\?php/i, weight: -0.8, anti: true },
      { pattern: /System\.out\.println/i, weight: -0.6, anti: true },
      { pattern: /^\s*package\s+[\w.]+;/m, weight: -0.7, anti: true },
      { pattern: /=>\s*\{/g, weight: -0.5, anti: true }, // JS arrow function block
      { pattern: /<\w.*?>/g, weight: -0.7, anti: true }, // HTML/XML tags
      { pattern: /\b(var|let)\s+\w+\s*=/g, weight: -0.4, anti: true }, // JS var/let (not const, as Python has constants)
      { pattern: /\bfunction\s+\w+\s*\(/g, weight: -0.6, anti: true }, // JS function keyword
      { pattern: /\{\s*$/m, weight: -0.1, anti: true }, // Opening brace at end of line (less common in Python, more in C-style)
      { pattern: /^\s*\}/m, weight: -0.1, anti: true }, // Closing brace on its own line
      { pattern: /;\s*$/m, weight: -0.2, anti: true }, // Semicolons at end of line (Python doesn't require)
    ];
  }

  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }

    let confidenceScore = 0.0;
    let patternsMatchedCount = 0;
    let specificPatternsHitCount = 0;
    let antiPatternPenaltyScore = 0.0;

    // 1. Shebang
    const shebangMatch = trimmedContent.match(/^\s*#![^\r\n]*python[\d.]*/i);
    if (shebangMatch) {
      confidenceScore += 0.75;
      patternsMatchedCount++;
      specificPatternsHitCount++;
    } else if (
      trimmedContent.match(
        /^\s*#![^\r\n]*(scala|sh|bash|node|perl|ruby|php|js|ts)/i,
      )
    ) {
      return { match: false, confidence: 0.0, matchedDefinitive: false }; // Not Python if other script shebang
    } else if (/^\s*#![^\r\n]*/i.test(trimmedContent)) {
      confidenceScore -= 0.2;
    }

    // 2. UTF-8 coding declaration
    if (
      /^\s*#.*coding[:=]\s*utf-8/i.test(
        content.split("\n").slice(0, 2).join("\n"),
      )
    ) {
      confidenceScore += 0.15;
      patternsMatchedCount++;
    }

    const allPatterns = this.getPatterns();

    for (const p of allPatterns) {
      if (
        p.pattern.source.includes("#!") ||
        p.pattern.source.includes("coding[:=]")
      )
        continue;

      const matches = content.match(p.pattern);
      if (matches) {
        if (p.anti) {
          antiPatternPenaltyScore +=
            p.weight * Math.min(matches.length, p.maxMatches || 2);
        } else {
          confidenceScore += p.weight;
          if (p.perMatch) {
            confidenceScore +=
              Math.min(matches.length, p.maxMatches || 5) * p.perMatch;
          }
          patternsMatchedCount++;
          if (p.specific) {
            specificPatternsHitCount++;
          }
        }
      }
    }

    // --- REFINED SCALA ANTI-PATTERNS for Python Detector ---
    const scalaAntiPatterns = [
      // Scala's `def name(...): ReturnType = {` is distinct from Python's `def name(...): -> ReturnType:`
      {
        pattern:
          /\bdef\s+\w+(?:\[[^\]]+\])?\s*\([^)]*\)\s*:\s*[\w\[\],.<>:"']+\s*=/g,
        weight: -0.7,
      },
      { pattern: /\b(?:val|var)\s+\w+\s*:\s*[\w\[\],.<>:"']+/g, weight: -0.5 }, // `val x: Type` or `var y: Type` (Python uses `x: Type`)
      {
        pattern:
          /\b(case\s+class|case\s+object|trait|sealed\s+trait|sealed\s+class)\b/g,
        weight: -0.8,
      },
      {
        pattern: /\bobject\s+[A-Z]\w*\s*(?:extends\s+App)?\s*\{/g,
        weight: -0.7,
      }, // `object Main extends App {`
      { pattern: /\bimport\s+[\w.]+\.(?:\{[^}]*\}|_)/g, weight: -0.5 }, // `import scala.util.{Try, Success}` or `import scala.collection._`
      { pattern: /\bs(?:""|"|')/g, weight: -0.6 }, // Scala s"" string interpolator (Python uses f"")
      { pattern: /\b(implicit|lazy)\b/g, weight: -0.4 }, // Scala specific keywords
      { pattern: /\w+\s*<:\s*\w+|\w+\s*>:\s*\w+/g, weight: -0.5 }, // Scala type bounds <: >:
      { pattern: /=>/g, weight: -0.3, except: /\s*->\s*.*:/g }, // Scala fat arrow, unless it's part of Python return type hint
    ];

    for (const ap of scalaAntiPatterns) {
      const matches = content.match(ap.pattern);
      if (matches) {
        let applyPenalty = true;
        if (ap.except) {
          if (ap.except.test(content)) {
            applyPenalty = false;
          }
        }
        if (applyPenalty) {
          antiPatternPenaltyScore += ap.weight * Math.min(matches.length, 2);
        }
      }
    }
    // --- END SCALA ANTI-PATTERNS ---

    confidenceScore += antiPatternPenaltyScore;

    // Adjustments
    if (specificPatternsHitCount >= 2 && patternsMatchedCount >= 3) {
      confidenceScore += 0.2;
    }
    if (
      specificPatternsHitCount === 0 &&
      patternsMatchedCount < 2 &&
      confidenceScore > 0.1
    ) {
      confidenceScore *= 0.5;
    }
    const linesCount = content.split("\n").length;
    if (
      linesCount > 20 &&
      patternsMatchedCount < 3 &&
      specificPatternsHitCount < 1 &&
      confidenceScore > 0.1
    ) {
      // Only penalize if confidence isn't already very low
      confidenceScore -= 0.15;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = confidenceScore >= 0.35; // Slightly lowered threshold, relies more on anti-patterns now

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive:
        isMatch &&
        (shebangMatch !== null || specificPatternsHitCount >= 2) &&
        confidenceScore > 0.6,
    };
  }

  // countSpecificPatterns is now effectively rolled into detect's confidence logic
  // You can remove it or adapt it if LanguageRegistry needs a separate distinct count
  // for some tie-breaking beyond confidence and priority.

  getFileExtension(): string {
    return "py";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'python'

    // Monaco has excellent built-in support for 'python'.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // Python formatting is best handled by tools like Black, Yapf, or Autopep8,
    // often via an LSP. A simple regex-based formatter is highly inadequate.
    // The one you had was a very basic indentation attempt.
    // It's better to rely on Monaco's default (if any) or user's external tools.
  }
}

// Create and register the detector
const pythonDetector = new PythonLanguageDetector();
languageRegistry.register(pythonDetector);

// Export for backward compatibility (optional)
export const registerPythonProvider = (monaco: any) => {
  pythonDetector.registerProvider(monaco);
};
