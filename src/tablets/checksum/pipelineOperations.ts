import { operationRegistry } from "../../services/pipeline/OperationRegistry";
import { OperationDefinition } from "../../services/pipeline/types";
import { hashText } from "./utils/hashing";
import { HashAlgorithm } from "./types";

/**
 * Checksum Pipeline Operations
 */
const checksumOperations: OperationDefinition[] = [
    {
        id: "checksum.calculate",
        name: "Calculate Checksum",
        description: "Calculate hash (MD5, SHA, etc.) for each line or the entire text",
        categories: ["hashing"],
        parameters: [
            {
                name: "algorithm",
                label: "Algorithm",
                type: "select",
                default: "SHA-256",
                options: [
                    { value: "MD5", label: "MD5" },
                    { value: "SHA-1", label: "SHA-1" },
                    { value: "SHA-256", label: "SHA-256" },
                    { value: "SHA-384", label: "SHA-384" },
                    { value: "SHA-512", label: "SHA-512" },
                    { value: "CRC32", label: "CRC32" },
                ],
            },
            {
                name: "mode",
                label: "Process Mode",
                type: "select",
                default: "entire-text",
                options: [
                    { value: "entire-text", label: "Entire Text" },
                    { value: "line-by-line", label: "Line by Line" },
                ],
            },
        ],
        execute: async (input, params) => {
            const algorithm = (params.algorithm as HashAlgorithm) || "SHA-256";
            const mode = (params.mode as string) || "entire-text";

            if (mode === "line-by-line") {
                const lines = input.split("\n");
                const results = await Promise.all(
                    lines.map(async (line) => {
                        if (!line.trim()) return "";
                        const hashes = await hashText(line, [algorithm]);
                        return hashes[algorithm];
                    })
                );
                return results.join("\n");
            } else {
                const hashes = await hashText(input, [algorithm]);
                return hashes[algorithm];
            }
        },
        keywords: ["hash", "checksum", "md5", "sha", "crc32"],
        source: "tablet",
    },
];

// Register all checksum operations
checksumOperations.forEach((op) => operationRegistry.register(op));
