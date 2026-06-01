import { executeSingleOperation } from "../../pipelineExecutor";
import "../encoding";

describe("Base62 Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── encoding.base62-encode ────────────────────────────────────────────────

    describe("encoding.base62-encode", () => {
        it("encodes empty string to empty string", async () => {
            expect(await execute("encoding.base62-encode", "")).toBe("");
        });

        it("encodes 'A' (0x41=65) to '13'", async () => {
            // 65 = 1*62 + 3  →  alphabet[1]='1', alphabet[3]='3'
            expect(await execute("encoding.base62-encode", "A")).toBe("13");
        });

        it("encodes 'B' (0x42=66) to '14'", async () => {
            // 66 = 1*62 + 4
            expect(await execute("encoding.base62-encode", "B")).toBe("14");
        });

        it("output uses only base62 alphabet characters [0-9A-Za-z]", async () => {
            const result = await execute("encoding.base62-encode", "Hello World");
            expect(result).toMatch(/^[0-9A-Za-z]+$/);
        });

        it("encodes a null byte to '0' (leading-zero sentinel)", async () => {
            expect(await execute("encoding.base62-encode", "\x00")).toBe("0");
        });

        it("encodes two leading null bytes to '00'", async () => {
            expect(await execute("encoding.base62-encode", "\x00\x00")).toBe("00");
        });

        it("encodes null byte followed by non-null correctly", async () => {
            const encoded = await execute("encoding.base62-encode", "\x00A");
            expect(encoded).toMatch(/^0/); // starts with leading-zero sentinel
            expect(encoded).toMatch(/^[0-9A-Za-z]+$/);
        });

        it("longer input produces only base62 characters", async () => {
            const input = "The quick brown fox jumps over the lazy dog";
            const result = await execute("encoding.base62-encode", input);
            expect(result).toMatch(/^[0-9A-Za-z]+$/);
        });

        it("same input always produces same output", async () => {
            const a = await execute("encoding.base62-encode", "consistent");
            const b = await execute("encoding.base62-encode", "consistent");
            expect(a).toBe(b);
        });

        it("different inputs produce different outputs", async () => {
            const a = await execute("encoding.base62-encode", "hello");
            const b = await execute("encoding.base62-encode", "world");
            expect(a).not.toBe(b);
        });
    });

    // ── encoding.base62-decode ────────────────────────────────────────────────

    describe("encoding.base62-decode", () => {
        it("decodes empty string to empty string", async () => {
            expect(await execute("encoding.base62-decode", "")).toBe("");
        });

        it("decodes '13' to 'A'", async () => {
            expect(await execute("encoding.base62-decode", "13")).toBe("A");
        });

        it("decodes '14' to 'B'", async () => {
            expect(await execute("encoding.base62-decode", "14")).toBe("B");
        });

        it("decodes '0' to null byte", async () => {
            expect(await execute("encoding.base62-decode", "0")).toBe("\x00");
        });

        it("decodes '00' to two null bytes", async () => {
            expect(await execute("encoding.base62-decode", "00")).toBe("\x00\x00");
        });

        it("strips surrounding whitespace before decoding", async () => {
            expect(await execute("encoding.base62-decode", "  13  ")).toBe("A");
        });

        it("strips internal whitespace before decoding", async () => {
            // whitespace in the middle should be stripped
            expect(await execute("encoding.base62-decode", "1\t3")).toBe("A");
        });

        it("throws on invalid character $", async () => {
            await expect(execute("encoding.base62-decode", "$invalid"))
                .rejects.toThrow(/Invalid Base62/);
        });

        it("throws on invalid character !", async () => {
            await expect(execute("encoding.base62-decode", "!"))
                .rejects.toThrow(/Invalid Base62/);
        });
    });

    // ── Round-trip tests ──────────────────────────────────────────────────────

    describe("encode → decode round-trips", () => {
        const roundTrip = async (input: string) => {
            const encoded = await execute("encoding.base62-encode", input);
            return execute("encoding.base62-decode", encoded);
        };

        it("round-trips single ASCII character", async () => {
            expect(await roundTrip("A")).toBe("A");
        });

        it("round-trips 'Hello World'", async () => {
            expect(await roundTrip("Hello World")).toBe("Hello World");
        });

        it("round-trips a longer sentence", async () => {
            const input = "The quick brown fox jumps over the lazy dog";
            expect(await roundTrip(input)).toBe(input);
        });

        it("round-trips text with symbols and punctuation", async () => {
            const input = "pipeline: test@example.com #42!";
            expect(await roundTrip(input)).toBe(input);
        });

        it("round-trips text with leading null bytes", async () => {
            const input = "\x00\x00Hello";
            expect(await roundTrip(input)).toBe(input);
        });

        it("round-trips text with numbers and mixed case", async () => {
            const input = "abc123XYZ!@#";
            expect(await roundTrip(input)).toBe(input);
        });

        it("round-trips a URL", async () => {
            const input = "https://example.com/path?query=value&other=123";
            expect(await roundTrip(input)).toBe(input);
        });
    });
});
