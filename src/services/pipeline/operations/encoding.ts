import { OperationDefinition } from "../types";

/**
 * Encoding Pipeline Operations
 * 
 * Operations for converting between different string encodings and formats.
 */
export const encodingOperations: OperationDefinition[] = [
    // === HEX & BINARY ===
    {
        id: "encoding.from-hex",
        name: "From Hex",
        description: "Convert Hex dump back to raw text",
        categories: ["encoding", "binary"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "auto",
                options: [
                    { value: "auto", label: "Auto" },
                    { value: "none", label: "None" },
                    { value: "space", label: "Space" },
                    { value: "colon", label: "Colon" },
                    { value: "comma", label: "Comma" },
                    { value: "0x", label: "0x Prefix" },
                ]
            }
        ],
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) || "auto";
            let cleanInput = input;

            if (delimiter === "auto") {
                // Remove common delimiters
                cleanInput = cleanInput.replace(/[\s:,\n]/g, '').replace(/0x/gi, '');
            } else if (delimiter === "none") {
                // No cleanup
            } else if (delimiter === "space") {
                cleanInput = cleanInput.replace(/\s/g, '');
            } else if (delimiter === "colon") {
                cleanInput = cleanInput.replace(/:/g, '');
            } else if (delimiter === "comma") {
                cleanInput = cleanInput.replace(/,/g, '');
            } else if (delimiter === "0x") {
                cleanInput = cleanInput.replace(/0x/gi, '');
            }

            // Ensure valid hex length
            if (cleanInput.length % 2 !== 0) {
                // Try to handle odd usage if needed, or just throw/warn? 
                // For now, let's just ignore the last char if odd
                cleanInput = cleanInput.slice(0, -1);
            }

            let output = '';
            for (let i = 0; i < cleanInput.length; i += 2) {
                const byteVal = parseInt(cleanInput.substr(i, 2), 16);
                if (!isNaN(byteVal)) {
                    output += String.fromCharCode(byteVal);
                }
            }
            return output;
        },
        keywords: ["hex", "decode", "binary", "convert"],
        source: "core",
    },
    {
        id: "encoding.from-charcode",
        name: "From Charcode",
        description: "Convert character codes (decimal, hex) to text",
        categories: ["encoding"],
        parameters: [
            {
                name: "base",
                label: "Base",
                type: "number",
                default: 10,
                min: 2,
                max: 36
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "string",
                default: " ",
                description: "Character separating the codes (e.g. space, comma)"
            }
        ],
        execute: (input, params) => {
            const base = (params.base as number) || 10;
            const delim = (params.delimiter as string) || " ";

            // Handle simple string splits. 
            // If delim is empty/null, this operation essentially fails unless one char per code (unlikely for >9)
            if (!delim) return input;

            const parts = input.split(delim);
            return parts
                .map(p => {
                    const cleanP = p.trim();
                    if (!cleanP) return '';
                    const code = parseInt(cleanP, base);
                    return isNaN(code) ? '' : String.fromCharCode(code);
                })
                .join('');
        },
        keywords: ["charcode", "decimal", "ascii", "convert"],
        source: "core",
    },

    // === ESCAPING ===
    {
        id: "text.unescape",
        name: "Unescape String",
        description: "Converts escape sequences (\\n, \\t, \\x41, \\u0041) to characters",
        categories: ["text", "formatting"],
        parameters: [],
        execute: (input) => {
            try {
                // JSON.parse is the robust way to handle standard JS escapes
                // We wrap in quotes to treat the whole input as a JSON string
                // But we must escape existing double quotes first to avoid syntax error
                // e.g. input `He said "Hello"` -> JSON string `"He said \"Hello\""`

                // However, the user wants to UNESCAPE existing escapes.
                // Input: `Line 1\nLine 2`
                // JSON need: `"Line 1\nLine 2"` -> parse -> `Line 1
                //                                            Line 2`

                // If input already has quotes like `"foo"`, we shouldn't break.
                // It's tricky. 

                // Let's use the fallback replacer logic as it's safer for partial content
                // unless we are sure it's a valid JSON string body.

                return input
                    .replace(/\\n/g, '\n')
                    .replace(/\\t/g, '\t')
                    .replace(/\\r/g, '\r')
                    .replace(/\\b/g, '\b')
                    .replace(/\\f/g, '\f')
                    .replace(/\\v/g, '\v')
                    .replace(/\\'/g, "'")
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\')
                    // Hex \xHH
                    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                    // Unicode \uHHHH
                    .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
            } catch (e) {
                return input;
            }
        },
        keywords: ["unescape", "decode", "slash"],
        source: "core",
    },
    {
        id: "text.escape",
        name: "Escape String",
        description: "Converts special characters to escape sequences (\\n, \\u0041)",
        categories: ["text", "formatting"],
        parameters: [
            {
                name: "level",
                label: "Level",
                type: "select",
                default: "special",
                options: [
                    { value: "special", label: "Special chars only (\\n, \\t)" },
                    { value: "all", label: "All non-ASCII (\\uXXXX)" }
                ]
            }
        ],
        execute: (input, params) => {
            const level = (params.level as string) || "special";

            if (level === "special") {
                return JSON.stringify(input).slice(1, -1);
            } else {
                // Manual loop for "all" to handle non-ascii
                return input.split('').map(char => {
                    const code = char.charCodeAt(0);
                    if (code < 32 || code > 126) {
                        return '\\u' + code.toString(16).padStart(4, '0');
                    }
                    // Special JSON escape chars
                    if (char === '"') return '\\"';
                    if (char === '\\') return '\\\\';
                    return char;
                }).join('');
            }
        },
        keywords: ["escape", "encode", "slash"],
        source: "core",
    },

    // === HTML ENTITIES ===
    {
        id: "encoding.from-html-entity",
        name: "From HTML Entity",
        description: "Decode HTML entities (e.g. &amp; to &)",
        categories: ["encoding", "web"],
        parameters: [],
        execute: (input) => {
            // Heuristic regex replacer since we might be in a Worker (no DOM)
            return input
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'")
                .replace(/&nbsp;/g, ' ')
                // Hex entities &#xHH;
                .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
                // Decimal entities &#DD;
                .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
        },
        keywords: ["html", "entity", "decode", "web"],
        source: "core",
    }
];

// Self-register all operations
import { operationRegistry } from "../OperationRegistry";
encodingOperations.forEach(op => operationRegistry.register(op));
