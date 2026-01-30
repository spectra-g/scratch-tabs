/**
 * Unit Tests for Web Pipeline Operations
 *
 * Tests web-related operations like HTML stripping and JWT decoding.
 */

import { executeSingleOperation } from "../../pipelineExecutor";
import "../web";

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

    describe("html.strip-tags", () => {
        it("should remove all HTML tags", async () => {
            const input = "<p>Hello <strong>World</strong></p>";
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("Hello World");
        });

        it("should preserve line breaks for block elements when enabled", async () => {
            const input = "<div>Line 1</div><div>Line 2</div>";
            const result = await execute("html.strip-tags", input, { preserveLineBreaks: true });
            expect(result).toBe("Line 1\nLine 2");
        });

        it("should not preserve line breaks when disabled", async () => {
            const input = "<div>Line 1</div><div>Line 2</div>";
            const result = await execute("html.strip-tags", input, { preserveLineBreaks: false });
            expect(result).toBe("Line 1Line 2");
        });

        it("should decode HTML entities", async () => {
            const input = "&lt;div&gt;Hello &amp; goodbye&lt;/div&gt;";
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("<div>Hello & goodbye</div>");
        });

        it("should handle nested tags", async () => {
            const input = "<div><span><b>Nested</b> content</span></div>";
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("Nested content");
        });

        it("should handle self-closing tags", async () => {
            const input = "Before<br/>After<img src='test.png'/>End";
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("BeforeAfterEnd");
        });

        it("should handle mixed HTML entities", async () => {
            const input = "&quot;Quotes&quot; &apos;apostrophe&apos; &nbsp;space";
            const result = await execute("html.strip-tags", input);
            expect(result).toBe('"Quotes" \'apostrophe\'  space');
        });

        it("should handle numeric HTML entities", async () => {
            const input = "&#72;&#101;&#108;&#108;&#111;"; // "Hello"
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("Hello");
        });

        it("should handle hex HTML entities", async () => {
            const input = "&#x48;&#x65;&#x6C;&#x6C;&#x6F;"; // "Hello"
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("Hello");
        });

        it("should handle empty input", async () => {
            const result = await execute("html.strip-tags", "");
            expect(result).toBe("");
        });

        it("should handle text without tags", async () => {
            const input = "Plain text content";
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("Plain text content");
        });

        it("should handle malformed HTML gracefully", async () => {
            const input = "<div>Unclosed tag";
            const result = await execute("html.strip-tags", input);
            expect(result).toBe("Unclosed tag");
        });

        it("should preserve line breaks for multiple block elements", async () => {
            const input = "<p>Para 1</p><p>Para 2</p><h1>Heading</h1><div>Content</div>";
            const result = await execute("html.strip-tags", input, { preserveLineBreaks: true });
            expect(result).toBe("Para 1\nPara 2\nHeading\nContent");
        });
    });

    describe("jwt.decode", () => {
        // Valid JWT tokens for testing
        const validJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        const jwtWithExp = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjIsIm5iZiI6MTUxNjIzOTAyMn0.4Adcj0vJNQKfV0RqQdmV6rKJvZ7cBgVqMJNZWLyvCxg";

        it("should decode a valid JWT", async () => {
            const result = await execute("jwt.decode", validJWT);
            const parsed = JSON.parse(result);

            expect(parsed.header).toEqual({ alg: "HS256", typ: "JWT" });
            expect(parsed.payload.sub).toBe("1234567890");
            expect(parsed.payload.name).toBe("John Doe");
            expect(parsed.payload.iat).toBe(1516239022);
        });

        it("should include human-readable timestamps", async () => {
            const result = await execute("jwt.decode", jwtWithExp);
            const parsed = JSON.parse(result);

            expect(parsed.payload.iat_readable).toBeDefined();
            expect(parsed.payload.exp_readable).toBeDefined();
            expect(parsed.payload.nbf_readable).toBeDefined();
        });

        it("should handle Bearer prefix", async () => {
            const input = `Bearer ${validJWT}`;
            const result = await execute("jwt.decode", input);
            const parsed = JSON.parse(result);

            expect(parsed.payload.name).toBe("John Doe");
        });

        it("should work with compact output format", async () => {
            const result = await execute("jwt.decode", validJWT, { outputFormat: "compact" });
            const parsed = JSON.parse(result);

            expect(parsed.header).toBeDefined();
            expect(parsed.payload).toBeDefined();
            // Should not have extra spacing
            expect(result).not.toContain("  ");
        });

        it("should work with payload-only output format", async () => {
            const result = await execute("jwt.decode", validJWT, { outputFormat: "payload-only" });
            const parsed = JSON.parse(result);

            expect(parsed.sub).toBe("1234567890");
            expect(parsed.name).toBe("John Doe");
            expect(parsed.header).toBeUndefined();
            expect(parsed.signature).toBeUndefined();
        });

        it("should handle JWT with whitespace", async () => {
            const input = `  ${validJWT}  `;
            const result = await execute("jwt.decode", input);
            const parsed = JSON.parse(result);

            expect(parsed.payload.name).toBe("John Doe");
        });

        it("should throw error for invalid JWT format", async () => {
            await expect(execute("jwt.decode", "not.a.jwt")).rejects.toThrow();
        });

        it("should throw error for malformed base64", async () => {
            await expect(execute("jwt.decode", "invalid.invalid.invalid")).rejects.toThrow();
        });

        it("should throw error for empty input", async () => {
            await expect(execute("jwt.decode", "")).rejects.toThrow();
        });

        it("should handle JWT with only 2 parts (missing signature)", async () => {
            const twoPartJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0";
            await expect(execute("jwt.decode", twoPartJWT)).rejects.toThrow();
        });

        it("should decode JWT with complex payload", async () => {
            const complexJWT = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsInJvbGVzIjpbImFkbWluIiwidXNlciJdLCJtZXRhZGF0YSI6eyJvcmciOiJBY21lIEluYyJ9fQ.signature";
            const result = await execute("jwt.decode", complexJWT);
            const parsed = JSON.parse(result);

            expect(parsed.payload.roles).toEqual(["admin", "user"]);
            expect(parsed.payload.metadata).toEqual({ org: "Acme Inc" });
        });
    });
});
