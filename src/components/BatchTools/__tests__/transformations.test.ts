import { describe, it, expect } from "@jest/globals";
import { applyTransformations } from "../transformations";

describe("Text Transformations", () => {
  const sampleText = "Hello World\nTest Line\nAnother Line";

  it("should trim whitespace", () => {
    const input = "  Hello World  \n  Test Line  \n  Another Line  ";
    const config = { trim: true };
    const result = applyTransformations(input, config);
    expect(result).toBe("Hello World\nTest Line\nAnother Line");
  });

  it("should remove extra whitespace preserving single spaces", () => {
    const input = "Hello    World\nTest     Line\nAnother  Line";
    const config = { removeExtraWhitespace: "preserve-single" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("Hello World\nTest Line\nAnother Line");
  });

  it("should remove all whitespace", () => {
    const input = "Hello World\nTest Line\nAnother Line";
    const config = { removeExtraWhitespace: "remove-all" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("HelloWorld\nTestLine\nAnotherLine");
  });

  it("should remove extra blank lines", () => {
    const input = "Line 1\n\n\nLine 2\n\n\n\nLine 3";
    const config = { removeExtraBlankLines: true };
    const result = applyTransformations(input, config);
    expect(result).toBe("Line 1\n\nLine 2\n\nLine 3");
  });

  it("should remove all blank lines", () => {
    const input = "Line 1\n\nLine 2\n\nLine 3";
    const config = { removeAllBlankLines: true };
    const result = applyTransformations(input, config);
    expect(result).toBe("Line 1\nLine 2\nLine 3");
  });

  it("should convert to uppercase", () => {
    const config = { caseTransform: "upper" as const };
    const result = applyTransformations(sampleText, config);
    expect(result).toBe("HELLO WORLD\nTEST LINE\nANOTHER LINE");
  });

  it("should convert to lowercase", () => {
    const config = { caseTransform: "lower" as const };
    const result = applyTransformations(sampleText, config);
    expect(result).toBe("hello world\ntest line\nanother line");
  });

  it("should convert to title case", () => {
    const input = "hello world\ntest line";
    const config = { caseTransform: "title" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("Hello World\nTest Line");
  });

  it("should sort lines ascending", () => {
    const input = "zebra\napple\nbanana";
    const config = { sortLines: "asc" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("apple\nbanana\nzebra");
  });

  it("should sort lines descending", () => {
    const input = "zebra\napple\nbanana";
    const config = { sortLines: "desc" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("zebra\nbanana\napple");
  });

  it("should sort lines by length", () => {
    const input = "a\nabcdef\nabc";
    const config = { sortLines: "length" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("a\nabc\nabcdef");
  });

  it("should reverse lines", () => {
    const input = "first\nsecond\nthird";
    const config = { reverseLines: true };
    const result = applyTransformations(input, config);
    expect(result).toBe("third\nsecond\nfirst");
  });

  it("should remove duplicates", () => {
    const input = "apple\nbanana\napple\ncherry\nbanana";
    const config = { removeDuplicates: true };
    const result = applyTransformations(input, config);
    expect(result).toBe("apple\nbanana\ncherry");
  });

  it("should add prefix", () => {
    const input = "line1\nline2";
    const config = { addPrefix: "> " };
    const result = applyTransformations(input, config);
    expect(result).toBe("> line1\n> line2");
  });

  it("should add suffix", () => {
    const input = "line1\nline2";
    const config = { addSuffix: " <" };
    const result = applyTransformations(input, config);
    expect(result).toBe("line1 <\nline2 <");
  });

  it("should number lines numerically", () => {
    const input = "first\nsecond\nthird";
    const config = { numberLines: "numeric" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("1. first\n2. second\n3. third");
  });

  it("should number lines with roman numerals", () => {
    const input = "first\nsecond\nthird";
    const config = { numberLines: "roman" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("I. first\nII. second\nIII. third");
  });

  it("should number lines alphabetically", () => {
    const input = "first\nsecond\nthird";
    const config = { numberLines: "alpha" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("A. first\nB. second\nC. third");
  });

  it("should join lines with separator", () => {
    const input = "apple\nbanana\ncherry";
    const config = { joinLines: ", " };
    const result = applyTransformations(input, config);
    expect(result).toBe("apple, banana, cherry");
  });

  it("should split lines by delimiter", () => {
    const input = "apple,banana,cherry\ndog,cat,fish";
    const config = { splitLines: "," };
    const result = applyTransformations(input, config);
    expect(result).toBe("apple\nbanana\ncherry\ndog\ncat\nfish");
  });

  it("should duplicate lines", () => {
    const input = "line1\nline2";
    const config = { duplicateLines: 2 };
    const result = applyTransformations(input, config);
    expect(result).toBe("line1\nline1\nline2\nline2");
  });

  it("should shuffle lines (test deterministically)", () => {
    const input = "a\nb\nc\nd\ne";
    const config = { shuffleLines: true };
    const result = applyTransformations(input, config);

    // Check that all original lines are present
    const originalLines = input.split("\n");
    const resultLines = result.split("\n");
    expect(resultLines.length).toBe(originalLines.length);

    for (const line of originalLines) {
      expect(resultLines).toContain(line);
    }
  });

  it("should filter by regex", () => {
    const input = "test123\nhello\ntest456\nworld";
    const config = {
      filterByRegex: { pattern: "test\\d+", caseSensitive: true },
    };
    const result = applyTransformations(input, config);
    expect(result).toBe("test123\ntest456");
  });

  it("should filter by regex case insensitive", () => {
    const input = "USER123\nhello\nuser456\nworld";
    const config = {
      filterByRegex: { pattern: "user\\d+", caseSensitive: false },
    };
    const result = applyTransformations(input, config);
    expect(result).toBe("USER123\nuser456");
  });

  it("should handle invalid regex gracefully", () => {
    const input = "line1\nline2";
    const config = { filterByRegex: { pattern: "[", caseSensitive: true } }; // Invalid regex
    const result = applyTransformations(input, config);
    expect(result).toBe(input); // Should return original content
  });

  it("should apply multiple transformations", () => {
    const input = "  zebra  \n  apple  \n  banana  \n  apple  ";
    const config = {
      trim: true,
      sortLines: "asc" as const,
      removeDuplicates: true,
      addPrefix: "- ",
    };
    const result = applyTransformations(input, config);
    expect(result).toBe("- apple\n- banana\n- zebra");
  });

  it("should return empty string for empty input", () => {
    const result = applyTransformations("", { trim: true });
    expect(result).toBe("");
  });

  it("should handle single line input", () => {
    const input = "single line";
    const config = { trim: true, caseTransform: "upper" as const };
    const result = applyTransformations(input, config);
    expect(result).toBe("SINGLE LINE");
  });

  it("should handle numbering with duplication correctly", () => {
    const input = "first\nsecond\nthird";
    const config = {
      numberLines: "numeric" as const,
      duplicateLines: 2,
    };
    const result = applyTransformations(input, config);
    // Should duplicate first, then number sequentially
    expect(result).toBe(
      "1. first\n2. first\n3. second\n4. second\n5. third\n6. third",
    );
  });

  // Advanced Transformations Tests
  describe("Advanced Transformations", () => {
    it("should apply regex find and replace with capture groups", () => {
      const input = "name: John\nage: 30\ncity: NYC";
      const config = {
        findReplaceRegex: {
          find: "(\\w+):\\s*(\\w+)",
          replace: "$2 is the $1",
          flags: "g",
        },
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("John is the name\n30 is the age\nNYC is the city");
    });

    it("should handle regex find and replace with different flags", () => {
      const input = "Hello WORLD\nHello world";
      const config = {
        findReplaceRegex: {
          find: "hello",
          replace: "Hi",
          flags: "gi", // global, case-insensitive
        },
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("Hi WORLD\nHi world");
    });

    it("should handle invalid regex in find/replace gracefully", () => {
      const input = "test line";
      const config = {
        findReplaceRegex: {
          find: "[",
          replace: "replacement",
          flags: "g",
        },
      };
      const result = applyTransformations(input, config);
      expect(result).toBe(input); // Should return original on error
    });

    it("should execute JavaScript snippet returning string", () => {
      const input = "line1\nline2\nline3";
      const config = {
        javascriptSnippet: "return text.toUpperCase();",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("LINE1\nLINE2\nLINE3");
    });

    it("should execute JavaScript snippet returning array", () => {
      const input = "apple\nbanana\ncherry\ndate";
      const config = {
        javascriptSnippet: "return lines.filter(line => line.length > 5);",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("banana\ncherry");
    });

    it("should execute JavaScript snippet with line manipulation", () => {
      const input = "first\nsecond\nthird";
      const config = {
        javascriptSnippet:
          "return lines.map((line, index) => `${index + 1}: ${line}`);",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("1: first\n2: second\n3: third");
    });

    it("should handle JavaScript snippet returning non-string values", () => {
      const input = "test";
      const config = {
        javascriptSnippet: "return 42;",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("42");
    });

    it("should handle JavaScript snippet returning null/undefined", () => {
      const input = "test";
      const config = {
        javascriptSnippet: "return null;",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe(input); // Should return original
    });

    it("should handle JavaScript snippet with syntax errors", () => {
      const input = "test line";
      const config = {
        javascriptSnippet: "return lines.filter(line => line.length > 0",
      };

      expect(() => {
        applyTransformations(input, config);
      }).toThrow("JavaScript execution failed");
    });

    it("should handle JavaScript snippet with runtime errors", () => {
      const input = "test line";
      const config = {
        javascriptSnippet: "return undefinedVariable.someMethod();",
      };

      expect(() => {
        applyTransformations(input, config);
      }).toThrow("JavaScript execution failed");
    });

    it("should provide correct variables to JavaScript snippet", () => {
      const input = "line1\nline2\nline3";
      const config = {
        javascriptSnippet: `
          // Test that all variables are available
          if (typeof text !== 'string') throw new Error('text not available');
          if (!Array.isArray(lines)) throw new Error('lines not available');
          if (typeof selection !== 'string') throw new Error('selection not available');
          
          return 'variables available: ' + lines.length + ' lines';
        `,
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("variables available: 3 lines");
    });

    it("should combine advanced transformations with regular ones", () => {
      const input = "name: john\nage: 30\ncity: nyc";
      const config = {
        caseTransform: "title" as const,
        findReplaceRegex: {
          find: "(\\w+):\\s*(\\w+)",
          replace: "$1 = $2",
          flags: "g",
        },
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("Name = John\nAge = 30\nCity = Nyc");
    });

    it("should execute JavaScript snippet after other transformations", () => {
      const input = "apple\nbanana\ncherry";
      const config = {
        caseTransform: "upper" as const,
        javascriptSnippet: "return lines.map(line => `Item: ${line}`);",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("Item: APPLE\nItem: BANANA\nItem: CHERRY");
    });
  });

  // Condition Tests
  describe("Conditional Transformations", () => {
    it("should apply transformation only to lines containing text", () => {
      const input = "apple\nbanana\ncherry\napricot";
      const config = {
        condition: { type: "contains" as const, value: "ap" },
        caseTransform: "upper" as const,
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("APPLE\nbanana\ncherry\nAPRICOT");
    });

    it("should apply transformation only to lines not containing text", () => {
      const input = "error: failed\ninfo: success\nerror: timeout";
      const config = {
        condition: { type: "not-contains" as const, value: "error" },
        addPrefix: "[LOG] ",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("error: failed\n[LOG] info: success\nerror: timeout");
    });

    it("should apply transformation to lines starting with text", () => {
      const input = "DEBUG: message\nINFO: message\nDEBUG: another";
      const config = {
        condition: { type: "starts-with" as const, value: "DEBUG" },
        addPrefix: "🐛 ",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe(
        "🐛 DEBUG: message\nINFO: message\n🐛 DEBUG: another",
      );
    });

    it("should apply transformation to lines ending with text", () => {
      const input = "file.txt\nimage.png\ndoc.pdf\nscript.js";
      const config = {
        condition: { type: "ends-with" as const, value: ".js" },
        addPrefix: "📜 ",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("file.txt\nimage.png\ndoc.pdf\n📜 script.js");
    });

    it("should apply transformation to specific line number", () => {
      const input = "line1\nline2\nline3\nline4";
      const config = {
        condition: { type: "line-number" as const, lineNumber: 2 },
        caseTransform: "upper" as const,
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("line1\nLINE2\nline3\nline4");
    });

    it("should apply transformation to line range", () => {
      const input = "line1\nline2\nline3\nline4\nline5";
      const config = {
        condition: { type: "line-range" as const, startLine: 2, endLine: 4 },
        addPrefix: "> ",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("line1\n> line2\n> line3\n> line4\nline5");
    });

    it("should apply transformation to every nth line", () => {
      const input = "line1\nline2\nline3\nline4\nline5\nline6";
      const config = {
        condition: { type: "every-nth" as const, nthInterval: 2 },
        caseTransform: "upper" as const,
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("line1\nLINE2\nline3\nLINE4\nline5\nLINE6");
    });

    it("should apply transformation to blank lines only", () => {
      const input = "line1\n\nline3\n\nline5";
      const config = {
        condition: { type: "blank" as const },
        addPrefix: "[EMPTY]",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("line1\n[EMPTY]\nline3\n[EMPTY]\nline5");
    });

    it("should apply transformation to non-blank lines only", () => {
      const input = "line1\n\nline3\n\nline5";
      const config = {
        condition: { type: "not-blank" as const },
        addSuffix: " [CONTENT]",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe(
        "line1 [CONTENT]\n\nline3 [CONTENT]\n\nline5 [CONTENT]",
      );
    });

    it("should work with regex conditions", () => {
      const input = "test123\nabc456\nxyz789\ntest000";
      const config = {
        condition: { type: "regex" as const, value: "test\\d+" },
        addSuffix: " [MATCHED]",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe(
        "test123 [MATCHED]\nabc456\nxyz789\ntest000 [MATCHED]",
      );
    });

    it("should handle invalid regex in conditions gracefully", () => {
      const input = "line1\nline2\nline3";
      const config = {
        condition: { type: "regex" as const, value: "[" },
        caseTransform: "upper" as const,
      };
      const result = applyTransformations(input, config);
      expect(result).toBe(input); // Should return original when regex is invalid
    });

    it("should work without conditions (apply to all lines)", () => {
      const input = "line1\nline2\nline3";
      const config = {
        caseTransform: "upper" as const,
      };
      const result = applyTransformations(input, config);
      expect(result).toBe("LINE1\nLINE2\nLINE3");
    });

    it("should combine conditions with multiple transformations", () => {
      const input = "error: failed\ninfo: success\nerror: timeout\nwarn: slow";
      const config = {
        condition: { type: "contains" as const, value: "error" },
        caseTransform: "upper" as const,
        addPrefix: "🚨 ",
        addSuffix: " 🚨",
      };
      const result = applyTransformations(input, config);
      expect(result).toBe(
        "🚨 ERROR: FAILED 🚨\ninfo: success\n🚨 ERROR: TIMEOUT 🚨\nwarn: slow",
      );
    });
  });
});
