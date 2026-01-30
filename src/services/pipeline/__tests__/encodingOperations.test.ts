/**
 * Unit Tests for Encoding Pipeline Operations
 *
 * Tests encoding/decoding operations including base64, URL encoding, and quoted-printable.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/encoding";

describe("Encoding Pipeline Operations", () => {
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

    describe("encoding.quoted-printable", () => {
        it("should decode basic quoted-printable text", async () => {
            const input = "Hello=20World";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Hello World");
        });

        it("should decode equals sign", async () => {
            const input = "1=3D2";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("1=2");
        });

        it("should decode special characters", async () => {
            const input = "Hello=21 World=3F";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Hello! World?");
        });

        it("should handle soft line breaks", async () => {
            const input = "This is a long line that has been=\nsplit across multiple lines";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("This is a long line that has beensplit across multiple lines");
        });

        it("should handle soft line breaks with CRLF", async () => {
            const input = "This is a long line=\r\nthat continues here";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("This is a long linethat continues here");
        });

        it("should decode multiple encoded characters", async () => {
            const input = "=48=65=6C=6C=6F"; // "Hello"
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Hello");
        });

        it("should handle mixed encoded and plain text", async () => {
            const input = "Hello=20World=21 This is plain.";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Hello World! This is plain.");
        });

        it("should decode accented characters", async () => {
            const input = "Caf=E9"; // é in ISO-8859-1
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Café");
        });

        it("should handle lowercase hex codes", async () => {
            const input = "Test=3d=3d";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Test==");
        });

        it("should handle uppercase hex codes", async () => {
            const input = "Test=3D=3D";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Test==");
        });

        it("should handle mixed case hex codes", async () => {
            const input = "Test=3d=3D";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Test==");
        });

        it("should handle empty input", async () => {
            const result = await execute("encoding.quoted-printable", "");

            expect(result).toBe("");
        });

        it("should handle text without encoding", async () => {
            const input = "Plain text without encoding";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Plain text without encoding");
        });

        it("should decode tab character", async () => {
            const input = "Hello=09World";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Hello\tWorld");
        });

        it("should decode newline characters", async () => {
            const input = "Line1=0ALine2";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Line1\nLine2");
        });

        it("should decode carriage return", async () => {
            const input = "Line1=0DLine2";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Line1\rLine2");
        });

        it("should handle = at end of input", async () => {
            const input = "Test=";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Test");
        });

        it("should handle real email content", async () => {
            const input = "Subject: Test=20Email=0A=0AHello=20World=21";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Subject: Test Email\n\nHello World!");
        });

        it("should decode URL-like content", async () => {
            const input = "http://example.com/path=3Fquery=3Dvalue";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("http://example.com/path?query=value");
        });

        it("should handle multiple soft line breaks", async () => {
            const input = "Line1=\nLine2=\nLine3";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Line1Line2Line3");
        });

        it("should decode HTML entities in email", async () => {
            const input = "<p>Hello=20World=21</p>";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("<p>Hello World!</p>");
        });

        it("should handle consecutive encoded characters", async () => {
            const input = "=3D=3D=3D";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("===");
        });

        it("should decode quotes", async () => {
            const input = "He said=2C =22Hello=21=22";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe('He said, "Hello!"');
        });

        it("should handle multiline email header", async () => {
            const input = "From: sender@example.com=0ATo: recipient@example.com=0ASubject: Test=20Message";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("From: sender@example.com\nTo: recipient@example.com\nSubject: Test Message");
        });

        it("should decode percentage sign", async () => {
            const input = "50=25 off";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("50% off");
        });

        it("should decode ampersand", async () => {
            const input = "This =26 That";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("This & That");
        });

        it("should decode less than and greater than", async () => {
            const input = "=3Chtml=3E";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("<html>");
        });

        it("should handle real-world email body", async () => {
            const input = "Dear Customer=2C=0A=0AThank you for your order=21=0A=0ARegards=2C=0AThe Team";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Dear Customer,\n\nThank you for your order!\n\nRegards,\nThe Team");
        });

        it("should decode null byte (edge case)", async () => {
            const input = "Test=00Data";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("Test\x00Data");
        });

        it("should handle incomplete encoding at end", async () => {
            const input = "Test=2";
            const result = await execute("encoding.quoted-printable", input);

            // Should keep as-is since it's not valid
            expect(result).toBe("Test=2");
        });

        it("should handle mixed encoded and soft breaks", async () => {
            const input = "This is a test=20message=\nthat continues here";
            const result = await execute("encoding.quoted-printable", input);

            expect(result).toBe("This is a test messagethat continues here");
        });
    });
});
