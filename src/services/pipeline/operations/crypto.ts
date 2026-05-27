import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

/**
 * Cryptography & Math Pipeline Operations
 *
 * Operations for cryptographic functions and number base conversions.
 */
export const cryptoOperations: OperationDefinition[] = [
    // === BASE CONVERSION ===
    {
        id: "math.base-convert",
        name: "Convert Number Base",
        description: "Convert numbers between Binary, Octal, Decimal, and Hexadecimal",
        categories: ["utilities", "encoding"],
        parameters: [
            {
                name: "fromBase",
                label: "From Base",
                type: "select",
                default: "10",
                options: [
                    { value: "2", label: "Binary (2)" },
                    { value: "8", label: "Octal (8)" },
                    { value: "10", label: "Decimal (10)" },
                    { value: "16", label: "Hexadecimal (16)" }
                ]
            },
            {
                name: "toBase",
                label: "To Base",
                type: "select",
                default: "16",
                options: [
                    { value: "2", label: "Binary (2)" },
                    { value: "8", label: "Octal (8)" },
                    { value: "10", label: "Decimal (10)" },
                    { value: "16", label: "Hexadecimal (16)" }
                ]
            },
            {
                name: "prefix",
                label: "Add Prefix",
                type: "boolean",
                default: true,
                description: "Add 0b/0o/0x prefix to output"
            }
        ],
        processingMode: "configurable",
        execute: (input, params) => {
            const fromBase = parseInt((params.fromBase as string) ?? "10");
            const toBase = parseInt((params.toBase as string) ?? "16");
            const addPrefix = params.prefix ?? true;

            // Clean input - remove common prefixes and whitespace
            let cleanInput = input.trim()
                .replace(/^0b/i, '')  // Binary prefix
                .replace(/^0o/i, '')  // Octal prefix
                .replace(/^0x/i, ''); // Hex prefix

            try {
                // Parse the number from source base
                const decimal = parseInt(cleanInput, fromBase);

                if (isNaN(decimal)) {
                    throw new Error('Invalid number for specified base');
                }

                // Convert to target base
                let result = decimal.toString(toBase).toUpperCase();

                // Add prefix if requested
                if (addPrefix) {
                    if (toBase === 2) result = '0b' + result;
                    else if (toBase === 8) result = '0o' + result;
                    else if (toBase === 16) result = '0x' + result;
                }

                return result;
            } catch (e: any) {
                throw new Error(`Failed to convert: ${e.message}`);
            }
        },
        keywords: ["base", "binary", "octal", "decimal", "hex", "hexadecimal", "convert", "number"],
        source: "core",
    },

    // === HASH DIGEST ===
    {
        id: "hash.digest",
        name: "Hash / Digest",
        description: "Generate a cryptographic hash of the input (SHA-1, SHA-256, SHA-384, SHA-512)",
        categories: ["hashing"],
        parameters: [
            {
                name: "algorithm",
                label: "Algorithm",
                type: "select",
                default: "SHA-256",
                options: [
                    { value: "SHA-1", label: "SHA-1 (160-bit)" },
                    { value: "SHA-256", label: "SHA-256 (256-bit)" },
                    { value: "SHA-384", label: "SHA-384 (384-bit)" },
                    { value: "SHA-512", label: "SHA-512 (512-bit)" },
                ]
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "hex",
                options: [
                    { value: "hex", label: "Hexadecimal" },
                    { value: "base64", label: "Base64" },
                ]
            }
        ],
        processingMode: "configurable",
        execute: async (input, params) => {
            const algorithm = (params.algorithm as string) || "SHA-256";
            const outputFormat = (params.outputFormat as string) || "hex";

            const hasWebCrypto = typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined';

            if (hasWebCrypto) {
                const data = new TextEncoder().encode(input);
                const hashBuffer = await crypto.subtle.digest(algorithm, data);
                const hashArray = new Uint8Array(hashBuffer);

                if (outputFormat === 'base64') {
                    let binary = '';
                    hashArray.forEach(byte => { binary += String.fromCharCode(byte); });
                    return btoa(binary);
                }
                return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                const nodeCrypto = await import('crypto');
                const algoMap: Record<string, string> = {
                    'SHA-1': 'sha1',
                    'SHA-256': 'sha256',
                    'SHA-384': 'sha384',
                    'SHA-512': 'sha512',
                };
                const hash = nodeCrypto.createHash(algoMap[algorithm] || 'sha256');
                hash.update(input);
                return hash.digest(outputFormat === 'base64' ? 'base64' : 'hex');
            }
        },
        keywords: ["hash", "digest", "sha", "sha256", "sha512", "checksum", "fingerprint", "crypto"],
        source: "core",
    },

    // === HMAC ===
    {
        id: "crypto.hmac",
        name: "Generate HMAC",
        description: "Generate Hash-based Message Authentication Code using a secret key",
        categories: ["hashing", "encryption"],
        parameters: [
            {
                name: "key",
                label: "Secret Key",
                type: "string",
                default: "",
                required: true,
                description: "Secret key for HMAC generation"
            },
            {
                name: "algorithm",
                label: "Algorithm",
                type: "select",
                default: "SHA-256",
                options: [
                    { value: "SHA-1", label: "SHA-1" },
                    { value: "SHA-256", label: "SHA-256" },
                    { value: "SHA-384", label: "SHA-384" },
                    { value: "SHA-512", label: "SHA-512" }
                ]
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "hex",
                options: [
                    { value: "hex", label: "Hexadecimal" },
                    { value: "base64", label: "Base64" }
                ]
            }
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const key = (params.key as string) ?? "";
            const algorithm = (params.algorithm as string) ?? "SHA-256";
            const outputFormat = (params.outputFormat as string) ?? "hex";

            if (!key) {
                throw new Error('Secret key is required for HMAC generation');
            }

            try {
                // Try Web Crypto API first (supported in modern Node.js 15+ and all browsers)
                // Falls back to Node.js crypto if TextEncoder or crypto.subtle is not available
                const hasWebCrypto = typeof crypto !== 'undefined' &&
                                    crypto.subtle &&
                                    typeof TextEncoder !== 'undefined';

                if (hasWebCrypto) {
                    const encoder = new TextEncoder();
                    const keyBuffer = encoder.encode(key);
                    const dataBuffer = encoder.encode(input);

                    // Import the key
                    const cryptoKey = await crypto.subtle.importKey(
                        'raw',
                        keyBuffer,
                        { name: 'HMAC', hash: algorithm },
                        false,
                        ['sign']
                    );

                    // Generate HMAC
                    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);

                    // Convert to requested format
                    const signatureArray = new Uint8Array(signature);

                    if (outputFormat === 'base64') {
                        // Convert to base64
                        let binary = '';
                        signatureArray.forEach(byte => {
                            binary += String.fromCharCode(byte);
                        });
                        return btoa(binary);
                    } else {
                        // Convert to hex
                        return Array.from(signatureArray)
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('');
                    }
                } else {
                    // Fallback to Node.js crypto (for test environments or old Node versions)
                    const nodeCrypto = await import('crypto');

                    // Map algorithm names to Node.js format
                    const algoMap: Record<string, string> = {
                        'SHA-1': 'sha1',
                        'SHA-256': 'sha256',
                        'SHA-384': 'sha384',
                        'SHA-512': 'sha512'
                    };

                    const hmac = nodeCrypto.createHmac(algoMap[algorithm] || 'sha256', key);
                    hmac.update(input);

                    if (outputFormat === 'base64') {
                        return hmac.digest('base64');
                    } else {
                        return hmac.digest('hex');
                    }
                }
            } catch (e: any) {
                throw new Error(`Failed to generate HMAC: ${e.message}`);
            }
        },
        keywords: ["hmac", "hash", "mac", "signature", "crypto", "auth", "webhook"],
        source: "core",
    },

    // === AES-GCM ===
    {
        id: "crypto.aes-encrypt",
        name: "AES Encrypt",
        description:
            "Encrypt text with AES-256-GCM. Output is Base64 or hex-encoded (salt + IV + ciphertext + auth tag). Key is derived from the passphrase via PBKDF2-SHA256.",
        categories: ["encryption"],
        parameters: [
            {
                name: "passphrase",
                label: "Passphrase",
                type: "string",
                default: "",
                required: true,
                placeholder: "Enter passphrase…",
                description: "Used to derive the 256-bit encryption key via PBKDF2.",
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "base64",
                options: [
                    { value: "base64", label: "Base64" },
                    { value: "hex", label: "Hexadecimal" },
                ],
            },
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const passphrase = (params.passphrase as string) ?? "";
            const outputFormat = (params.outputFormat as string) ?? "base64";

            if (!passphrase) throw new Error("Passphrase is required");

            const hasWebCrypto =
                typeof crypto !== "undefined" &&
                !!crypto.subtle &&
                typeof TextEncoder !== "undefined";

            let combined: Uint8Array;

            if (hasWebCrypto) {
                const enc = new TextEncoder();
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const iv = crypto.getRandomValues(new Uint8Array(12));

                const keyMaterial = await crypto.subtle.importKey(
                    "raw",
                    enc.encode(passphrase),
                    "PBKDF2",
                    false,
                    ["deriveKey"],
                );
                const key = await crypto.subtle.deriveKey(
                    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
                    keyMaterial,
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["encrypt"],
                );
                // Web Crypto appends the 16-byte auth tag at the end of the ciphertext buffer
                const ciphertextAndTag = new Uint8Array(
                    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(input)),
                );
                combined = new Uint8Array(16 + 12 + ciphertextAndTag.byteLength);
                combined.set(salt, 0);
                combined.set(iv, 16);
                combined.set(ciphertextAndTag, 28);
            } else {
                const nc = await import("crypto");
                const salt = nc.randomBytes(16);
                const iv = nc.randomBytes(12);
                const key = nc.pbkdf2Sync(passphrase, salt, 100_000, 32, "sha256");
                const cipher = nc.createCipheriv("aes-256-gcm", key, iv);
                const ciphertext = Buffer.concat([cipher.update(input, "utf8"), cipher.final()]);
                // Store ciphertext first, then auth tag — matches Web Crypto layout
                const authTag = cipher.getAuthTag();
                const buf = Buffer.concat([salt, iv, ciphertext, authTag]);
                combined = new Uint8Array(buf);
            }

            if (outputFormat === "hex") {
                return Array.from(combined)
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
            }
            return btoa(String.fromCharCode(...combined));
        },
        keywords: ["aes", "encrypt", "gcm", "symmetric", "cipher", "passphrase", "pbkdf2", "secret"],
        source: "core",
    },
    {
        id: "crypto.aes-decrypt",
        name: "AES Decrypt",
        description:
            "Decrypt AES-256-GCM ciphertext produced by AES Encrypt. Accepts Base64 or hex input.",
        categories: ["encryption"],
        parameters: [
            {
                name: "passphrase",
                label: "Passphrase",
                type: "string",
                default: "",
                required: true,
                placeholder: "Enter passphrase…",
            },
            {
                name: "inputFormat",
                label: "Input Format",
                type: "select",
                default: "base64",
                options: [
                    { value: "base64", label: "Base64" },
                    { value: "hex", label: "Hexadecimal" },
                ],
            },
        ],
        processingMode: "entire",
        execute: async (input, params) => {
            const passphrase = (params.passphrase as string) ?? "";
            const inputFormat = (params.inputFormat as string) ?? "base64";

            if (!passphrase) throw new Error("Passphrase is required");

            let bytes: Uint8Array;
            if (inputFormat === "hex") {
                const hex = input.trim().replace(/\s/g, "");
                if (hex.length % 2 !== 0) throw new Error("Invalid hex input: odd length");
                bytes = new Uint8Array(hex.length / 2);
                for (let i = 0; i < hex.length; i += 2)
                    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
            } else {
                const bin = atob(input.trim());
                bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            }

            // Minimum: salt(16) + iv(12) + authTag(16) = 44 bytes; plaintext may be 0 bytes
            if (bytes.length < 44)
                throw new Error("Ciphertext too short — expected at least 44 bytes");

            const salt = bytes.slice(0, 16);
            const iv = bytes.slice(16, 28);
            // Remaining bytes: ciphertext + 16-byte auth tag (appended at end)
            const ciphertextAndTag = bytes.slice(28);

            const hasWebCrypto =
                typeof crypto !== "undefined" &&
                !!crypto.subtle &&
                typeof TextEncoder !== "undefined";

            if (hasWebCrypto) {
                const enc = new TextEncoder();
                const keyMaterial = await crypto.subtle.importKey(
                    "raw",
                    enc.encode(passphrase),
                    "PBKDF2",
                    false,
                    ["deriveKey"],
                );
                const key = await crypto.subtle.deriveKey(
                    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
                    keyMaterial,
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["decrypt"],
                );
                try {
                    const plaintext = await crypto.subtle.decrypt(
                        { name: "AES-GCM", iv },
                        key,
                        ciphertextAndTag,
                    );
                    return new TextDecoder().decode(plaintext);
                } catch {
                    throw new Error("Decryption failed — wrong passphrase or corrupted ciphertext");
                }
            } else {
                const nc = await import("crypto");
                const key = nc.pbkdf2Sync(passphrase, salt, 100_000, 32, "sha256");
                const authTag = Buffer.from(ciphertextAndTag.slice(ciphertextAndTag.length - 16));
                const ciphertext = Buffer.from(ciphertextAndTag.slice(0, ciphertextAndTag.length - 16));
                const decipher = nc.createDecipheriv("aes-256-gcm", key, Buffer.from(iv));
                decipher.setAuthTag(authTag);
                try {
                    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
                } catch {
                    throw new Error("Decryption failed — wrong passphrase or corrupted ciphertext");
                }
            }
        },
        keywords: ["aes", "decrypt", "gcm", "symmetric", "cipher", "passphrase", "pbkdf2", "secret"],
        source: "core",
    },
];

// Self-register all operations
cryptoOperations.forEach(op => operationRegistry.register(op));

export default cryptoOperations;
