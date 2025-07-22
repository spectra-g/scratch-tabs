import { estimateTokenCount, formatTokenCount, getTokenCountColor } from "../utils/tokenCount";
import { parseVariables, substituteVariables, shouldUseTextarea } from "../utils/variables";

describe("Token Count Utils", () => {
  describe("estimateTokenCount", () => {
    it("should return 0 for empty or whitespace-only text", () => {
      expect(estimateTokenCount("")).toBe(0);
      expect(estimateTokenCount("   ")).toBe(0);
      expect(estimateTokenCount("\n\t")).toBe(0);
    });

    it("should handle single words correctly", () => {
      expect(estimateTokenCount("hello")).toBeGreaterThan(0);
      expect(estimateTokenCount("world")).toBeGreaterThan(0);
      expect(estimateTokenCount("test")).toBeGreaterThan(0);
    });

    it("should handle short words (1-3 characters)", () => {
      expect(estimateTokenCount("a")).toBeGreaterThan(0);
      expect(estimateTokenCount("hi")).toBeGreaterThan(0);
      expect(estimateTokenCount("the")).toBeGreaterThan(0);
    });

    it("should handle medium words (4-6 characters)", () => {
      expect(estimateTokenCount("word")).toBeGreaterThan(0);
      expect(estimateTokenCount("hello")).toBeGreaterThan(0);
      expect(estimateTokenCount("world")).toBeGreaterThan(0);
    });

    it("should handle long words and technical terms", () => {
      expect(estimateTokenCount("supercalifragilisticexpialidocious")).toBeGreaterThan(5);
      expect(estimateTokenCount("pneumonoultramicroscopicsilicovolcanoconioses")).toBeGreaterThan(10);
    });

    it("should handle punctuation correctly", () => {
      expect(estimateTokenCount("hello, world!")).toBeGreaterThan(0);
      expect(estimateTokenCount("test.")).toBeGreaterThan(0);
      expect(estimateTokenCount("a;b:c")).toBeGreaterThan(0);
    });

    it("should handle code patterns", () => {
      expect(estimateTokenCount("function test() {")).toBeGreaterThan(0);
      expect(estimateTokenCount("const x = 5;")).toBeGreaterThan(0);
    });

    it("should normalize whitespace", () => {
      expect(estimateTokenCount("hello   world")).toBeGreaterThan(0);
      expect(estimateTokenCount("test\n\n\nvalue")).toBeGreaterThan(0);
    });

    it("should handle complex text with mixed content", () => {
      const text = "Hello, world! This is a test of the token counting system.";
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(10);
      expect(count).toBeLessThan(50);
    });

    it("should handle very long text", () => {
      const longText = "This is a very long text that contains many words and sentences. ".repeat(100);
      const count = estimateTokenCount(longText);
      expect(count).toBeGreaterThan(100);
    });
  });

  describe("formatTokenCount", () => {
    it("should format zero tokens", () => {
      expect(formatTokenCount(0)).toBe("0 tokens");
    });

    it("should format single token", () => {
      expect(formatTokenCount(1)).toBe("1 token");
    });

    it("should format small numbers", () => {
      expect(formatTokenCount(5)).toBe("5 tokens");
      expect(formatTokenCount(99)).toBe("99 tokens");
    });

    it("should format thousands", () => {
      expect(formatTokenCount(1000)).toBe("1.0K tokens");
      expect(formatTokenCount(1500)).toBe("1.5K tokens");
      expect(formatTokenCount(9999)).toBe("10.0K tokens");
    });

    it("should format millions", () => {
      expect(formatTokenCount(1000000)).toBe("1.0M tokens");
      expect(formatTokenCount(1500000)).toBe("1.5M tokens");
      expect(formatTokenCount(9999999)).toBe("10.0M tokens");
    });
  });

  describe("getTokenCountColor", () => {
    it("should return gray for zero tokens", () => {
      expect(getTokenCountColor(0)).toBe("text-gray-500");
    });

    it("should return green for low token counts", () => {
      expect(getTokenCountColor(1)).toBe("text-green-400");
      expect(getTokenCountColor(50)).toBe("text-green-400");
      expect(getTokenCountColor(99)).toBe("text-green-400");
    });

    it("should return yellow for medium token counts", () => {
      expect(getTokenCountColor(100)).toBe("text-yellow-400");
      expect(getTokenCountColor(250)).toBe("text-yellow-400");
      expect(getTokenCountColor(499)).toBe("text-yellow-400");
    });

    it("should return orange for high token counts", () => {
      expect(getTokenCountColor(500)).toBe("text-orange-400");
      expect(getTokenCountColor(750)).toBe("text-orange-400");
      expect(getTokenCountColor(999)).toBe("text-orange-400");
    });

    it("should return red for very high token counts", () => {
      expect(getTokenCountColor(1000)).toBe("text-red-400");
      expect(getTokenCountColor(5000)).toBe("text-red-400");
      expect(getTokenCountColor(10000)).toBe("text-red-400");
    });
  });
});

describe("Variable Utils", () => {
  describe("parseVariables", () => {
    it("should return empty array for empty content", () => {
      expect(parseVariables("")).toEqual([]);
      expect(parseVariables(null as any)).toEqual([]);
      expect(parseVariables(undefined as any)).toEqual([]);
    });

    it("should extract single variable", () => {
      expect(parseVariables("Hello {{name}}!")).toEqual(["name"]);
    });

    it("should extract multiple variables", () => {
      expect(parseVariables("Hello {{name}}, you are {{age}} years old.")).toEqual(["age", "name"]);
    });

    it("should handle variables with spaces", () => {
      expect(parseVariables("{{user name}} and {{user age}}")).toEqual(["user age", "user name"]);
    });

    it("should handle nested braces", () => {
      expect(parseVariables("{{outer{{inner}}}}")).toEqual(["outer{{inner"]);
    });

    it("should handle empty variable names", () => {
      expect(parseVariables("{{}}")).toEqual([]);
      expect(parseVariables("{{   }}")).toEqual([]);
    });

    it("should handle duplicate variables", () => {
      expect(parseVariables("{{name}} and {{name}}")).toEqual(["name"]);
    });

    it("should handle complex variable names", () => {
      expect(parseVariables("{{user.firstName}} {{user.lastName}}")).toEqual(["user.firstName", "user.lastName"]);
    });

    it("should handle variables with special characters", () => {
      expect(parseVariables("{{user-name}} {{user_name}} {{userName}}")).toEqual(["user-name", "user_name", "userName"].sort());
    });

    it("should return sorted array", () => {
      expect(parseVariables("{{zebra}} {{apple}} {{banana}}")).toEqual(["apple", "banana", "zebra"]);
    });
  });

  describe("substituteVariables", () => {
    it("should return original content when no variables", () => {
      expect(substituteVariables("Hello world", {})).toBe("Hello world");
    });

    it("should substitute single variable", () => {
      expect(substituteVariables("Hello {{name}}!", { name: "John" })).toBe("Hello John!");
    });

    it("should substitute multiple variables", () => {
      expect(substituteVariables("Hello {{name}}, you are {{age}} years old.", { 
        name: "John", 
        age: "25" 
      })).toBe("Hello John, you are 25 years old.");
    });

    it("should handle variables with spaces", () => {
      expect(substituteVariables("{{user name}}", { "user name": "John Doe" })).toBe("John Doe");
    });

    it("should handle empty values", () => {
      expect(substituteVariables("Hello {{name}}!", { name: "" })).toBe("Hello !");
    });

    it("should handle undefined values", () => {
      expect(substituteVariables("Hello {{name}}!", { name: undefined as any })).toBe("Hello !");
    });

    it("should keep unfilled variables when keepUnfilled is true", () => {
      expect(substituteVariables("Hello {{name}} {{age}}!", { name: "John" }, true))
        .toBe("Hello John {{age}}!");
    });

    it("should remove unfilled variables when keepUnfilled is false", () => {
      expect(substituteVariables("Hello {{name}} {{age}}!", { name: "John" }, false))
        .toBe("Hello John !");
    });

    it("should handle case-sensitive variable names", () => {
      expect(substituteVariables("{{Name}} {{name}}", { Name: "John", name: "Jane" }))
        .toBe("John Jane");
    });

    it("should handle complex variable names", () => {
      expect(substituteVariables("{{user.firstName}} {{user.lastName}}", {
        "user.firstName": "John",
        "user.lastName": "Doe"
      })).toBe("John Doe");
    });

    it("should handle special characters in values", () => {
      expect(substituteVariables("{{message}}", { message: "Hello\nWorld!" }))
        .toBe("Hello\nWorld!");
    });

    it("should handle multiple occurrences of same variable", () => {
      expect(substituteVariables("{{name}} says hello to {{name}}", { name: "John" }))
        .toBe("John says hello to John");
    });
  });

  describe("shouldUseTextarea", () => {
    it("should return true for text-related keywords", () => {
      expect(shouldUseTextarea("text")).toBe(true);
      expect(shouldUseTextarea("content")).toBe(true);
      expect(shouldUseTextarea("summary")).toBe(true);
      expect(shouldUseTextarea("notes")).toBe(true);
      expect(shouldUseTextarea("description")).toBe(true);
      expect(shouldUseTextarea("message")).toBe(true);
      expect(shouldUseTextarea("body")).toBe(true);
    });

    it("should handle case-insensitive matching", () => {
      expect(shouldUseTextarea("TEXT")).toBe(true);
      expect(shouldUseTextarea("Content")).toBe(true);
      expect(shouldUseTextarea("SUMMARY")).toBe(true);
    });

    it("should handle partial matches", () => {
      expect(shouldUseTextarea("userText")).toBe(true);
      expect(shouldUseTextarea("contentArea")).toBe(true);
      expect(shouldUseTextarea("messageBody")).toBe(true);
    });

    it("should return false for non-text keywords", () => {
      expect(shouldUseTextarea("name")).toBe(false);
      expect(shouldUseTextarea("age")).toBe(false);
      expect(shouldUseTextarea("email")).toBe(false);
      expect(shouldUseTextarea("phone")).toBe(false);
    });

    it("should handle empty string", () => {
      expect(shouldUseTextarea("")).toBe(false);
    });

    it("should handle special characters", () => {
      expect(shouldUseTextarea("text-area")).toBe(true);
      expect(shouldUseTextarea("content_box")).toBe(true);
    });
  });
}); 