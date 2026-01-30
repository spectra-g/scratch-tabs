import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

/**
 * Web & Network Pipeline Operations
 *
 * Operations for web-related content transformation.
 */
export const webOperations: OperationDefinition[] = [
    // === HTML ===
    {
        id: "html.strip-tags",
        name: "Strip HTML Tags",
        description: "Remove all HTML/XML tags, leaving only text content",
        categories: ["text", "web"],
        parameters: [
            {
                name: "preserveLineBreaks",
                label: "Preserve Line Breaks",
                type: "boolean",
                default: false,
                description: "Convert <br> and block elements to newlines"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const preserveNewlines = params.preserveLineBreaks ?? false;

            let result = input;

            if (preserveNewlines) {
                // Convert br tags to newlines
                result = result.replace(/<br\s*\/?>/gi, '\n');
                // Convert closing tags of block elements to newlines
                result = result.replace(/<\/(p|div|h[1-6]|li|tr|pre|blockquote)>/gi, '\n');
                // Remove opening tags of block elements (don't add newlines)
                result = result.replace(/<(p|div|h[1-6]|li|tr|pre|blockquote)[^>]*>/gi, '');
            }

            // Remove all remaining HTML tags
            result = result.replace(/<[^>]+>/g, '');

            // Decode common HTML entities
            result = result
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
                .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

            // Clean up extra whitespace if newlines were preserved
            if (preserveNewlines) {
                result = result.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
            }

            return result.trim();
        },
        keywords: ["html", "xml", "strip", "remove", "tags", "clean", "text"],
        source: "core",
    },

    // === JWT ===
    {
        id: "jwt.decode",
        name: "Decode JWT",
        description: "Decode a JSON Web Token into header, payload, and signature",
        categories: ["encoding", "utilities"],
        parameters: [
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "pretty",
                options: [
                    { value: "pretty", label: "JSON (Pretty)" },
                    { value: "compact", label: "JSON (Compact)" },
                    { value: "payload-only", label: "Payload Only (Pretty)" }
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const outputFormat = (params.outputFormat as string) ?? "pretty";

            // Remove "Bearer " prefix if present
            let token = input.trim();
            if (token.startsWith('Bearer ')) {
                token = token.substring(7);
            }

            // JWT format: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
            }

            try {
                // Decode Base64Url (not standard Base64)
                const base64UrlDecode = (str: string): string => {
                    // Replace URL-safe characters
                    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
                    // Pad with = to make length multiple of 4
                    while (base64.length % 4) {
                        base64 += '=';
                    }
                    // Decode and parse
                    return atob(base64);
                };

                const header = JSON.parse(base64UrlDecode(parts[0]));
                const payload = JSON.parse(base64UrlDecode(parts[1]));
                const signature = parts[2]; // Keep signature encoded

                // Add human-readable timestamps to payload if present
                const enhancedPayload = { ...payload };
                if (payload.iat) {
                    enhancedPayload.iat_readable = new Date(payload.iat * 1000).toISOString();
                }
                if (payload.exp) {
                    enhancedPayload.exp_readable = new Date(payload.exp * 1000).toISOString();
                }
                if (payload.nbf) {
                    enhancedPayload.nbf_readable = new Date(payload.nbf * 1000).toISOString();
                }

                if (outputFormat === "payload-only") {
                    return JSON.stringify(enhancedPayload, null, 2);
                }

                const result = {
                    header,
                    payload: enhancedPayload,
                    signature: signature
                };

                return outputFormat === "pretty"
                    ? JSON.stringify(result, null, 2)
                    : JSON.stringify(result);

            } catch (e: any) {
                throw new Error(`Failed to decode JWT: ${e.message}`);
            }
        },
        keywords: ["jwt", "token", "decode", "json", "auth", "bearer"],
        source: "core",
    }
];

// Self-register all operations
webOperations.forEach(op => operationRegistry.register(op));

export default webOperations;
