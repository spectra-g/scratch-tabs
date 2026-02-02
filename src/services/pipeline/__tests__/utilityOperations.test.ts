/**
 * Unit Tests for Utility Pipeline Operations
 *
 * Tests for UUID, random string, lorem ipsum, and sequence generation.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/utilities";

describe("Utility Pipeline Operations", () => {
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

    describe("utilities.uuid", () => {
        it("should generate a valid UUID v4", async () => {
            const result = await execute("utilities.uuid", "", { count: 1, version: "v4" });
            expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it("should generate multiple UUIDs", async () => {
            const result = await execute("utilities.uuid", "", { count: 5 });
            const lines = result.split("\n");
            expect(lines.length).toBe(5);
        });

        it("should generate uppercase UUIDs", async () => {
            const result = await execute("utilities.uuid", "", { count: 1, format: "uppercase" });
            expect(result).toMatch(/^[0-9A-F-]+$/);
        });

        it("should generate UUIDs without dashes", async () => {
            const result = await execute("utilities.uuid", "", { count: 1, format: "no-dashes" });
            expect(result).not.toContain("-");
            expect(result.length).toBe(32);
        });

        it("should generate UUID v7 with timestamp", async () => {
            const result = await execute("utilities.uuid", "", { count: 1, version: "v7" });
            // v7 UUIDs have '7' in the version position
            expect(result.charAt(14)).toBe("7");
        });

        it("should limit count to 100", async () => {
            const result = await execute("utilities.uuid", "", { count: 200 });
            const lines = result.split("\n");
            expect(lines.length).toBe(100);
        });
    });

    describe("utilities.random-string", () => {
        it("should generate alphanumeric string", async () => {
            const result = await execute("utilities.random-string", "", { length: 16, charset: "alphanumeric" });
            expect(result.length).toBe(16);
            expect(result).toMatch(/^[a-zA-Z0-9]+$/);
        });

        it("should generate lowercase string", async () => {
            const result = await execute("utilities.random-string", "", { length: 20, charset: "lowercase" });
            expect(result.length).toBe(20);
            expect(result).toMatch(/^[a-z]+$/);
        });

        it("should generate uppercase string", async () => {
            const result = await execute("utilities.random-string", "", { length: 20, charset: "uppercase" });
            expect(result.length).toBe(20);
            expect(result).toMatch(/^[A-Z]+$/);
        });

        it("should generate numeric string", async () => {
            const result = await execute("utilities.random-string", "", { length: 10, charset: "numeric" });
            expect(result.length).toBe(10);
            expect(result).toMatch(/^[0-9]+$/);
        });

        it("should generate hex string", async () => {
            const result = await execute("utilities.random-string", "", { length: 16, charset: "hex" });
            expect(result.length).toBe(16);
            expect(result).toMatch(/^[0-9a-f]+$/);
        });

        it("should generate multiple strings", async () => {
            const result = await execute("utilities.random-string", "", { length: 10, count: 5 });
            const lines = result.split("\n");
            expect(lines.length).toBe(5);
        });

        it("should generate URL-safe strings", async () => {
            const result = await execute("utilities.random-string", "", { length: 32, charset: "url-safe" });
            expect(result).toMatch(/^[a-zA-Z0-9_-]+$/);
        });
    });

    describe("utilities.lorem-ipsum", () => {
        it("should generate paragraphs", async () => {
            const result = await execute("utilities.lorem-ipsum", "", { type: "paragraphs", count: 2 });
            const paragraphs = result.split("\n\n");
            expect(paragraphs.length).toBe(2);
        });

        it("should generate sentences", async () => {
            const result = await execute("utilities.lorem-ipsum", "", { type: "sentences", count: 3 });
            // Sentences should end with period
            expect(result).toMatch(/\.$/);
        });

        it("should generate words", async () => {
            const result = await execute("utilities.lorem-ipsum", "", { type: "words", count: 10 });
            const words = result.split(" ");
            expect(words.length).toBe(10);
        });

        it("should generate valid words", async () => {
            const result = await execute("utilities.lorem-ipsum", "", { type: "words", count: 5 });
            // Just check that we got 5 words (content is random)
            const words = result.split(" ");
            expect(words.length).toBe(5);
            // Check words only contain letters
            words.forEach(word => {
                expect(word).toMatch(/^[a-z]+$/);
            });
        });
    });

    describe("utilities.sequence", () => {
        it("should generate number sequence", async () => {
            const result = await execute("utilities.sequence", "", {
                type: "numbers",
                start: 1,
                end: 5,
                separator: "newline"
            });
            expect(result).toBe("1\n2\n3\n4\n5");
        });

        it("should generate letter sequence (lowercase)", async () => {
            const result = await execute("utilities.sequence", "", {
                type: "letters-lower",
                start: 1,
                end: 5,
                separator: "comma"
            });
            expect(result).toBe("a, b, c, d, e");
        });

        it("should generate letter sequence (uppercase)", async () => {
            const result = await execute("utilities.sequence", "", {
                type: "letters-upper",
                start: 1,
                end: 3,
                separator: "space"
            });
            expect(result).toBe("A B C");
        });

        it("should generate roman numerals", async () => {
            const result = await execute("utilities.sequence", "", {
                type: "roman",
                start: 1,
                end: 5,
                separator: "comma"
            });
            expect(result).toBe("I, II, III, IV, V");
        });

        it("should respect step parameter", async () => {
            const result = await execute("utilities.sequence", "", {
                type: "numbers",
                start: 0,
                end: 10,
                step: 2,
                separator: "comma"
            });
            expect(result).toBe("0, 2, 4, 6, 8, 10");
        });

        it("should handle tab separator", async () => {
            const result = await execute("utilities.sequence", "", {
                type: "numbers",
                start: 1,
                end: 3,
                separator: "tab"
            });
            expect(result).toBe("1\t2\t3");
        });
    });
});
