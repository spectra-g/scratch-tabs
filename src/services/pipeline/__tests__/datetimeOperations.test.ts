/**
 * Unit Tests for DateTime Pipeline Operations
 *
 * Tests for datetime.to-unix operation.
 */

import { executeSingleOperation } from "../pipelineExecutor";
// Import the datetime pipelineOperations to register
import "../../../tablets/datetime/pipelineOperations";

describe("DateTime Pipeline Operations", () => {
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

    describe("datetime.to-unix", () => {
        it("should convert ISO date to unix seconds", async () => {
            const result = await execute("datetime.to-unix", "2024-01-15T00:00:00Z", {
                units: "seconds",
                mode: "parse"
            });
            expect(result).toBe("1705276800");
        });

        it("should convert ISO date to unix milliseconds", async () => {
            const result = await execute("datetime.to-unix", "2024-01-15T00:00:00Z", {
                units: "milliseconds",
                mode: "parse"
            });
            expect(result).toBe("1705276800000");
        });

        it("should return current time in seconds with mode=now", async () => {
            const before = Math.floor(Date.now() / 1000);
            const result = await execute("datetime.to-unix", "", {
                units: "seconds",
                mode: "now"
            });
            const after = Math.floor(Date.now() / 1000);
            const timestamp = parseInt(result);
            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });

        it("should return current time in milliseconds with mode=now", async () => {
            const before = Date.now();
            const result = await execute("datetime.to-unix", "", {
                units: "milliseconds",
                mode: "now"
            });
            const after = Date.now();
            const timestamp = parseInt(result);
            expect(timestamp).toBeGreaterThanOrEqual(before);
            expect(timestamp).toBeLessThanOrEqual(after);
        });

        it("should handle date string formats", async () => {
            const result = await execute("datetime.to-unix", "January 15, 2024", {
                units: "seconds",
                mode: "parse"
            });
            expect(parseInt(result)).toBeGreaterThan(0);
        });

        it("should throw error for invalid date", async () => {
            await expect(execute("datetime.to-unix", "not a date", {
                mode: "parse"
            })).rejects.toThrow(/could not parse/i);
        });

        it("should convert milliseconds to seconds when already numeric", async () => {
            // Input looks like milliseconds (13 digits)
            const result = await execute("datetime.to-unix", "1705276800000", {
                units: "seconds",
                mode: "parse"
            });
            expect(result).toBe("1705276800");
        });

        it("should convert seconds to milliseconds when already numeric", async () => {
            // Input looks like seconds (10 digits)
            const result = await execute("datetime.to-unix", "1705276800", {
                units: "milliseconds",
                mode: "parse"
            });
            expect(result).toBe("1705276800000");
        });
    });
});
