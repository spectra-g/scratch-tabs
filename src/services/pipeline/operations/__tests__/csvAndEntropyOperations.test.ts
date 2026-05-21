import { executeSingleOperation } from "../../pipelineExecutor";
import "../dataFormats";
import "../coreOperations";

describe("CSV Filter / Sort / Transpose and Shannon Entropy Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    const CSV = `name,age,city
Alice,30,New York
Bob,25,London
Charlie,35,Paris
Diana,25,Berlin`;

    // ── csv.filter-rows ──────────────────────────────────────────────────────

    describe("csv.filter-rows", () => {
        it("filters rows by contains (case-insensitive by default)", async () => {
            const result = await execute("csv.filter-rows", CSV, { column: "name", operator: "contains", value: "ali" });
            const lines = result.split("\n");
            expect(lines[0]).toBe("name,age,city");
            expect(lines.some((l) => l.startsWith("Alice"))).toBe(true);
            expect(lines.some((l) => l.startsWith("Bob"))).toBe(false);
        });

        it("filters rows by exact equals", async () => {
            const result = await execute("csv.filter-rows", CSV, { column: "city", operator: "equals", value: "London" });
            const lines = result.split("\n").filter((l) => l.trim());
            expect(lines.length).toBe(2); // header + Bob
            expect(lines[1]).toContain("Bob");
        });

        it("filters rows by not-equals", async () => {
            const result = await execute("csv.filter-rows", CSV, { column: "city", operator: "not-equals", value: "London" });
            const lines = result.split("\n").filter((l) => l.trim());
            expect(lines.some((l) => l.startsWith("Bob"))).toBe(false);
            expect(lines.some((l) => l.startsWith("Alice"))).toBe(true);
        });

        it("filters rows by regex", async () => {
            const result = await execute("csv.filter-rows", CSV, { column: "name", operator: "regex", value: "^[AB]" });
            const lines = result.split("\n").filter((l) => l.trim());
            expect(lines.some((l) => l.startsWith("Alice"))).toBe(true);
            expect(lines.some((l) => l.startsWith("Bob"))).toBe(true);
            expect(lines.some((l) => l.startsWith("Charlie"))).toBe(false);
        });

        it("filters rows by numeric greater-than", async () => {
            const result = await execute("csv.filter-rows", CSV, { column: "age", operator: "gt", value: "29" });
            const lines = result.split("\n").filter((l) => l.trim());
            expect(lines.some((l) => l.startsWith("Alice"))).toBe(true);
            expect(lines.some((l) => l.startsWith("Charlie"))).toBe(true);
            expect(lines.some((l) => l.startsWith("Bob"))).toBe(false);
        });

        it("filters rows by numeric less-than", async () => {
            const result = await execute("csv.filter-rows", CSV, { column: "age", operator: "lt", value: "30" });
            const lines = result.split("\n").filter((l) => l.trim());
            // Bob (25) and Diana (25) pass
            expect(lines.some((l) => l.startsWith("Bob"))).toBe(true);
            expect(lines.some((l) => l.startsWith("Diana"))).toBe(true);
            expect(lines.some((l) => l.startsWith("Alice"))).toBe(false);
        });

        it("preserves header row", async () => {
            const result = await execute("csv.filter-rows", CSV, { column: "name", operator: "equals", value: "Alice" });
            expect(result.startsWith("name,age,city")).toBe(true);
        });

        it("works with column by index when hasHeaders is false", async () => {
            const noHeader = "Alice,30\nBob,25";
            const result = await execute("csv.filter-rows", noHeader, {
                column: "1",
                operator: "equals",
                value: "30",
                hasHeaders: false,
            });
            expect(result).toContain("Alice");
            expect(result).not.toContain("Bob");
        });

        it("is case-sensitive when requested", async () => {
            const result = await execute("csv.filter-rows", CSV, {
                column: "name",
                operator: "equals",
                value: "alice",
                caseSensitive: true,
            });
            expect(result.trim()).toBe("name,age,city");
        });

        it("throws for unknown header name", async () => {
            await expect(
                execute("csv.filter-rows", CSV, { column: "nonexistent", operator: "equals", value: "x" }),
            ).rejects.toThrow(/not found/);
        });
    });

    // ── csv.sort ─────────────────────────────────────────────────────────────

    describe("csv.sort", () => {
        it("sorts by string column ascending", async () => {
            const result = await execute("csv.sort", CSV, { column: "name", order: "asc" });
            const lines = result.split("\n").filter((l) => l.trim()).slice(1);
            const names = lines.map((l) => l.split(",")[0]);
            expect(names).toEqual(["Alice", "Bob", "Charlie", "Diana"]);
        });

        it("sorts by string column descending", async () => {
            const result = await execute("csv.sort", CSV, { column: "name", order: "desc" });
            const lines = result.split("\n").filter((l) => l.trim()).slice(1);
            const names = lines.map((l) => l.split(",")[0]);
            expect(names).toEqual(["Diana", "Charlie", "Bob", "Alice"]);
        });

        it("sorts by numeric column ascending", async () => {
            const result = await execute("csv.sort", CSV, { column: "age", order: "asc", type: "number" });
            const lines = result.split("\n").filter((l) => l.trim()).slice(1);
            const ages = lines.map((l) => parseInt(l.split(",")[1]));
            expect(ages[0]).toBe(25);
            expect(ages[ages.length - 1]).toBe(35);
        });

        it("sorts by numeric column descending", async () => {
            const result = await execute("csv.sort", CSV, { column: "age", order: "desc", type: "number" });
            const lines = result.split("\n").filter((l) => l.trim()).slice(1);
            const ages = lines.map((l) => parseInt(l.split(",")[1]));
            expect(ages[0]).toBe(35);
            expect(ages[ages.length - 1]).toBe(25);
        });

        it("preserves header row at top", async () => {
            const result = await execute("csv.sort", CSV, { column: "name", order: "asc" });
            expect(result.startsWith("name,age,city")).toBe(true);
        });

        it("sorts by column index when hasHeaders is false", async () => {
            const noHeader = "Charlie,35\nAlice,30\nBob,25";
            const result = await execute("csv.sort", noHeader, {
                column: "0",
                order: "asc",
                hasHeaders: false,
            });
            const lines = result.split("\n");
            expect(lines[0]).toContain("Alice");
        });

        it("auto-detects numeric sort for numeric column", async () => {
            const result = await execute("csv.sort", CSV, { column: "age", order: "asc", type: "auto" });
            const lines = result.split("\n").filter((l) => l.trim()).slice(1);
            const ages = lines.map((l) => parseInt(l.split(",")[1]));
            expect(ages[0]).toBe(25);
            expect(ages[ages.length - 1]).toBe(35);
        });
    });

    // ── csv.transpose ────────────────────────────────────────────────────────

    describe("csv.transpose", () => {
        const SIMPLE = "a,b,c\n1,2,3\n4,5,6";

        it("transposes rows and columns", async () => {
            const result = await execute("csv.transpose", SIMPLE);
            const lines = result.split("\n");
            expect(lines[0]).toBe("a,1,4");
            expect(lines[1]).toBe("b,2,5");
            expect(lines[2]).toBe("c,3,6");
        });

        it("double transpose returns original", async () => {
            const once = await execute("csv.transpose", SIMPLE);
            const twice = await execute("csv.transpose", once);
            expect(twice).toBe(SIMPLE);
        });

        it("handles single row", async () => {
            const result = await execute("csv.transpose", "a,b,c");
            const lines = result.split("\n");
            expect(lines).toEqual(["a", "b", "c"]);
        });

        it("handles single column", async () => {
            const result = await execute("csv.transpose", "a\n1\n2");
            expect(result).toBe("a,1,2");
        });

        it("handles unequal row lengths (pads with empty)", async () => {
            const result = await execute("csv.transpose", "a,b\n1");
            const lines = result.split("\n");
            expect(lines[0]).toBe("a,1");
            expect(lines[1]).toBe("b,");
        });

        it("uses tab delimiter when specified", async () => {
            const tsv = "a\tb\tc\n1\t2\t3";
            const result = await execute("csv.transpose", tsv, { delimiter: "\t" });
            const lines = result.split("\n");
            expect(lines[0]).toBe("a\t1");
        });
    });

    // ── text.entropy ─────────────────────────────────────────────────────────

    describe("text.entropy", () => {
        it("returns 0 for empty input (value mode)", async () => {
            expect(await execute("text.entropy", "", { format: "value" })).toBe("0");
        });

        it("returns 0 for single repeated character", async () => {
            const result = await execute("text.entropy", "aaaa", { format: "value" });
            expect(parseFloat(result)).toBeCloseTo(0, 4);
        });

        it("returns 1.0 for two equally probable characters", async () => {
            const result = await execute("text.entropy", "abababab", { format: "value" });
            expect(parseFloat(result)).toBeCloseTo(1.0, 4);
        });

        it("returns 2.0 for four equally probable characters", async () => {
            const result = await execute("text.entropy", "abcdabcdabcd", { format: "value" });
            expect(parseFloat(result)).toBeCloseTo(2.0, 4);
        });

        it("returns a full report by default", async () => {
            const result = await execute("text.entropy", "Hello World");
            expect(result).toContain("Entropy:");
            expect(result).toContain("Length:");
            expect(result).toContain("Unique characters:");
        });

        it("full report includes correct length", async () => {
            const result = await execute("text.entropy", "Hello");
            expect(result).toContain("Length: 5 characters");
        });

        it("full report includes correct unique character count", async () => {
            const result = await execute("text.entropy", "aabb");
            expect(result).toContain("Unique characters: 2");
        });

        it("value mode returns a numeric string", async () => {
            const result = await execute("text.entropy", "Hello World", { format: "value" });
            expect(parseFloat(result)).toBeGreaterThan(0);
            expect(result).toMatch(/^\d+\.\d+$/);
        });

        it("high entropy text scores higher than repetitive text", async () => {
            const low = parseFloat(await execute("text.entropy", "aaaaaaa", { format: "value" }));
            const high = parseFloat(await execute("text.entropy", "abcdefg", { format: "value" }));
            expect(high).toBeGreaterThan(low);
        });
    });
});
