import { executeSingleOperation } from "../../../services/pipeline/pipelineExecutor";
import "../pipelineOperations";

describe("DateTime Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    describe("datetime.to-unix", () => {
        it("converts ISO date to unix seconds", async () => {
            const result = await execute("datetime.to-unix", "2023-01-01T00:00:00.000Z");
            expect(result).toBe("1672531200");
        });

        it("converts ISO date to unix milliseconds", async () => {
            const result = await execute("datetime.to-unix", "2023-01-01T00:00:00.000Z", {
                units: "milliseconds",
            });
            expect(result).toBe("1672531200000");
        });

        it("returns current time when mode is now", async () => {
            const before = Math.floor(Date.now() / 1000);
            const result = await execute("datetime.to-unix", "", { mode: "now" });
            const after = Math.floor(Date.now() / 1000);
            expect(Number(result)).toBeGreaterThanOrEqual(before);
            expect(Number(result)).toBeLessThanOrEqual(after);
        });

        it("converts millisecond timestamp to seconds", async () => {
            const result = await execute("datetime.to-unix", "1672531200000", { units: "seconds" });
            expect(result).toBe("1672531200");
        });

        it("throws for unparseable input", async () => {
            await expect(execute("datetime.to-unix", "not a date")).rejects.toThrow(/Could not parse date/);
        });
    });

    describe("datetime.from-unix", () => {
        it("converts unix seconds to ISO string", async () => {
            const result = await execute("datetime.from-unix", "1672531200", {
                units: "seconds",
                format: "iso",
            });
            expect(result).toContain("2023-01-01T00:00:00.000Z");
        });

        it("converts unix milliseconds to ISO string", async () => {
            const result = await execute("datetime.from-unix", "1672531200000", {
                units: "milliseconds",
                format: "iso",
            });
            expect(result).toContain("2023-01-01T00:00:00.000Z");
        });

        it("replaces timestamps embedded in text", async () => {
            const result = await execute(
                "datetime.from-unix",
                "Event at 1672531200 ended.",
                { units: "seconds", format: "iso" },
            );
            expect(result).toContain("2023-01-01T00:00:00.000Z");
            expect(result).toContain("Event at");
            expect(result).toContain("ended.");
        });

        it("converts to UTC string format", async () => {
            const result = await execute("datetime.from-unix", "1672531200", {
                units: "seconds",
                format: "utc",
            });
            expect(result).toMatch(/Sun, 01 Jan 2023/);
        });
    });

    describe("datetime.format", () => {
        const ISO_INPUT = "2023-06-15T10:30:00.000Z";

        it("outputs ISO 8601 by default", async () => {
            const result = await execute("datetime.format", ISO_INPUT);
            expect(result).toBe(new Date(ISO_INPUT).toISOString());
        });

        it("outputs date-only for iso-date format", async () => {
            const result = await execute("datetime.format", ISO_INPUT, { outputFormat: "iso-date" });
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });

        it("outputs SQL datetime for sql format", async () => {
            const result = await execute("datetime.format", ISO_INPUT, { outputFormat: "sql" });
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        });

        it("outputs RFC 3339 for rfc3339 format", async () => {
            const result = await execute("datetime.format", ISO_INPUT, { outputFormat: "rfc3339" });
            // RFC 3339: 2023-06-15T10:30:00+00:00
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
        });

        it("outputs HTTP date for http format", async () => {
            const result = await execute("datetime.format", ISO_INPUT, { outputFormat: "http" });
            // RFC 7231: Thu, 15 Jun 2023 10:30:00 GMT
            expect(result).toMatch(/^[A-Za-z]+, \d{2} [A-Za-z]+ \d{4} \d{2}:\d{2}:\d{2} GMT$/);
        });

        it("outputs human-readable date for human format", async () => {
            const result = await execute("datetime.format", "2023-01-01T00:00:00.000Z", {
                outputFormat: "human",
            });
            expect(result).toMatch(/January \d+, 2023/);
        });

        it("outputs full human-readable date for human-full format", async () => {
            const result = await execute("datetime.format", ISO_INPUT, { outputFormat: "human-full" });
            expect(result).toMatch(/\w+, \w+ \d+, \d{4}, \d+:\d{2}:\d{2} (AM|PM)/);
        });

        it("outputs relative time for relative format", async () => {
            const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
            const result = await execute("datetime.format", recent, { outputFormat: "relative" });
            expect(result).toMatch(/hour/);
            expect(result).toMatch(/ago/);
        });

        it("outputs unix seconds for unix-s format", async () => {
            const result = await execute("datetime.format", "2023-01-01T00:00:00.000Z", {
                outputFormat: "unix-s",
            });
            expect(result).toBe("1672531200");
        });

        it("outputs unix milliseconds for unix-ms format", async () => {
            const result = await execute("datetime.format", "2023-01-01T00:00:00.000Z", {
                outputFormat: "unix-ms",
            });
            expect(result).toBe("1672531200000");
        });

        it("applies custom format string", async () => {
            const result = await execute("datetime.format", "2023-01-15T00:00:00.000Z", {
                outputFormat: "custom",
                customFormat: "dd/MM/yyyy",
            });
            expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        });

        it("accepts unix timestamps as input", async () => {
            const result = await execute("datetime.format", "1672531200", { outputFormat: "iso-date" });
            expect(result).toBe("2023-01-01");
        });

        it("accepts SQL datetime strings as input", async () => {
            const result = await execute("datetime.format", "2023-06-15 10:30:00", {
                outputFormat: "iso-date",
            });
            expect(result).toBe("2023-06-15");
        });

        it("accepts natural language 'yesterday'", async () => {
            const result = await execute("datetime.format", "yesterday", { outputFormat: "iso-date" });
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const expected = yesterday.toISOString().slice(0, 10);
            expect(result).toBe(expected);
        });

        it("returns empty string for empty input", async () => {
            const result = await execute("datetime.format", "");
            expect(result).toBe("");
        });

        it("throws for unparseable input", async () => {
            await expect(
                execute("datetime.format", "not a date at all xyz"),
            ).rejects.toThrow(/Could not parse date/);
        });
    });
});
