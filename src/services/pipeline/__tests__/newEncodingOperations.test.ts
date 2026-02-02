/**
 * Unit Tests for New Encoding Pipeline Operations
 *
 * Tests for to-hex, to-charcode, and to-html-entity operations.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/encoding";

describe("New Encoding Pipeline Operations", () => {
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

    describe("encoding.to-hex", () => {
        it("should convert text to hex without delimiter", async () => {
            const result = await execute("encoding.to-hex", "ABC", { delimiter: "none" });
            expect(result).toBe("414243");
        });

        it("should convert text to hex with space delimiter", async () => {
            const result = await execute("encoding.to-hex", "ABC", { delimiter: "space" });
            expect(result).toBe("41 42 43");
        });

        it("should convert text to hex with colon delimiter", async () => {
            const result = await execute("encoding.to-hex", "ABC", { delimiter: "colon" });
            expect(result).toBe("41:42:43");
        });

        it("should convert text to hex with comma delimiter", async () => {
            const result = await execute("encoding.to-hex", "ABC", { delimiter: "comma" });
            expect(result).toBe("41,42,43");
        });

        it("should convert text to hex with 0x prefix", async () => {
            const result = await execute("encoding.to-hex", "ABC", { delimiter: "0x" });
            expect(result).toBe("0x41 0x42 0x43");
        });

        it("should handle lowercase option", async () => {
            const result = await execute("encoding.to-hex", "ABC", { delimiter: "none", uppercase: false });
            expect(result).toBe("414243".toLowerCase());
        });

        it("should handle empty input", async () => {
            const result = await execute("encoding.to-hex", "");
            expect(result).toBe("");
        });

        it("should handle special characters", async () => {
            const result = await execute("encoding.to-hex", "Hello!", { delimiter: "space" });
            expect(result).toBe("48 65 6C 6C 6F 21");
        });
    });

    describe("encoding.to-charcode", () => {
        it("should convert text to decimal charcodes", async () => {
            const result = await execute("encoding.to-charcode", "ABC", { base: "10", delimiter: " " });
            expect(result).toBe("65 66 67");
        });

        it("should convert text to hexadecimal charcodes", async () => {
            const result = await execute("encoding.to-charcode", "ABC", { base: "16", delimiter: " " });
            expect(result).toBe("41 42 43");
        });

        it("should convert text to binary charcodes", async () => {
            const result = await execute("encoding.to-charcode", "A", { base: "2", delimiter: " " });
            expect(result).toBe("01000001");
        });

        it("should handle custom delimiter", async () => {
            const result = await execute("encoding.to-charcode", "ABC", { base: "10", delimiter: ", " });
            expect(result).toBe("65, 66, 67");
        });

        it("should pad binary output", async () => {
            const result = await execute("encoding.to-charcode", "AB", { base: "2", delimiter: " ", padding: true });
            expect(result).toBe("01000001 01000010");
        });

        it("should handle empty input", async () => {
            const result = await execute("encoding.to-charcode", "");
            expect(result).toBe("");
        });
    });

    describe("encoding.to-html-entity", () => {
        it("should encode special HTML characters", async () => {
            const result = await execute("encoding.to-html-entity", "<div>&test</div>", { mode: "special" });
            expect(result).toContain("&lt;");
            expect(result).toContain("&gt;");
            expect(result).toContain("&amp;");
        });

        it("should encode quotes", async () => {
            const result = await execute("encoding.to-html-entity", '"hello"', { mode: "special" });
            expect(result).toBe("&quot;hello&quot;");
        });

        it("should encode to numeric entities", async () => {
            const result = await execute("encoding.to-html-entity", "<", { mode: "numeric" });
            expect(result).toBe("&#60;");
        });

        it("should encode to hex entities", async () => {
            const result = await execute("encoding.to-html-entity", "<", { mode: "hex" });
            expect(result).toBe("&#x3C;");
        });

        it("should use named entities when available", async () => {
            const result = await execute("encoding.to-html-entity", "& < >", { mode: "named" });
            expect(result).toContain("&amp;");
            expect(result).toContain("&lt;");
            expect(result).toContain("&gt;");
        });

        it("should encode non-ASCII when option enabled", async () => {
            const result = await execute("encoding.to-html-entity", "Cafe", { mode: "special", encodeNonAscii: false });
            expect(result).toBe("Cafe");
        });

        it("should handle empty input", async () => {
            const result = await execute("encoding.to-html-entity", "");
            expect(result).toBe("");
        });
    });
});
