import { executeSingleOperation } from "../../pipelineExecutor";
import "../compression";

const hasBrotliSupport = (): boolean => {
    try {
        if (typeof CompressionStream === 'undefined') return false;
        new CompressionStream('br' as CompressionFormat);
        return true;
    } catch {
        return false;
    }
};

describe("Brotli Compression Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    describe("compression.brotli / compression.unbrotli", () => {
        const itIfSupported = hasBrotliSupport() ? it : it.skip;

        itIfSupported("compresses and decompresses round-trip", async () => {
            const input = "Hello, World!";
            const compressed = await execute("compression.brotli", input);
            expect(typeof compressed).toBe("string");
            expect(compressed.length).toBeGreaterThan(0);

            const decompressed = await execute("compression.unbrotli", compressed);
            expect(decompressed).toBe(input);
        });

        itIfSupported("round-trips longer repetitive text", async () => {
            const input = "The quick brown fox jumps over the lazy dog. ".repeat(10);
            const compressed = await execute("compression.brotli", input);
            expect(compressed.length).toBeLessThan(input.length);
            const decompressed = await execute("compression.unbrotli", compressed);
            expect(decompressed).toBe(input);
        });

        itIfSupported("handles empty string", async () => {
            const compressed = await execute("compression.brotli", "");
            expect(compressed).toBe("");
        });

        itIfSupported("unbrotli handles empty string", async () => {
            const result = await execute("compression.unbrotli", "");
            expect(result).toBe("");
        });

        itIfSupported("compressed output is valid base64", async () => {
            const compressed = await execute("compression.brotli", "test data");
            expect(compressed).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });

        itIfSupported("produces different output than gzip for same input", async () => {
            const input = "same input data for both";
            const gzipped = await execute("compression.gzip", input);
            const brotli = await execute("compression.brotli", input);
            expect(brotli).not.toBe(gzipped);
        });

        itIfSupported("respects outputEncoding=latin1 (regression: params was ignored)", async () => {
            // With the bug, outputEncoding was ignored and always returned Base64
            const input = "hello";
            const base64Out = await execute("compression.brotli", input, { outputEncoding: "base64" });
            const latin1Out = await execute("compression.brotli", input, { outputEncoding: "latin1" });
            // Base64 output should not equal latin1 output
            expect(base64Out).not.toBe(latin1Out);
            // Base64 output should be valid base64
            expect(base64Out).toMatch(/^[A-Za-z0-9+/]+=*$/);
            // Latin1 output should contain non-base64 characters (raw binary)
            // and should decompress correctly when fed back as latin1
            const decompressed = await execute("compression.unbrotli", latin1Out, { inputEncoding: "latin1" });
            expect(decompressed).toBe(input);
        });
    });
});
