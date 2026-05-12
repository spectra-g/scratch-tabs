import { executeSingleOperation } from "../../pipelineExecutor";
import "../crypto";
import "../extraction";
import "../../../../formats/json/pipelineOperations";

describe("Priority B Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    // ── hash.digest ─────────────────────────────────────────────────────────

    describe("hash.digest", () => {
        it("SHA-256 hex output has correct length (64 chars)", async () => {
            const result = await execute("hash.digest", "Hello, World!", { algorithm: "SHA-256", outputFormat: "hex" });
            expect(result).toMatch(/^[0-9a-f]{64}$/);
        });

        it("SHA-1 hex output has correct length (40 chars)", async () => {
            const result = await execute("hash.digest", "test", { algorithm: "SHA-1", outputFormat: "hex" });
            expect(result).toMatch(/^[0-9a-f]{40}$/);
        });

        it("SHA-384 hex output has correct length (96 chars)", async () => {
            const result = await execute("hash.digest", "test", { algorithm: "SHA-384", outputFormat: "hex" });
            expect(result).toMatch(/^[0-9a-f]{96}$/);
        });

        it("SHA-512 hex output has correct length (128 chars)", async () => {
            const result = await execute("hash.digest", "test", { algorithm: "SHA-512", outputFormat: "hex" });
            expect(result).toMatch(/^[0-9a-f]{128}$/);
        });

        it("base64 output is valid base64", async () => {
            const result = await execute("hash.digest", "test", { algorithm: "SHA-256", outputFormat: "base64" });
            expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
        });

        it("produces consistent results for same input", async () => {
            const r1 = await execute("hash.digest", "hello", { algorithm: "SHA-256", outputFormat: "hex" });
            const r2 = await execute("hash.digest", "hello", { algorithm: "SHA-256", outputFormat: "hex" });
            expect(r1).toBe(r2);
        });

        it("produces different results for different inputs", async () => {
            const r1 = await execute("hash.digest", "hello", { algorithm: "SHA-256", outputFormat: "hex" });
            const r2 = await execute("hash.digest", "world", { algorithm: "SHA-256", outputFormat: "hex" });
            expect(r1).not.toBe(r2);
        });

        it("produces different results for different algorithms", async () => {
            const r256 = await execute("hash.digest", "test", { algorithm: "SHA-256", outputFormat: "hex" });
            const r512 = await execute("hash.digest", "test", { algorithm: "SHA-512", outputFormat: "hex" });
            expect(r256).not.toBe(r512);
        });

        it("handles empty input", async () => {
            const result = await execute("hash.digest", "", { algorithm: "SHA-256", outputFormat: "hex" });
            // SHA-256 of empty string is a known value
            expect(result).toMatch(/^[0-9a-f]{64}$/);
        });

        it("handles unicode input", async () => {
            const result = await execute("hash.digest", "Hello 世界 🌍", { algorithm: "SHA-256", outputFormat: "hex" });
            expect(result).toMatch(/^[0-9a-f]{64}$/);
        });

        it("hex and base64 outputs encode the same hash", async () => {
            const hex = await execute("hash.digest", "test", { algorithm: "SHA-256", outputFormat: "hex" });
            const b64 = await execute("hash.digest", "test", { algorithm: "SHA-256", outputFormat: "base64" });
            // Convert hex to base64 manually to verify they're the same hash
            const bytes = hex.match(/.{2}/g)!.map(h => parseInt(h, 16));
            const binary = bytes.map(b => String.fromCharCode(b)).join('');
            expect(btoa(binary)).toBe(b64);
        });
    });

    // ── ip.change-format ────────────────────────────────────────────────────

    describe("ip.change-format", () => {
        const IP = "192.168.1.1";
        const IP_DECIMAL = "3232235777";
        const IP_HEX = "0xC0A80101";
        const IP_OCTAL = "0300.0250.0001.0001";

        describe("from dotted decimal", () => {
            it("converts to decimal integer", async () => {
                const result = await execute("ip.change-format", IP, { inputFormat: "dotted", outputFormat: "decimal" });
                expect(result).toBe(IP_DECIMAL);
            });

            it("converts to hex", async () => {
                const result = await execute("ip.change-format", IP, { inputFormat: "dotted", outputFormat: "hex" });
                expect(result).toBe(IP_HEX);
            });

            it("converts to dotted octal", async () => {
                const result = await execute("ip.change-format", IP, { inputFormat: "dotted", outputFormat: "octal" });
                expect(result).toBe(IP_OCTAL);
            });

            it("dotted-to-dotted is identity", async () => {
                const result = await execute("ip.change-format", IP, { inputFormat: "dotted", outputFormat: "dotted" });
                expect(result).toBe(IP);
            });

            it("replaces IP in surrounding text", async () => {
                const result = await execute(
                    "ip.change-format",
                    `Client from ${IP} connected`,
                    { inputFormat: "dotted", outputFormat: "decimal" }
                );
                expect(result).toBe(`Client from ${IP_DECIMAL} connected`);
            });

            it("converts multiple IPs in text", async () => {
                const result = await execute(
                    "ip.change-format",
                    "10.0.0.1 and 10.0.0.2",
                    { inputFormat: "dotted", outputFormat: "decimal" }
                );
                expect(result).toContain("167772161");
                expect(result).toContain("167772162");
            });
        });

        describe("from decimal integer", () => {
            it("converts to dotted decimal", async () => {
                const result = await execute("ip.change-format", IP_DECIMAL, { inputFormat: "decimal", outputFormat: "dotted" });
                expect(result).toBe(IP);
            });

            it("converts to hex", async () => {
                const result = await execute("ip.change-format", IP_DECIMAL, { inputFormat: "decimal", outputFormat: "hex" });
                expect(result).toBe(IP_HEX);
            });
        });

        describe("from hex", () => {
            it("converts to dotted decimal", async () => {
                const result = await execute("ip.change-format", IP_HEX, { inputFormat: "hex", outputFormat: "dotted" });
                expect(result).toBe(IP);
            });

            it("converts to decimal", async () => {
                const result = await execute("ip.change-format", IP_HEX, { inputFormat: "hex", outputFormat: "decimal" });
                expect(result).toBe(IP_DECIMAL);
            });

            it("is case-insensitive for hex input", async () => {
                const result = await execute("ip.change-format", "0xc0a80101", { inputFormat: "hex", outputFormat: "dotted" });
                expect(result).toBe(IP);
            });
        });

        describe("from dotted octal", () => {
            it("converts to dotted decimal", async () => {
                const result = await execute("ip.change-format", IP_OCTAL, { inputFormat: "octal", outputFormat: "dotted" });
                expect(result).toBe(IP);
            });

            it("converts to decimal", async () => {
                const result = await execute("ip.change-format", IP_OCTAL, { inputFormat: "octal", outputFormat: "decimal" });
                expect(result).toBe(IP_DECIMAL);
            });
        });

        describe("loopback and edge cases", () => {
            it("handles 127.0.0.1 → decimal", async () => {
                const result = await execute("ip.change-format", "127.0.0.1", { inputFormat: "dotted", outputFormat: "decimal" });
                expect(result).toBe("2130706433");
            });

            it("handles 255.255.255.255 → decimal", async () => {
                const result = await execute("ip.change-format", "255.255.255.255", { inputFormat: "dotted", outputFormat: "decimal" });
                expect(result).toBe("4294967295");
            });

            it("handles 0.0.0.0 → decimal", async () => {
                const result = await execute("ip.change-format", "0.0.0.0", { inputFormat: "dotted", outputFormat: "decimal" });
                expect(result).toBe("0");
            });
        });
    });

    // ── json.jsonpath ────────────────────────────────────────────────────────

    describe("json.jsonpath", () => {
        const execute = async (
            id: string,
            input: string,
            params: Record<string, unknown> = {},
        ): Promise<string> => {
            const result = await executeSingleOperation(id, input, params);
            if (!result.success) throw new Error(result.error);
            return result.output;
        };

        it("selects root document with $", async () => {
            const json = '{"name":"Alice","age":30}';
            const result = await execute("json.jsonpath", json, { path: "$", outputFormat: "compact" });
            const parsed = JSON.parse(result);
            expect(parsed).toEqual([{ name: "Alice", age: 30 }]);
        });

        it("selects a scalar field", async () => {
            const json = '{"name":"Alice","age":30}';
            const result = await execute("json.jsonpath", json, { path: "$.name", outputFormat: "compact" });
            const parsed = JSON.parse(result);
            expect(parsed).toEqual(["Alice"]);
        });

        it("selects a nested field", async () => {
            const json = '{"user":{"email":"alice@example.com"}}';
            const result = await execute("json.jsonpath", json, { path: "$.user.email", outputFormat: "compact" });
            const parsed = JSON.parse(result);
            expect(parsed).toEqual(["alice@example.com"]);
        });

        it("selects array elements with [*]", async () => {
            const json = '{"items":[1,2,3]}';
            const result = await execute("json.jsonpath", json, { path: "$.items[*]", outputFormat: "compact" });
            const parsed = JSON.parse(result);
            expect(parsed).toEqual([1, 2, 3]);
        });

        it("returns empty array for non-matching path", async () => {
            const json = '{"name":"Alice"}';
            const result = await execute("json.jsonpath", json, { path: "$.missing", outputFormat: "compact" });
            const parsed = JSON.parse(result);
            expect(parsed).toEqual([]);
        });

        it("outputs pretty JSON with indentation", async () => {
            const json = '{"name":"Alice"}';
            const result = await execute("json.jsonpath", json, { path: "$", outputFormat: "pretty", indent: 2 });
            expect(result).toContain("\n");
            expect(result).toContain("  ");
        });

        it("outputs one value per line in lines format", async () => {
            const json = '{"items":["a","b","c"]}';
            const result = await execute("json.jsonpath", json, { path: "$.items[*]", outputFormat: "lines" });
            expect(result.split("\n")).toEqual(["a", "b", "c"]);
        });

        it("throws on invalid JSON input", async () => {
            await expect(execute("json.jsonpath", "not json", { path: "$.foo" }))
                .rejects.toThrow(/Invalid JSON/);
        });
    });
});
