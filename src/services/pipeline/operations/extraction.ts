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
    },
    {
        id: "extract.regex-group",
        name: "Extract Regex Capture Group",
        description: "Extract specific capture group content from regex matches",
        categories: ["extraction", "search"],
        parameters: [
            {
                name: "pattern",
                label: "Regex Pattern",
                type: "string",
                default: "",
                required: true,
                description: "Regular expression with capture groups (use parentheses)",
                placeholder: "e.g. ID:(\\d+) or \\[(.*?)\\]"
            },
            {
                name: "group",
                label: "Capture Group",
                type: "number",
                default: 1,
                min: 1,
                max: 9,
                description: "Which capture group to extract (1-based)"
            },
            {
                name: "flags",
                label: "Flags",
                type: "string",
                default: "g",
                description: "Regex flags (g=global, i=case-insensitive, m=multiline)"
            },
            {
                name: "unique",
                label: "Unique Only",
                type: "boolean",
                default: false,
                description: "Remove duplicate matches"
            }
        ],
        execute: (input, params) => {
            const pattern = params.pattern as string;
            const groupIndex = (params.group as number) ?? 1;
            const flags = (params.flags as string) ?? "g";
            const unique = params.unique ?? false;

            if (!pattern) {
                throw new Error('Pattern is required');
            }

            try {
                const regex = new RegExp(pattern, flags);
                const matches: string[] = [];
                let match;

                // Use matchAll for capture groups
                const allMatches = input.matchAll(new RegExp(pattern, flags));

                for (const m of allMatches) {
                    if (m[groupIndex] !== undefined) {
                        matches.push(m[groupIndex]);
                    }
                }

                const result = unique ? [...new Set(matches)] : matches;
                return result.join('\n');
            } catch (e: any) {
                throw new Error(`Invalid regex pattern: ${e.message}`);
            }
        },
        keywords: ["regex", "extract", "capture", "group", "match", "pattern"],
        source: "core",
    },
    {
        id: "extract.numbers",
        name: "Extract Numbers",
        description: "Extract all numbers (integers and decimals) from text",
        categories: ["extraction"],
        parameters: [
            {
                name: "type",
                label: "Number Type",
                type: "select",
                default: "all",
                options: [
                    { value: "all", label: "All Numbers" },
                    { value: "integers", label: "Integers Only" },
                    { value: "decimals", label: "Decimals Only" },
                ]
            },
            {
                name: "includeNegative",
                label: "Include Negative",
                type: "boolean",
                default: true,
                description: "Include negative numbers"
            },
            {
                name: "unique",
                label: "Unique Only",
                type: "boolean",
                default: false
            }
        ],
        execute: (input, params) => {
            const type = (params.type as string) ?? "all";
            const includeNegative = params.includeNegative ?? true;
            const unique = params.unique ?? false;

            let regex: RegExp;
            const negPrefix = includeNegative ? '-?' : '';

            switch (type) {
                case "integers":
                    regex = new RegExp(`${negPrefix}\\b\\d+\\b`, 'g');
                    break;
                case "decimals":
                    regex = new RegExp(`${negPrefix}\\d+\\.\\d+`, 'g');
                    break;
                default: // all
                    regex = new RegExp(`${negPrefix}\\d+(?:\\.\\d+)?`, 'g');
            }

            const matches = input.match(regex) || [];
            const result = unique ? [...new Set(matches)] : matches;
            return result.join('\n');
        },
        keywords: ["numbers", "digits", "extract", "integers", "decimals"],
        source: "core",
    },
    {
        id: "extract.phone",
        name: "Extract Phone Numbers",
        description: "Extract phone numbers in various formats",
        categories: ["extraction"],
        parameters: [
            {
                name: "format",
                label: "Format",
                type: "select",
                default: "all",
                options: [
                    { value: "all", label: "All Formats" },
                    { value: "us", label: "US Format" },
                    { value: "international", label: "International (+XX)" },
                ]
            },
            {
                name: "unique",
                label: "Unique Only",
                type: "boolean",
                default: true
            }
        ],
        execute: (input, params) => {
            const format = (params.format as string) ?? "all";
            const unique = params.unique ?? true;

            let regex: RegExp;

            switch (format) {
                case "us":
                    // US formats: (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
                    regex = /\b(?:\(\d{3}\)\s?|\d{3}[-.]?)\d{3}[-.]?\d{4}\b/g;
                    break;
                case "international":
                    // International: +1 234 567 8900, +44 20 7123 4567
                    regex = /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
                    break;
                default: // all
                    // Comprehensive pattern for various formats
                    regex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{2,4}(?:[-.\s]?\d{1,4})?/g;
            }

            const matches = input.match(regex) || [];
            // Filter out matches that are too short (less than 7 digits)
            const filtered = matches.filter(m => {
                const digits = m.replace(/\D/g, '');
                return digits.length >= 7 && digits.length <= 15;
            });

            const result = unique ? [...new Set(filtered)] : filtered;
            return result.join('\n');
        },
        keywords: ["phone", "telephone", "mobile", "number", "contact"],
        source: "core",
    },
    {
        id: "extract.dates",
        name: "Extract Dates",
        description: "Extract date strings in various formats",
        categories: ["extraction", "datetime"],
        parameters: [
            {
                name: "format",
                label: "Format to Find",
                type: "select",
                default: "all",
                options: [
                    { value: "all", label: "All Formats" },
                    { value: "iso", label: "ISO (2024-01-15)" },
                    { value: "us", label: "US (01/15/2024, Jan 15, 2024)" },
                    { value: "eu", label: "EU (15/01/2024, 15 Jan 2024)" },
                ]
            },
            {
                name: "unique",
                label: "Unique Only",
                type: "boolean",
                default: true
            }
        ],
        execute: (input, params) => {
            const format = (params.format as string) ?? "all";
            const unique = params.unique ?? true;

            const patterns: RegExp[] = [];

            // ISO format: 2024-01-15, 2024-01-15T10:30:00
            const isoPattern = /\b\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b/g;

            // US numeric: 01/15/2024, 1/15/24
            const usNumericPattern = /\b(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])\/(?:\d{4}|\d{2})\b/g;

            // US text: Jan 15, 2024 or January 15, 2024
            const usTextPattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?[,\s]+\d{4}\b/gi;

            // EU numeric: 15/01/2024, 15-01-2024
            const euNumericPattern = /\b(?:0?[1-9]|[12]\d|3[01])[\/\-](?:0?[1-9]|1[0-2])[\/\-](?:\d{4}|\d{2})\b/g;

            // EU text: 15 Jan 2024, 15 January 2024
            const euTextPattern = /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+\d{4}\b/gi;

            switch (format) {
                case "iso":
                    patterns.push(isoPattern);
                    break;
                case "us":
                    patterns.push(usNumericPattern, usTextPattern);
                    break;
                case "eu":
                    patterns.push(euNumericPattern, euTextPattern);
                    break;
                default: // all
                    patterns.push(isoPattern, usNumericPattern, usTextPattern, euNumericPattern, euTextPattern);
            }

            const allMatches: string[] = [];
            patterns.forEach(pattern => {
                const matches = input.match(pattern) || [];
                allMatches.push(...matches);
            });

            const result = unique ? [...new Set(allMatches)] : allMatches;
            return result.join('\n');
        },
        keywords: ["date", "time", "extract", "datetime", "calendar"],
        source: "core",
    },
    {
        id: "ip.change-format",
        name: "Change IP Format",
        description: "Convert IPv4 addresses between dotted decimal, integer, hex, and octal",
        categories: ["networking"],
        parameters: [
            {
                name: "inputFormat",
                label: "Input Format",
                type: "select",
                default: "dotted",
                options: [
                    { value: "dotted", label: "Dotted Decimal (192.168.1.1)" },
                    { value: "decimal", label: "Decimal Integer (3232235777)" },
                    { value: "hex", label: "Hex (0xC0A80101)" },
                    { value: "octal", label: "Dotted Octal (0300.0250.0001.0001)" },
                ]
            },
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "decimal",
                options: [
                    { value: "dotted", label: "Dotted Decimal (192.168.1.1)" },
                    { value: "decimal", label: "Decimal Integer (3232235777)" },
                    { value: "hex", label: "Hex (0xC0A80101)" },
                    { value: "octal", label: "Dotted Octal (0300.0250.0001.0001)" },
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const inputFormat = (params.inputFormat as string) || "dotted";
            const outputFormat = (params.outputFormat as string) || "decimal";

            function parseIp(ip: string): number {
                switch (inputFormat) {
                    case "dotted": {
                        const parts = ip.split('.').map(Number);
                        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
                            throw new Error(`Invalid dotted IP: ${ip}`);
                        }
                        return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
                    }
                    case "decimal": {
                        const n = parseInt(ip, 10);
                        if (isNaN(n) || n < 0 || n > 4294967295) throw new Error(`Invalid decimal IP: ${ip}`);
                        return n >>> 0;
                    }
                    case "hex": {
                        const n = parseInt(ip.replace(/^0x/i, ''), 16);
                        if (isNaN(n)) throw new Error(`Invalid hex IP: ${ip}`);
                        return n >>> 0;
                    }
                    case "octal": {
                        const parts = ip.split('.').map(p => parseInt(p, 8));
                        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
                            throw new Error(`Invalid octal IP: ${ip}`);
                        }
                        return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
                    }
                    default:
                        throw new Error(`Unknown input format: ${inputFormat}`);
                }
            }

            function formatIp(value: number): string {
                const a = (value >>> 24) & 0xff;
                const b = (value >>> 16) & 0xff;
                const c = (value >>> 8) & 0xff;
                const d = value & 0xff;
                switch (outputFormat) {
                    case "dotted":  return `${a}.${b}.${c}.${d}`;
                    case "decimal": return String(value >>> 0);
                    case "hex":     return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
                    case "octal":   return [a, b, c, d].map(n => '0' + n.toString(8).padStart(3, '0')).join('.');
                    default: throw new Error(`Unknown output format: ${outputFormat}`);
                }
            }

            // Build regex for the selected input format
            const patterns: Record<string, RegExp> = {
                dotted:  /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
                decimal: /\b(?:429496729[0-5]|42949672[0-8]\d|4294967[01]\d{2}|429496[0-6]\d{3}|42949[0-5]\d{4}|4294[0-8]\d{5}|429[0-3]\d{6}|42[0-8]\d{7}|4[01]\d{8}|[1-3]\d{9}|\d{1,9})\b/g,
                hex:     /\b0x[0-9a-fA-F]{1,8}\b/g,
                octal:   /\b0\d{1,3}\.0\d{1,3}\.0\d{1,3}\.0\d{1,3}\b/g,
            };

            const regex = patterns[inputFormat];
            if (!regex) throw new Error(`Unknown input format: ${inputFormat}`);

            return input.replace(regex, (match) => {
                try {
                    return formatIp(parseIp(match));
                } catch {
                    return match;
                }
            });
        },
        keywords: ["ip", "ipv4", "address", "format", "convert", "decimal", "hex", "octal", "networking"],
        source: "core",
    },
];

// Self-register all operations
import { operationRegistry } from "../OperationRegistry";
extractionOperations.forEach(op => operationRegistry.register(op));
