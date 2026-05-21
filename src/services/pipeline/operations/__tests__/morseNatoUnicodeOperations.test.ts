import { executeSingleOperation } from "../../pipelineExecutor";
import "../encoding";

describe("Morse / NATO / Unicode Escape Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── Morse Encode ────────────────────────────────────────────────────────

    describe("encoding.morse-encode", () => {
        it("encodes a single letter", async () => {
            expect(await execute("encoding.morse-encode", "A")).toBe(".-");
        });

        it("encodes SOS", async () => {
            expect(await execute("encoding.morse-encode", "SOS")).toBe("... --- ...");
        });

        it("separates words with / by default", async () => {
            expect(await execute("encoding.morse-encode", "HI THERE")).toBe(".... .. / - .... . .-. .");
        });

        it("separates words with | when requested", async () => {
            const result = await execute("encoding.morse-encode", "HI THERE", { wordSeparator: "|" });
            expect(result).toBe(".... .. | - .... . .-. .");
        });

        it("separates words with newline when requested", async () => {
            const result = await execute("encoding.morse-encode", "HI THERE", { wordSeparator: "newline" });
            expect(result).toBe(".... ..\n- .... . .-. .");
        });

        it("encodes digits", async () => {
            expect(await execute("encoding.morse-encode", "123")).toBe(".---- ..--- ...--");
        });

        it("marks unknown characters with brackets", async () => {
            const result = await execute("encoding.morse-encode", "A#");
            expect(result).toContain("[#]");
        });

        it("is case-insensitive", async () => {
            expect(await execute("encoding.morse-encode", "sos")).toBe("... --- ...");
        });
    });

    // ── Morse Decode ────────────────────────────────────────────────────────

    describe("encoding.morse-decode", () => {
        it("decodes a single letter", async () => {
            expect(await execute("encoding.morse-decode", ".-")).toBe("A");
        });

        it("decodes SOS", async () => {
            expect(await execute("encoding.morse-decode", "... --- ...")).toBe("SOS");
        });

        it("decodes multi-word message with / separator", async () => {
            const result = await execute("encoding.morse-decode", ".... .. / - .... . .-. .");
            expect(result).toBe("HI THERE");
        });

        it("decodes multi-word message with | separator", async () => {
            const result = await execute("encoding.morse-decode", ".... .. | - .... . .-. .", { wordSeparator: "|" });
            expect(result).toBe("HI THERE");
        });

        it("decodes digits", async () => {
            expect(await execute("encoding.morse-decode", ".---- ..--- ...--")).toBe("123");
        });

        it("marks unknown codes with brackets", async () => {
            const result = await execute("encoding.morse-decode", ".----. ..--..");
            expect(result).toContain("'");
            expect(result).toContain("?");
        });

        it("round-trips a message", async () => {
            const original = "HELLO WORLD";
            const encoded = await execute("encoding.morse-encode", original);
            const decoded = await execute("encoding.morse-decode", encoded);
            expect(decoded).toBe(original);
        });

        it("round-trips alphanumeric text", async () => {
            const original = "TEST123";
            const encoded = await execute("encoding.morse-encode", original);
            const decoded = await execute("encoding.morse-decode", encoded);
            expect(decoded).toBe(original);
        });
    });

    // ── NATO Phonetic Alphabet ───────────────────────────────────────────────

    describe("encoding.nato-phonetic", () => {
        it("converts a single letter", async () => {
            expect(await execute("encoding.nato-phonetic", "A")).toBe("Alfa");
        });

        it("converts multiple letters space-separated", async () => {
            expect(await execute("encoding.nato-phonetic", "AB")).toBe("Alfa Bravo");
        });

        it("converts SOS", async () => {
            expect(await execute("encoding.nato-phonetic", "SOS")).toBe("Sierra Oscar Sierra");
        });

        it("converts digits", async () => {
            expect(await execute("encoding.nato-phonetic", "1")).toBe("One");
        });

        it("converts with newline delimiter", async () => {
            const result = await execute("encoding.nato-phonetic", "AB", { delimiter: "newline" });
            expect(result).toBe("Alfa\nBravo");
        });

        it("converts with comma delimiter", async () => {
            const result = await execute("encoding.nato-phonetic", "AB", { delimiter: "comma" });
            expect(result).toBe("Alfa, Bravo");
        });

        it("outputs uppercase when requested", async () => {
            const result = await execute("encoding.nato-phonetic", "A", { uppercase: true });
            expect(result).toBe("ALFA");
        });

        it("handles lowercase input by uppercasing", async () => {
            expect(await execute("encoding.nato-phonetic", "a")).toBe("Alfa");
        });

        it("passes through unknown characters", async () => {
            const result = await execute("encoding.nato-phonetic", "A-B");
            expect(result).toContain("Alfa");
            expect(result).toContain("Bravo");
        });
    });

    // ── Unicode Escape ───────────────────────────────────────────────────────

    describe("encoding.unicode-escape", () => {
        it("escapes non-ASCII characters by default", async () => {
            expect(await execute("encoding.unicode-escape", "café")).toBe("caf\\u00E9");
        });

        it("leaves ASCII characters unchanged in non-ascii mode", async () => {
            expect(await execute("encoding.unicode-escape", "Hello")).toBe("Hello");
        });

        it("escapes all characters in all mode", async () => {
            const result = await execute("encoding.unicode-escape", "Hi", { mode: "all" });
            expect(result).toBe("\\u0048\\u0069");
        });

        it("escapes emoji with \\u{XXXXX} for code points above U+FFFF", async () => {
            const result = await execute("encoding.unicode-escape", "😀");
            expect(result).toMatch(/\\u\{1F600\}/i);
        });

        it("returns empty string for empty input", async () => {
            expect(await execute("encoding.unicode-escape", "")).toBe("");
        });

        it("produces uppercase hex digits", async () => {
            const result = await execute("encoding.unicode-escape", "é");
            expect(result).toBe("\\u00E9");
        });
    });

    // ── Unicode Unescape ─────────────────────────────────────────────────────

    describe("encoding.unicode-unescape", () => {
        it("decodes \\uXXXX sequences", async () => {
            expect(await execute("encoding.unicode-unescape", "\\u0048\\u0069")).toBe("Hi");
        });

        it("decodes \\u{XXXXX} sequences", async () => {
            expect(await execute("encoding.unicode-unescape", "\\u{1F600}")).toBe("😀");
        });

        it("leaves non-escape text unchanged", async () => {
            expect(await execute("encoding.unicode-unescape", "Hello")).toBe("Hello");
        });

        it("decodes mixed content", async () => {
            expect(await execute("encoding.unicode-unescape", "caf\\u00E9")).toBe("café");
        });

        it("round-trips with unicode-escape", async () => {
            const original = "héllo wörld";
            const escaped = await execute("encoding.unicode-escape", original);
            const unescaped = await execute("encoding.unicode-unescape", escaped);
            expect(unescaped).toBe(original);
        });
    });
});
