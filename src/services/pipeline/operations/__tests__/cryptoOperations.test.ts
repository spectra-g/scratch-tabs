/**
 * Unit Tests for Crypto Pipeline Operations
 *
 * Tests cryptography and math operations like base conversion and HMAC.
 */

import { executeSingleOperation } from "../../pipelineExecutor";
import "../crypto";

describe("Crypto Pipeline Operations", () => {
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

    describe("math.base-convert", () => {
        describe("Decimal to Binary", () => {
            it("should convert decimal to binary", async () => {
                const result = await execute("math.base-convert", "255", {
                    fromBase: "10",
                    toBase: "2",
                    prefix: true
                });

                expect(result).toBe("0b11111111");
            });

            it("should convert without prefix", async () => {
                const result = await execute("math.base-convert", "255", {
                    fromBase: "10",
                    toBase: "2",
                    prefix: false
                });

                expect(result).toBe("11111111");
            });
        });

        describe("Decimal to Hex", () => {
            it("should convert decimal to hexadecimal", async () => {
                const result = await execute("math.base-convert", "255", {
                    fromBase: "10",
                    toBase: "16",
                    prefix: true
                });

                expect(result).toBe("0xFF");
            });

            it("should handle larger numbers", async () => {
                const result = await execute("math.base-convert", "4096", {
                    fromBase: "10",
                    toBase: "16",
                    prefix: true
                });

                expect(result).toBe("0x1000");
            });
        });

        describe("Decimal to Octal", () => {
            it("should convert decimal to octal", async () => {
                const result = await execute("math.base-convert", "64", {
                    fromBase: "10",
                    toBase: "8",
                    prefix: true
                });

                expect(result).toBe("0o100");
            });
        });

        describe("Hex to Decimal", () => {
            it("should convert hex to decimal", async () => {
                const result = await execute("math.base-convert", "FF", {
                    fromBase: "16",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("255");
            });

            it("should handle hex with 0x prefix", async () => {
                const result = await execute("math.base-convert", "0xFF", {
                    fromBase: "16",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("255");
            });

            it("should handle lowercase hex", async () => {
                const result = await execute("math.base-convert", "0xff", {
                    fromBase: "16",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("255");
            });
        });

        describe("Binary to Decimal", () => {
            it("should convert binary to decimal", async () => {
                const result = await execute("math.base-convert", "11111111", {
                    fromBase: "2",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("255");
            });

            it("should handle binary with 0b prefix", async () => {
                const result = await execute("math.base-convert", "0b11111111", {
                    fromBase: "2",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("255");
            });
        });

        describe("Octal to Decimal", () => {
            it("should convert octal to decimal", async () => {
                const result = await execute("math.base-convert", "100", {
                    fromBase: "8",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("64");
            });

            it("should handle octal with 0o prefix", async () => {
                const result = await execute("math.base-convert", "0o100", {
                    fromBase: "8",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("64");
            });
        });

        describe("Binary to Hex", () => {
            it("should convert binary to hex", async () => {
                const result = await execute("math.base-convert", "11111111", {
                    fromBase: "2",
                    toBase: "16",
                    prefix: true
                });

                expect(result).toBe("0xFF");
            });
        });

        describe("Hex to Binary", () => {
            it("should convert hex to binary", async () => {
                const result = await execute("math.base-convert", "FF", {
                    fromBase: "16",
                    toBase: "2",
                    prefix: true
                });

                expect(result).toBe("0b11111111");
            });
        });

        describe("Edge Cases", () => {
            it("should handle zero", async () => {
                const result = await execute("math.base-convert", "0", {
                    fromBase: "10",
                    toBase: "16",
                    prefix: true
                });

                expect(result).toBe("0x0");
            });

            it("should handle whitespace", async () => {
                const result = await execute("math.base-convert", "  255  ", {
                    fromBase: "10",
                    toBase: "16",
                    prefix: false
                });

                expect(result).toBe("FF");
            });

            it("should throw error for invalid number", async () => {
                await expect(execute("math.base-convert", "invalid", {
                    fromBase: "10",
                    toBase: "16"
                })).rejects.toThrow();
            });

            it("should throw error for invalid base", async () => {
                await expect(execute("math.base-convert", "FF", {
                    fromBase: "2",
                    toBase: "10"
                })).rejects.toThrow();
            });

            it("should handle same base conversion", async () => {
                const result = await execute("math.base-convert", "123", {
                    fromBase: "10",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("123");
            });
        });

        describe("Large Numbers", () => {
            it("should handle large decimal numbers", async () => {
                const result = await execute("math.base-convert", "1000000", {
                    fromBase: "10",
                    toBase: "16",
                    prefix: true
                });

                expect(result).toBe("0xF4240");
            });

            it("should handle large hex numbers", async () => {
                const result = await execute("math.base-convert", "FFFFFF", {
                    fromBase: "16",
                    toBase: "10",
                    prefix: false
                });

                expect(result).toBe("16777215");
            });
        });
    });

    describe("crypto.hmac", () => {
        describe("SHA-256 (default)", () => {
            it("should generate HMAC-SHA256 in hex format", async () => {
                const result = await execute("crypto.hmac", "Hello, World!", {
                    key: "secret-key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{64}$/);
                expect(result.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
            });

            it("should generate HMAC-SHA256 in base64 format", async () => {
                const result = await execute("crypto.hmac", "Hello, World!", {
                    key: "secret-key",
                    algorithm: "SHA-256",
                    outputFormat: "base64"
                });

                expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
                expect(result.length).toBeGreaterThan(0);
            });

            it("should produce consistent results for same input", async () => {
                const result1 = await execute("crypto.hmac", "test message", {
                    key: "my-key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                const result2 = await execute("crypto.hmac", "test message", {
                    key: "my-key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result1).toBe(result2);
            });

            it("should produce different results for different keys", async () => {
                const result1 = await execute("crypto.hmac", "test", {
                    key: "key1",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                const result2 = await execute("crypto.hmac", "test", {
                    key: "key2",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result1).not.toBe(result2);
            });

            it("should produce different results for different messages", async () => {
                const result1 = await execute("crypto.hmac", "message1", {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                const result2 = await execute("crypto.hmac", "message2", {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result1).not.toBe(result2);
            });
        });

        describe("SHA-1", () => {
            it("should generate HMAC-SHA1", async () => {
                const result = await execute("crypto.hmac", "test", {
                    key: "key",
                    algorithm: "SHA-1",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{40}$/);
                expect(result.length).toBe(40); // SHA-1 = 20 bytes = 40 hex chars
            });
        });

        describe("SHA-384", () => {
            it("should generate HMAC-SHA384", async () => {
                const result = await execute("crypto.hmac", "test", {
                    key: "key",
                    algorithm: "SHA-384",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{96}$/);
                expect(result.length).toBe(96); // SHA-384 = 48 bytes = 96 hex chars
            });
        });

        describe("SHA-512", () => {
            it("should generate HMAC-SHA512", async () => {
                const result = await execute("crypto.hmac", "test", {
                    key: "key",
                    algorithm: "SHA-512",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{128}$/);
                expect(result.length).toBe(128); // SHA-512 = 64 bytes = 128 hex chars
            });
        });

        describe("Edge Cases", () => {
            it("should throw error when key is missing", async () => {
                await expect(execute("crypto.hmac", "test", {
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                })).rejects.toThrow(/key is required/i);
            });

            it("should throw error when key is empty", async () => {
                await expect(execute("crypto.hmac", "test", {
                    key: "",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                })).rejects.toThrow(/key is required/i);
            });

            it("should handle empty message", async () => {
                const result = await execute("crypto.hmac", "", {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{64}$/);
            });

            it("should handle unicode in message", async () => {
                const result = await execute("crypto.hmac", "Hello 世界 🌍", {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{64}$/);
            });

            it("should handle unicode in key", async () => {
                const result = await execute("crypto.hmac", "test", {
                    key: "密钥🔑",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{64}$/);
            });

            it("should handle long messages", async () => {
                const longMessage = "x".repeat(10000);
                const result = await execute("crypto.hmac", longMessage, {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{64}$/);
            });

            it("should handle multiline messages", async () => {
                const multilineMessage = "line1\nline2\nline3";
                const result = await execute("crypto.hmac", multilineMessage, {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{64}$/);
            });
        });

        describe("Real-world Use Cases", () => {
            it("should generate webhook signature (GitHub style)", async () => {
                const payload = '{"event":"push","repository":"test"}';
                const secret = "webhook-secret";

                const result = await execute("crypto.hmac", payload, {
                    key: secret,
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                expect(result).toMatch(/^[0-9a-f]{64}$/);
            });

            it("should generate API signature", async () => {
                const data = "timestamp=1234567890&nonce=abc123&method=POST";
                const apiSecret = "api-secret-key";

                const result = await execute("crypto.hmac", data, {
                    key: apiSecret,
                    algorithm: "SHA-256",
                    outputFormat: "base64"
                });

                expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
            });
        });

        describe("Output Format Conversion", () => {
            it("should produce valid base64 from same input as hex", async () => {
                const hexResult = await execute("crypto.hmac", "test", {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "hex"
                });

                const base64Result = await execute("crypto.hmac", "test", {
                    key: "key",
                    algorithm: "SHA-256",
                    outputFormat: "base64"
                });

                // Both should be valid but different formats
                expect(hexResult).toMatch(/^[0-9a-f]+$/);
                expect(base64Result).toMatch(/^[A-Za-z0-9+/]+=*$/);
                expect(hexResult).not.toBe(base64Result);
            });
        });
    });

    // ── hash.ripemd160 ───────────────────────────────────────────────────────

    describe("hash.ripemd160", () => {
        it("hashes empty string to known test vector", async () => {
            expect(await execute("hash.ripemd160", "")).toBe("9c1185a5c5e9fc54612808977ee8f548b2258d31");
        });

        it('hashes "abc" to known test vector', async () => {
            expect(await execute("hash.ripemd160", "abc")).toBe("8eb208f7e05d987a9b044a8e98c6b087f15a0bfc");
        });

        it('hashes "message digest" to known test vector', async () => {
            expect(await execute("hash.ripemd160", "message digest")).toBe("5d0689ef49d2fae572b881b123a85ffa21595f36");
        });

        it("produces 40 hex characters (160 bits)", async () => {
            const result = await execute("hash.ripemd160", "hello world");
            expect(result).toHaveLength(40);
            expect(result).toMatch(/^[0-9a-f]+$/);
        });

        it("produces base64 output when requested", async () => {
            const hex = await execute("hash.ripemd160", "abc");
            const b64 = await execute("hash.ripemd160", "abc", { outputFormat: "base64" });
            expect(Buffer.from(b64, "base64").toString("hex")).toBe(hex);
        });

        it("different inputs produce different hashes", async () => {
            const h1 = await execute("hash.ripemd160", "hello");
            const h2 = await execute("hash.ripemd160", "world");
            expect(h1).not.toBe(h2);
        });
    });

    // ── hash.keccak ──────────────────────────────────────────────────────────

    describe("hash.keccak", () => {
        it("hashes empty string to known Keccak-256 test vector", async () => {
            expect(await execute("hash.keccak", "")).toBe("c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470");
        });

        it('hashes "abc" to known Keccak-256 test vector', async () => {
            expect(await execute("hash.keccak", "abc")).toBe("4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45");
        });

        it("produces 64 hex characters (256 bits)", async () => {
            const result = await execute("hash.keccak", "hello world");
            expect(result).toHaveLength(64);
            expect(result).toMatch(/^[0-9a-f]+$/);
        });

        it("produces base64 output when requested", async () => {
            const hex = await execute("hash.keccak", "abc");
            const b64 = await execute("hash.keccak", "abc", { outputFormat: "base64" });
            expect(Buffer.from(b64, "base64").toString("hex")).toBe(hex);
        });

        it("differs from FIPS SHA3-256 (different padding)", async () => {
            // Keccak-256("") = c5d246..., SHA3-256("") = a7ffc6...
            const result = await execute("hash.keccak", "");
            expect(result).not.toBe("a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a");
        });
    });
});
