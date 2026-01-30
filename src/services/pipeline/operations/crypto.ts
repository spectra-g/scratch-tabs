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
    }
];

// Self-register all operations
cryptoOperations.forEach(op => operationRegistry.register(op));

export default cryptoOperations;
