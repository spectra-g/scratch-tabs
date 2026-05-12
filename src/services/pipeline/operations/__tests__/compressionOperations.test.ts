import { executeSingleOperation } from "../../pipelineExecutor";
import "../compression";

const hasCompressionStream = typeof CompressionStream !== 'undefined';

describe("Compression Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── Raw Deflate ─────────────────────────────────────────────────────────

    describe("compression.deflate / compression.inflate", () => {
        const itIfSupported = hasCompressionStream ? it : it.skip;

        itIfSupported("compresses and decompresses round-trip", async () => {
            const input = "Hello, World!";
            const compressed = await execute("compression.deflate", input);
            expect(typeof compressed).toBe("string");
            expect(compressed.length).toBeGreaterThan(0);

            const decompressed = await execute("compression.inflate", compressed);
            expect(decompressed).toBe(input);
        });

        itIfSupported("round-trips longer text", async () => {
            const input = "The quick brown fox jumps over the lazy dog. ".repeat(10);
            const compressed = await execute("compression.deflate", input);
            // Compression should reduce size for repetitive data
            expect(compressed.length).toBeLessThan(input.length);
            const decompressed = await execute("compression.inflate", compressed);
            expect(decompressed).toBe(input);
        });

        itIfSupported("handles empty string", async () => {
            const compressed = await execute("compression.deflate", "");
            expect(compressed).toBe("");
        });

        itIfSupported("inflate handles empty string", async () => {
            const result = await execute("compression.inflate", "");
            expect(result).toBe("");
        });

        itIfSupported("compressed output is valid base64", async () => {
            const compressed = await execute("compression.deflate", "test data");
            expect(compressed).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });
    });

    // ── Zlib ────────────────────────────────────────────────────────────────

    describe("compression.zlib / compression.unzlib", () => {
        const itIfSupported = hasCompressionStream ? it : it.skip;

        itIfSupported("compresses and decompresses round-trip", async () => {
            const input = "Hello, World!";
            const compressed = await execute("compression.zlib", input);
            expect(typeof compressed).toBe("string");
            expect(compressed.length).toBeGreaterThan(0);

            const decompressed = await execute("compression.unzlib", compressed);
            expect(decompressed).toBe(input);
        });

        itIfSupported("round-trips longer text", async () => {
            const input = "Lorem ipsum dolor sit amet. ".repeat(20);
            const compressed = await execute("compression.zlib", input);
            expect(compressed.length).toBeLessThan(input.length);
            const decompressed = await execute("compression.unzlib", compressed);
            expect(decompressed).toBe(input);
        });

        itIfSupported("handles empty string", async () => {
            const compressed = await execute("compression.zlib", "");
            expect(compressed).toBe("");
        });

        itIfSupported("unzlib handles empty string", async () => {
            const result = await execute("compression.unzlib", "");
            expect(result).toBe("");
        });

        itIfSupported("zlib output differs from raw deflate", async () => {
            const input = "same input data";
            const deflated = await execute("compression.deflate", input);
            const zlibed = await execute("compression.zlib", input);
            // zlib adds a 2-byte header + adler32 checksum, so outputs differ
            expect(zlibed).not.toBe(deflated);
        });

        itIfSupported("compressed output is valid base64", async () => {
            const compressed = await execute("compression.zlib", "test data");
            expect(compressed).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });
    });

    // ── Existing gzip still works ───────────────────────────────────────────

    describe("compression.gzip / compression.gunzip", () => {
        const itIfSupported = hasCompressionStream ? it : it.skip;

        itIfSupported("gzip round-trip still works after new ops added", async () => {
            const input = "gzip test";
            const compressed = await execute("compression.gzip", input);
            const decompressed = await execute("compression.gunzip", compressed);
            expect(decompressed).toBe(input);
        });
    });
});
