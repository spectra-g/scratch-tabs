import { generateKeyPairSync } from "crypto";
import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/crypto";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

describe("RSA Encrypt / Decrypt Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) throw new Error(result.error);
        return result.output;
    };

    describe("crypto.rsa-encrypt", () => {
        it("produces base64 output", async () => {
            const result = await execute("crypto.rsa-encrypt", "hello", { publicKey });
            expect(() => atob(result)).not.toThrow();
            expect(result.length).toBeGreaterThan(0);
        });

        it("produces ciphertext the size of the RSA modulus (256 bytes for 2048-bit)", async () => {
            const result = await execute("crypto.rsa-encrypt", "hello", { publicKey });
            expect(atob(result).length).toBe(256);
        });

        it("throws when public key is empty", async () => {
            const result = await executeSingleOperation("crypto.rsa-encrypt", "hello", {
                publicKey: "",
            });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/public key/i);
        });

        it("throws on malformed PEM", async () => {
            const result = await executeSingleOperation("crypto.rsa-encrypt", "hello", {
                publicKey: "not a pem",
            });
            expect(result.success).toBe(false);
        });

        it("rejects input longer than the key can encrypt in one block", async () => {
            const longInput = "x".repeat(300);
            await expect(
                execute("crypto.rsa-encrypt", longInput, { publicKey }),
            ).rejects.toThrow();
        });
    });

    describe("crypto.rsa-decrypt", () => {
        it("round-trips base64 ciphertext back to plaintext", async () => {
            const plaintext = "Top secret payload";
            const encrypted = await execute("crypto.rsa-encrypt", plaintext, { publicKey });
            const decrypted = await execute("crypto.rsa-decrypt", encrypted, { privateKey });
            expect(decrypted).toBe(plaintext);
        });

        it("round-trips hex ciphertext", async () => {
            const encrypted = await execute("crypto.rsa-encrypt", "hex mode", { publicKey });
            const hex = Array.from(atob(encrypted))
                .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
                .join("");
            const decrypted = await execute("crypto.rsa-decrypt", hex, {
                privateKey,
                inputFormat: "hex",
            });
            expect(decrypted).toBe("hex mode");
        });

        it("round-trips empty plaintext", async () => {
            const encrypted = await execute("crypto.rsa-encrypt", "", { publicKey });
            expect(await execute("crypto.rsa-decrypt", encrypted, { privateKey })).toBe("");
        });

        it("round-trips unicode text", async () => {
            const plaintext = "héllo wörld ✓ 日本語";
            const encrypted = await execute("crypto.rsa-encrypt", plaintext, { publicKey });
            expect(await execute("crypto.rsa-decrypt", encrypted, { privateKey })).toBe(
                plaintext,
            );
        });

        it("fails with an unrelated key", async () => {
            const other = generateKeyPairSync("rsa", {
                modulusLength: 2048,
                publicKeyEncoding: { type: "spki", format: "pem" },
                privateKeyEncoding: { type: "pkcs8", format: "pem" },
            }).privateKey;
            const encrypted = await execute("crypto.rsa-encrypt", "secret", { publicKey });
            const result = await executeSingleOperation("crypto.rsa-decrypt", encrypted, {
                privateKey: other,
            });
            expect(result.success).toBe(false);
        });

        it("throws when private key is empty", async () => {
            const result = await executeSingleOperation("crypto.rsa-decrypt", btoa("x"), {
                privateKey: "",
            });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/private key/i);
        });

        it("throws on truncated ciphertext", async () => {
            const result = await executeSingleOperation(
                "crypto.rsa-decrypt",
                btoa("short"),
                { privateKey },
            );
            expect(result.success).toBe(false);
        });
    });
});
