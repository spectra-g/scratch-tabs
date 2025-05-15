import { BaseLanguageDetector } from './baseDetector';
import { languageRegistry } from './registry';
import { DetectionResult, LanguageDetector } from './types';

/**
 * Scala language detector
 */
export class ScalaLanguageDetector extends BaseLanguageDetector implements LanguageDetector {
  id = 'scala'; // Monaco might have 'scala' or require a custom setup
  name = 'Scala';
  extensions = ['scala', 'sc']; // .sc for Scala scripts
  priority = 6; // Higher than Java due to `val`, `var`, `def`, `object` top-level

  sampleContent(): string {
    return `package com.example.myscalaproject

import scala.concurrent.Future
import scala.util.{Try, Success, Failure}
import scala.collection.mutable.ListBuffer

// Define a case class (immutable with auto-generated companion object, equals, hashCode, toString)
case class Person(name: String, age: Int, city: Option[String] = None)

// Define a trait (similar to an interface, can have concrete methods)
trait Printable {
  def toPrettyString: String
}

// Define a class that extends a trait
class DetailedPerson(name: String, age: Int, city: Option[String], val occupation: String)
  extends Person(name, age, city) with Printable {
  
  override def toPrettyString: String = {
    val cityStr = city.getOrElse("N/A")
    s"Name: $name, Age: $age, City: $cityStr, Occupation: $occupation"
  }
}

// Singleton object
object MainApp extends App {
  println("Hello, Scala World!")

  val immutableValue: String = "Scala is concise"
  var mutableCounter: Int = 0

  def greet(name: String, greeting: String = "Hello"): String = {
    s"$greeting, $name!"
  }

  val person1 = Person("Alice Smith", 30)
  val person2 = new DetailedPerson("Bob Johnson", 42, Some("New York"), "Engineer")

  println(greet(person1.name))
  println(person2.toPrettyString)

  // Collections and higher-order functions
  val numbers = List(1, 2, 3, 4, 5, 6)
  val evenSquaredNumbers = numbers.filter(_ % 2 == 0).map(x => x * x)
  println(s"Even squared numbers: $evenSquaredNumbers")

  // Pattern matching
  val someValue: Any = 5
  val description = someValue match {
    case s: String => s"It's a String: $s"
    case i: Int if i > 10 => s"It's a large Int: $i"
    case _: Int => "It's some other Int"
    case _ => "It's something else"
  }
  println(description)

  // Future example
  import scala.concurrent.ExecutionContext.Implicits.global
  val futureResult: Future[String] = Future {
    Thread.sleep(1000) // Simulate work
    "Async operation completed!"
  }

  futureResult.onComplete {
    case Success(value) => println(value)
    case Failure(ex) => println(s"An error occurred: \${ex.getMessage}")
  }

  // Wait for future for demo purposes (not typical in production main thread)
  Thread.sleep(2000)
  println("Exiting application.")
}
`;
  }

  /**
   * Detects if the given content matches Scala patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 10) {
      return { match: false, confidence: 0.0, matchedDefinitive: false };
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;
    let specificScalaHits = 0;
    let antiPatternPenaltyScore = 0.0;

    // 0. Shebang check
    if (/^\s*#![^\r\n]*scala/i.test(trimmedContent)) {
      confidenceScore += 0.8; // Very strong signal
      patternsMatched++;
      strongSignalFound = true;
      specificScalaHits++;
    } else if (/^\s*#![^\r\n]*(python|ruby|bash|sh|node|js|ts|php)/i.test(trimmedContent)) {
      return { match: false, confidence: 0.0, matchedDefinitive: false }; // Not Scala if other script shebang
    }

    // --- PYTHON ANTI-PATTERNS for Scala Detector ---
    if (/\bif\s+__name__\s*==\s*(['"])__main__\1\s*:/m.test(content)) { // Python main guard
      antiPatternPenaltyScore -= 0.8;
    }
    if (/^\s*"""[\s\S]*?"""|^\s*'''[\s\S]*?'''/m.test(content) && !content.match(/s"""|f"""|raw"""/)) { // Python docstrings/multiline strings, but not Scala's raw/interpolated
      antiPatternPenaltyScore -= 0.5;
    }
    if (/\b(elif|else\s*:)\b/g.test(content) && !content.match(/\belse\s*\{/)) { // Python elif/else:, Scala uses `else if` or `else {`
      antiPatternPenaltyScore -= 0.4;
    }
    if (/\b(True|False|None)(?!\w)/g.test(content) && !content.match(/\b(Some|None)\(/)) { // Python bool/None, ensure not Scala's Option.None
      antiPatternPenaltyScore -= 0.3;
    }
    if (/\[.+?\s+for\s+\w+\s+in\s+.+?\]/g.test(content) && !/\bfor\s*\{.*\}\s*yield\b/.test(content)) { // Python list comprehension vs Scala for/yield
      antiPatternPenaltyScore -= 0.5;
    }
    if (/^\s*from\s+[\w.]+\s+import\s+(?:\*|\w+|\([\w\s,]+\))$/gm.test(content) && !/^\s*import\s+[\w.{}]/.test(content)) { // Python from...import, if not also Scala-style import
      antiPatternPenaltyScore -= 0.4;
    }
    if (/\s*->\s*([\w\[\],.:\s|]+?)(?:\s*#.*)?$/gm.test(content) && !/\s*:\s*[\w\[\],.<>:"']+\s*=/.test(content)) { // Python return type hint `-> Type:` vs Scala `): Type =`
      antiPatternPenaltyScore -= 0.3;
    }
    // --- End Python Anti-Patterns ---


    // 1. Core Scala Keywords and Structures
    const definitivePatterns = [
      { pattern: /^\s*package\s+[\w.]+/m, weight: 0.25, perMatch: 0.02, maxMatches: 1, specific: true },
      { pattern: /^\s*import\s+[\w.{}\s,]+(?:_\b)?/m, weight: 0.25, perMatch: 0.03, maxMatches: 5, specific: true },
      { pattern: /\b(class|trait|object)\s+[A-Z_][\w]*(?:\[[^\]]+\])?(?:\s*\([^)]*\))?(?:\s+extends\s+[\w.:<>\[\]]+)?(?:\s+with\s+[\w.:<>\[\]]+)*\s*\{?/g, weight: 0.4, perMatch: 0.1, specific: true, maxMatches: 4 },
      { pattern: /\b(?:val|var)\s+[a-zA-Z_][\w]*\s*:\s*[\w\[\],.<>:"'\s]+\s*(?:=\s*[^;{\n]*)?/g, weight: 0.35, perMatch: 0.05, specific: true, maxMatches: 10 },
      { pattern: /\bdef\s+[a-zA-Z_][\w!?=~<>*+\-%&^|]*\s*(?:\[[^\]]+\])?\s*(?:\([^)]*\))*\s*:\s*[\w\[\],.<>:"'\s]+\s*=/g, weight: 0.4, perMatch: 0.05, specific: true, maxMatches: 5 },
      { pattern: /\bcase\s+(?:class|object)\s+\w+/g, weight: 0.4, perMatch: 0.1, specific: true, maxMatches: 3 },
      { pattern: /\b(private\[\w+\]|protected\[\w+\]|override|final|sealed|implicit|lazy|abstract\s+override)\b/g, weight: 0.2, perMatch: 0.02, maxMatches: 5, specific: true },
      { pattern: /=>/g, weight: 0.25, perMatch: 0.03, specific: true, maxMatches: 10 },
      { pattern: /_\s*(?::\s*\w+|as\s+\w+|\*)/g, weight: 0.2, perMatch: 0.02, maxMatches: 5, specific: true },
      { pattern: /\b(for|yield)\s*(?:\{|\()[\s\S]*?(?:\}|\))\s*(?:yield)?/g, weight: 0.3, perMatch: 0.03, specific: true, maxMatches: 3 },
      { pattern: /\b[sfr](?:"""|""|")[\s\S]*?(?:"""|""|")/g, weight: 0.35, perMatch: 0.05, specific: true, maxMatches: 5 },
    ];

    for (const dp of definitivePatterns) {
      const matches = content.match(dp.pattern);
      if (matches) {
        confidenceScore += dp.weight;
        if (dp.perMatch) {
          confidenceScore += Math.min(matches.length, dp.maxMatches || 5) * dp.perMatch;
        }
        patternsMatched++;
        if (dp.specific) {
          strongSignalFound = true;
          specificScalaHits++;
        }
      }
    }

    // 2. Common collection methods and syntax
    const collectionPatterns = [
      { pattern: /\.\s*(map|flatMap|filter|foreach|reduce|foldLeft|collect|groupBy|zip|headOption|find|exists|forall|mkString|to[A-Z]\w*)\b/g, weight: 0.15, perMatch: 0.01, maxMatches: 10 },
      { pattern: /\b(List|Seq|Vector|Map|Set|Option|Some|None|Try|Success|Failure|Future|Either|Left|Right)\s*\(?/g, weight: 0.2, perMatch: 0.02, maxMatches: 5 },
    ];
    for (const cp of collectionPatterns) {
      const matches = content.match(cp.pattern);
      if (matches) {
        confidenceScore += cp.weight;
        if (cp.perMatch) {
          confidenceScore += Math.min(matches.length, cp.maxMatches || 5) * cp.perMatch;
        }
        patternsMatched++;
      }
    }

    // 3. Comments
    if (/\/\//.test(content) || /\/\*[\s\S]*?\*\//.test(content)) {
      confidenceScore += 0.02;
    }

    // Apply anti-pattern penalty
    confidenceScore += antiPatternPenaltyScore;

    // 5. Final Adjustments
    if (strongSignalFound && specificScalaHits >= 2) {
      confidenceScore += 0.3;
    }
    if (content.includes("def ") && (content.includes("val ") || content.includes("var ")) && content.includes("=>") && content.includes(": ") && content.includes(" = ")) {
      confidenceScore += 0.35; // Very strong Scala idiom
      strongSignalFound = true;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = (strongSignalFound && specificScalaHits >= 1 && confidenceScore >= 0.50) ||
      (specificScalaHits >= 2 && confidenceScore >= 0.60) ||
      (patternsMatched >= 4 && confidenceScore >= 0.70);


    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound && specificScalaHits >= 2 && confidenceScore > 0.65
    };
  }

  getFileExtension(): string {
    return 'scala';
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'scala'

    // Check if Monaco has built-in support or if a community plugin might provide 'scala'
    // For this example, we'll assume a basic Monarch tokenizer if not present.
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageId)) {
      monaco.languages.register({ id: languageId });

      monaco.languages.setMonarchTokensProvider(languageId, {
        defaultToken: 'invalid',
        keywords: [
          'abstract', 'case', 'catch', 'class', 'def', 'do', 'else', 'enum', 'extends',
          'false', 'final', 'finally', 'for', 'forSome', 'if', 'implicit', 'import',
          'lazy', 'match', 'new', 'null', 'object', 'override', 'package',
          'private', 'protected', 'return', 'sealed', 'super', 'this', 'throw',
          'trait', 'true', 'try', 'type', 'val', 'var', 'while', 'with', 'yield',
          '_', // Placeholder
        ],
        typeKeywords: [
          'Any', 'AnyVal', 'AnyRef', 'Boolean', 'Byte', 'Char', 'Double', 'Float',
          'Int', 'Long', 'Nothing', 'Null', 'Short', 'String', 'Symbol', 'Unit',
          'List', 'Seq', 'Vector', 'Map', 'Set', 'Option', 'Some', 'None',
          'Try', 'Success', 'Failure', 'Future',
        ],
        operators: [
          '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=', '&&', '||', '++', '--',
          '+', '-', '*', '/', '&', '|', '^', '%', '<<', '>>', '>>>', '+=', '-=', '*=', '/=',
          '&=', '|=', '^=', '%=', '<<=', '>>=', '>>>=', '=>', '<-', '<:', ':>', '#', '@',
          '->' // For tuples or context bounds
        ],
        symbols: /[=><!~?:&|+\-*/^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        digits: /\d+(_\d+)*/,
        octaldigits: /[0-7]+(_[0-7]+)*/,
        binarydigits: /[01]+(_[01]+)*/,
        hexdigits: /[[0-9a-fA-F]+(_[0-9a-fA-F]+)*/,

        tokenizer: {
          root: [
            [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@typeKeywords': 'type', '@default': 'identifier' } }],
            { include: '@whitespace' },
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],
            [/@digits+[lLfFdD]?/, 'number'],
            [/0[xX]@hexdigits+[lL]?/, 'number.hex'],
            [/0[bB]@binarydigits+[lL]?/, 'number.binary'],
            [/0@octaldigits+[lL]?/, 'number.octal'], // Less common
            [/[;,.]/, 'delimiter'],
            [/'(?:[^'\\]|\\.)*$/, 'string.invalid'], // non-teminated single quote string
            [/'/, 'string', '@string_single'],
            [/"/, 'string', '@string_double'],
            [/`[^`]*`/, 'identifier.special'], // Backtick quoted identifiers
            [/"""/, 'string', '@string_triple_double'], // Triple quote string
          ],
          whitespace: [
            [/[ \t\r\n]+/, ''],
            [/\/\*\*(?!\/)/, 'comment.doc', '@scaladoc'],
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
          ],
          comment: [
            [/[^/*]+/, 'comment'],
            [/\/\*/, 'comment', '@push'], // Nested comments
            ["\\*/", 'comment', '@pop'],
            [/[/*]/, 'comment']
          ],
          scaladoc: [
            [/[^/*]+/, 'comment.doc'],
            [/\/\*/, 'comment.doc', '@push'],
            ["\\*/", 'comment.doc', '@pop'],
            [/[/*]/, 'comment.doc']
          ],
          string_single: [
            [/[^\\']+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop']
          ],
          string_double: [
            [/[^\\"$]+/, 'string'], // Allow $ for interpolation but handle separately
            [/\$([a-zA-Z_]\w*|\{[^}]*\})/, 'variable.interpolation'], // $var or ${expr}
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
          ],
          string_triple_double: [
            [/[^"$]+/, 'string'], // Allow $ for interpolation
            [/\$([a-zA-Z_]\w*|\{[^}]*\})/, 'variable.interpolation'],
            [/"""/, 'string', '@pop'],
            [/./, 'string'] // Catch-all for characters within triple quotes
          ],
        }
      });
    }
    // Scala formatting is very complex, usually done with Scalafmt.
    // A simple regex formatter is not practical.
  }
}

// Create and register the detector
const scalaDetector = new ScalaLanguageDetector();
languageRegistry.register(scalaDetector);

// Export for backward compatibility (optional)
export const registerScalaProvider = (monaco: any) => {
  scalaDetector.registerProvider(monaco);
};