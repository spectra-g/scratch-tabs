import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";

/**
 * Detector for Groovy language files
 */
export class GroovyDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "groovy";
  name = "Groovy";
  extensions = ["groovy", "gvy", "gy", "gsh", "gradle"]; // Added .gradle
  priority = 7; // Higher priority, especially vs JavaScript, due to 'def' and other distinct features

  sampleContent(): string {
    return `#!/usr/bin/env groovy

// Groovy script example
def greeting = "Hello, World!"
println greeting

// Define a class
class Example {
String name

void sayHello() {
    println "Hello, \${name}!"
}
}

// Create an instance and use it
def example = new Example(name: "Groovy")
example.sayHello()
`;
  }

  getFileExtension(): string {
    return "groovy";
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 5) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0; // Count of distinct pattern types hit
    let groovySpecificHits = 0; // Count of highly specific Groovy patterns

    // 1. Shebang check (strong positive signal)
    if (/^\s*#!.*?env\s+groovy\b|^\s*#!.*?\/groovy\b/.test(content)) {
      confidenceScore += 0.8;
      patternsMatched++;
      groovySpecificHits++;
    }

    // 2. Core Groovy Keywords and Syntax
    const groovyPatterns = [
      // Very Groovy specific (higher weights)
      { regex: /\bdef\s+\w+\s*=\s*/g, weight: 0.4, perMatch: 0.07 }, // def variable assignment (boosted)
      { regex: /\bdef\s+\w+\s*\([^)]*\)\s*\{/g, weight: 0.45, perMatch: 0.07 }, // def method definition (boosted)
      {
        regex: /['"]{1,3}.*?\$\{.*?}.*?['"]{1,3}/g,
        weight: 0.4,
        perMatch: 0.1,
      }, // String interpolation (GStrings) - very strong
      { regex: /\bprintln\s+[^(]/g, weight: 0.35, perMatch: 0.1 }, // println without parentheses
      {
        regex: /\bnew\s+\w+\([^)]*:[^,}]+[^)]*\)/g,
        weight: 0.3,
        perMatch: 0.05,
      }, // Named parameters in constructor
      {
        regex: /\b(assert|as|in|trait|delegate)\b/g,
        weight: 0.2,
        perMatch: 0.03,
      }, // Keywords more common/distinct in Groovy
      { regex: /\b(Closure)\b/g, weight: 0.25, perMatch: 0.05 }, // Closure type
      {
        regex: /\?\.|(?<!\w)\*\.(?!\w)|\.\&|<=>|<~|==~|=~|.&|\*\*/g,
        weight: 0.25,
        perMatch: 0.05,
      }, // Groovy-specific operators
      { regex: /@Grab(?:\(.*?\))?/g, weight: 0.3, perMatch: 0.1 }, // Grape annotations
      { regex: /\w+\.each\s*\{/g, weight: 0.15, perMatch: 0.03 },
      { regex: /\w+\.collect\s*\{/g, weight: 0.15, perMatch: 0.03 },
      { regex: /\w+\.with\s*\{/g, weight: 0.15, perMatch: 0.03 },
      { regex: /\w+\.inject\s*\(.*?\)\s*\{/g, weight: 0.15, perMatch: 0.03 },

      // Common with Java/JS but still useful context
      {
        regex: /\b(class|interface|enum)\s+\w+/g,
        weight: 0.05,
        perMatch: 0.01,
      },
      { regex: /\bpackage\s+[\w.]+;?/g, weight: 0.05, perMatch: 0.01 },
      { regex: /\bimport\s+[\w.*]+;?/g, weight: 0.05, perMatch: 0.01 }, // Java-style imports also common
      {
        regex: /\b(public|private|protected|static|final)\b/g,
        weight: 0.03,
        perMatch: 0.005,
      },
      {
        regex: /\b(try|catch|finally|throw|throws)\b/g,
        weight: 0.03,
        perMatch: 0.005,
      },
      {
        regex:
          /\b(if|else|for|while|switch|case|default|break|continue|return)\b/g,
        weight: 0.02,
        perMatch: 0.002,
      },
    ];

    for (const p of groovyPatterns) {
      const matches = content.match(p.regex);
      if (matches) {
        confidenceScore += p.weight;
        if (p.perMatch) {
          confidenceScore += Math.min(matches.length, 5) * p.perMatch; // Cap per-match bonus
        }
        patternsMatched++;
        if (p.weight >= 0.25) {
          // Consider patterns with high weight as "specific hits"
          groovySpecificHits++;
        }
      }
    }

    // 3. Line analysis (average length, comments) - more heuristic
    const lines = content.split("\n");
    const nonCommentLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        !trimmed.startsWith("*")
      );
    });

    if (nonCommentLines.length > 1) {
      const avgCharsPerLine =
        nonCommentLines.reduce((sum, l) => sum + l.length, 0) /
        nonCommentLines.length;
      if (
        avgCharsPerLine > 80 &&
        avgCharsPerLine < 150 &&
        patternsMatched < 2
      ) {
        // Prose-like lines but few code patterns
        confidenceScore -= 0.1;
      } else if (avgCharsPerLine < 70 && patternsMatched > 0) {
        confidenceScore += 0.05; // Code-like line lengths
      }
    }

    // 4. Anti-patterns (syntax strongly indicating other languages)
    const antiPatterns = [
      { pattern: /#include\s*</i, weight: -0.6 }, // C/C++ include
      { pattern: /^\s*using\s+System;/im, weight: -0.5 }, // C#
      { pattern: /<script.*?>|<div.*?>|<\/div>/i, weight: -0.6 }, // HTML
      // Python specific
      { pattern: /^\s*def\s+\w+\s*\(.*?\)\s*:/m, weight: -0.4 }, // Python def func():
      { pattern: /^\s*class\s+\w+\s*\(.*?\)\s*:/m, weight: -0.4 }, // Python class MyClass(object):
      // JavaScript specific (that are less common or different in Groovy)
      { pattern: /\b(const|let)\s+\w+\s*=/g, weight: -0.3 },
      { pattern: /=>\s*\{/g, weight: -0.3 },
    ];

    const negativeIfMissingPatterns = [
      { pattern: /^\s*def\s+\w+\s*/m, weight: -0.5 }, // Penalize if no Groovy-style def found
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }
    for (const np of negativeIfMissingPatterns) {
      if (!np.pattern.test(content)) {
        confidenceScore += np.weight;
      }
    }
    // 5. Final adjustments and clamping
    if (groovySpecificHits >= 2 && patternsMatched >= 3) {
      confidenceScore += 0.2; // Boost if multiple specific Groovy patterns are found
    }
    if (
      content.includes("def ") &&
      content.includes("println ") &&
      content.includes("${")
    ) {
      confidenceScore += 0.25; // Combination of highly idiomatic Groovy
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    const isMatch = confidenceScore >= 0.45; // Adjust this threshold as needed
    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive:
        isMatch && groovySpecificHits >= 2 && patternsMatched >= 3,
    };
  }

  // registerProvider method remains the same as in your provided snippet
  registerProvider(monaco: any): void {
    const languageId = this.id;
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });

      const keywords = [
        "abstract",
        "as",
        "assert",
        "boolean",
        "break",
        "byte",
        "case",
        "catch",
        "char",
        "class",
        "const",
        "continue",
        "def",
        "default",
        "do",
        "double",
        "else",
        "enum",
        "extends",
        "false",
        "final",
        "finally",
        "float",
        "for",
        "goto",
        "if",
        "implements",
        "import",
        "in",
        "instanceof",
        "int",
        "interface",
        "it",
        "long",
        "native",
        "new",
        "null",
        "package",
        "private",
        "protected",
        "public",
        "return",
        "short",
        "static",
        "strictfp",
        "super",
        "switch",
        "synchronized",
        "this",
        "threadsafe",
        "throw",
        "throws",
        "trait",
        "transient",
        "true",
        "try",
        "void",
        "volatile",
        "while",
      ];
      const types = [
        "BigDecimal",
        "BigInteger",
        "Boolean",
        "Byte",
        "Character",
        "CharSequence",
        "Class",
        "Collection",
        "Date",
        "Double",
        "Enum",
        "Float",
        "Iterable",
        "Integer",
        "List",
        "Long",
        "Map",
        "Object",
        "Set",
        "Short",
        "String",
        "StringBuffer",
        "StringBuilder",
      ];
      const annotations = [
        "Bindable",
        "Delegate",
        "Grab",
        "GrabConfig",
        "GrabExclude",
        "GrabResolver",
        "Immutable",
        "Lazy",
        "Mixin",
        "Newify",
        "Singleton",
        "TypeChecked",
        "CompileStatic",
        "Override", // Added Override
        "ToString",
        "EqualsAndHashCode",
        "TupleConstructor",
        "Canonical", // Common AST transforms
      ];
      const groovyOperators = [
        "<=>",
        "==~",
        "=~",
        "*.",
        "?.",
        ".&",
        ".@",
        "**",
        "**=",
        "?:",
        "<~",
      ];

      monaco.languages.setMonarchTokensProvider(languageId, {
        defaultToken: "invalid",
        keywords: keywords,
        typeKeywords: types,
        annotations: annotations,
        operators: [
          "=",
          ">",
          "<",
          "!",
          "~",
          "?",
          ":",
          "==",
          "<=",
          ">=",
          "!=",
          "&&",
          "||",
          "++",
          "--",
          "+",
          "-",
          "*",
          "/",
          "&",
          "|",
          "^",
          "%",
          "<<",
          ">>",
          ">>>",
          "+=",
          "-=",
          "*=",
          "/=",
          "&=",
          "|=",
          "^=",
          "%=",
          "<<=",
          ">>=",
          ">>>=",
        ],
        groovyOperators: groovyOperators,
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        escapes:
          /\\(?:[abfnrtv\\"'`]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        tokenizer: {
          root: [
            [
              /[a-zA-Z_$][\w$]*/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@typeKeywords": "type",
                  "@default": "identifier",
                },
              },
            ],
            [
              /@\s*[a-zA-Z_$][\w$]*/,
              {
                cases: {
                  "@annotations": "annotation",
                  "@default": "annotation",
                },
              },
            ],
            { include: "@whitespace" },
            [/[{}()\[\]]/, "@brackets"],
            [/[<>](?!@symbols)/, "@brackets"],
            [
              /@symbols/,
              {
                cases: {
                  "@groovyOperators": "operator.special",
                  "@operators": "operator",
                  "@default": "delimiter",
                },
              },
            ],
            [/\d*\.\d+([eE][\-+]?\d+)?[fFdDgG]?/, "number.float"],
            [
              /0[xX][0-9a-fA-F]+([uUbBsSiIlLgG]|([uU](b|s|i|l|g))|([bBsSiIlL](u|U)?))?/,
              "number.hex",
            ],
            [
              /0[bB][01]+([uUbBsSiIlLgG]|([uU](b|s|i|l|g))|([bBsSiIlL](u|U)?))?/,
              "number.binary",
            ],
            [
              /\d+([uUbBsSiIlLgG]|([uU](b|s|i|l|g))|([bBsSiIlL](u|U)?))?/,
              "number",
            ],
            [/'([^'\\]|\\.)*$/, "string.invalid"],
            [/'/, "string", "@string_single"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, "string", "@string_double"],
            [/'''/, "string", "@string_triple_single"],
            [/"""/, "string", "@string_triple_double"],
            [/\$\//, "regexp", "@regexp_slashy"],
            [/\//, "regexp", "@regexp_dollar_slashy"], // For $/ /$ syntax
          ],
          comment: [
            [/[^/*]+/, "comment"],
            [/\/\*/, "comment", "@push"], // Nested comments
            ["\\*/", "comment", "@pop"],
            [/[/*]/, "comment"],
          ],
          groovydoc: [
            [/[^/*]+/, "comment.doc"],
            [/\/\*/, "comment.doc", "@push"],
            ["\\*/", "comment.doc", "@pop"],
            [/[/*]/, "comment.doc"],
          ],
          whitespace: [
            [/[ \t\r\n]+/, "white"],
            [/\/\*\*(?!\/)/, "comment.doc", "@groovydoc"],
            [/\/\*/, "comment", "@comment"],
            [/\/\/.*$/, "comment"],
          ],
          string_single: [
            [/[^\\']+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/'/, "string", "@pop"],
          ],
          string_double: [
            [/[^\\"$]+/, "string"],
            [
              /\$\{/,
              {
                token: "delimiter.bracket",
                next: "@string_expression",
                bracket: "@open",
              },
            ],
            [/\$[a-zA-Z_][\w$]*/, "variable.interpolation"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@pop"],
          ],
          string_triple_single: [
            [/[^\\']+/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/'''/, "string", "@pop"],
          ],
          string_triple_double: [
            [/[^\\"$]+/, "string"],
            [
              /\$\{/,
              {
                token: "delimiter.bracket",
                next: "@string_expression",
                bracket: "@open",
              },
            ],
            [/\$[a-zA-Z_][\w$]*/, "variable.interpolation"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"""/, "string", "@pop"],
          ],
          string_expression: [
            [
              /\}/,
              { token: "delimiter.bracket", next: "@pop", bracket: "@close" },
            ],
            { include: "root" }, // Allow full Groovy syntax inside ${}
          ],
          regexp_slashy: [
            [/[^\\\/]+/, "regexp"],
            [/@escapes/, "regexp.escape"],
            [/\\./, "regexp.escape.invalid"],
            [/\//, "regexp", "@pop"],
          ],
          regexp_dollar_slashy: [
            [/[^\\\/$]+/, "regexp"],
            [
              /\$\{/,
              {
                token: "delimiter.bracket",
                next: "@string_expression",
                bracket: "@open",
              },
            ],
            [/\$[a-zA-Z_][\w$]*/, "variable.interpolation"],
            [/@escapes/, "regexp.escape"],
            [/\\./, "regexp.escape.invalid"],
            [/\$\//, "regexp", "@pop"],
            [/\//, "regexp"], // Unescaped slash inside $/ /$
          ],
        },
      });

      monaco.editor.defineTheme("groovy-theme", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "C586C0" }, // Magenta for keywords
          { token: "type", foreground: "4EC9B0" }, // Teal for types
          { token: "identifier", foreground: "9CDCFE" }, // Light blue for identifiers
          { token: "string", foreground: "CE9178" }, // Orange for strings
          { token: "string.escape", foreground: "D7BA7D" }, // Yellow for escapes
          { token: "comment", foreground: "6A9955" }, // Green for comments
          { token: "comment.doc", foreground: "608B4E" }, // Darker green for Groovydoc
          { token: "number", foreground: "B5CEA8" }, // Light green for numbers
          { token: "regexp", foreground: "D16969" }, // Red for regexps
          { token: "annotation", foreground: "DCDCAA" }, // Yellow for annotations
          { token: "operator", foreground: "D4D4D4" }, // Default for operators
          { token: "operator.special", foreground: "DCDCAA" }, // Groovy specific operators
          { token: "delimiter", foreground: "D4D4D4" },
          { token: "delimiter.bracket", foreground: "808080" }, // Braces, parens
          { token: "variable.interpolation", foreground: "4EC9B0" }, // Interpolated variables
        ],
        colors: {
          "editor.background": "#1E1E1E",
        },
      });
    }

    // Groovy formatter is complex. For a scratchpad, manual formatting or a basic indenter is typical.
    // The example below is a VERY basic indenter.
    monaco.languages.registerDocumentFormattingEditProvider(this.id, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let indentLevel = 0;
        const indentChar = "\t"; // Groovy often uses tabs or 4 spaces

        const formattedLines = lines.map((line: string) => {
          let trimmedLine = line.trim();
          let currentIndent = "";

          if (
            trimmedLine.match(/^(}|\]|\)|else\b|catch\b|finally\b)/) &&
            !trimmedLine.match(/^\s*(?:else\s+if|case\b|default\b)/)
          ) {
            indentLevel = Math.max(0, indentLevel - 1);
          }
          if (trimmedLine.match(/^\s*(case\b|default\b)/) && indentLevel > 0) {
            currentIndent = indentChar.repeat(Math.max(0, indentLevel - 1));
          } else {
            currentIndent = indentChar.repeat(indentLevel);
          }

          const formattedLine = trimmedLine ? currentIndent + trimmedLine : "";

          if (
            trimmedLine.endsWith("{") ||
            trimmedLine.endsWith("(") ||
            trimmedLine.endsWith("[")
          ) {
            indentLevel++;
          }
          if (trimmedLine.match(/^(case\b|default\b).*:$/)) {
            // After a case label
            indentLevel++;
          }

          return formattedLine;
        });
        return [
          {
            range: model.getFullModelRange(),
            text:
              formattedLines.join("\n").trimEnd() +
              (content.endsWith("\n") ? "\n" : ""),
          },
        ];
      },
    });
  }
}

// Create and register the detector
const groovyDetector = new GroovyDetector();
languageRegistry.register(groovyDetector);

// Export for backward compatibility (optional)
export const registerGroovyProvider = (monaco: any) => {
  groovyDetector.registerProvider(monaco);
};
