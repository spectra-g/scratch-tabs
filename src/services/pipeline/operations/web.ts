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
    },
    {
        id: "jwt.sign",
        name: "Sign JWT",
        description: "Sign a JSON payload as a JWT using HMAC (HS256/HS384/HS512) via Web Crypto",
        categories: ["encoding", "utilities"],
        parameters: [
            {
                name: "secret",
                label: "Secret Key",
                type: "string",
                default: "",
                placeholder: "your-secret-key",
                description: "HMAC secret for signing",
                required: true,
            },
            {
                name: "algorithm",
                label: "Algorithm",
                type: "select",
                default: "HS256",
                options: [
                    { value: "HS256", label: "HS256 (SHA-256)" },
                    { value: "HS384", label: "HS384 (SHA-384)" },
                    { value: "HS512", label: "HS512 (SHA-512)" },
                ],
            },
            {
                name: "expiresIn",
                label: "Expires In (seconds)",
                type: "number",
                default: 0,
                min: 0,
                description: "Add exp claim (0 = do not add)",
            },
            {
                name: "addIat",
                label: "Add iat claim",
                type: "boolean",
                default: true,
                description: "Automatically add issued-at timestamp",
            },
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const secret = (params.secret as string) ?? "";
            const algorithm = (params.algorithm as string) ?? "HS256";
            const expiresIn = (params.expiresIn as number) ?? 0;
            const addIat = (params.addIat as boolean) ?? true;

            if (!secret) {
                throw new Error("Secret key is required");
            }

            let payload: Record<string, unknown>;
            try {
                const parsed = JSON.parse(input.trim());
                if (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null) {
                    throw new Error("must be a JSON object");
                }
                payload = parsed as Record<string, unknown>;
            } catch (e: any) {
                throw new Error(`Input must be a valid JSON object: ${e.message}`);
            }

            const now = Math.floor(Date.now() / 1000);
            if (addIat && payload.iat === undefined) {
                payload = { ...payload, iat: now };
            }
            if (expiresIn > 0) {
                payload = { ...payload, exp: now + expiresIn };
            }

            const header = { alg: algorithm, typ: "JWT" };

            const base64url = (value: string): string =>
                btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

            const encodedHeader = base64url(JSON.stringify(header));
            const encodedPayload = base64url(JSON.stringify(payload));
            const signingInput = `${encodedHeader}.${encodedPayload}`;

            const hashName = algorithm === "HS256" ? "SHA-256"
                : algorithm === "HS384" ? "SHA-384"
                : "SHA-512";

            const keyData = new TextEncoder().encode(secret);
            const msgData = new TextEncoder().encode(signingInput);

            const cryptoKey = await crypto.subtle.importKey(
                "raw",
                keyData,
                { name: "HMAC", hash: hashName },
                false,
                ["sign"],
            );

            const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
            const sigBytes = new Uint8Array(sigBuffer);
            // Convert bytes to binary string then base64url-encode
            const binary = Array.from(sigBytes).map(b => String.fromCharCode(b)).join("");
            const sigB64url = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

            return `${signingInput}.${sigB64url}`;
        },
        keywords: ["jwt", "sign", "token", "hmac", "auth", "bearer", "encode"],
        source: "core",
    },
];

// Self-register all operations
webOperations.forEach(op => operationRegistry.register(op));

export default webOperations;
