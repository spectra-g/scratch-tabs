import { executeSingleOperation } from "../../pipelineExecutor";
import "../encoding";

describe("Base85 (Ascii85) and Punycode Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── encoding.base85-encode / encoding.base85-decode ──────────────────────

    describe("encoding.base85-encode / encoding.base85-decode", () => {
        it("round-trips ASCII text", async () => {
            const input = "Hello, World!";
            const encoded = await execute("encoding.base85-encode", input);
            const decoded = await execute("encoding.base85-decode", encoded);
            expect(decoded).toBe(input);
        });

        it("output is wrapped with <~ and ~>", async () => {
            const encoded = await execute("encoding.base85-encode", "A");
            expect(encoded).toMatch(/^<~/);
            expect(encoded).toMatch(/~>$/);
        });

        it("encodes 4 zero bytes as 'z' shorthand", async () => {
            const input = "\x00\x00\x00\x00";
            const encoded = await execute("encoding.base85-encode", input);
            expect(encoded).toBe("<~z~>");
        });

        it("handles empty string", async () => {
            const encoded = await execute("encoding.base85-encode", "");
            expect(encoded).toBe("<~~>");
            const decoded = await execute("encoding.base85-decode", encoded);
            expect(decoded).toBe("");
        });

        it("round-trips longer text", async () => {
            const input = "The quick brown fox jumps over the lazy dog";
            const encoded = await execute("encoding.base85-encode", input);
            const decoded = await execute("encoding.base85-decode", encoded);
            expect(decoded).toBe(input);
        });

        it("round-trips text with partial last group (1 byte)", async () => {
            const decoded = await execute("encoding.base85-decode",
                await execute("encoding.base85-encode", "A"));
            expect(decoded).toBe("A");
        });

        it("round-trips text with partial last group (2 bytes)", async () => {
            const decoded = await execute("encoding.base85-decode",
                await execute("encoding.base85-encode", "AB"));
            expect(decoded).toBe("AB");
        });

        it("round-trips text with partial last group (3 bytes)", async () => {
            const decoded = await execute("encoding.base85-decode",
                await execute("encoding.base85-encode", "Man"));
            expect(decoded).toBe("Man");
        });

        it("decode strips <~ ~> delimiters automatically", async () => {
            const decoded = await execute("encoding.base85-decode", "<~9jqo~>");
            expect(decoded).toBe("Man");
        });

        it("decode works without delimiters", async () => {
            const decoded = await execute("encoding.base85-decode", "9jqo");
            expect(decoded).toBe("Man");
        });

        it("decode ignores whitespace", async () => {
            const encoded = "<~9j qo~>";
            const decoded = await execute("encoding.base85-decode", encoded);
            expect(decoded).toBe("Man");
        });

        it("decode throws on invalid character", async () => {
            // '~' (126) and '{' (123) are above the valid range 33–117 ('!' to 'u')
            await expect(execute("encoding.base85-decode", "<~{{{{{~>")).rejects.toThrow(/Invalid Ascii85/);
        });

        it("round-trips text that fills a 4-byte group exactly", async () => {
            const input = "Test";
            const decoded = await execute("encoding.base85-decode",
                await execute("encoding.base85-encode", input));
            expect(decoded).toBe(input);
        });
    });

    // ── encoding.punycode-encode / encoding.punycode-decode ──────────────────

    describe("encoding.punycode-encode / encoding.punycode-decode", () => {
        it("encodes ASCII domain unchanged", async () => {
            const result = await execute("encoding.punycode-encode", "example.com");
            expect(result).toBe("example.com");
        });

        it("decodes ASCII domain unchanged", async () => {
            const result = await execute("encoding.punycode-decode", "example.com");
            expect(result).toBe("example.com");
        });

        it("encodes unicode domain to ACE punycode", async () => {
            const result = await execute("encoding.punycode-encode", "münchen.de");
            // münchen encodes to xn--mnchen-3ya
            expect(result).toMatch(/^xn--/);
            expect(result).toContain(".de");
        });

        it("decodes punycode domain to unicode", async () => {
            const result = await execute("encoding.punycode-decode", "xn--mnchen-3ya.de");
            expect(result).toBe("münchen.de");
        });

        it("round-trips a unicode domain", async () => {
            const domain = "münchen.de";
            const encoded = await execute("encoding.punycode-encode", domain);
            const decoded = await execute("encoding.punycode-decode", encoded);
            expect(decoded).toBe(domain);
        });

        it("handles empty input", async () => {
            expect(await execute("encoding.punycode-encode", "")).toBe("");
            expect(await execute("encoding.punycode-decode", "")).toBe("");
        });

        it("handles already-encoded punycode input to encode gracefully", async () => {
            // Encoding a punycode domain should be idempotent for ASCII-only parts
            const result = await execute("encoding.punycode-encode", "xn--mnchen-3ya.de");
            expect(result).toBe("xn--mnchen-3ya.de");
        });
    });
});
