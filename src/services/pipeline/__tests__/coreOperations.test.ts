/**
 * Unit Tests for Core Pipeline Operations
 *
 * Tests each operation's execute function independently.
 */

import { OperationDefinition } from "../types";

// Import the operations file to register them
import "../operations/coreOperations";
import { operationRegistry } from "../OperationRegistry";

describe("Core Pipeline Operations", () => {
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
            getVariable: (_name: string) => undefined,
            setVariable: (_name: string, _value: string) => { },
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

        describe("text.remove-extra-whitespace", () => {
            it("should collapse multiple spaces to single space in preserve-single mode", async () => {
                const input = "hello   world\n  multiple    spaces  ";
                const result = await execute("text.remove-extra-whitespace", input, {
                    mode: "preserve-single",
                });
                expect(result).toBe("hello world\n multiple spaces ");
            });

            it("should remove all whitespace in remove-all mode", async () => {
                const input = "hello   world\n  multiple    spaces  ";
                const result = await execute("text.remove-extra-whitespace", input, {
                    mode: "remove-all",
                });
                expect(result).toBe("helloworld\nmultiplespaces");
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

        describe("text.sentence-case", () => {
            it("should capitalize the first letter of the text", async () => {
                const result = await execute("text.sentence-case", "hello world. how ARE YOU?");
                expect(result).toBe("Hello world. how are you?");
            });
        });

        describe("text.camel-case", () => {
            it("should convert to camelCase", async () => {
                const result = await execute("text.camel-case", "hello world");
                expect(result).toBe("helloWorld");
            });

            it("should handle PascalCase input", async () => {
                const result = await execute("text.camel-case", "HelloWorld");
                expect(result).toBe("helloWorld");
            });
        });

        describe("text.pascal-case", () => {
            it("should convert to PascalCase", async () => {
                const result = await execute("text.pascal-case", "hello world");
                expect(result).toBe("HelloWorld");
            });
        });

        describe("text.kebab-case", () => {
            it("should convert to kebab-case", async () => {
                const result = await execute("text.kebab-case", "Hello World");
                expect(result).toBe("hello-world");
            });
        });

        describe("text.snake-case", () => {
            it("should convert to snake_case", async () => {
                const result = await execute("text.snake-case", "Hello World");
                expect(result).toBe("hello_world");
            });
        });

        describe("text.screaming-snake-case", () => {
            it("should convert to SCREAMING_SNAKE_CASE", async () => {
                const result = await execute("text.screaming-snake-case", "hello world");
                expect(result).toBe("HELLO_WORLD");
            });

            it("should handle camelCase boundaries", async () => {
                const result = await execute("text.screaming-snake-case", "camelCaseVariableName");
                expect(result).toBe("CAMEL_CASE_VARIABLE_NAME");
            });
        });

        describe("text.invert-case", () => {
            it("should invert the case of each character", async () => {
                const result = await execute("text.invert-case", "Hello World 123");
                expect(result).toBe("hELLO wORLD 123");
            });
        });

        describe("text.alternating-case", () => {
            it("should alternate the case of characters", async () => {
                const result = await execute("text.alternating-case", "hello world");
                expect(result).toBe("hElLo wOrLd");
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

        describe("text.shuffle-lines", () => {
            it("should shuffle lines", async () => {
                const input = "1\n2\n3\n4\n5\n6\n7\n8\n9\n10";
                const result = await execute("text.shuffle-lines", input);
                expect(result).not.toBe(input); // Random, but extremely likely to be different
                expect(result.split("\n").sort()).toEqual(input.split("\n").sort());
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

    describe("Line Numbering & Wrapping", () => {
        describe("text.add-line-numbers", () => {
            const input = "line1\nline2\nline3";

            it("should add numeric line numbers", async () => {
                const result = await execute("text.add-line-numbers", input, { style: "numeric" });
                expect(result).toBe("1. line1\n2. line2\n3. line3");
            });

            it("should add roman line numbers", async () => {
                const result = await execute("text.add-line-numbers", input, { style: "roman" });
                expect(result).toBe("I. line1\nII. line2\nIII. line3");
            });

            it("should add alpha line numbers", async () => {
                const result = await execute("text.add-line-numbers", input, { style: "alpha" });
                expect(result).toBe("A. line1\nB. line2\nC. line3");
            });
        });

        describe("text.wrap-lines", () => {
            it("should wrap lines at specific width", async () => {
                const input = "This is a long line that should be wrapped.";
                const result = await execute("text.wrap-lines", input, { width: 10 });
                expect(result).toBe("This is a\nlong line\nthat\nshould be\nwrapped.");
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

    describe("Filtering & Selection Operations", () => {
        const input = "apple\nbanana\ncherry\ndate";

        describe("text.filter-regex", () => {
            it("should keep matching lines", async () => {
                const result = await execute("text.filter-regex", input, { pattern: "a", action: "keep" });
                expect(result).toBe("apple\nbanana\ndate");
            });

            it("should remove matching lines", async () => {
                const result = await execute("text.filter-regex", input, { pattern: "a", action: "remove" });
                expect(result).toBe("cherry");
            });
        });

        describe("text.filter-keyword", () => {
            it("should filter by contains", async () => {
                const result = await execute("text.filter-keyword", input, { keyword: "an", position: "contains" });
                expect(result).toBe("banana");
            });

            it("should filter by starts with", async () => {
                const result = await execute("text.filter-keyword", input, { keyword: "c", position: "starts" });
                expect(result).toBe("cherry");
            });
        });

        describe("text.keep-first-n", () => {
            it("should keep first N lines", async () => {
                const result = await execute("text.keep-first-n", input, { n: 2 });
                expect(result).toBe("apple\nbanana");
            });
        });

        describe("text.keep-last-n", () => {
            it("should keep last N lines", async () => {
                const result = await execute("text.keep-last-n", input, { n: 2 });
                expect(result).toBe("cherry\ndate");
            });
        });
    });

    describe("Formatting & Padding Operations", () => {
        describe("text.pad-lines", () => {
            it("should pad lines to the right", async () => {
                const input = "a\nbc";
                const result = await execute("text.pad-lines", input, { length: 3, align: "left", char: "." });
                expect(result).toBe("a..\nbc.");
            });

            it("should pad lines to the left", async () => {
                const input = "a\nbc";
                const result = await execute("text.pad-lines", input, { length: 3, align: "right", char: "." });
                expect(result).toBe("..a\n.bc");
            });
        });

        describe("text.change-indentation", () => {
            it("should add indentation", async () => {
                const input = "line";
                const result = await execute("text.change-indentation", input, { action: "add", amount: 2, type: "spaces" });
                expect(result).toBe("  line");
            });

            it("should remove indentation", async () => {
                const input = "  line";
                const result = await execute("text.change-indentation", input, { action: "remove", amount: 2, type: "spaces" });
                expect(result).toBe("line");
            });
        });

        describe("text.convert-tabs-spaces", () => {
            it("should convert tabs to spaces", async () => {
                const input = "\tline";
                const result = await execute("text.convert-tabs-spaces", input, { mode: "tabs-to-spaces" });
                expect(result).toBe("    line");
            });
        });

        describe("text.normalize-line-endings", () => {
            it("should normalize to LF", async () => {
                const input = "line1\r\nline2";
                const result = await execute("text.normalize-line-endings", input, { mode: "lf" });
                expect(result).toBe("line1\nline2");
            });
        });
    });

    describe("Line Duplication", () => {
        it("should duplicate each line", async () => {
            const input = "a\nb";
            const result = await execute("text.duplicate-lines", input, { count: 2 });
            expect(result).toBe("a\na\nb\nb");
        });
    });

    describe("Advanced Operations", () => {
        describe("text.apply-redaction", () => {
            it("should redact email addresses", async () => {
                const input = "contact me at test@example.com";
                const result = await execute("text.apply-redaction", input, { types: ["email"], mode: "mask" });
                expect(result).toBe("contact me at [REDACTED]");
            });

            it("should obfuscate email addresses", async () => {
                const input = "contact me at test@example.com";
                const result = await execute("text.apply-redaction", input, { types: ["email"], mode: "obfuscate" });
                expect(result).toContain("t***t@e***m");
            });
        });

        describe("text.javascript-snippet", () => {
            it("should execute custom JS", async () => {
                const input = "hello";
                const result = await execute("text.javascript-snippet", input, { code: "return input.toUpperCase();" });
                expect(result).toBe("HELLO");
            });

            it("should handle async scripts", async () => {
                const input = "hello";
                const result = await execute("text.javascript-snippet", input, { code: "return Promise.resolve(input + '!');" });
                expect(result).toBe("hello!");
            });
        });
    });

    describe("Integration with PipelineRunner", () => {
        // Test the full flow through createStep and runPipeline
        it("should work with prefix through createStep and runPipeline", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const step = createStep("text.add-prefix", { prefix: ">> " });
            const pipeline = createPipeline();
            pipeline.steps.push(step);

            const result = await runPipeline("line1\nline2\nline3", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe(">> line1\n>> line2\n>> line3");
        });

        it("should work with suffix through createStep and runPipeline", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const step = createStep("text.add-suffix", { suffix: " <<" });
            const pipeline = createPipeline();
            pipeline.steps.push(step);

            const result = await runPipeline("line1\nline2\nline3", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe("line1 <<\nline2 <<\nline3 <<");
        });

        it("should work with find-replace through createStep and runPipeline", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const step = createStep("text.find-replace-regex", {
                find: "\\d+",
                replace: "NUM",
                flags: "g",
            });
            const pipeline = createPipeline();
            pipeline.steps.push(step);

            const result = await runPipeline("test 123 hello 456", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe("test NUM hello NUM");
        });

        it("should chain multiple operations", async () => {
            const { createStep, runPipeline, createPipeline } = await import(
                "../index"
            );

            const pipeline = createPipeline();
            pipeline.steps.push(createStep("text.trim"));
            pipeline.steps.push(createStep("text.uppercase"));
            pipeline.steps.push(createStep("text.add-prefix", { prefix: "> " }));

            const result = await runPipeline("  hello world  ", pipeline);

            expect(result.success).toBe(true);
            expect(result.output).toBe("> HELLO WORLD");
        });
    });

    describe("Operation Registration", () => {
        it("should register all core operations", () => {
            const expectedOperations = [
                "text.trim",
                "text.remove-blank-lines",
                "text.remove-extra-blank-lines",
                "text.remove-extra-whitespace",
                "text.uppercase",
                "text.lowercase",
                "text.title-case",
                "text.sentence-case",
                "text.camel-case",
                "text.pascal-case",
                "text.kebab-case",
                "text.snake-case",
                "text.screaming-snake-case",
                "text.invert-case",
                "text.alternating-case",
                "text.remove-duplicates",
                "text.sort-asc",
                "text.sort-desc",
                "text.reverse-lines",
                "text.shuffle-lines",
                "text.join-lines",
                "text.split-lines",
                "text.add-line-numbers",
                "text.wrap-lines",
                "text.add-prefix",
                "text.add-suffix",
                "text.find-replace-regex",
                "text.filter-regex",
                "text.filter-keyword",
                "text.keep-first-n",
                "text.keep-last-n",
                "text.pad-lines",
                "text.change-indentation",
                "text.convert-tabs-spaces",
                "text.normalize-line-endings",
                "text.duplicate-lines",
                "text.apply-redaction",
                "text.javascript-snippet",
            ];

            for (const id of expectedOperations) {
                const op = operationRegistry.getById(id);
                expect(op).toBeDefined();
                expect(op?.id).toBe(id);
            }
        });

        it("should have valid parameter definitions", () => {
            const opsWithParams = [
                "text.remove-extra-whitespace",
                "text.join-lines",
                "text.split-lines",
                "text.add-line-numbers",
                "text.wrap-lines",
                "text.add-prefix",
                "text.add-suffix",
                "text.find-replace-regex",
                "text.filter-regex",
                "text.filter-keyword",
                "text.keep-first-n",
                "text.keep-last-n",
                "text.pad-lines",
                "text.change-indentation",
                "text.convert-tabs-spaces",
                "text.normalize-line-endings",
                "text.duplicate-lines",
                "text.apply-redaction",
                "text.javascript-snippet",
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
