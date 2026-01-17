/**
 * Unit Tests for BatchTools Pipeline Operations
 *
 * Tests each operation's execute function independently.
 */

import { OperationDefinition } from "../../../services/pipeline/types";

// Import the operations file to register them
import "../pipelineOperations";
import { operationRegistry } from "../../../services/pipeline";

describe("BatchTools Pipeline Operations", () => {
  // Helper to get an operation by ID
  const getOperation = (id: string): OperationDefinition => {
    const op = operationRegistry.getById(id);
    if (!op) {
      throw new Error(`Operation ${id} not found`);
    }
    return op;
  };

  // Helper to execute an operation
  const execute = async (
    id: string,
    input: string,
    params: Record<string, unknown> = {},
  ): Promise<string> => {
    const op = getOperation(id);
    const context = {
      stepIndex: 0,
      totalSteps: 1,
      variables: new Map<string, string>(),
      getVariable: (name: string) => undefined,
      setVariable: (name: string, value: string) => {},
      _input: input,
      _previousOutput: "",
      _stepIndex: 0,
    };
    const result = await op.execute(input, params, context);
    return result;
  };

  describe("Whitespace & Cleanup Operations", () => {
    describe("text.trim", () => {
      it("should trim leading and trailing whitespace from each line", async () => {
        const input = "  hello  \n  world  ";
        const result = await execute("text.trim", input);
        expect(result).toBe("hello\nworld");
      });

      it("should handle empty input", async () => {
        const result = await execute("text.trim", "");
        expect(result).toBe("");
      });

      it("should preserve internal spaces", async () => {
        const input = "  hello world  ";
        const result = await execute("text.trim", input);
        expect(result).toBe("hello world");
      });
    });

    describe("text.remove-blank-lines", () => {
      it("should remove all blank lines", async () => {
        const input = "line1\n\nline2\n   \nline3";
        const result = await execute("text.remove-blank-lines", input);
        expect(result).toBe("line1\nline2\nline3");
      });

      it("should handle input with no blank lines", async () => {
        const input = "line1\nline2\nline3";
        const result = await execute("text.remove-blank-lines", input);
        expect(result).toBe("line1\nline2\nline3");
      });
    });

    describe("text.remove-extra-blank-lines", () => {
      it("should collapse consecutive blank lines", async () => {
        const input = "line1\n\n\n\nline2\n\nline3";
        const result = await execute("text.remove-extra-blank-lines", input);
        expect(result).toBe("line1\n\nline2\n\nline3");
      });
    });
  });

  describe("Case Conversion Operations", () => {
    describe("text.uppercase", () => {
      it("should convert text to uppercase", async () => {
        const result = await execute("text.uppercase", "Hello World");
        expect(result).toBe("HELLO WORLD");
      });

      it("should handle mixed case input", async () => {
        const result = await execute("text.uppercase", "HeLLo WoRLd 123");
        expect(result).toBe("HELLO WORLD 123");
      });
    });

    describe("text.lowercase", () => {
      it("should convert text to lowercase", async () => {
        const result = await execute("text.lowercase", "Hello World");
        expect(result).toBe("hello world");
      });
    });

    describe("text.title-case", () => {
      it("should capitalize first letter of each word", async () => {
        const result = await execute("text.title-case", "hello world");
        expect(result).toBe("Hello World");
      });

      it("should handle already capitalized text", async () => {
        const result = await execute("text.title-case", "HELLO WORLD");
        expect(result).toBe("Hello World");
      });
    });
  });

  describe("Duplicates Operations", () => {
    describe("text.remove-duplicates", () => {
      it("should remove duplicate lines", async () => {
        const input = "apple\nbanana\napple\ncherry\nbanana";
        const result = await execute("text.remove-duplicates", input);
        expect(result).toBe("apple\nbanana\ncherry");
      });

      it("should preserve order of first occurrence", async () => {
        const input = "c\na\nb\na\nc";
        const result = await execute("text.remove-duplicates", input);
        expect(result).toBe("c\na\nb");
      });

      it("should handle empty input", async () => {
        const result = await execute("text.remove-duplicates", "");
        expect(result).toBe("");
      });
    });
  });

  describe("Sorting Operations", () => {
    describe("text.sort-asc", () => {
      it("should sort lines alphabetically ascending", async () => {
        const input = "cherry\napple\nbanana";
        const result = await execute("text.sort-asc", input);
        expect(result).toBe("apple\nbanana\ncherry");
      });
    });

    describe("text.sort-desc", () => {
      it("should sort lines alphabetically descending", async () => {
        const input = "apple\nbanana\ncherry";
        const result = await execute("text.sort-desc", input);
        expect(result).toBe("cherry\nbanana\napple");
      });
    });

    describe("text.reverse-lines", () => {
      it("should reverse line order", async () => {
        const input = "first\nsecond\nthird";
        const result = await execute("text.reverse-lines", input);
        expect(result).toBe("third\nsecond\nfirst");
      });
    });
  });

  describe("Join/Split Operations", () => {
    describe("text.join-lines", () => {
      it("should join lines with default separator", async () => {
        const input = "a\nb\nc";
        const result = await execute("text.join-lines", input);
        expect(result).toBe("a, b, c");
      });

      it("should join lines with custom separator", async () => {
        const input = "a\nb\nc";
        const result = await execute("text.join-lines", input, {
          separator: " | ",
        });
        expect(result).toBe("a | b | c");
      });

      it("should handle empty separator", async () => {
        const input = "a\nb\nc";
        const result = await execute("text.join-lines", input, { separator: "" });
        expect(result).toBe("abc");
      });
    });

    describe("text.split-lines", () => {
      it("should split by default separator", async () => {
        const input = "a, b, c";
        const result = await execute("text.split-lines", input);
        expect(result).toBe("a\nb\nc");
      });

      it("should split by custom separator", async () => {
        const input = "a|b|c";
        const result = await execute("text.split-lines", input, {
          separator: "|",
        });
        expect(result).toBe("a\nb\nc");
      });
    });
  });

  describe("Prefix/Suffix Operations", () => {
    describe("text.add-prefix", () => {
      it("should add prefix to each line", async () => {
        const input = "line1\nline2\nline3";
        const result = await execute("text.add-prefix", input, {
          prefix: ">> ",
        });
        expect(result).toBe(">> line1\n>> line2\n>> line3");
      });

      it("should handle empty prefix (no change)", async () => {
        const input = "line1\nline2";
        const result = await execute("text.add-prefix", input, { prefix: "" });
        expect(result).toBe("line1\nline2");
      });

      it("should work with single line input", async () => {
        const input = "123";
        const result = await execute("text.add-prefix", input, {
          prefix: "PREFIX_",
        });
        expect(result).toBe("PREFIX_123");
      });
    });

    describe("text.add-suffix", () => {
      it("should add suffix to each line", async () => {
        const input = "line1\nline2\nline3";
        const result = await execute("text.add-suffix", input, {
          suffix: " <<",
        });
        expect(result).toBe("line1 <<\nline2 <<\nline3 <<");
      });

      it("should handle empty suffix (no change)", async () => {
        const input = "line1\nline2";
        const result = await execute("text.add-suffix", input, { suffix: "" });
        expect(result).toBe("line1\nline2");
      });

      it("should work with single line input", async () => {
        const input = "123";
        const result = await execute("text.add-suffix", input, {
          suffix: "_SUFFIX",
        });
        expect(result).toBe("123_SUFFIX");
      });
    });
  });

  describe("Find/Replace Operations", () => {
    describe("text.find-replace-regex", () => {
      it("should find and replace with regex", async () => {
        const input = "hello 123 world 456";
        const result = await execute("text.find-replace-regex", input, {
          find: "\\d+",
          replace: "NUM",
          flags: "g",
        });
        expect(result).toBe("hello NUM world NUM");
      });

      it("should support capture groups", async () => {
        const input = "hello world";
        const result = await execute("text.find-replace-regex", input, {
          find: "(\\w+) (\\w+)",
          replace: "$2 $1",
          flags: "g",
        });
        expect(result).toBe("world hello");
      });

      it("should return input unchanged if find pattern is empty", async () => {
        const input = "hello world";
        const result = await execute("text.find-replace-regex", input, {
          find: "",
          replace: "test",
        });
        expect(result).toBe("hello world");
      });

      it("should handle invalid regex gracefully", async () => {
        const input = "hello world";
        const result = await execute("text.find-replace-regex", input, {
          find: "[invalid(",
          replace: "test",
        });
        expect(result).toBe("hello world");
      });

      it("should support case-insensitive flag", async () => {
        const input = "Hello HELLO hello";
        const result = await execute("text.find-replace-regex", input, {
          find: "hello",
          replace: "hi",
          flags: "gi",
        });
        expect(result).toBe("hi hi hi");
      });
    });
  });

  describe("Operation Registration", () => {
    it("should register all batch tools operations", () => {
      const expectedOperations = [
        "text.trim",
        "text.remove-blank-lines",
        "text.remove-extra-blank-lines",
        "text.uppercase",
        "text.lowercase",
        "text.title-case",
        "text.remove-duplicates",
        "text.sort-asc",
        "text.sort-desc",
        "text.reverse-lines",
        "text.join-lines",
        "text.split-lines",
        "text.add-prefix",
        "text.add-suffix",
        "text.find-replace-regex",
      ];

      for (const id of expectedOperations) {
        const op = operationRegistry.getById(id);
        expect(op).toBeDefined();
        expect(op?.id).toBe(id);
      }
    });

    it("should have valid parameter definitions", () => {
      const opsWithParams = [
        "text.join-lines",
        "text.split-lines",
        "text.add-prefix",
        "text.add-suffix",
        "text.find-replace-regex",
      ];

      for (const id of opsWithParams) {
        const op = operationRegistry.getById(id);
        expect(op).toBeDefined();
        expect(op!.parameters.length).toBeGreaterThan(0);

        for (const param of op!.parameters) {
          expect(param.name).toBeDefined();
          expect(param.label).toBeDefined();
          expect(param.type).toBeDefined();
        }
      }
    });
  });
});
