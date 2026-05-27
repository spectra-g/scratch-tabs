import { executeSingleOperation } from "../pipelineExecutor";
import "../../../tablets/datetime/pipelineOperations";

describe("datetime.diff Pipeline Operation", () => {
    const execute = async (
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation("datetime.diff", input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    it("computes positive day difference", async () => {
        const result = await execute("2026-01-11T00:00:00Z", {
            other: "2026-01-01T00:00:00Z",
            unit: "days",
        });
        expect(result).toBe("10 days");
    });

    it("computes negative day difference", async () => {
        const result = await execute("2026-01-01T00:00:00Z", {
            other: "2026-01-11T00:00:00Z",
            unit: "days",
        });
        expect(result).toBe("-10 days");
    });

    it("returns absolute value when absolute=true", async () => {
        const result = await execute("2026-01-01T00:00:00Z", {
            other: "2026-01-11T00:00:00Z",
            unit: "days",
            absolute: true,
        });
        expect(result).toBe("10 days");
    });

    it("computes hour difference", async () => {
        const result = await execute("2026-01-01T06:00:00Z", {
            other: "2026-01-01T00:00:00Z",
            unit: "hours",
        });
        expect(result).toBe("6 hours");
    });

    it("computes second difference", async () => {
        const result = await execute("2026-01-01T00:01:30Z", {
            other: "2026-01-01T00:00:00Z",
            unit: "seconds",
        });
        expect(result).toBe("90 seconds");
    });

    it("computes minute difference", async () => {
        const result = await execute("2026-01-01T01:00:00Z", {
            other: "2026-01-01T00:00:00Z",
            unit: "minutes",
        });
        expect(result).toBe("60 minutes");
    });

    it("computes week difference", async () => {
        const result = await execute("2026-01-15T00:00:00Z", {
            other: "2026-01-01T00:00:00Z",
            unit: "weeks",
        });
        expect(result).toBe("2 weeks");
    });

    it("computes month difference", async () => {
        const result = await execute("2026-04-01T00:00:00Z", {
            other: "2026-01-01T00:00:00Z",
            unit: "months",
        });
        expect(result).toBe("3 months");
    });

    it("computes year difference", async () => {
        const result = await execute("2028-01-01T00:00:00Z", {
            other: "2026-01-01T00:00:00Z",
            unit: "years",
        });
        expect(result).toBe("2 years");
    });

    it("throws on unparseable input date", async () => {
        const result = await executeSingleOperation("datetime.diff", "not-a-date", {
            other: "2026-01-01T00:00:00Z",
        });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/parse/i);
    });

    it("throws on unparseable comparison date", async () => {
        const result = await executeSingleOperation("datetime.diff", "2026-01-01T00:00:00Z", {
            other: "not-a-date",
        });
        expect(result.success).toBe(false);
    });
});
