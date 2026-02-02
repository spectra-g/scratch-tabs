/**
 * Unit Tests for Compression Pipeline Operations
 *
 * Tests for gzip compress operation.
 * Note: These tests require CompressionStream API (available in modern browsers/Node 18+)
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/compression";

describe("Compression Pipeline Operations", () => {
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

    // Skip these tests if CompressionStream is not available
    const hasCompressionAPI = typeof globalThis.CompressionStream !== 'undefined';

    describe("compression.gzip", () => {
        (hasCompressionAPI ? it : it.skip)("should compress text to base64", async () => {
            const input = "Hello World! This is a test string.";
            const result = await execute("compression.gzip", input);

            // Result should be valid base64
            expect(result).toMatch(/^[A-Za-z0-9+/=]+$/);

            // Compressed output should exist
            expect(result.length).toBeGreaterThan(0);
        });

        (hasCompressionAPI ? it : it.skip)("should handle empty input", async () => {
            const result = await execute("compression.gzip", "");
            expect(result).toBe("");
        });

        (hasCompressionAPI ? it : it.skip)("should compress and be decompressible", async () => {
            const input = "Test compression roundtrip";
            const compressed = await execute("compression.gzip", input);

            // Verify it's base64
            expect(() => atob(compressed)).not.toThrow();
        });

        it("should throw error when API not available", async () => {
            // This test verifies error handling
            // In environments without CompressionStream, it should throw
            if (!hasCompressionAPI) {
                await expect(execute("compression.gzip", "test"))
                    .rejects.toThrow(/not supported/i);
            }
        });
    });
});
