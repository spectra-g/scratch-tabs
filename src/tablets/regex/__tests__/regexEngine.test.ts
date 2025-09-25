import {
  createRegexFromPattern,
  validateRegex,
  executeRegex,
  explainRegex,
  DEFAULT_FLAGS,
} from "../utils/regexEngine";
import { RegexFlag, RegexError, RegexMatch } from "../types";

describe("regexEngine", () => {
  describe("DEFAULT_FLAGS", () => {
    it("should have the correct default flags", () => {
      expect(DEFAULT_FLAGS).toHaveLength(6);
      expect(DEFAULT_FLAGS[0]).toEqual({
        flag: "g",
        name: "Global",
        description: "Find all matches rather than stopping after the first match",
        enabled: true,
      });
      expect(DEFAULT_FLAGS[1]).toEqual({
        flag: "i",
        name: "Ignore Case",
        description: "Case-insensitive matching",
        enabled: false,
      });
    });
  });

  describe("createRegexFromPattern", () => {
    it("should create a valid regex with enabled flags", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
        { flag: "i", name: "Ignore Case", description: "", enabled: true },
      ];
      const regex = createRegexFromPattern("test", flags);
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex?.flags).toBe("gi");
    });

    it("should create a regex with only enabled flags", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
        { flag: "i", name: "Ignore Case", description: "", enabled: false },
        { flag: "m", name: "Multiline", description: "", enabled: true },
      ];
      const regex = createRegexFromPattern("test", flags);
      expect(regex?.flags).toBe("gm");
    });

    it("should return null for invalid regex patterns", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const regex = createRegexFromPattern("[invalid", flags);
      expect(regex).toBeNull();
    });

    it("should handle empty pattern", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const regex = createRegexFromPattern("", flags);
      expect(regex).toBeInstanceOf(RegExp);
    });
  });

  describe("validateRegex", () => {
    it("should return null for valid regex patterns", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const error = validateRegex("test", flags);
      expect(error).toBeNull();
    });

    it("should return error for invalid regex patterns", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const error = validateRegex("[invalid", flags);
      expect(error).toEqual({
        message: expect.stringContaining("Invalid regular expression"),
        position: undefined,
      });
    });

    it("should extract position from error message when available", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      // This pattern should cause a position-specific error
      const error = validateRegex("a{2,1}", flags);
      expect(error?.message).toContain("Invalid regular expression");
    });

    it("should handle empty pattern", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const error = validateRegex("", flags);
      expect(error).toBeNull();
    });
  });

  describe("executeRegex", () => {
    it("should find matches with global flag", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const matches = executeRegex("test", "test string test", flags);
      expect(matches).toHaveLength(2);
      expect(matches[0].match).toBe("test");
      expect(matches[0].index).toBe(0);
      expect(matches[1].match).toBe("test");
      expect(matches[1].index).toBe(12);
    });

    it("should find single match without global flag", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: false },
      ];
      const matches = executeRegex("test", "test string test", flags);
      expect(matches).toHaveLength(1);
      expect(matches[0].match).toBe("test");
      expect(matches[0].index).toBe(0);
    });

    it("should handle capture groups", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const matches = executeRegex("(\\w+)\\s+(\\w+)", "hello world", flags);
      expect(matches).toHaveLength(1);
      expect(matches[0].groups).toHaveLength(2);
      expect(matches[0].groups[0].match).toBe("hello");
      expect(matches[0].groups[1].match).toBe("world");
    });

    it("should handle named capture groups", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const matches = executeRegex(
        "(?<first>\\w+)\\s+(?<second>\\w+)",
        "hello world",
        flags,
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].namedGroups).toEqual({
        first: "hello",
        second: "world",
      });
    });

    it("should return empty array for no matches", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const matches = executeRegex("nonexistent", "test string", flags);
      expect(matches).toHaveLength(0);
    });

    it("should handle case insensitive matching", () => {
      const flags: RegexFlag[] = [
        { flag: "i", name: "Ignore Case", description: "", enabled: true },
      ];
      const matches = executeRegex("TEST", "test string", flags);
      expect(matches).toHaveLength(1);
      expect(matches[0].match).toBe("test");
    });

    it("should handle multiline matching", () => {
      const flags: RegexFlag[] = [
        { flag: "m", name: "Multiline", description: "", enabled: true },
      ];
      const matches = executeRegex("^test", "test\nline2\ntest", flags);
      expect(matches).toHaveLength(1);
    });

    it("should handle empty string", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const matches = executeRegex("test", "", flags);
      expect(matches).toHaveLength(0);
    });

    it("should handle zero-length matches", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const matches = executeRegex("(?=test)", "test", flags);
      expect(matches).toHaveLength(1);
      expect(matches[0].match).toBe("");
    });

    it("should return empty array for invalid regex", () => {
      const flags: RegexFlag[] = [
        { flag: "g", name: "Global", description: "", enabled: true },
      ];
      const matches = executeRegex("[invalid", "test string", flags);
      expect(matches).toHaveLength(0);
    });
  });

  describe("explainRegex", () => {
    it("should explain literal characters", () => {
      const explanation = explainRegex("abc");
      expect(explanation).toHaveLength(3);
      expect(explanation[0]).toEqual({
        type: "literal",
        value: "a",
        description: "Literal \"a\"",
        start: 0,
        end: 1,
      });
    });

    it("should explain character classes", () => {
      const explanation = explainRegex("[abc]");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("character-class");
      expect(explanation[0].value).toBe("[abc]");
    });

    it("should explain quantifiers", () => {
      const explanation = explainRegex("a+");
      expect(explanation).toHaveLength(2);
      expect(explanation[1].type).toBe("quantifier");
      expect(explanation[1].value).toBe("+");
    });

    it("should explain groups", () => {
      const explanation = explainRegex("(abc)");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("group");
      expect(explanation[0].value).toBe("(abc)");
    });

    it("should explain anchors", () => {
      const explanation = explainRegex("^abc$");
      expect(explanation).toHaveLength(5);
      expect(explanation[0].type).toBe("anchor");
      expect(explanation[0].value).toBe("^");
      expect(explanation[4].type).toBe("anchor");
      expect(explanation[4].value).toBe("$");
    });

    it("should explain escapes", () => {
      const explanation = explainRegex("\\d");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("escape");
      expect(explanation[0].value).toBe("\\d");
    });

    it("should explain assertions", () => {
      const explanation = explainRegex("(?=abc)");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("group");
      expect(explanation[0].value).toBe("(?=abc)");
    });

    it("should handle empty pattern", () => {
      const explanation = explainRegex("");
      expect(explanation).toHaveLength(0);
    });

    it("should handle complex patterns", () => {
      const explanation = explainRegex("^(?<name>\\w+)@(\\w+)\\.\\w+$");
      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation.some((exp) => exp.type === "anchor")).toBe(true);
      expect(explanation.some((exp) => exp.type === "group")).toBe(true);
    });

    it("should handle nested groups", () => {
      const explanation = explainRegex("((a|b)+)");
      expect(explanation.some((exp) => exp.type === "group")).toBe(true);
    });

    it("should handle character class ranges", () => {
      const explanation = explainRegex("[a-z0-9]");
      expect(explanation[0].type).toBe("character-class");
      expect(explanation[0].value).toBe("[a-z0-9]");
    });

    it("should handle negated character classes", () => {
      const explanation = explainRegex("[^abc]");
      expect(explanation[0].type).toBe("character-class");
      expect(explanation[0].value).toBe("[^abc]");
    });

    it("should handle multiple quantifiers", () => {
      const explanation = explainRegex("a*b+c?");
      expect(explanation.filter((exp) => exp.type === "quantifier")).toHaveLength(3);
    });

    it("should handle escaped special characters", () => {
      const explanation = explainRegex("\\[\\]\\{\\}\\(\\)");
      expect(explanation.every((exp) => exp.type === "escape")).toBe(true);
    });

    it("should provide detailed explanations for capturing groups with alternation", () => {
      const explanation = explainRegex("(-|[A-Z])+");
      expect(explanation).toHaveLength(2);
      expect(explanation[0].type).toBe("group");
      expect(explanation[0].description).toBe("Capturing group containing: either a hyphen (-) or uppercase letters");
      expect(explanation[1].type).toBe("quantifier");
      expect(explanation[1].description).toBe("Match one or more repetitions");
    });

    it("should provide meaningful character class explanations", () => {
      const testCases = [
        { pattern: "[A-Z]", expected: "Match uppercase letters" },
        { pattern: "[a-z]", expected: "Match lowercase letters" },
        { pattern: "[0-9]", expected: "Match digits" },
        { pattern: "[a-zA-Z]", expected: "Match letters" },
        { pattern: "[^A-Z]", expected: "Match any character except uppercase letters" },
      ];

      testCases.forEach(({ pattern, expected }) => {
        const explanation = explainRegex(pattern);
        expect(explanation[0].description).toBe(expected);
      });
    });

    it("should explain named capturing groups with content details", () => {
      const explanation = explainRegex("(?<name>[A-Z]+)");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("group");
      expect(explanation[0].description).toBe("Named capturing group \"name\" containing: uppercase letters (one or more)");
    });

    it("should explain non-capturing groups", () => {
      const explanation = explainRegex("(?:hello|world)");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("group");
      expect(explanation[0].description).toBe("Non-capturing group containing: either \"hello\" or \"world\"");
    });

    it("should handle multiple alternatives in groups", () => {
      const explanation = explainRegex("(a|b|c)");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("group");
      expect(explanation[0].description).toBe("Capturing group containing: one of 3 alternatives: \"a\", \"b\", \"c\"");
    });

    it("should explain character classes with quantifiers inside groups", () => {
      const explanation = explainRegex("([0-9]+)");
      expect(explanation).toHaveLength(1);
      expect(explanation[0].type).toBe("group");
      expect(explanation[0].description).toBe("Capturing group containing: digits (one or more)");
    });

    it("should handle simple character lists in character classes", () => {
      const testCases = [
        { pattern: "[abc]", expected: "Match one of \"a\", \"b\", \"c\"" },
        { pattern: "[xy]", expected: "Match \"x\" or \"y\"" },
        { pattern: "[z]", expected: "Match \"z\"" },
      ];

      testCases.forEach(({ pattern, expected }) => {
        const explanation = explainRegex(pattern);
        expect(explanation[0].description).toBe(expected);
      });
    });

    it("should handle character ranges", () => {
      const testCases = [
        { pattern: "[a-c]", expected: "Match letters from a to c" },
        { pattern: "[X-Z]", expected: "Match uppercase letters from X to Z" },
        { pattern: "[1-5]", expected: "Match digits from 1 to 5" },
      ];

      testCases.forEach(({ pattern, expected }) => {
        const explanation = explainRegex(pattern);
        expect(explanation[0].description).toBe(expected);
      });
    });

    it("should provide fallback for complex character classes", () => {
      const explanation = explainRegex("[a-z\\d\\s]");
      expect(explanation[0].description).toBe("Match characters matching [a-z\\d\\s]");
    });
  });
}); 