import { executeSingleOperation } from "../../pipelineExecutor";
import "../encoding";

describe("Encoding Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── To/From Binary ──────────────────────────────────────────────────────

    describe("encoding.to-binary", () => {
        it("encodes ASCII text with space delimiter", async () => {
            const result = await execute("encoding.to-binary", "AB");
            expect(result).toBe("01000001 01000010");
        });

        it("encodes single character", async () => {
            const result = await execute("encoding.to-binary", "A");
            expect(result).toBe("01000001");
        });

        it("encodes with no delimiter", async () => {
            const result = await execute("encoding.to-binary", "AB", { delimiter: "none" });
            expect(result).toBe("0100000101000010");
        });

        it("encodes with comma delimiter", async () => {
            const result = await execute("encoding.to-binary", "AB", { delimiter: "comma" });
            expect(result).toBe("01000001,01000010");
        });

        it("encodes with newline delimiter", async () => {
            const result = await execute("encoding.to-binary", "AB", { delimiter: "newline" });
            expect(result).toBe("01000001\n01000010");
        });

        it("returns empty string for empty input", async () => {
            const result = await execute("encoding.to-binary", "");
            expect(result).toBe("");
        });
    });

    describe("encoding.from-binary", () => {
        it("decodes space-delimited binary (auto)", async () => {
            const result = await execute("encoding.from-binary", "01000001 01000010");
            expect(result).toBe("AB");
        });

        it("decodes comma-delimited binary (auto)", async () => {
            const result = await execute("encoding.from-binary", "01000001,01000010");
            expect(result).toBe("AB");
        });

        it("decodes no-delimiter binary (none mode)", async () => {
            const result = await execute("encoding.from-binary", "0100000101000010", { delimiter: "none" });
            expect(result).toBe("AB");
        });

        it("decodes single character", async () => {
            const result = await execute("encoding.from-binary", "01000001");
            expect(result).toBe("A");
        });

        it("round-trips ASCII text", async () => {
            const input = "Hello!";
            const encoded = await execute("encoding.to-binary", input);
            const decoded = await execute("encoding.from-binary", encoded);
            expect(decoded).toBe(input);
        });

        it("returns empty string for empty input", async () => {
            const result = await execute("encoding.from-binary", "");
            expect(result).toBe("");
        });
    });

    // ── To/From Octal ───────────────────────────────────────────────────────

    describe("encoding.to-octal", () => {
        it("encodes ASCII text with space delimiter", async () => {
            const result = await execute("encoding.to-octal", "A");
            expect(result).toBe("101");
        });

        it("encodes multiple characters space-delimited", async () => {
            const result = await execute("encoding.to-octal", "AB");
            expect(result).toBe("101 102");
        });

        it("encodes with backslash delimiter", async () => {
            const result = await execute("encoding.to-octal", "AB", { delimiter: "backslash" });
            expect(result).toBe("\\101\\102");
        });

        it("encodes with no delimiter", async () => {
            const result = await execute("encoding.to-octal", "AB", { delimiter: "none" });
            expect(result).toBe("101102");
        });

        it("encodes with comma delimiter", async () => {
            const result = await execute("encoding.to-octal", "AB", { delimiter: "comma" });
            expect(result).toBe("101,102");
        });

        it("returns empty string for empty input", async () => {
            const result = await execute("encoding.to-octal", "");
            expect(result).toBe("");
        });
    });

    describe("encoding.from-octal", () => {
        it("decodes space-delimited octal (auto)", async () => {
            const result = await execute("encoding.from-octal", "101 102");
            expect(result).toBe("AB");
        });

        it("decodes backslash-delimited octal (auto)", async () => {
            const result = await execute("encoding.from-octal", "\\101\\102");
            expect(result).toBe("AB");
        });

        it("decodes comma-delimited octal (auto)", async () => {
            const result = await execute("encoding.from-octal", "101,102");
            expect(result).toBe("AB");
        });

        it("round-trips ASCII text", async () => {
            const input = "Hello!";
            const encoded = await execute("encoding.to-octal", input);
            const decoded = await execute("encoding.from-octal", encoded);
            expect(decoded).toBe(input);
        });

        it("returns empty string for empty input", async () => {
            const result = await execute("encoding.from-octal", "");
            expect(result).toBe("");
        });
    });

    // ── Base32 ──────────────────────────────────────────────────────────────

    describe("encoding.base32-encode", () => {
        it("encodes empty string to empty string", async () => {
            const result = await execute("encoding.base32-encode", "");
            expect(result).toBe("");
        });

        it("encodes 'f' to JTQQ (RFC test vector)", async () => {
            // RFC 4648 test vectors
            const result = await execute("encoding.base32-encode", "f");
            expect(result).toBe("MY======");
        });

        it("encodes 'fo' correctly", async () => {
            const result = await execute("encoding.base32-encode", "fo");
            expect(result).toBe("MZXQ====");
        });

        it("encodes 'foo' correctly", async () => {
            const result = await execute("encoding.base32-encode", "foo");
            expect(result).toBe("MZXW6===");
        });

        it("encodes 'foobar' correctly", async () => {
            const result = await execute("encoding.base32-encode", "foobar");
            expect(result).toBe("MZXW6YTBOI======");
        });

        it("omits padding when padding=false", async () => {
            const result = await execute("encoding.base32-encode", "f", { padding: false });
            expect(result).toBe("MY");
        });

        it("output is uppercase alphabet + 2-7", async () => {
            const result = await execute("encoding.base32-encode", "Hello World");
            expect(result).toMatch(/^[A-Z2-7=]+$/);
        });
    });

    describe("encoding.base32-decode", () => {
        it("decodes empty string to empty string", async () => {
            const result = await execute("encoding.base32-decode", "");
            expect(result).toBe("");
        });

        it("decodes 'MY======' to 'f'", async () => {
            const result = await execute("encoding.base32-decode", "MY======");
            expect(result).toBe("f");
        });

        it("decodes without padding", async () => {
            const result = await execute("encoding.base32-decode", "MY");
            expect(result).toBe("f");
        });

        it("decodes lowercase input", async () => {
            const result = await execute("encoding.base32-decode", "my======");
            expect(result).toBe("f");
        });

        it("round-trips ASCII text", async () => {
            const input = "Hello World";
            const encoded = await execute("encoding.base32-encode", input);
            const decoded = await execute("encoding.base32-decode", encoded);
            expect(decoded).toBe(input);
        });

        it("round-trips multi-word text", async () => {
            const input = "pipeline operations test";
            const encoded = await execute("encoding.base32-encode", input);
            const decoded = await execute("encoding.base32-decode", encoded);
            expect(decoded).toBe(input);
        });

        it("throws on invalid character", async () => {
            await expect(execute("encoding.base32-decode", "!!INVALID!!"))
                .rejects.toThrow(/Invalid Base32/);
        });
    });

    // ── Base58 ──────────────────────────────────────────────────────────────

    describe("encoding.base58-encode", () => {
        it("encodes empty string to empty string", async () => {
            const result = await execute("encoding.base58-encode", "");
            expect(result).toBe("");
        });

        it("encodes 'Hello World'", async () => {
            const result = await execute("encoding.base58-encode", "Hello World");
            // Known value
            expect(result).toBe("JxF12TrwUP45BMd");
        });

        it("output uses Bitcoin alphabet only", async () => {
            const result = await execute("encoding.base58-encode", "test");
            expect(result).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
        });

        it("no zero (0), O, I, or l in output", async () => {
            const result = await execute("encoding.base58-encode", "Hello World");
            expect(result).not.toMatch(/[0OIl]/);
        });
    });

    describe("encoding.base58-decode", () => {
        it("decodes empty string to empty string", async () => {
            const result = await execute("encoding.base58-decode", "");
            expect(result).toBe("");
        });

        it("decodes 'JxF12TrwUP45BMd' to 'Hello World'", async () => {
            const result = await execute("encoding.base58-decode", "JxF12TrwUP45BMd");
            expect(result).toBe("Hello World");
        });

        it("round-trips ASCII text", async () => {
            const input = "test string 123";
            const encoded = await execute("encoding.base58-encode", input);
            const decoded = await execute("encoding.base58-decode", encoded);
            expect(decoded).toBe(input);
        });

        it("round-trips longer text", async () => {
            const input = "The quick brown fox jumps over the lazy dog";
            const encoded = await execute("encoding.base58-encode", input);
            const decoded = await execute("encoding.base58-decode", encoded);
            expect(decoded).toBe(input);
        });

        it("throws on invalid character", async () => {
            await expect(execute("encoding.base58-decode", "0invalid"))
                .rejects.toThrow(/Invalid Base58/);
        });
    });
});
