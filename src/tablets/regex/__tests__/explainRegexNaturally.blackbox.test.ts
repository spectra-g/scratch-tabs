import { explainRegexNaturally } from "../utils/regexEngine";

/**
 * Black Box Tests for Natural Language Regex Explanations
 *
 * These tests verify input/output pairs without caring about internal implementation.
 * They ensure the semantic regex explanation produces human-readable, natural language
 * output that accurately describes what the regex pattern does.
 */
describe("explainRegexNaturally - Black Box Tests", () => {
  // ==========================================================================
  // Password Validation Patterns
  // ==========================================================================
  describe("Password Validation Patterns", () => {
    test.each([
      [
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
        "Checks that the string contains at least one lowercase letter, uppercase letter, and digit, and then ensures it is at least 8 characters long.",
      ],
      [
        "^(?=.*[a-z])(?=.*\\d).{6,}$",
        "Checks that the string contains at least one lowercase letter and digit, and then ensures it is at least 6 characters long.",
      ],
      [
        "^(?=.*[A-Z])(?=.*[a-z]).{8,}$",
        "Checks that the string contains at least one uppercase letter and lowercase letter, and then ensures it is at least 8 characters long.",
      ],
      [
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*]).{10,}$",
        "Checks that the string contains at least one lowercase letter, uppercase letter, digit, and special character, and then ensures it is at least 10 characters long.",
      ],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Password with Negative Lookaheads (Prohibitions)
  // ==========================================================================
  describe("Password with Prohibitions", () => {
    test.each([
      [
        "^(?!.*password)(?=.*[A-Z]).{8,}$",
        "Checks that the string contains at least one uppercase letter and does not contain 'password', and then ensures it is at least 8 characters long.",
      ],
      [
        "^(?!.*123)(?=.*[a-z]).{6,}$",
        "Checks that the string contains at least one lowercase letter and does not contain '123', and then ensures it is at least 6 characters long.",
      ],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Email Patterns
  // ==========================================================================
  describe("Email Patterns", () => {
    test.each([
      ["^[\\w.-]+@[\\w.-]+\\.\\w{2,}$", "Matches an email address format."],
      ["[\\w.+-]+@[\\w-]+\\.[\\w.-]+", "Matches an email address format."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // URL Patterns
  // ==========================================================================
  describe("URL Patterns", () => {
    test.each([
      ["^https?://", "Matches URLs starting with http:// or https://."],
      ["^https://", "Matches URLs starting with https://."],
      ["^http://", "Matches URLs starting with http://."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Date Patterns
  // ==========================================================================
  describe("Date Patterns", () => {
    test.each([
      ["^\\d{4}-\\d{2}-\\d{2}$", "Matches a date in YYYY-MM-DD format."],
      ["^\\d{2}/\\d{2}/\\d{4}$", "Matches a date in MM/DD/YYYY format."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Time Patterns
  // ==========================================================================
  describe("Time Patterns", () => {
    test.each([
      [
        "^\\d{2}:\\d{2}(:\\d{2})?$",
        "Matches a time in HH:MM or HH:MM:SS format.",
      ],
      ["^\\d{2}:\\d{2}$", "Matches a time in HH:MM format."],
      ["^\\d{2}:\\d{2}:\\d{2}$", "Matches a time in HH:MM:SS format."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Phone Number Patterns
  // ==========================================================================
  describe("Phone Number Patterns", () => {
    test.each([
      [
        "^\\d{3}-\\d{3}-\\d{4}$",
        "Matches a US phone number in XXX-XXX-XXXX format.",
      ],
      [
        "^\\(\\d{3}\\) \\d{3}-\\d{4}$",
        "Matches a US phone number in (XXX) XXX-XXXX format.",
      ],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // SSN Pattern
  // ==========================================================================
  describe("SSN Pattern", () => {
    test("SSN format", () => {
      expect(explainRegexNaturally("^\\d{3}-\\d{2}-\\d{4}$")).toBe(
        "Matches a US Social Security Number format."
      );
    });
  });

  // ==========================================================================
  // Simple Literal Patterns
  // ==========================================================================
  describe("Simple Literal Patterns", () => {
    test.each([
      ["hello", "Matches the literal text 'hello'."],
      ["world", "Matches the literal text 'world'."],
      ["foo", "Matches the literal text 'foo'."],
      ["bar", "Matches the literal text 'bar'."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Exact Match Patterns (anchored)
  // ==========================================================================
  describe("Exact Match Patterns", () => {
    test.each([
      ["^abc$", "Matches exactly 'abc'."],
      ["^hello$", "Matches exactly 'hello'."],
      ["^test$", "Matches exactly 'test'."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Quantifier Patterns
  // ==========================================================================
  describe("Quantifier Patterns", () => {
    test.each([
      ["a+", "Matches one or more 'a'."],
      ["\\d+", "Matches one or more digit."],
      ["\\w*", "Matches zero or more word character."],
      ["x?", "Matches optional 'x'."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Character Class Patterns
  // ==========================================================================
  describe("Character Class Patterns", () => {
    test.each([
      ["[aeiou]", "Matches vowel."],
      ["[^aeiou]", "Matches consonant."],
      ["[a-z]", "Matches lowercase letter."],
      ["[A-Z]", "Matches uppercase letter."],
      ["[0-9]", "Matches digit."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Optional Character Patterns
  // ==========================================================================
  describe("Optional Character Patterns", () => {
    test.each([
      ["colou?r", "Matches 'colo' followed by optional 'u' followed by 'r'."],
      ["behaviou?r", "Matches 'behavio' followed by optional 'u' followed by 'r'."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Alternation Patterns
  // ==========================================================================
  describe("Alternation Patterns", () => {
    test.each([
      ["cat|dog", "Matches 'cat' or 'dog'."],
      ["red|green|blue", "Matches 'red', 'green', or 'blue'."],
      ["yes|no", "Matches 'yes' or 'no'."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Group Patterns
  // ==========================================================================
  describe("Group Patterns", () => {
    test("alternation group with quantifier", () => {
      const result = explainRegexNaturally("(foo|bar)+");
      expect(result).toContain("foo");
      expect(result).toContain("bar");
    });

    test("non-capturing group with quantifier", () => {
      const result = explainRegexNaturally("(?:ab)+");
      expect(result).toContain("ab");
    });
  });

  // ==========================================================================
  // Named Group Patterns
  // ==========================================================================
  describe("Named Group Patterns", () => {
    test("simple named group", () => {
      const result = explainRegexNaturally("(?<name>\\w+)");
      expect(result).toContain("word character");
      expect(result).toContain("name");
    });

    test("date with named groups", () => {
      // This matches the date-iso template
      const result = explainRegexNaturally("^(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})$");
      expect(result).toContain("date");
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("Edge Cases", () => {
    test("empty pattern", () => {
      expect(explainRegexNaturally("")).toBe("No pattern to explain.");
    });

    test("single dot", () => {
      expect(explainRegexNaturally(".")).toBe("Matches any character.");
    });

    test("dot star", () => {
      expect(explainRegexNaturally(".*")).toBe(
        "Matches zero or more any character."
      );
    });

    test("empty string match", () => {
      expect(explainRegexNaturally("^$")).toBe("Matches an empty string.");
    });

    test("single character", () => {
      expect(explainRegexNaturally("a")).toBe("Matches the literal text 'a'.");
    });
  });

  // ==========================================================================
  // Escape Sequence Patterns
  // ==========================================================================
  describe("Escape Sequence Patterns", () => {
    test.each([
      ["\\d", "Matches digit."],
      ["\\w", "Matches word character."],
      ["\\s", "Matches whitespace."],
      ["\\D", "Matches non-digit."],
      ["\\W", "Matches non-word character."],
      ["\\S", "Matches non-whitespace."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Length Constraint Patterns
  // ==========================================================================
  describe("Length Constraint Patterns", () => {
    test.each([
      ["^.{8,}$", "Matches a string that is at least 8 characters long."],
      ["^.{5,10}$", "Matches a string that is between 5 and 10 characters long."],
      ["^.{6}$", "Matches a string that is exactly 6 characters long."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Complex Real-World Patterns
  // ==========================================================================
  describe("Complex Real-World Patterns", () => {
    test("IPv4 pattern elements", () => {
      // Simplified version - actual IPv4 is too complex
      const result = explainRegexNaturally("^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$");
      expect(result).toContain("digit");
    });

    test("hex color pattern", () => {
      const result = explainRegexNaturally("^#[0-9a-fA-F]{6}$");
      // May describe as alphanumeric or hex depending on recognition
      expect(result.toLowerCase()).toMatch(/hex|alphanumeric|character/);
    });

    test("username pattern", () => {
      const result = explainRegexNaturally("^[a-zA-Z][a-zA-Z0-9_]{2,15}$");
      expect(result).toContain("letter");
    });
  });

  // ==========================================================================
  // Word Boundary Patterns
  // ==========================================================================
  describe("Word Boundary Patterns", () => {
    test.each([
      ["\\bword\\b", "Matches word boundary followed by 'word' followed by word boundary."],
    ])("pattern: %s", (input, expected) => {
      expect(explainRegexNaturally(input)).toBe(expected);
    });
  });

  // ==========================================================================
  // Repetition Patterns
  // ==========================================================================
  describe("Repetition Patterns", () => {
    test("exact repetition", () => {
      const result = explainRegexNaturally("a{3}");
      expect(result).toContain("3");
      expect(result).toContain("a");
    });

    test("range repetition", () => {
      const result = explainRegexNaturally("a{2,5}");
      expect(result).toContain("2");
      expect(result).toContain("5");
    });

    test("minimum repetition", () => {
      const result = explainRegexNaturally("a{2,}");
      expect(result).toContain("2");
      expect(result).toContain("a");
    });
  });

  // ==========================================================================
  // Lookahead/Lookbehind Patterns
  // ==========================================================================
  describe("Lookahead/Lookbehind Patterns", () => {
    test("positive lookahead", () => {
      const result = explainRegexNaturally("foo(?=bar)");
      // The result should mention bar since it's a lookahead condition
      expect(result).toContain("bar");
    });

    test("negative lookahead", () => {
      const result = explainRegexNaturally("foo(?!bar)");
      // Should mention bar in the prohibition
      expect(result).toContain("bar");
    });

    test("positive lookbehind", () => {
      const result = explainRegexNaturally("(?<=@)\\w+");
      // Should mention word character or the @ symbol
      expect(result.toLowerCase()).toMatch(/word|@/);
    });

    test("negative lookbehind", () => {
      const result = explainRegexNaturally("(?<!@)\\w+");
      // Should mention word character or the @ symbol
      expect(result.toLowerCase()).toMatch(/word|@/);
    });
  });

  // ==========================================================================
  // Non-Greedy Patterns (note: description focuses on what matches, not how)
  // ==========================================================================
  describe("Non-Greedy Patterns", () => {
    test("non-greedy star", () => {
      const result = explainRegexNaturally("a*?");
      expect(result).toContain("a");
    });

    test("non-greedy plus", () => {
      const result = explainRegexNaturally("a+?");
      expect(result).toContain("a");
    });
  });

  // ==========================================================================
  // Multi-Line and Special Anchors
  // ==========================================================================
  describe("Multi-Line and Special Anchors", () => {
    test("start anchor only", () => {
      const result = explainRegexNaturally("^hello");
      expect(result).toContain("hello");
    });

    test("end anchor only", () => {
      const result = explainRegexNaturally("world$");
      expect(result).toContain("world");
    });
  });
});
