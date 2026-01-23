import { OperationDefinition } from "../types";

/**
 * Extraction Pipeline Operations
 * 
 * Operations for extracting specific patterns from text.
 */
export const extractionOperations: OperationDefinition[] = [
    {
        id: "extract.ip",
        name: "Extract IP Addresses",
        description: "Extract IPv4 addresses from text",
        categories: ["extraction", "networking"],
        parameters: [
            { name: "unique", label: "Unique Only", type: "boolean", default: true }
        ],
        execute: (input, params) => {
            // Simple IPv4 regex
            const regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
            const matches = input.match(regex) || [];
            const result = params.unique ? [...new Set(matches)] : matches;
            return result.join('\n');
        },
        keywords: ["ip", "address", "ipv4", "networking"],
        source: "core",
    },
    {
        id: "extract.urls",
        name: "Extract URLs",
        description: "Extract http/https URLs",
        categories: ["extraction", "networking"],
        parameters: [
            { name: "unique", label: "Unique Only", type: "boolean", default: true }
        ],
        execute: (input, params) => {
            // Simple URL regex
            const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
            const matches = input.match(regex) || [];
            const result = params.unique ? [...new Set(matches)] : matches;
            return result.join('\n');
        },
        keywords: ["url", "link", "http", "networking"],
        source: "core",
    },
    {
        id: "extract.email",
        name: "Extract Emails",
        description: "Extract email addresses",
        categories: ["extraction"],
        parameters: [
            { name: "unique", label: "Unique Only", type: "boolean", default: true }
        ],
        execute: (input, params) => {
            const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const matches = input.match(regex) || [];
            const result = params.unique ? [...new Set(matches)] : matches;
            return result.join('\n');
        },
        keywords: ["email", "mail", "contact"],
        source: "core",
    }
];

// Self-register all operations
import { operationRegistry } from "../OperationRegistry";
extractionOperations.forEach(op => operationRegistry.register(op));
