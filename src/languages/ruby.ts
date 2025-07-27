import { BaseLanguageDetector } from "./baseDetector";
import { languageRegistry } from "./registry";
import { DetectionResult, LanguageDetector } from "./types";

/**
 * Ruby language detector
 */
export class RubyLanguageDetector
  extends BaseLanguageDetector
  implements LanguageDetector
{
  id = "ruby"; // Monaco's built-in ID for Ruby
  name = "Ruby";
  extensions = ["rb", "rbw", "rake", "gemspec", "ru", "erb"]; // .erb for embedded Ruby
  priority = 7; // High priority, fairly distinct syntax

  sampleContent(): string {
    return `#!/usr/bin/env ruby
# frozen_string_literal: true

require 'json'
require_relative 'my_module'

module MyWebApp
  class UserController
    attr_accessor :name, :email
    attr_reader :id

    # Class variable
    @@user_count = 0

    def initialize(name:, email:)
      @id = SecureRandom.uuid
      @name = name
      @email = email
      @@user_count += 1
      puts "User '#{name}' created with ID: #{@id}"
    end

    def greet(message = "Hello")
      "#{message}, #{@name}!"
    end

    # Class method
    def self.total_users
      @@user_count
    end

    private

    def log_activity(action)
      # Placeholder for logging
      File.open('activity.log', 'a') do |f|
        f.puts "[#{Time.now}] User #{@id}: #{action}"
      end
    end
  end
end

# Using the class
if __FILE__ == $0
  user1 = MyWebApp::UserController.new(name: "Alice Wonderland", email: "alice@example.com")
  puts user1.greet("Welcome")

  user2 = MyWebApp::UserController.new(name: "Bob The Builder", email: "bob@example.com")
  
  puts "Total users: #{MyWebApp::UserController.total_users}"

  # Array and Hashes
  my_array = [1, 2, "three", :four, { key: 'value' }]
  my_hash = { name: "Charlie", age: 30, city: "Rubyville" }

  my_array.each_with_index do |item, index|
    puts "Item #{index}: #{item.inspect}"
  end

  # Conditional
  if my_hash[:age] > 25 && my_hash.key?(:city)
    puts "#{my_hash[:name]} is an adult in #{my_hash.dig(:city)}."
  elsif my_hash[:age] < 10
    puts "#{my_hash[:name]} is a child."
  else
    puts "#{my_hash[:name]}'s age is #{my_hash[:age]}."
  end

  # Case statement (Ruby style)
  day_type = case Time.now.wday
             when 0, 6 then :weekend
             when 1..5 then :weekday
             else :unknown
             end
  puts "Today is a #{day_type}"

  # Safe navigation operator
  puts user1.email&.upcase
end
`;
  }

  /**
   * Detects if the given content matches Ruby patterns and returns a confidence score.
   */
  detect(content: string): DetectionResult {
    const trimmedContent = content.trim();
    if (!trimmedContent || trimmedContent.length < 3) {
      // e.g., "def"
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0;
    let strongSignalFound = false;

    // 1. Shebang (strong positive signal if ruby)
    if (/^\s*#![^\r\n]*ruby/i.test(trimmedContent)) {
      confidenceScore += 0.7;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 2. Core Ruby Keywords and Structure (Definitive)
    const definitivePatterns = [
      {
        pattern: /^\s*(?:class|module)\s+[A-Z_][\w]*(?:\s*<\s*[\w:]+)?/gm,
        weight: 0.35,
        perMatch: 0.1,
        specific: true,
      }, // class Foo or class Foo < Bar or module Foo
      {
        pattern: /^\s*def\s+[a-zA-Z_][\w!?=]*\s*(?:\([^)]*\)|[\w\s,]+)?/gm,
        weight: 0.3,
        perMatch: 0.05,
        specific: true,
      }, // def method_name(...) or def method_name ...
      {
        pattern: /\battr_(?:reader|writer|accessor)\s+(?::\w+|['"]\w+['"])/g,
        weight: 0.25,
        perMatch: 0.05,
        specific: true,
      },
      {
        pattern: /@[a-zA-Z_][\w]*/g,
        weight: 0.15,
        perMatch: 0.02,
        specific: true,
      }, // Instance variables @var
      {
        pattern: /@@[a-zA-Z_][\w]*/g,
        weight: 0.2,
        perMatch: 0.03,
        specific: true,
      }, // Class variables @@var
      {
        pattern: /:[a-zA-Z_][\w!?=]*/g,
        weight: 0.2,
        perMatch: 0.02,
        specific: true,
      }, // Symbols :my_symbol
      { pattern: /#\{.*?\}/g, weight: 0.25, perMatch: 0.05, specific: true }, // String interpolation #{expression}
      {
        pattern: /\b(BEGIN|END)\s*\{/g,
        weight: 0.2,
        perMatch: 0.05,
        specific: true,
      }, // BEGIN {} / END {} blocks
      {
        pattern: /\b(alias|alias_method|undef)\b/g,
        weight: 0.15,
        perMatch: 0.03,
      },
      {
        pattern: /\b(require|require_relative|load|include|extend|prepend)\b/g,
        weight: 0.15,
        perMatch: 0.02,
      },
      {
        pattern: /\b(?:if|unless|while|until|case|for)\b[\s\S]*?\bend\b/g,
        weight: 0.1,
        perMatch: 0.01,
      }, // Control structures ending with 'end'
      {
        pattern: /\bdo\s*(?:\|[^|]*\|)?[\s\S]*?\bend\b/g,
        weight: 0.15,
        perMatch: 0.02,
      }, // Blocks do |params| ... end
      {
        pattern: /\{\s*(?:\|[^|]*\|)?[\s\S]*?\}/g,
        weight: 0.05,
        perMatch: 0.005,
      }, // Blocks { |params| ... } - less specific than do..end
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
        }
      }
    }

    // 3. Common keywords (lower weight as they can appear in other contexts)
    const commonKeywords = [
      "puts",
      "gets",
      "yield",
      "super",
      "self",
      "nil",
      "true",
      "false",
      "defined?",
      "lambda",
      "proc",
    ];
    const commonKeywordsRegex = new RegExp(
      `\\b(?:${commonKeywords.join("|")})\\b`,
      "g",
    );
    const commonMatches = content.match(commonKeywordsRegex);
    if (commonMatches) {
      confidenceScore += 0.05;
      confidenceScore += Math.min(commonMatches.length, 10) * 0.01;
      patternsMatched++;
    }

    // 4. Comments
    if (/^\s*#.*$/m.test(content)) {
      // Single line comments
      confidenceScore += 0.03;
      patternsMatched++;
    }
    if (/^=begin[\s\S]*?^=end/m.test(content)) {
      // Block comments
      confidenceScore += 0.15;
      patternsMatched++;
      strongSignalFound = true;
    }

    // 5. Anti-patterns
    const antiPatterns = [
      { pattern: /<\?php/i, weight: -0.7 },
      { pattern: /^\s*package\s+\w+;/m, weight: -0.6 }, // Java package
      { pattern: /System\.out\.println/i, weight: -0.5 }, // Java print
      { pattern: /\b(var|let|const)\s+\w+\s*=/g, weight: -0.4 }, // JS var declarations (def is preferred in Ruby)
      { pattern: /function\s+\w+\s*\(/g, weight: -0.4 }, // JS function keyword
      { pattern: /=>\s*\{/g, weight: -0.3 }, // JS arrow (Ruby uses -> for lambdas)
      { pattern: /^\s*#include\s*<.+>/m, weight: -0.6 }, // C/C++ include
      { pattern: /<\w.*?>/g, weight: -0.5 }, // HTML/XML tags
      { pattern: /^\s*def\s+\w+\s*\(.*?\)\s*:/m, weight: -0.5 }, // Python def func(): (colon at end)
      { pattern: /"[^"]*"\s*:/g, weight: -0.8 }, // JSON key-value pairs (strong negative)
      { pattern: /^\s*\{[^}]*"[^"]*"\s*:[^}]*\}\s*$/m, weight: -0.9 }, // Complete JSON object (very strong negative)
    ];

    for (const ap of antiPatterns) {
      if (ap.pattern.test(content)) {
        confidenceScore += ap.weight;
      }
    }

    // 6. Final Adjustments and Clamping
    if (strongSignalFound && patternsMatched >= 3) {
      confidenceScore += 0.2;
    }
    // If common Ruby patterns like def, class, and string interpolation or symbols are present together
    if (
      content.includes("def ") &&
      (content.includes("class ") || content.includes("module ")) &&
      (content.includes("#{") || content.includes(" :"))
    ) {
      confidenceScore += 0.25;
      strongSignalFound = true;
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine match status
    const isMatch =
      (strongSignalFound && confidenceScore >= 0.45) ||
      (patternsMatched >= 3 && confidenceScore >= 0.55);

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound,
    };
  }

  getFileExtension(): string {
    return "rb";
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'ruby'

    // Monaco has built-in support for 'ruby'.
    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    // The built-in Ruby tokenizer in Monaco is generally good.
    // Custom formatting is complex; tools like RuboCop are standard.
    // Your heuristic formatter for indentation is a good simple approach for a scratchpad.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const content = model.getValue();
        const lines = content.split("\n");
        let indentLevel = 0;
        const indentChar = "  "; // Common: 2 spaces for Ruby

        // Keywords that typically increase indentation for the next line
        const increaseIndentKeywords = [
          "class",
          "module",
          "def",
          "if",
          "unless",
          "case",
          "while",
          "until",
          "for",
          "begin",
          // Also consider blocks starting with do, or {
        ];
        // Keywords that decrease indentation on the current line
        const decreaseIndentKeywords = [
          "end",
          "else",
          "elsif",
          "when",
          "rescue",
          "ensure",
        ];

        const formattedLines = lines.map((line: string) => {
          const trimmedLine = line.trim();
          let currentIndent = "";

          // Heuristic: Decrease indent if line starts with a keyword that closes a block
          // or is an `else` or `elsif` part of a conditional.
          // Also handle '}' for blocks.
          if (
            decreaseIndentKeywords.some((kw) => trimmedLine.startsWith(kw)) ||
            trimmedLine.startsWith("}") ||
            trimmedLine.startsWith("]")
          ) {
            if (
              !(
                trimmedLine.startsWith("else if") ||
                trimmedLine.startsWith("elsif")
              )
            ) {
              // `else if` is not a single block ender
              indentLevel = Math.max(0, indentLevel - 1);
            }
          }
          // Special case for `when` if it's not the first `when` in a `case`
          if (
            trimmedLine.startsWith("when") &&
            indentLevel > 0 &&
            !line.match(/^\s*case\b/)
          ) {
            // currentIndent = indentChar.repeat(Math.max(0, indentLevel -1));
          } else {
            currentIndent = indentChar.repeat(indentLevel);
          }

          const formattedLine = trimmedLine ? currentIndent + trimmedLine : "";

          // Heuristic: Increase indent if line ends with `do` (for blocks)
          // or starts with a keyword that opens a block and doesn't also close it on the same line.
          // Also handle '{' for blocks.
          if (
            increaseIndentKeywords.some((kw) => trimmedLine.startsWith(kw)) ||
            (trimmedLine.includes(" do") && !trimmedLine.includes(" end")) || // `foo.each do`
            (trimmedLine.endsWith("{") && !trimmedLine.startsWith("}")) ||
            (trimmedLine.endsWith("[") && !trimmedLine.startsWith("]"))
          ) {
            // Avoid double indenting for one-liners like `if true then ... end`
            if (
              !trimmedLine.endsWith(" end") &&
              !trimmedLine.includes("; end") &&
              !trimmedLine.match(/\bif\s+.*\sthen\s+.*\s+end\b/)
            ) {
              indentLevel++;
            }
          }

          // If a line ends with 'end' or '}' or ']', it might be closing a block opened on the same line for single-liners.
          // The previous logic might have already decremented. This needs careful handling.
          // For single line blocks like `foo.map { |x| x*2 }` or `if true; do_something; end`
          // the indent level should ideally remain same for next line or revert correctly.
          // This simplistic formatter might struggle with complex single-liners.

          return formattedLine;
        });
        return [
          {
            range: model.getFullModelRange(),
            text:
              formattedLines.join("\n").trimEnd() +
              (content.endsWith("\n") &&
              formattedLines.join("\n").trimEnd() !== ""
                ? "\n"
                : ""),
          },
        ];
      },
    });

    // In RubyLanguageDetector.registerProvider

    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "invalid", // Be explicit about unhandled tokens
      tokenPostfix: ".ruby", // Good practice

      keywords: [
        "__ENCODING__",
        "__LINE__",
        "__FILE__",
        "BEGIN",
        "END",
        "alias",
        "and",
        "begin",
        "break",
        "case",
        "class",
        "def",
        "defined?",
        "do",
        "else",
        "elsif",
        "end",
        "ensure",
        "false",
        "for",
        "if",
        "in",
        "module",
        "next",
        "nil",
        "not",
        "or",
        "redo",
        "rescue",
        "retry",
        "return",
        "self",
        "super",
        "then",
        "true",
        "undef",
        "unless",
        "until",
        "when",
        "while",
        "yield",
        // Contextual keywords (sometimes): require, require_relative, include, extend, prepend
      ],

      typeKeywords: [
        // Less formal types, but common conventions or core classes
        "Array",
        "String",
        "Integer",
        "Float",
        "Hash",
        "Symbol",
        "Regexp",
        "Proc",
        "Lambda",
      ],

      operators: [
        "=",
        ">",
        "<",
        "!",
        "~",
        "?",
        ":",
        "==",
        "===",
        "<=",
        ">=",
        "<=>",
        "!=",
        "&&",
        "||",
        "!",
        "not",
        "and",
        "or",
        "++",
        "--", // Not standard Ruby, but sometimes seen in DSLs or by mistake
        "+",
        "-",
        "*",
        "/",
        "%",
        "**",
        "&",
        "|",
        "^",
        "<<",
        ">>",
        "+=",
        "-=",
        "*=",
        "/=",
        "%=",
        "**=",
        "&=",
        "|=",
        "^=",
        "<<=",
        ">>=",
        "&&=",
        "||=",
        "=~",
        "!~", // Regex matching
        "..",
        "...", // Range operators
        "::",
        ".",
        "&.", // Scope, method call, safe navigation
        "=>", // Hash rocket, lambda
      ],

      symbols: /[=><!~?:&|+\-*/^%]+/,

      escapes:
        /\\(?:[abefnrstv\\"']|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|x[0-9a-fA-F]{1,2}|[0-7]{1,3})/,

      // Variables
      globalVar: /\$([&_*~@`']|\w+|-[0-9a-zA-Z])/, // $global, $!, $&, etc.
      instanceVar: /@[a-zA-Z_]\w*/,
      classVar: /@@[a-zA-Z_]\w*/,

      tokenizer: {
        root: [
          // Shebang
          [/^#!.*$/, "metatag.shebang"],

          // Comments
          [/^\s*#.*$/, "comment.ruby"],
          [
            /^=begin(?=\s)/,
            { token: "comment.block.ruby", next: "@commentBlock" },
          ],

          // Keywords
          [
            /[a-zA-Z_]\w*[!?=]?/,
            {
              cases: {
                "@keywords": "keyword.ruby",
                "@typeKeywords": "type.ruby",
                "@default": "identifier.ruby",
              },
            },
          ],

          // Identifiers that can end with ! or ?
          // Handled by the rule above now with [!?=]?

          // Global, instance, class variables
          [/@globalVar/, "variable.global.ruby"],
          [/@instanceVar/, "variable.instance.ruby"],
          [/@classVar/, "variable.class.ruby"],

          // Constants (start with uppercase)
          [/[A-Z_]\w*[!?=]?/, "constant.ruby"],

          // Numbers
          [/\d+[eE][+-]?\d+/, "number.float.ruby"], // Scientific notation
          [/\d+\.\d+(?:[eE][+-]?\d+)?/, "number.float.ruby"],
          [/0[xX][0-9a-fA-F]+/, "number.hex.ruby"],
          [/0[bB][01]+/, "number.binary.ruby"],
          [/0[oO]?[0-7]+/, "number.octal.ruby"], // 0o prefix is optional for octal
          [/\d+/, "number.ruby"],

          // Delimiters and Brackets - assign specific token types, don't use generic '@brackets' in root
          [/[{}()\[\]]/, "@brackets"], // This is fine if Monaco handles it, or use specific:
          // [/\(/, 'delimiter.parenthesis.ruby'],
          // [/\)/, 'delimiter.parenthesis.ruby'],
          // [/\{/, 'delimiter.curly.ruby'],
          // [/\}/, 'delimiter.curly.ruby'],
          // [/\[/, 'delimiter.square.ruby'],
          // [/\]/, 'delimiter.square.ruby'],

          // Symbols
          [/:\w+!?=?'?/, "string.symbol.ruby"], // :symbol, :symbol=, :symbol?
          [/:"[^"]+"/, "string.symbol.ruby"], // :"quoted_symbol"
          [/:'[^']+'/, "string.symbol.ruby"], // :'quoted_symbol'

          // Strings
          [
            /"/,
            {
              token: "string.double.ruby",
              bracket: "@open",
              next: "@string_double",
            },
          ],
          [
            /'/,
            {
              token: "string.single.ruby",
              bracket: "@open",
              next: "@string_single",
            },
          ],
          [
            /`/,
            {
              token: "string.interpolated.ruby",
              bracket: "@open",
              next: "@string_backtick",
            },
          ], // Backtick strings (command execution)

          // Heredocs
          [
            /<<(-?)(\w+)/,
            [
              { token: "string.heredoc.delimiter", next: `@heredoc_start.$2` },
              { token: "string.heredoc.delimiter", next: `@heredoc_start.$2` },
            ],
          ],

          // Regular Expressions
          // [/\/(?![*+?])(?:[^\r\n\[\/\\]|\\.|\\[(?:[^\]\\]|\\.)*\])*\//[gimuy] */, 'regexp.ruby'],

          // Operators
          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator.ruby",
                "@default": "", // Or 'invalid' if unmatched symbols are errors
              },
            },
          ],

          // Delimiters
          [/[;,]/, "delimiter.ruby"],

          // Whitespace
          { include: "@whitespace" },
        ],

        commentBlock: [
          [/^=end/, { token: "comment.block.ruby", next: "@pop" }],
          [/./, "comment.block.ruby"], // Anything else inside is a comment
        ],

        whitespace: [
          [/[ \t\r\n]+/, ""], // Removed 'white' token, just ignore
        ],

        string_double: [
          [/[^\\"#]+/, "string.double.ruby"],
          [/@escapes/, "string.escape.ruby"],
          [/\\./, "string.escape.invalid.ruby"],
          [
            /#\{/,
            {
              token: "string.interpolation.delimiter.ruby",
              bracket: "@open",
              next: "@interpolation",
            },
          ],
          [
            /"/,
            { token: "string.double.ruby", bracket: "@close", next: "@pop" },
          ],
        ],

        string_single: [
          [/[^\\']+/, "string.single.ruby"],
          [/@escapes/, "string.escape.ruby"], // Note: single quotes in Ruby only escape \' and \\
          [/\\./, "string.escape.invalid.ruby"],
          [
            /'/,
            { token: "string.single.ruby", bracket: "@close", next: "@pop" },
          ],
        ],

        string_backtick: [
          [/[^\\`#]+/, "string.interpolated.ruby"],
          [/@escapes/, "string.escape.ruby"],
          [/\\./, "string.escape.invalid.ruby"],
          [
            /#\{/,
            {
              token: "string.interpolation.delimiter.ruby",
              bracket: "@open",
              next: "@interpolation",
            },
          ],
          [
            /`/,
            {
              token: "string.interpolated.ruby",
              bracket: "@close",
              next: "@pop",
            },
          ],
        ],

        heredoc_start: [
          [
            /^\s*([^\s]+)\s*$/,
            {
              cases: {
                "$1==$S2": { token: "string.heredoc.delimiter", next: "@pop" },
                "@default": "string.heredoc.ruby",
              },
            },
          ],
          [/./, "string.heredoc.ruby"],
        ],

        interpolation: [
          // Match expressions inside #{}
          [
            /\{/,
            {
              token: "string.interpolation.delimiter.ruby",
              bracket: "@open",
              next: "@interpolation_nested",
            },
          ], // Nested #{{}}
          [
            /\}/,
            {
              token: "string.interpolation.delimiter.ruby",
              bracket: "@close",
              next: "@pop",
            },
          ],
          { include: "root" }, // Allow full Ruby syntax inside interpolation
        ],
        interpolation_nested: [
          // For handling nested braces inside interpolation
          [
            /\{/,
            {
              token: "string.interpolation.delimiter.ruby",
              bracket: "@open",
              next: "@interpolation_nested",
            },
          ],
          [
            /\}/,
            {
              token: "string.interpolation.delimiter.ruby",
              bracket: "@close",
              next: "@pop",
            },
          ],
          { include: "root" },
        ],

        section: [
          // For INI-style sections, if you ever need them (not standard Ruby)
          [/[^\]]+/, "type.identifier.ini"],
          [/\]/, { token: "metatag.ini", bracket: "@close", next: "@pop" }],
        ],
      },
    });
  }
}

// Create and register the detector
const rubyDetector = new RubyLanguageDetector();
languageRegistry.register(rubyDetector);

// Export for backward compatibility (optional)
export const registerRubyProvider = (monaco: any) => {
  rubyDetector.registerProvider(monaco);
};
