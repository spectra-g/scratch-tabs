import { executeSingleOperation } from "../../pipelineExecutor";
import "../network";
import "../dataFormats";
import "../utilities";

describe("CIDR Expand, CSV Dedupe, and Datetime Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── network.cidr-expand ─────────────────────────────────────────────────

    describe("network.cidr-expand", () => {
        it("expands /30 to 4 addresses including network and broadcast", async () => {
            const result = await execute("network.cidr-expand", "192.168.1.0/30");
            const ips = result.split('\n');
            expect(ips).toHaveLength(4);
            expect(ips[0]).toBe("192.168.1.0");
            expect(ips[3]).toBe("192.168.1.3");
        });

        it("excludes network and broadcast when flags are false", async () => {
            const result = await execute("network.cidr-expand", "192.168.1.0/30", {
                includeNetwork: false,
                includeBroadcast: false,
            });
            const ips = result.split('\n');
            expect(ips).toHaveLength(2);
            expect(ips[0]).toBe("192.168.1.1");
            expect(ips[1]).toBe("192.168.1.2");
        });

        it("expands /32 to a single host", async () => {
            const result = await execute("network.cidr-expand", "10.0.0.1/32");
            expect(result).toBe("10.0.0.1");
        });

        it("expands /24 to 256 addresses", async () => {
            const result = await execute("network.cidr-expand", "192.168.1.0/24");
            const ips = result.split('\n');
            expect(ips).toHaveLength(256);
            expect(ips[0]).toBe("192.168.1.0");
            expect(ips[255]).toBe("192.168.1.255");
        });

        it("always starts from network address regardless of host bits", async () => {
            const result = await execute("network.cidr-expand", "192.168.1.5/30");
            const ips = result.split('\n');
            expect(ips[0]).toBe("192.168.1.4");
            expect(ips[3]).toBe("192.168.1.7");
        });

        it("throws for ranges larger than 65536", async () => {
            await expect(execute("network.cidr-expand", "10.0.0.0/15"))
                .rejects.toThrow(/65,536/);
        });

        it("throws for invalid CIDR notation", async () => {
            await expect(execute("network.cidr-expand", "192.168.1.0"))
                .rejects.toThrow(/CIDR notation/);
        });

        it("throws for invalid prefix length", async () => {
            await expect(execute("network.cidr-expand", "192.168.1.0/33"))
                .rejects.toThrow(/prefix/);
        });

        it("returns empty for empty input", async () => {
            const result = await execute("network.cidr-expand", "");
            expect(result).toBe("");
        });

        it("handles 0.0.0.0/31 edge case", async () => {
            const result = await execute("network.cidr-expand", "0.0.0.0/31");
            const ips = result.split('\n');
            expect(ips).toHaveLength(2);
            expect(ips[0]).toBe("0.0.0.0");
            expect(ips[1]).toBe("0.0.0.1");
        });
    });

    // ── csv.dedupe ──────────────────────────────────────────────────────────

    describe("csv.dedupe", () => {
        const CSV_WITH_HEADERS = "name,email\nAlice,alice@example.com\nBob,bob@example.com\nAlice,alice@example.com";

        it("removes duplicate rows across all columns", async () => {
            const result = await execute("csv.dedupe", CSV_WITH_HEADERS);
            const lines = result.split('\n');
            expect(lines).toHaveLength(3); // header + 2 unique rows
            expect(lines[0]).toBe("name,email");
            expect(lines[1]).toBe("Alice,alice@example.com");
            expect(lines[2]).toBe("Bob,bob@example.com");
        });

        it("preserves first occurrence and removes subsequent duplicates", async () => {
            const input = "id\n1\n2\n1\n3\n2";
            const result = await execute("csv.dedupe", input);
            expect(result).toBe("id\n1\n2\n3");
        });

        it("dedupes by specific column name", async () => {
            const result = await execute("csv.dedupe", CSV_WITH_HEADERS, { column: "name" });
            const lines = result.split('\n');
            expect(lines).toHaveLength(3); // header + Alice + Bob
        });

        it("dedupes by column index", async () => {
            const result = await execute("csv.dedupe", CSV_WITH_HEADERS, { column: "0" });
            const lines = result.split('\n');
            expect(lines).toHaveLength(3);
        });

        it("handles data without headers", async () => {
            const input = "Alice\nBob\nAlice\nCharlie";
            const result = await execute("csv.dedupe", input, { hasHeaders: false });
            expect(result).toBe("Alice\nBob\nCharlie");
        });

        it("is case-sensitive by default", async () => {
            const input = "name\nalice\nAlice\nBOB";
            const result = await execute("csv.dedupe", input);
            const lines = result.split('\n');
            expect(lines).toHaveLength(4); // all 3 values treated as distinct
        });

        it("is case-insensitive when configured", async () => {
            const input = "name\nalice\nAlice\nBOB\nbob";
            const result = await execute("csv.dedupe", input, { caseSensitive: false });
            const lines = result.split('\n');
            expect(lines).toHaveLength(3); // header + alice + BOB (first occurrences)
        });

        it("returns empty for empty input", async () => {
            const result = await execute("csv.dedupe", "");
            expect(result).toBe("");
        });

        it("returns unchanged CSV when no duplicates exist", async () => {
            const input = "a,b\n1,2\n3,4";
            const result = await execute("csv.dedupe", input);
            expect(result).toBe(input);
        });

        it("throws for unknown column name", async () => {
            await expect(execute("csv.dedupe", CSV_WITH_HEADERS, { column: "nonexistent" }))
                .rejects.toThrow(/nonexistent/);
        });
    });

    // ── datetime.add / datetime.subtract ────────────────────────────────────

    describe("datetime.add", () => {
        it("adds days to an ISO date", async () => {
            const result = await execute("datetime.add", "2024-01-01T00:00:00.000Z", {
                amount: 5,
                unit: "days",
                outputFormat: "date",
            });
            expect(result).toBe("2024-01-06");
        });

        it("adds months to a date", async () => {
            const result = await execute("datetime.add", "2024-01-31T00:00:00.000Z", {
                amount: 1,
                unit: "months",
                outputFormat: "date",
            });
            // date-fns add month from Jan 31 → Feb 29 (2024 is a leap year)
            expect(result).toBe("2024-02-29");
        });

        it("adds hours", async () => {
            const result = await execute("datetime.add", "2024-06-01T10:00:00.000Z", {
                amount: 3,
                unit: "hours",
                outputFormat: "iso",
            });
            expect(result).toContain("13:00:00");
        });

        it("adds weeks", async () => {
            const result = await execute("datetime.add", "2024-01-01T00:00:00.000Z", {
                amount: 2,
                unit: "weeks",
                outputFormat: "date",
            });
            expect(result).toBe("2024-01-15");
        });

        it("adds years", async () => {
            const result = await execute("datetime.add", "2024-03-15T00:00:00.000Z", {
                amount: 1,
                unit: "years",
                outputFormat: "date",
            });
            expect(result).toBe("2025-03-15");
        });

        it("outputs unix timestamp in ms", async () => {
            const result = await execute("datetime.add", "2024-01-01T00:00:00.000Z", {
                amount: 0,
                unit: "days",
                outputFormat: "unix-ms",
            });
            expect(result).toBe(String(new Date("2024-01-01T00:00:00.000Z").getTime()));
        });

        it("outputs unix timestamp in seconds", async () => {
            const result = await execute("datetime.add", "2024-01-01T00:00:00.000Z", {
                amount: 0,
                unit: "days",
                outputFormat: "unix-s",
            });
            expect(result).toBe(String(Math.floor(new Date("2024-01-01T00:00:00.000Z").getTime() / 1000)));
        });

        it("accepts 'now' as input", async () => {
            const before = Date.now();
            const result = await execute("datetime.add", "now", { amount: 0, unit: "days", outputFormat: "unix-ms" });
            const after = Date.now();
            const ts = parseInt(result, 10);
            expect(ts).toBeGreaterThanOrEqual(before);
            expect(ts).toBeLessThanOrEqual(after + 1000);
        });

        it("throws for invalid date input", async () => {
            await expect(execute("datetime.add", "not-a-date", { amount: 1, unit: "days" }))
                .rejects.toThrow(/parse date/);
        });

        it("returns empty for empty input", async () => {
            const result = await execute("datetime.add", "");
            expect(result).toBe("");
        });
    });

    describe("datetime.subtract", () => {
        it("subtracts days from an ISO date", async () => {
            const result = await execute("datetime.subtract", "2024-01-10T00:00:00.000Z", {
                amount: 5,
                unit: "days",
                outputFormat: "date",
            });
            expect(result).toBe("2024-01-05");
        });

        it("subtracts months from a date", async () => {
            const result = await execute("datetime.subtract", "2024-03-31T00:00:00.000Z", {
                amount: 1,
                unit: "months",
                outputFormat: "date",
            });
            // date-fns sub 1 month from Mar 31 → Feb 29 (2024 is leap year)
            expect(result).toBe("2024-02-29");
        });

        it("subtracts hours", async () => {
            const result = await execute("datetime.subtract", "2024-06-01T10:00:00.000Z", {
                amount: 3,
                unit: "hours",
                outputFormat: "iso",
            });
            expect(result).toContain("07:00:00");
        });

        it("subtracts years", async () => {
            const result = await execute("datetime.subtract", "2024-06-15T00:00:00.000Z", {
                amount: 4,
                unit: "years",
                outputFormat: "date",
            });
            expect(result).toBe("2020-06-15");
        });

        it("add then subtract is identity", async () => {
            const input = "2024-06-15T12:30:00.000Z";
            const added = await execute("datetime.add", input, { amount: 7, unit: "days", outputFormat: "iso" });
            const restored = await execute("datetime.subtract", added, { amount: 7, unit: "days", outputFormat: "iso" });
            expect(restored).toBe(input);
        });

        it("returns empty for empty input", async () => {
            const result = await execute("datetime.subtract", "");
            expect(result).toBe("");
        });
    });
});
