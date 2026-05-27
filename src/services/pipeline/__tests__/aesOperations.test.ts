import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/crypto";

describe("AES Encrypt / Decrypt Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    describe("crypto.aes-encrypt", () => {
        it("produces base64 output by default", async () => {
            const result = await execute("crypto.aes-encrypt", "hello", {
                passphrase: "secret",
            });
            expect(() => atob(result)).not.toThrow();
        });

        it("produces hex output when requested", async () => {
            const result = await execute("crypto.aes-encrypt", "hello", {
                passphrase: "secret",
                outputFormat: "hex",
            });
            expect(result).toMatch(/^[0-9a-f]+$/);
        });

        it("throws when passphrase is empty", async () => {
            const result = await executeSingleOperation("crypto.aes-encrypt", "hello", {
                passphrase: "",
            });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/passphrase/i);
        });

        it("produces different ciphertext on each call (random IV/salt)", async () => {
            const a = await execute("crypto.aes-encrypt", "hello", { passphrase: "pw" });
            const b = await execute("crypto.aes-encrypt", "hello", { passphrase: "pw" });
            expect(a).not.toBe(b);
        });
    });

    describe("crypto.aes-decrypt", () => {
        it("round-trips base64 ciphertext back to plaintext", async () => {
            const plaintext = "Hello, World!";
            const encrypted = await execute("crypto.aes-encrypt", plaintext, {
                passphrase: "my-secret",
            });
            const decrypted = await execute("crypto.aes-decrypt", encrypted, {
                passphrase: "my-secret",
                inputFormat: "base64",
            });
            expect(decrypted).toBe(plaintext);
        });

        it("round-trips hex ciphertext back to plaintext", async () => {
            const plaintext = "Hex round trip test";
            const encrypted = await execute("crypto.aes-encrypt", plaintext, {
                passphrase: "pw",
                outputFormat: "hex",
            });
            const decrypted = await execute("crypto.aes-decrypt", encrypted, {
                passphrase: "pw",
                inputFormat: "hex",
            });
            expect(decrypted).toBe(plaintext);
        });

        it("round-trips empty string", async () => {
            const encrypted = await execute("crypto.aes-encrypt", "", { passphrase: "pw" });
            const decrypted = await execute("crypto.aes-decrypt", encrypted, { passphrase: "pw" });
            expect(decrypted).toBe("");
        });

        it("round-trips multi-line text", async () => {
            const plaintext = "line one\nline two\nline three";
            const encrypted = await execute("crypto.aes-encrypt", plaintext, { passphrase: "pw" });
            const decrypted = await execute("crypto.aes-decrypt", encrypted, { passphrase: "pw" });
            expect(decrypted).toBe(plaintext);
        });

        it("fails with wrong passphrase", async () => {
            const encrypted = await execute("crypto.aes-encrypt", "secret data", {
                passphrase: "correct-pw",
            });
            const result = await executeSingleOperation("crypto.aes-decrypt", encrypted, {
                passphrase: "wrong-pw",
            });
            expect(result.success).toBe(false);
        });

        it("throws when passphrase is empty", async () => {
            const result = await executeSingleOperation("crypto.aes-decrypt", "abc", {
                passphrase: "",
            });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/passphrase/i);
        });

        it("throws on ciphertext that is too short", async () => {
            const result = await executeSingleOperation("crypto.aes-decrypt", btoa("tooshort"), {
                passphrase: "pw",
            });
            expect(result.success).toBe(false);
        });
    });
});
