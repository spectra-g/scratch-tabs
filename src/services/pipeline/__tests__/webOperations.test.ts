/**
 * Unit Tests for Web Pipeline Operations
 *
 * Tests for jwt.decode and jwt.sign.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/web";

describe("Web Pipeline Operations", () => {
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

    describe("jwt.decode", () => {
        // A well-known public JWT for testing (payload: {"sub":"1234567890","name":"John Doe","iat":1516239022})
        const sampleToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
            ".eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ" +
            ".SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

        it("should decode a JWT into header and payload", async () => {
            const result = await execute("jwt.decode", sampleToken);
            const parsed = JSON.parse(result);
            expect(parsed.header.alg).toBe("HS256");
            expect(parsed.payload.sub).toBe("1234567890");
            expect(parsed.payload.name).toBe("John Doe");
        });

        it("should strip Bearer prefix", async () => {
            const result = await execute("jwt.decode", `Bearer ${sampleToken}`);
            const parsed = JSON.parse(result);
            expect(parsed.header.typ).toBe("JWT");
        });

        it("should return payload-only when outputFormat=payload-only", async () => {
            const result = await execute("jwt.decode", sampleToken, { outputFormat: "payload-only" });
            const parsed = JSON.parse(result);
            expect(parsed.sub).toBe("1234567890");
            expect(parsed.header).toBeUndefined();
        });

        it("should throw on invalid JWT format", async () => {
            await expect(execute("jwt.decode", "not.a.valid.jwt.parts")).rejects.toThrow();
        });
    });

    describe("jwt.sign", () => {
        const payload = JSON.stringify({ sub: "user123", name: "Alice" });

        it("should produce a three-part JWT string", async () => {
            const result = await execute("jwt.sign", payload, {
                secret: "my-secret",
                algorithm: "HS256",
                addIat: false,
                expiresIn: 0,
            });
            const parts = result.split(".");
            expect(parts).toHaveLength(3);
        });

        it("should produce a decodable header with correct algorithm", async () => {
            const token = await execute("jwt.sign", payload, {
                secret: "my-secret",
                algorithm: "HS256",
                addIat: false,
                expiresIn: 0,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.header.alg).toBe("HS256");
            expect(parsed.header.typ).toBe("JWT");
        });

        it("should embed original payload claims", async () => {
            const token = await execute("jwt.sign", payload, {
                secret: "my-secret",
                algorithm: "HS256",
                addIat: false,
                expiresIn: 0,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.payload.sub).toBe("user123");
            expect(parsed.payload.name).toBe("Alice");
        });

        it("should automatically add iat when addIat=true", async () => {
            const before = Math.floor(Date.now() / 1000);
            const token = await execute("jwt.sign", payload, {
                secret: "secret",
                algorithm: "HS256",
                addIat: true,
                expiresIn: 0,
            });
            const after = Math.floor(Date.now() / 1000);
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.payload.iat).toBeGreaterThanOrEqual(before);
            expect(parsed.payload.iat).toBeLessThanOrEqual(after);
        });

        it("should not overwrite existing iat", async () => {
            const payloadWithIat = JSON.stringify({ sub: "x", iat: 9999 });
            const token = await execute("jwt.sign", payloadWithIat, {
                secret: "secret",
                algorithm: "HS256",
                addIat: true,
                expiresIn: 0,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.payload.iat).toBe(9999);
        });

        it("should add exp when expiresIn > 0", async () => {
            const before = Math.floor(Date.now() / 1000);
            const token = await execute("jwt.sign", payload, {
                secret: "secret",
                algorithm: "HS256",
                addIat: false,
                expiresIn: 3600,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.payload.exp).toBeGreaterThanOrEqual(before + 3600);
        });

        it("should not add exp when expiresIn=0", async () => {
            const token = await execute("jwt.sign", payload, {
                secret: "secret",
                algorithm: "HS256",
                addIat: false,
                expiresIn: 0,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.payload.exp).toBeUndefined();
        });

        it("should sign with HS384", async () => {
            const token = await execute("jwt.sign", payload, {
                secret: "my-secret",
                algorithm: "HS384",
                addIat: false,
                expiresIn: 0,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.header.alg).toBe("HS384");
        });

        it("should sign with HS512", async () => {
            const token = await execute("jwt.sign", payload, {
                secret: "my-secret",
                algorithm: "HS512",
                addIat: false,
                expiresIn: 0,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.header.alg).toBe("HS512");
        });

        it("should produce different tokens for different secrets", async () => {
            const opts = { algorithm: "HS256", addIat: false, expiresIn: 0 };
            const token1 = await execute("jwt.sign", payload, { ...opts, secret: "secret-a" });
            const token2 = await execute("jwt.sign", payload, { ...opts, secret: "secret-b" });
            expect(token1).not.toBe(token2);
        });

        it("should produce the same token for the same inputs (deterministic)", async () => {
            const opts = { secret: "key", algorithm: "HS256", addIat: false, expiresIn: 0 };
            const token1 = await execute("jwt.sign", payload, opts);
            const token2 = await execute("jwt.sign", payload, opts);
            expect(token1).toBe(token2);
        });

        it("should throw when secret is empty", async () => {
            await expect(
                execute("jwt.sign", payload, { secret: "", algorithm: "HS256", addIat: false, expiresIn: 0 })
            ).rejects.toThrow();
        });

        it("should throw when input is not a JSON object", async () => {
            await expect(
                execute("jwt.sign", '"just a string"', { secret: "key", algorithm: "HS256" })
            ).rejects.toThrow();
        });

        it("should throw when input is a JSON array", async () => {
            await expect(
                execute("jwt.sign", "[1,2,3]", { secret: "key", algorithm: "HS256" })
            ).rejects.toThrow();
        });

        it("should use only base64url-safe characters in the output", async () => {
            const token = await execute("jwt.sign", payload, {
                secret: "secret",
                algorithm: "HS256",
                addIat: false,
                expiresIn: 0,
            });
            // base64url charset: A-Z a-z 0-9 - _ (no + / =)
            expect(token).toMatch(/^[A-Za-z0-9\-_.]+$/);
        });

        it("should roundtrip: sign then decode preserves all claims", async () => {
            const claims = { sub: "u1", role: "admin", count: 42 };
            const token = await execute("jwt.sign", JSON.stringify(claims), {
                secret: "roundtrip-secret",
                algorithm: "HS256",
                addIat: false,
                expiresIn: 0,
            });
            const decoded = await execute("jwt.decode", token);
            const parsed = JSON.parse(decoded);
            expect(parsed.payload.sub).toBe("u1");
            expect(parsed.payload.role).toBe("admin");
            expect(parsed.payload.count).toBe(42);
        });
    });
});
