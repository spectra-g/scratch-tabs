import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatDetector } from "./types";

/**
 * Stacktrace language detector
 */
export class StacktraceFormatDetector
  extends BaseFormatDetector
  implements FormatDetector
{
  id = "stacktrace"; // Custom ID, as Monaco might not have a specific one for generic stacktraces
  name = "Stack Trace";
  extensions = ["log", "trace", "txt"]; // Common extensions where stacktraces are found
  priority = 3; // High priority - higher than Kotlin to win tie-breakers

  sampleContent(): string {
    return `Error: Cannot read properties of undefined (reading 'length')
    at processItems (webpack:///./src/utils/dataProcessor.ts:42:23)
    at async Function.handleRequest (/app/src/controllers/itemController.js:156:12)
    at /app/node_modules/express/lib/router/layer.js:95:5
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
Caused by: java.lang.NullPointerException: Attempt to invoke virtual method 'java.lang.String java.lang.Object.toString()' on a null object reference
    at com.example.MyClass.doSomething(MyClass.java:123)
    at com.example.AnotherClass.callDoSomething(AnotherClass.java:45)
    ... 3 more
panic: runtime error: index out of range [2] with length 2
goroutine 1 [running]:
main.main()
    /usr/local/go/src/runtime/proc.go:250 +0x9d fp=0xc000050780 sp=0xc000050770 pc=0x45a25d
    /path/to/my/project/main.go:15 +0x64
Exception in thread "main" java.io.FileNotFoundException: /tmp/test (No such file or directory)
    at java.base/java.io.FileInputStream.open0(Native Method)
    at java.base/java.io.FileInputStream.open(FileInputStream.java:219)
    at java.base/java.io.FileInputStream.<init>(FileInputStream.java:157)
    at java.base/java.io.FileInputStream.<init>(FileInputStream.java:112)
    at SomeProgram.main(SomeProgram.java:5)
Uncaught (in promise) DOMException: The operation failed for an unspecified reason.
    at <anonymous>:1:1`;
  }

  private typicalFrameLineStartRegex = new RegExp(
    [
      /^(\s*at\s+)/i, // Java, JS, .NET: "at com.example..." or "   at func (file.js:1:1)"
      /^(\s*File\s+"[^"]+"\s*,\s*line\s+\d+)/i, // Python: "File "path/to/file.py", line 123"
      /^(\s*[\w.$/-]+\.(?:go|s):\d+)/i, // Go: "path/to/file.go:123" - now includes $
      /^(\s*[\w.$/-]+(?:[\w.$/-]*\.\w+)?\((?:[^)]*)\))/, // Go: "main.main()" or "pkg.MyFunction()" - now includes $
      // Add more language-specific frame starts if needed (e.g., Ruby, C++)
      // Be cautious about overly generic patterns here.
    ]
      .map((r) => r.source)
      .join("|"),
  );

  detect(content: string): DetectionResult {
    // Normalize literal escape sequences before detection
    let normalizedContent = content;
    // Convert literal \n sequences to actual newlines
    normalizedContent = normalizedContent.replace(/\\n/g, "\n");
    // Convert literal \t sequences to actual tabs
    normalizedContent = normalizedContent.replace(/\\t/g, "\t");
    // Convert literal \r sequences to actual carriage returns
    normalizedContent = normalizedContent.replace(/\\r/g, "\r");

    const trimmedContent = normalizedContent.trim();
    if (!trimmedContent || trimmedContent.length < 15) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let patternsMatched = 0; // Number of distinct pattern types found
    let strongSignalFound = false;
    let errorKeywordFound = false;
    let framePatternHits = 0; // Count of individual frame-like regex pattern hits

    // --- Pre-checks for strong anti-signals (same as before) ---
    if (
      /^\s*<\?php/i.test(trimmedContent) ||
      /^\s*<(!DOCTYPE|html|xml)/i.test(trimmedContent)
    ) {
      return this.noMatch();
    }
    if (
      /^\s*#include\s*</.test(trimmedContent) ||
      /^\s*package\s+[\w.]+;/.test(trimmedContent)
    ) {
      return this.noMatch();
    }
    if (
      /\b(function|class|var|let|const)\s+\w+\s*(=|\(|\{)/.test(
        trimmedContent,
      ) &&
      !/\bat\s+\w+\s*\(/.test(trimmedContent)
    ) {
      if (
        !trimmedContent.match(
          /\b(Error|Exception|Panic|Traceback|Fault|Failure)\b/i,
        )
      ) {
        // Added Fault/Failure
        return this.noMatch();
      }
    }
    // Prevent matching SQL more aggressively
    if (
      normalizedContent.match(
        /\b(SELECT|CREATE\s+TABLE|INSERT\s+INTO|UPDATE\s+\w+\s+SET)\b/gi,
      ) &&
      normalizedContent.match(/;/g) &&
      !trimmedContent.match(
        /\b(Error|Exception|Panic|Traceback|Fault|Failure)\b/i,
      )
    ) {
      // If SQL keywords and semicolons but no error words
      return this.noMatch();
    }

    // 1. Check for common error prefixes
    const errorPrefixRegex =
      /^(?:uncaught\s+)?([A-Za-z_][\w.$]*(?:Error|Exception|Panic|AssertionError|Failure|Fault|Traceback))\b(\s*[:-\s])?/i;
    const errorMatch = trimmedContent.match(errorPrefixRegex);
    if (errorMatch) {
      confidenceScore += 0.35; // Slightly reduced base, will be boosted by frames
      patternsMatched++;
      strongSignalFound = true;
      errorKeywordFound = true;
    }

    // Also check for "Wrapped by:" which is a strong Java/Scala stacktrace indicator
    if (/^Wrapped by:/im.test(normalizedContent)) {
      confidenceScore += 0.2;
      strongSignalFound = true;
      patternsMatched++;
      errorKeywordFound = true;
    }

    // 2. Global scan for various frame patterns (more specific now)
    // These are for counting occurrences, not just line starts.
    const framePatternsForCounting = [
      /\bat\s+[\w$./()<>[\]~`!@#%^&*+=|\\?-]+(?:\s*\(.*?\))?/g, // "at com.example.MyClass.method(MyClass.java:123)" or "at func (file.js:1:1)" or "at MyFunc" - now includes $
      /File\s+"[^"]+",\s*line\s+\d+,\s*in\s+\S+/g, // Python
      /[\w./-]+\.(?:go|s):\d+(?:\s+\+0x[0-9a-fA-F]+)?/g, // Go
      // A very generic file:line:col pattern (use cautiously, lower weight)
      // /(?:[a-zA-Z]:\\|[~\w./-]+[/])?[\w.-]+\.[a-zA-Z]{1,5}:\d+(?::\d+)?/g
    ];

    for (const fp of framePatternsForCounting) {
      const matches = normalizedContent.match(fp);
      if (matches) {
        framePatternHits += matches.length;
      }
    }

    if (framePatternHits > 0) {
      confidenceScore += 0.2; // Base for finding any such patterns
      confidenceScore += Math.min(framePatternHits, 5) * 0.04; // Bonus for more
      patternsMatched++;
      if (framePatternHits >= 1) strongSignalFound = true;
    }

    // 3. Specific indicators for Java or .NET
    if (/\.{3}\s*\d+\s+more\b/i.test(normalizedContent)) {
      confidenceScore += 0.2;
      strongSignalFound = true;
      patternsMatched++;
    }
    if (/\sCaused by:/i.test(normalizedContent)) {
      confidenceScore += 0.15;
      strongSignalFound = true;
      patternsMatched++;
    }

    // --- 4. Ratio of Frame-Like Lines (NEW & CRITICAL) ---
    const lines = normalizedContent.split(/\r\n|\r|\n/);
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    let typicalFrameLinesCount = 0;

    if (nonEmptyLines.length > 0) {
      nonEmptyLines.forEach((line) => {
        if (this.typicalFrameLineStartRegex.test(line.trimStart())) {
          typicalFrameLinesCount++;
        }
      });

      const frameLineRatio = typicalFrameLinesCount / nonEmptyLines.length;
      // console.log(`Stacktrace Detector: FrameLineRatio=${frameLineRatio.toFixed(3)}, TypicalFrameLines=${typicalFrameLinesCount}, NonEmptyLines=${nonEmptyLines.length}`);

      if (
        typicalFrameLinesCount === 0 &&
        nonEmptyLines.length > 3 &&
        !errorKeywordFound
      ) {
        // If no lines look like typical frames, and no error keyword, it's very unlikely a stacktrace.
        // This is a strong negative signal for prose.
        // console.log("Stacktrace Detector: No typical frame lines and no error keyword found in multi-line text.");
        return this.noMatch();
      }

      if (frameLineRatio >= 0.5 && typicalFrameLinesCount >= 1) {
        // At least 50% of lines are frame-like
        confidenceScore += 0.3;
        strongSignalFound = true;
        patternsMatched++;
      } else if (frameLineRatio >= 0.25 && typicalFrameLinesCount >= 1) {
        // At least 25%
        confidenceScore += 0.15;
        strongSignalFound = true;
        patternsMatched++;
      } else if (
        typicalFrameLinesCount > 0 &&
        nonEmptyLines.length <= 3 &&
        errorKeywordFound
      ) {
        // Short trace with error
        confidenceScore += 0.1;
      } else if (
        typicalFrameLinesCount === 0 &&
        nonEmptyLines.length > 5 &&
        errorKeywordFound
      ) {
        // Has an error keyword, but no subsequent lines look like frames. Might be just an error message.
        confidenceScore *= 0.5; // Reduce confidence
      }
    }
    // --- End Ratio of Frame-Like Lines ---

    // 5. Adjustments (combining signals)
    if (
      errorKeywordFound &&
      (typicalFrameLinesCount >= 1 || framePatternHits >= 1)
    ) {
      confidenceScore += 0.2; // Error message + at least one frame is a strong indicator
    } else if (
      errorKeywordFound &&
      typicalFrameLinesCount === 0 &&
      framePatternHits === 0 &&
      lines.length === 1
    ) {
      confidenceScore *= 0.6; // Single line error message, no frames
    } else if (
      !errorKeywordFound &&
      (typicalFrameLinesCount >= 1 || framePatternHits >= 1)
    ) {
      confidenceScore += 0.05; // Has frames but no clear error keyword
    }

    if (
      lines.length === 1 &&
      (!errorKeywordFound || framePatternHits < 1) &&
      typicalFrameLinesCount < 1
    ) {
      confidenceScore -= 0.3; // Penalize single lines without strong trace characteristics
    }

    // --- Prose Anti-Pattern (If it looks like sentences and signals are weak) ---
    if (
      nonEmptyLines.length > 3 &&
      typicalFrameLinesCount < Math.max(1, nonEmptyLines.length * 0.1) &&
      !strongSignalFound
    ) {
      let sentenceLikeLines = 0;
      nonEmptyLines.slice(0, 10).forEach((line) => {
        const words = line.trim().split(/\s+/);
        if (
          words.length > 5 &&
          (line.endsWith(".") || line.endsWith(":") || line.endsWith("?"))
        ) {
          let commonWordCount = 0;
          words.forEach((w) => {
            if (
              [
                "the",
                "a",
                "is",
                "to",
                "of",
                "and",
                "in",
                "it",
                "for",
                "with",
              ].includes(w.toLowerCase())
            )
              commonWordCount++;
          });
          if (commonWordCount / words.length > 0.2) sentenceLikeLines++;
        }
      });
      if (sentenceLikeLines >= 2) {
        // console.log("Stacktrace Detector: Prose-like content detected, penalizing score.");
        confidenceScore *= 0.2; // Strong penalty if it looks like prose
      }
    }
    // --- End Prose Anti-Pattern ---

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Final match decision:
    // Needs an error keyword and some frame indication, OR a high ratio of frame-like lines.
    let isMatch = false;
    if (
      errorKeywordFound &&
      (typicalFrameLinesCount >= 1 || framePatternHits >= 1) &&
      confidenceScore >= 0.3
    ) {
      isMatch = true;
    } else if (
      typicalFrameLinesCount >= 2 &&
      typicalFrameLinesCount / nonEmptyLines.length >= 0.4 &&
      confidenceScore >= 0.35
    ) {
      // At least 2 frames and good ratio
      isMatch = true;
    } else if (strongSignalFound && confidenceScore >= 0.45) {
      // General strong signal fallback
      isMatch = true;
    }

    // If it's long but has very few frame-like lines or error keywords, it's probably not a stack trace.
    if (
      nonEmptyLines.length > 10 &&
      typicalFrameLinesCount < 2 &&
      !errorKeywordFound &&
      framePatternHits < 2
    ) {
      isMatch = false;
    }
    if (confidenceScore < 0.2 && nonEmptyLines.length > 5) {
      // If after all checks, confidence is still very low for multi-line
      isMatch = false;
    }

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isMatch && strongSignalFound && confidenceScore > 0.55,
    };
  }

  getFileExtension(): string {
    return "log"; // .log is a common extension for files containing stack traces
  }

  registerProvider(monaco: any): void {
    const languageId = this.id; // 'stacktrace'

    if (
      !monaco.languages
        .getLanguages()
        .some((lang: any) => lang.id === languageId)
    ) {
      monaco.languages.register({ id: languageId });
    }

    monaco.languages.setMonarchTokensProvider(languageId, {
      defaultToken: "source.stacktrace",
      ignoreCase: false,
      tokenPostfix: ".stacktrace",

      tokenizer: {
        root: [
          // Comments
          [/^\s*[#;].*$/, "comment.stacktrace"],
          [/^\s*\/\/.*/, "comment.stacktrace"], // Added for JS/Java style comments if they appear

          // Section Delimiters (if relevant, though less common in pure stack traces)
          // [/^\s*\[/, { token: 'metatag.ini', bracket: '@open', next: '@section' }], // Likely not needed for stacktrace

          // 1. Common Error/Exception lines
          // Group 1: Optional "Uncaught "
          // Group 2: Error Name
          // Group 3: Separator (e.g., ": ")
          // Group 4: Message
          [
            /^((?:Uncaught\s+)?)([A-Za-z_][\w.]*(?:Error|Exception|Panic|AssertionError|Failure|Fault))\b((?:\s*:\s*)?)(.*)$/,
            [
              "keyword.modifier.stacktrace",
              "type.error.stacktrace",
              "delimiter.stacktrace",
              "string.error.message.stacktrace",
            ],
          ],
          // Simpler Error: Message
          // Group 1: "Error" (or similar keywords)
          // Group 2: Separator (e.g., ": ")
          // Group 3: Message
          [
            /^(Error|Fatal error|Critical|Warning)(\s*:\s*)(.*)$/, // Added Warning
            [
              "type.error.stacktrace",
              "delimiter.stacktrace",
              "string.error.message.stacktrace",
            ],
          ],
          [/^\s*(Caused by:)/, "keyword.error.stacktrace"],
          [
            /^\s*(Traceback \(most recent call last\):)/,
            "keyword.error.stacktrace",
          ],

          // 2. Stack frame lines - ORDER MATTERS (most specific first)

          // Python: File "path/to/file.py", line 123, in my_function
          [
            /^(File\s+)(".*?")(,\s*line\s+)(\d+)(,\s*in\s+)(.*)$/,
            [
              "keyword.frame.stacktrace",
              "string.filepath.stacktrace",
              "keyword.frame.stacktrace",
              "number.linenumber.stacktrace",
              "keyword.frame.stacktrace",
              "function.name.stacktrace",
            ],
          ],
          // Python: File "path/to/file.py", line 123
          [
            /^(File\s+)(".*?")(,\s*line\s+)(\d+)$/,
            [
              "keyword.frame.stacktrace",
              "string.filepath.stacktrace",
              "keyword.frame.stacktrace",
              "number.linenumber.stacktrace",
            ],
          ],

          // Go: /path/to/file.go:123 +0xabc
          [
            /^(\s*)([\w./-]+\.(?:go|s))(:)(\d+)((?:\s+\+0x[0-9a-fA-F]+)?)$/,
            [
              "white",
              "string.filepath.stacktrace",
              "delimiter.stacktrace",
              "number.linenumber.stacktrace",
              "meta.offset.stacktrace",
            ],
          ],
          // Go: main.main() or path/to/pkg.MyFunction()
          [
            /^(\s*)([\w./-]+(?:[\w./-]*\.\w+)?\((?:[^)]*)\))$/,
            ["white", "function.name.stacktrace"],
          ],
          // Go: Simpler path-like identifiers
          [
            /^(\s*)([\w./-]+(?:\.[\w./-]+)*)$/,
            ["white", "identifier.stacktrace"],
          ],

          // at package.method(FileName.ext:line:col)
          // G1: "at " | G2: method | G3: " (" | G4: file | G5: ":" | G6: line | G7: ":" | G8: col | G9: ")"
          [
            /^(\s*at\s+)([\w$./<>\[\]~`!@#%^&*+=|\\?-]+(?:\([\w\s,]*\))?)(\s*\()(\/?[\w.-/\\]+\.[a-zA-Z]{1,5})(:)(\d+)(:)(\d+)(\))$/,
            [
              "keyword.frame.stacktrace", // G1
              "function.name.stacktrace", // G2
              "delimiter.parenthesis.stacktrace", // G3
              "string.filepath.stacktrace", // G4
              "delimiter.stacktrace", // G5
              "number.linenumber.stacktrace", // G6
              "delimiter.stacktrace", // G7
              "number.column.stacktrace", // G8
              "delimiter.parenthesis.stacktrace", // G9
            ],
          ],
          // at package.method(FileName.ext:line)
          // G1: "at " | G2: method | G3: " (" | G4: file | G5: ":" | G6: line | G7: ")"
          [
            /^(\s*at\s+)([\w$./<>\[\]~`!@#%^&*+=|\\?-]+(?:\([\w\s,]*\))?)(\s*\()(\/?[\w.-/\\]+\.[a-zA-Z]{1,5})(:)(\d+)(\))$/,
            [
              "keyword.frame.stacktrace",
              "function.name.stacktrace",
              "delimiter.parenthesis.stacktrace",
              "string.filepath.stacktrace",
              "delimiter.stacktrace",
              "number.linenumber.stacktrace",
              "delimiter.parenthesis.stacktrace",
            ],
          ],
          // at package.method(FileName.ext)
          // G1: "at " | G2: method | G3: " (" | G4: file | G5: ")"
          [
            /^(\s*at\s+)([\w$./<>\[\]~`!@#%^&*+=|\\?-]+(?:\([\w\s,]*\))?)(\s*\()(\/?[\w.-/\\]+\.[a-zA-Z]{1,5})(\))$/,
            [
              "keyword.frame.stacktrace",
              "function.name.stacktrace",
              "delimiter.parenthesis.stacktrace",
              "string.filepath.stacktrace",
              "delimiter.parenthesis.stacktrace",
            ],
          ],
          // at package.method (Native Method) or (Unknown Source) or (<anonymous>)
          // G1: "at " | G2: method | G3: " (" | G4: Info | G5: ")"
          [
            /^(\s*at\s+)([\w$./<>\[\]~`!@#%^&*+=|\\?-]+(?:\([\w\s,]*\))?)(\s*\()([^)]+)(\))$/,
            [
              "keyword.frame.stacktrace",
              "function.name.stacktrace",
              "delimiter.parenthesis.stacktrace",
              "meta.info.stacktrace",
              "delimiter.parenthesis.stacktrace",
            ],
          ],
          // at package.method (simplest form, ensure it's tried last among "at" lines with file info)
          // This rule has 2 groups.
          [
            /^(\s*at\s+)(.*)$/,
            ["keyword.frame.stacktrace", "function.name.stacktrace"],
          ],

          // --- REVISED GENERIC FILE PATH LINE ---
          // This rule was complex and had many optional groups.
          // Let's simplify or ensure all potential parts are captured.
          // Example: webpack:///./src/utils/dataProcessor.ts:42:23
          // G1: Optional leading whitespace
          // G2: Full path including filename (greedy but stops before line/col)
          // G3: Optional ( Colon + LineNumber )
          // G4: Optional ( Colon + ColNumber )
          // G5: Optional ( Closing Parenthesis if path was in parens - less common for this rule)
          // This is still tricky. A better approach might be to tokenize the path, then line, then col separately.
          // For now, let's try to capture the whole file:line:col structure if present.
          [
            /^(\s*)((?:[a-zA-Z]:\\|[~/\w.-]+[/])?[\w.-]+\.[a-zA-Z]{1,5})((?::\d+)?((?::\d+)?)?)(\)?)$/,
            [
              "white", // G1: Leading whitespace
              "string.filepath.stacktrace", // G2: Full path
              "number.linenumber.stacktrace", // G3: :line (or empty if no line)
              "number.column.stacktrace", // G4: :col (or empty if no col)
              "delimiter.parenthesis.stacktrace", // G5: Optional closing paren
            ],
            // The issue here is that if :line or :col are not present, groups 3 and 4 will be undefined.
            // Monarch needs a token for each group.
            // A more robust way is to have separate rules or use non-capturing groups for optional parts
            // if you don't want to assign them a token.
          ],
          // Simpler file path with line number only
          [
            /^(\s*)((?:[a-zA-Z]:\\|[~/\w.-]+[/])?[\w.-]+\.[a-zA-Z]{1,5})([:(])(\d+)(\))?$/,
            [
              "white",
              "string.filepath.stacktrace",
              "delimiter.stacktrace",
              "number.linenumber.stacktrace",
              "delimiter.parenthesis.stacktrace",
            ],
          ],

          // ... (other rules: Python, Go frames, keywords, comments, numbers, delimiters)
          // Ensure these simpler rules don't have group/token mismatches either.
          // For example:
          [
            /\b(async|await|native method|unknown source|webpack:\/\/\/|\[native code\])\b/i,
            "keyword.modifier.stacktrace",
          ], // 0 groups, 1 token string (OK)
          [
            /\b(node_modules|vendor|gems|site-packages|jdk\.internal|sun\.reflect)\b/,
            "namespace.library.stacktrace",
          ], // 0 groups, 1 token string (OK)
          [/\b\d+\b/, "number.stacktrace"], // 0 groups, 1 token string (OK)
          [/[{}()\[\]]/, "delimiter.bracket.stacktrace"], // 0 groups, 1 token string (OK)
          [/[:;,.]/, "delimiter.stacktrace"], // 0 groups, 1 token string (OK)
        ],

        // Removed 'section' state as it's not typical for stack traces
      },
    });

    // Define stacktrace theme
    monaco.editor.defineTheme(`${languageId}-theme`, {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "type.error", foreground: "F44747", fontStyle: "bold" }, // Bright Red for Error Type
        { token: "error.message", foreground: "F44747" }, // Red for error message
        { token: "keyword.error", foreground: "F44747", fontStyle: "italic" },
        { token: "keyword.frame", foreground: "C586C0" }, // Magenta for "at"
        { token: "keyword.modifier", foreground: "569CD6" }, // Blue for "async"
        { token: "function.name.full", foreground: "DCDCAA" }, // Yellow for full function path
        { token: "type.class", foreground: "4EC9B0" }, // Teal for class names
        { token: "function.name", foreground: "DCDCAA" }, // Yellow for method names
        { token: "string.filepath.prefix", foreground: "CE9178" }, // Orange for path
        {
          token: "string.filepath.filename",
          foreground: "CE9178",
          fontStyle: "underline",
        }, // Orange, underlined for filename
        { token: "number.linenumber", foreground: "B5CEA8", fontStyle: "bold" }, // Green, bold for line
        { token: "number.column", foreground: "B5CEA8" }, // Green for column
        { token: "number", foreground: "B5CEA8" }, // General numbers
        { token: "namespace.library", foreground: "4FD6BE" }, // Cyan-ish for library paths
        { token: "identifier", foreground: "9CDCFE" }, // Light blue for other identifiers
        { token: "delimiter.bracket", foreground: "d4d4d4" },
        { token: "delimiter", foreground: "d4d4d4" },
        { token: "comment", foreground: "6A9955" },
        { token: "source", foreground: "D4D4D4" }, // Default text
      ],
      colors: {
        "editor.background": "#1E1E1E",
      },
    });

    // The formatter you had is a good attempt for trying to structure potentially mangled stack traces.
    monaco.languages.registerDocumentFormattingEditProvider(languageId, {
      provideDocumentFormattingEdits(model: any) {
        const originalContent = model.getValue();

        let formattedContent = originalContent;

        // 1. Normalize explicit newlines `\n` that are part of the string
        const contentAfterNewlineNormalization = formattedContent.replace(
          /\\n/g,
          "\n",
        );
        if (contentAfterNewlineNormalization !== formattedContent) {
          formattedContent = contentAfterNewlineNormalization;
        }

        // 1b. Normalize explicit tabs `\t` that are part of the string
        const contentAfterTabNormalization = formattedContent.replace(
          /\\t/g,
          "\t",
        );
        if (contentAfterTabNormalization !== formattedContent) {
          formattedContent = contentAfterTabNormalization;
        }

        // 2. Ensure newline *only if not already present* after a closing parenthesis
        //    followed by common frame starters.
        //    Regex:
        //    - `(\))` : Capture the closing parenthesis (Group 1)
        //    - `([ \t]*)`: Capture any horizontal whitespace (Group 2) - NOT newlines
        //    - `(at\s+|Caused by:|\.{3}\s*\d+\s+more\b|File\s+"[^"]+"\s*,\s*line\s+\d+|[\w./-]+\.(?:go|s):\d+|[\w./-]+\((?:[^)]*)\)\s*$)`: Frame starters (Group 3)
        //    This regex now specifically looks for horizontal whitespace between ')' and 'at'.
        //    If there's already a newline, this regex won't match that part.
        const frameStarterRegex =
          /(\))([ \t]*)((?:at\s+|Caused by:|\.{3}\s*\d+\s+more\b|File\s+"[^"]+"\s*,\s*line\s+\d+|[\w./-]+\.(?:go|s):\d+|[\w./-]+\((?:[^)]*)\)\s*$))/g;
        const contentAfterFrameSplit = formattedContent.replace(
          frameStarterRegex,
          (
            match: string,
            p1ClosingParen: string,
            p2Whitespace: string,
            p3FrameStarter: string,
          ): string => {
            // p1 is ')', p2 is horizontal whitespace, p3 is the frame starter
            // We want to ensure there's a newline, and then consistent indentation for the frame starter.
            return `${p1ClosingParen}\n  ${p3FrameStarter.trimStart()}`;
          },
        );

        if (contentAfterFrameSplit !== formattedContent) {
          formattedContent = contentAfterFrameSplit;
        }

        // 3. Line-by-line processing for indentation and cleaning up excessive blank lines
        const lines = formattedContent.split("\n");
        const processedLines: string[] = [];
        let consecutiveBlankLines = 0;

        const isFrameStart = (line: string): boolean => {
          const trimmed = line.trimStart();
          return (
            /^(at\s+|File\s+"[^"]+"\s*,\s*line\s+\d+|Caused by:|\.{3}\s*\d+\s+more\b|[\w./-]+\.(?:go|s):\d+|[\w./-]+\((?:[^)]*)\)$)/i.test(
              trimmed,
            ) ||
            (trimmed.startsWith("Caused by:") &&
              processedLines.length > 0 &&
              processedLines[processedLines.length - 1].trim() !== "")
          );
        };

        const isErrorKeywordLine = (line: string): boolean => {
          const trimmed = line.trim();
          return (
            /^(?:Uncaught\s+)?(?:[A-Za-z_][\w.]*(?:Error|Exception|Panic|AssertionError|Failure|Fault|Traceback))\b/i.test(
              trimmed,
            ) ||
            /^\s*(Caused by:|Traceback \(most recent call last\):)/i.test(
              trimmed,
            )
          );
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          if (!trimmedLine) {
            consecutiveBlankLines++;
            if (consecutiveBlankLines <= 1) {
              // Allow one blank line
              processedLines.push("");
            }
            continue;
          } else {
            consecutiveBlankLines = 0; // Reset counter
          }

          // If it's an error line and not also a frame start (e.g. "Error: foo at bar.js")
          if (isErrorKeywordLine(trimmedLine) && !isFrameStart(trimmedLine)) {
            // If the previous line wasn't blank, and this isn't the first line, add a blank line before a new error block
            if (
              processedLines.length > 0 &&
              processedLines[processedLines.length - 1].trim() !== ""
            ) {
              processedLines.push("");
            }
            processedLines.push(trimmedLine); // Add error line without extra indent
          } else if (isFrameStart(trimmedLine)) {
            // Indent stack frames consistently if they are not already indented by at least 2 spaces
            if (!/^\s{2,}/.test(line) && line.trimStart() === line) {
              processedLines.push("  " + trimmedLine);
            } else {
              // If already indented, try to normalize to 2 spaces if it's not excessive
              const currentIndentMatch = line.match(/^(\s*)/);
              const currentIndentLength = currentIndentMatch
                ? currentIndentMatch[1].length
                : 0;
              if (currentIndentLength < 2 || currentIndentLength > 4) {
                // Adjust if too little or too much
                processedLines.push("  " + trimmedLine);
              } else {
                processedLines.push(line); // Preserve reasonable existing indentation
              }
            }
          } else {
            // For lines that are part of a multi-line error message or other content
            processedLines.push(line); // Keep original leading whitespace for these lines
          }
        }

        let finalOutput = processedLines.join("\n");
        // Remove leading/trailing blank lines that might have been introduced
        finalOutput = finalOutput.replace(/^\n+/, "").replace(/\n+$/, "");
        // Ensure a single trailing newline if original content had one and output is not empty
        if (originalContent.endsWith("\n") && finalOutput !== "") {
          finalOutput += "\n";
        }

        if (finalOutput === originalContent) {
          return null;
        }

        return [
          {
            range: model.getFullModelRange(),
            text: finalOutput,
          },
        ];
      },
    });
  }
}

// Create and register the detector
const stacktraceDetector = new StacktraceFormatDetector();
formatRegistry.register(stacktraceDetector);

// Export for backward compatibility (optional)
export const registerStacktraceProvider = (monaco: any) => {
  stacktraceDetector.registerProvider(monaco);
};
