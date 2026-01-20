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
        description: "Calculate hash (MD5, SHA, etc.)",
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
        ],
        processingMode: "configurable",
        execute: async (input, params) => {
            if (!input.trim()) {
                return "";
            }
            const algorithm = (params.algorithm as HashAlgorithm) || "SHA-256";
            const hashes = await hashText(input, [algorithm]);
            return hashes[algorithm];
        },
        keywords: ["hash", "checksum", "md5", "sha", "crc32"],
        source: "tablet",
    },
];

// Register all checksum operations
checksumOperations.forEach((op) => operationRegistry.register(op));
