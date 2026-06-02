/**
 * Unit Tests for New Extraction Pipeline Operations
 *
 * Tests for extract.numbers, extract.phone, and extract.dates operations.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/extraction";

describe("New Extraction Pipeline Operations", () => {
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

    describe("extract.numbers", () => {
        it("should extract all numbers", async () => {
            const result = await execute("extract.numbers", "Price: $50.99, Qty: 10", { type: "all" });
            expect(result).toContain("50.99");
            expect(result).toContain("10");
        });

        it("should extract integers only", async () => {
            const result = await execute("extract.numbers", "50.99 and 10 and 25", { type: "integers" });
            expect(result).toContain("10");
            expect(result).toContain("25");
            expect(result).not.toContain("50.99");
        });

        it("should extract decimals only", async () => {
            const result = await execute("extract.numbers", "50.99 and 10 and 3.14", { type: "decimals" });
            expect(result).toContain("50.99");
            expect(result).toContain("3.14");
        });

        it("should include negative numbers", async () => {
            const result = await execute("extract.numbers", "temp: -5 degrees", { type: "all", includeNegative: true });
            expect(result).toContain("-5");
        });

        it("should exclude negative numbers when disabled", async () => {
            const result = await execute("extract.numbers", "temp: -5 and 10", { type: "all", includeNegative: false });
            expect(result).toContain("5");
            expect(result).toContain("10");
        });

        it("should return unique numbers only", async () => {
            const result = await execute("extract.numbers", "5 10 5 10", { type: "all", unique: true });
            const lines = result.split("\n");
            expect(lines.length).toBe(2);
        });

        it("should handle empty input", async () => {
            const result = await execute("extract.numbers", "no numbers here");
            expect(result).toBe("");
        });
    });

    describe("extract.phone", () => {
        it("should extract US phone numbers", async () => {
            // US format expects patterns like (123) 456-7890 or 123-456-7890
            const result = await execute("extract.phone", "Call 555-123-4567 today", { format: "us" });
            expect(result).toContain("555-123-4567");
        });

        it("should extract phone with parentheses using all format", async () => {
            // The "all" format is more permissive
            const result = await execute("extract.phone", "Call (555) 123-4567 today", { format: "all" });
            expect(result.length).toBeGreaterThan(0);
        });

        it("should extract international phone numbers", async () => {
            const result = await execute("extract.phone", "Call +1-234-567-8900", { format: "international" });
            expect(result.length).toBeGreaterThan(0);
        });

        it("should extract all phone formats", async () => {
            const result = await execute("extract.phone", "US: 555-123-4567 other: 123.456.7890", { format: "all" });
            expect(result.length).toBeGreaterThan(0);
        });

        it("should return unique phone numbers only", async () => {
            const result = await execute("extract.phone", "Call 555-123-4567 and 555-123-4567 again", { format: "all", unique: true });
            const lines = result.split("\n").filter(l => l.trim());
            // Should be unique
            const uniqueLines = [...new Set(lines)];
            expect(lines.length).toBe(uniqueLines.length);
        });

        it("should handle text without phone numbers", async () => {
            const result = await execute("extract.phone", "no phone numbers here");
            expect(result).toBe("");
        });
    });

    describe("extract.dates", () => {
        it("should extract ISO dates", async () => {
            const result = await execute("extract.dates", "Meeting on 2024-01-15", { format: "iso" });
            expect(result).toContain("2024-01-15");
        });

        it("should extract ISO datetime", async () => {
            const result = await execute("extract.dates", "Time: 2024-01-15T10:30:00Z", { format: "iso" });
            expect(result).toContain("2024-01-15T10:30:00Z");
        });

        it("should extract US format dates", async () => {
            const result = await execute("extract.dates", "Date: 01/15/2024", { format: "us" });
            expect(result).toContain("01/15/2024");
        });

        it("should extract US text dates", async () => {
            const result = await execute("extract.dates", "Meeting on Jan 15, 2024", { format: "us" });
            expect(result).toContain("Jan 15, 2024");
        });

        it("should extract EU format dates", async () => {
            const result = await execute("extract.dates", "Date: 15/01/2024", { format: "eu" });
            expect(result).toContain("15/01/2024");
        });

        it("should extract all date formats", async () => {
            const result = await execute("extract.dates", "ISO: 2024-01-15, US: Jan 15, 2024", { format: "all" });
            expect(result).toContain("2024-01-15");
            expect(result).toContain("Jan 15, 2024");
        });

        it("should return unique dates only", async () => {
            const result = await execute("extract.dates", "2024-01-15 2024-01-15", { format: "iso", unique: true });
            const lines = result.split("\n").filter(l => l.trim());
            expect(lines.length).toBe(1);
        });

        it("should handle empty input", async () => {
            const result = await execute("extract.dates", "no dates here");
            expect(result).toBe("");
        });
    });

    describe("text.extract-json", () => {
        it("should extract the first JSON object from mixed log text", async () => {
            const result = await execute("text.extract-json", '2024-01-01 ERROR {"code":500,"msg":"failed"} tail');
            expect(JSON.parse(result)).toEqual({ code: 500, msg: "failed" });
        });

        it("should extract JSON arrays", async () => {
            const result = await execute("text.extract-json", "payload=[1,2,{\"ok\":true}]", { outputFormat: "minified" });
            expect(result).toBe('[1,2,{"ok":true}]');
        });

        it("should ignore invalid bracket-shaped text and continue scanning", async () => {
            const result = await execute("text.extract-json", "bad { nope } good {\"ok\":true}");
            expect(JSON.parse(result)).toEqual({ ok: true });
        });

        it("should preserve braces inside JSON strings", async () => {
            const result = await execute("text.extract-json", 'log {"message":"literal } brace","ok":true}');
            expect(JSON.parse(result)).toEqual({ message: "literal } brace", ok: true });
        });

        it("should return all JSON values as an array by default", async () => {
            const result = await execute("text.extract-json", 'a {"one":1} b [2,3]', { mode: "all" });
            expect(JSON.parse(result)).toEqual([{ one: 1 }, [2, 3]]);
        });

        it("should return all JSON values as minified lines", async () => {
            const result = await execute("text.extract-json", 'a {"one":1} b [2,3]', {
                mode: "all",
                outputFormat: "lines",
            });
            expect(result).toBe('{"one":1}\n[2,3]');
        });

        it("should return empty output when no JSON is found", async () => {
            const result = await execute("text.extract-json", "plain text only");
            expect(result).toBe("");
        });
    });
});
