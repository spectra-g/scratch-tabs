import { OperationDefinition } from "../types";

/**
 * Compression Pipeline Operations
 *
 * Operations for compressing and decompressing data.
 * Leverages the Compression Streams API.
 */
export const compressionOperations: OperationDefinition[] = [
    {
        id: "compression.gzip",
        name: "Gzip",
        description: "Compress data using GZIP",
        categories: ["compression"],
        parameters: [
            {
                name: "outputEncoding",
                label: "Output Encoding",
                type: "select",
                default: "base64",
                options: [
                    { value: "base64", label: "Base64" },
                    { value: "latin1", label: "Raw String (Latin-1)" }
                ]
            }
        ],
        execute: async (input) => {
            if (!input) return "";

            // Check for CompressionStream API
            if (typeof CompressionStream === 'undefined') {
                throw new Error("CompressionStream API not supported in this browser");
            }

            try {
                // 1. Convert string to Uint8Array
                let Encoder;
                if (typeof TextEncoder === 'undefined') {
                    Encoder = require('util').TextEncoder;
                } else {
                    Encoder = TextEncoder;
                }
                const encoder = new Encoder();
                const inputBytes = encoder.encode(input);

                // 2. Compress using CompressionStream
                const cs = new CompressionStream('gzip');
                const writer = cs.writable.getWriter();
                writer.write(inputBytes);
                writer.close();

                // 3. Read compressed output
                const response = new Response(cs.readable);
                const compressedBuffer = await response.arrayBuffer();
                const compressedBytes = new Uint8Array(compressedBuffer);

                // 4. Convert to Base64
                let binary = '';
                compressedBytes.forEach(byte => {
                    binary += String.fromCharCode(byte);
                });
                return btoa(binary);
            } catch (e) {
                throw new Error("Compression failed: " + (e as Error).message);
            }
        },
        keywords: ["gzip", "compress", "zip", "deflate"],
        source: "core",
    },
    {
        id: "compression.gunzip",
        name: "Gunzip",
        description: "Decompress GZIP data (Base64 input recommended)",
        categories: ["compression"],
        parameters: [
            {
                name: "inputEncoding",
                label: "Input Encoding",
                type: "select",
                default: "base64",
                options: [{ value: "base64", label: "Base64" }, { value: "latin1", label: "Raw String" }]
            }
        ],
        execute: async (input, params) => {
            if (!input) return "";

            // 1. Convert Input String -> Uint8Array
            let binaryString = input;
            if (params.inputEncoding === 'base64') {
                // Determine environment - Browser or Worker (atob usually available in both modern ones)
                // In Node test env, might need polyfill, but we target browser.
                try {
                    binaryString = atob(input.replace(/\s/g, ''));
                } catch (e) {
                    throw new Error("Invalid Base64 input");
                }
            }

            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // 2. Decompress
            if (typeof DecompressionStream === 'undefined') {
                throw new Error("DecompressionStream API not supported in this browser");
            }

            try {
                const ds = new DecompressionStream('gzip');
                const writer = ds.writable.getWriter();
                writer.write(bytes);
                writer.close();

                // 3. Convert Output -> String
                let Decoder;
                if (typeof TextDecoder === 'undefined') {
                    Decoder = require('util').TextDecoder;
                } else {
                    Decoder = TextDecoder;
                }
                const response = new Response(ds.readable);
                const arrayBuffer = await response.arrayBuffer();
                // Use 'latin1' (ISO-8859-1) to preserve binary data 1:1. 
                return new Decoder('latin1').decode(arrayBuffer as ArrayBuffer);
            } catch (e) {
                throw new Error("Decompression failed: " + (e as Error).message);
            }
        }
    }
];

// Self-register all operations
import { operationRegistry } from "../OperationRegistry";
compressionOperations.forEach(op => operationRegistry.register(op));
