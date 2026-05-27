import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/coreOperations";

describe("Text Utility Pipeline Operations (slugify, number-format, text.diff)", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // =========================================================
    describe("text.slugify", () => {
        it("converts basic text to hyphen slug", async () => {
            expect(await execute("text.slugify", "Hello World")).toBe("hello-world");
        });

        it("strips punctuation", async () => {
            expect(await execute("text.slugify", "Hello, World!")).toBe("hello-world");
        });

        it("collapses multiple spaces", async () => {
            expect(await execute("text.slugify", "foo   bar")).toBe("foo-bar");
        });

        it("transliterates accented characters", async () => {
            expect(await execute("text.slugify", "Héllo Wörld")).toBe("hello-world");
        });

        it("transliterates æ to ae", async () => {
            expect(await execute("text.slugify", "Ærø")).toBe("aero");
        });

        it("uses underscore separator when configured", async () => {
            expect(
                await execute("text.slugify", "Hello World", { separator: "_" }),
            ).toBe("hello_world");
        });

        it("trims leading and trailing separators", async () => {
            expect(await execute("text.slugify", "!Hello World!")).toBe("hello-world");
        });

        it("handles empty input", async () => {
            expect(await execute("text.slugify", "")).toBe("");
        });

        it("handles all-punctuation input", async () => {
            expect(await execute("text.slugify", "!@#$%")).toBe("");
        });
    });

    // =========================================================
    describe("text.number-format", () => {
        it("formats a number with default en-US locale and 2 decimal places", async () => {
            expect(await execute("text.number-format", "1234567.89")).toBe("1,234,567.89");
        });

        it("formats an integer with 0 decimal places", async () => {
            expect(
                await execute("text.number-format", "1000", { decimals: 0 }),
            ).toBe("1,000");
        });

        it("formats as currency (USD)", async () => {
            const result = await execute("text.number-format", "1234.5", {
                style: "currency",
                currency: "USD",
            });
            expect(result).toContain("1,234.50");
        });

        it("formats as percent", async () => {
            const result = await execute("text.number-format", "0.75", {
                style: "percent",
                decimals: 0,
            });
            expect(result).toContain("75");
            expect(result).toContain("%");
        });

        it("strips commas from input before parsing", async () => {
            expect(await execute("text.number-format", "1,234.56")).toBe("1,234.56");
        });

        it("throws on non-numeric input", async () => {
            const result = await executeSingleOperation("text.number-format", "abc", {});
            expect(result.success).toBe(false);
        });

        it("handles negative numbers", async () => {
            const result = await execute("text.number-format", "-9876.54");
            expect(result).toContain("-");
            expect(result).toContain("9,876.54");
        });
    });

    // =========================================================
    describe("text.diff", () => {
        it("returns (no differences) when inputs are identical", async () => {
            expect(
                await execute("text.diff", "hello\nworld", { modified: "hello\nworld" }),
            ).toBe("(no differences)");
        });

        it("shows a single changed line", async () => {
            const result = await execute("text.diff", "a\nb\nc", {
                modified: "a\nb2\nc",
                context: 0,
            });
            expect(result).toContain("-b");
            expect(result).toContain("+b2");
        });

        it("includes context lines around changes", async () => {
            const result = await execute("text.diff", "a\nb\nc", {
                modified: "a\nb2\nc",
                context: 1,
            });
            expect(result).toContain(" a");
            expect(result).toContain(" c");
        });

        it("produces unified diff header lines", async () => {
            const result = await execute("text.diff", "a", { modified: "b" });
            expect(result).toContain("--- a");
            expect(result).toContain("+++ b");
            expect(result).toContain("@@");
        });

        it("handles added lines", async () => {
            const result = await execute("text.diff", "a\nc", {
                modified: "a\nb\nc",
                context: 0,
            });
            expect(result).toContain("+b");
        });

        it("handles removed lines", async () => {
            const result = await execute("text.diff", "a\nb\nc", {
                modified: "a\nc",
                context: 0,
            });
            expect(result).toContain("-b");
        });

        it("handles completely replaced content", async () => {
            const result = await execute("text.diff", "old", { modified: "new" });
            expect(result).toContain("-old");
            expect(result).toContain("+new");
        });

        it("handles empty original", async () => {
            const result = await execute("text.diff", "", { modified: "new line" });
            expect(result).toContain("+new line");
        });

        it("handles empty modified", async () => {
            const result = await execute("text.diff", "old line", { modified: "" });
            expect(result).toContain("-old line");
        });
    });
});
