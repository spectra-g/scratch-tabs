import { OperationDefinition } from "../types";

/**
 * Encoding Pipeline Operations
 *
 * Operations for converting between different string encodings and formats.
 */
export const encodingOperations: OperationDefinition[] = [
    // === HEX & BINARY ===
    {
        id: "encoding.to-hex",
        name: "To Hex",
        description: "Convert text to hexadecimal representation",
        categories: ["encoding", "binary"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "none",
                options: [
                    { value: "none", label: "None (4142)" },
                    { value: "space", label: "Space (41 42)" },
                    { value: "colon", label: "Colon (41:42)" },
                    { value: "comma", label: "Comma (41,42)" },
                    { value: "0x", label: "0x Prefix (0x41 0x42)" },
                ]
            },
            {
                name: "uppercase",
                label: "Uppercase",
                type: "boolean",
                default: true,
                description: "Use uppercase hex letters (A-F vs a-f)"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) || "none";
            const uppercase = params.uppercase ?? true;

            const hexChars = Array.from(input).map(char => {
                let hex = char.charCodeAt(0).toString(16).padStart(2, '0');
                return uppercase ? hex.toUpperCase() : hex;
            });

            switch (delimiter) {
                case "space": return hexChars.join(' ');
                case "colon": return hexChars.join(':');
                case "comma": return hexChars.join(',');
                case "0x": return hexChars.map(h => '0x' + h).join(' ');
                default: return hexChars.join('');
            }
        },
        keywords: ["hex", "encode", "binary", "convert", "hexadecimal"],
        source: "core",
    },
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
        id: "encoding.to-charcode",
        name: "To Charcode",
        description: "Convert text to character codes (decimal, hex, binary)",
        categories: ["encoding"],
        parameters: [
            {
                name: "base",
                label: "Output Base",
                type: "select",
                default: "10",
                options: [
                    { value: "10", label: "Decimal (65, 66)" },
                    { value: "16", label: "Hexadecimal (41, 42)" },
                    { value: "2", label: "Binary (01000001)" },
                ]
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "string",
                default: " ",
                description: "Character separating the codes"
            },
            {
                name: "padding",
                label: "Pad Output",
                type: "boolean",
                default: true,
                description: "Pad numbers to consistent width"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const base = parseInt((params.base as string) || "10");
            const delim = (params.delimiter as string) ?? " ";
            const padding = params.padding ?? true;

            const padWidth = base === 2 ? 8 : (base === 16 ? 2 : 0);

            return Array.from(input).map(char => {
                let code = char.charCodeAt(0).toString(base);
                if (padding && padWidth > 0) {
                    code = code.padStart(padWidth, '0');
                }
                return base === 16 ? code.toUpperCase() : code;
            }).join(delim);
        },
        keywords: ["charcode", "decimal", "ascii", "convert", "unicode"],
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
        id: "encoding.to-html-entity",
        name: "To HTML Entity",
        description: "Encode special characters as HTML entities",
        categories: ["encoding", "web"],
        parameters: [
            {
                name: "mode",
                label: "Encoding Mode",
                type: "select",
                default: "special",
                options: [
                    { value: "special", label: "Special chars only (<>&\"')" },
                    { value: "named", label: "All named entities" },
                    { value: "numeric", label: "Numeric (&#65;)" },
                    { value: "hex", label: "Hex (&#x41;)" },
                ]
            },
            {
                name: "encodeNonAscii",
                label: "Encode Non-ASCII",
                type: "boolean",
                default: false,
                description: "Also encode characters outside ASCII range"
            }
        ],
        execute: (input, params) => {
            const mode = (params.mode as string) || "special";
            const encodeNonAscii = params.encodeNonAscii ?? false;

            // Named entity map (common entities)
            const namedEntities: Record<string, string> = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&apos;',
                ' ': '&nbsp;',
                '¢': '&cent;',
                '£': '&pound;',
                '¥': '&yen;',
                '€': '&euro;',
                '©': '&copy;',
                '®': '&reg;',
                '™': '&trade;',
                '—': '&mdash;',
                '–': '&ndash;',
                '…': '&hellip;',
                '•': '&bull;',
                '°': '&deg;',
                '±': '&plusmn;',
                '×': '&times;',
                '÷': '&divide;',
                '≠': '&ne;',
                '≤': '&le;',
                '≥': '&ge;',
                '∞': '&infin;',
            };

            // Special chars that must always be encoded
            const specialChars = new Set(['&', '<', '>', '"', "'"]);

            return Array.from(input).map(char => {
                const code = char.charCodeAt(0);

                if (mode === "special") {
                    // Only encode the 5 special HTML chars
                    if (specialChars.has(char)) {
                        return namedEntities[char] || `&#${code};`;
                    }
                    if (encodeNonAscii && code > 127) {
                        return `&#${code};`;
                    }
                    return char;
                }

                if (mode === "named") {
                    if (namedEntities[char]) {
                        return namedEntities[char];
                    }
                    if (encodeNonAscii && code > 127) {
                        return `&#${code};`;
                    }
                    return char;
                }

                if (mode === "numeric") {
                    if (specialChars.has(char) || (encodeNonAscii && code > 127)) {
                        return `&#${code};`;
                    }
                    return char;
                }

                if (mode === "hex") {
                    if (specialChars.has(char) || (encodeNonAscii && code > 127)) {
                        return `&#x${code.toString(16).toUpperCase()};`;
                    }
                    return char;
                }

                return char;
            }).join('');
        },
        keywords: ["html", "entity", "encode", "web", "escape"],
        source: "core",
    },
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
    },

    // === QUOTED-PRINTABLE ===
    {
        id: "encoding.quoted-printable",
        name: "Decode Quoted-Printable",
        description: "Decode MIME Quoted-Printable encoding (e.g., =3D to =)",
        categories: ["encoding"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            // Decode quoted-printable encoding
            let result = input;

            // First, handle soft line breaks (=\r\n or =\n)
            result = result.replace(/=\r?\n/g, '');

            // Handle edge case of = at end of input BEFORE decoding hex
            // (a trailing = without two hex digits is just removed)
            result = result.replace(/=$/g, '');

            // Then decode all hex encoded characters (=XX)
            result = result.replace(/=([0-9A-F]{2})/gi, (_, hex) =>
                String.fromCharCode(parseInt(hex, 16))
            );

            return result;
        },
        keywords: ["quoted", "printable", "mime", "email", "decode"],
        source: "core",
    }
];

// Self-register all operations
import { operationRegistry } from "../OperationRegistry";
encodingOperations.forEach(op => operationRegistry.register(op));
