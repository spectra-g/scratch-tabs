/**
 * Unit Tests for New Text Pipeline Operations
 *
 * Tests for text.reverse and text.statistics operations.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/coreOperations";

describe("New Text Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.output;
    };

    describe("text.reverse", () => {
        it("should reverse entire text", async () => {
            const result = await execute("text.reverse", "Hello", { mode: "all" });
            expect(result).toBe("olleH");
        });

        it("should reverse each line separately", async () => {
            const result = await execute("text.reverse", "Hello\nWorld", { mode: "per-line" });
            expect(result).toBe("olleH\ndlroW");
        });

        it("should reverse each word separately", async () => {
            const result = await execute("text.reverse", "Hello World", { mode: "words" });
            expect(result).toBe("olleH dlroW");
        });

        it("should preserve whitespace in word mode", async () => {
            const result = await execute("text.reverse", "Hello  World", { mode: "words" });
            expect(result).toBe("olleH  dlroW");
        });

        it("should handle empty input", async () => {
            const result = await execute("text.reverse", "");
            expect(result).toBe("");
        });

        it("should handle Unicode characters", async () => {
            const result = await execute("text.reverse", "cafe", { mode: "all" });
            expect(result).toBe("efac");
        });

        it("should handle single character", async () => {
            const result = await execute("text.reverse", "A", { mode: "all" });
            expect(result).toBe("A");
        });

        it("should handle palindrome", async () => {
            const result = await execute("text.reverse", "radar", { mode: "all" });
            expect(result).toBe("radar");
        });
    });

    describe("text.statistics", () => {
        it("should count characters", async () => {
            const result = await execute("text.statistics", "Hello World", { outputFormat: "text" });
            expect(result).toContain("Characters: 11");
        });

        it("should count characters without spaces", async () => {
            const result = await execute("text.statistics", "Hello World", { outputFormat: "text" });
            expect(result).toContain("Characters (no spaces): 10");
        });

        it("should count words", async () => {
            const result = await execute("text.statistics", "Hello World Test", { outputFormat: "text" });
            expect(result).toContain("Words: 3");
        });

        it("should count lines", async () => {
            const result = await execute("text.statistics", "Line1\nLine2\nLine3", { outputFormat: "text" });
            expect(result).toContain("Lines: 3");
        });

        it("should count non-blank lines", async () => {
            const result = await execute("text.statistics", "Line1\n\nLine3", { outputFormat: "text" });
            expect(result).toContain("Non-blank lines: 2");
        });

        it("should count sentences", async () => {
            const result = await execute("text.statistics", "Hello. World! Test?", { outputFormat: "text" });
            expect(result).toContain("Sentences: 3");
        });

        it("should count paragraphs", async () => {
            const result = await execute("text.statistics", "Para1\n\nPara2\n\nPara3", { outputFormat: "text" });
            expect(result).toContain("Paragraphs: 3");
        });

        it("should return JSON format", async () => {
            const result = await execute("text.statistics", "Hello", { outputFormat: "json" });
            const json = JSON.parse(result);
            expect(json.characters).toBe(5);
            expect(json.words).toBe(1);
        });

        it("should calculate average word length", async () => {
            const result = await execute("text.statistics", "Hello World", { outputFormat: "json" });
            const json = JSON.parse(result);
            expect(json.averageWordLength).toBeCloseTo(5, 1);
        });

        it("should handle empty input", async () => {
            const result = await execute("text.statistics", "", { outputFormat: "json" });
            const json = JSON.parse(result);
            expect(json.characters).toBe(0);
            expect(json.words).toBe(0);
        });
    });
});
