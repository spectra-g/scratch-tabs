import { OperationDefinition } from "../types";
import punycode from 'punycode/';

// === Base32 helpers (RFC 4648) ===
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(input: string, padding: boolean): string {
    const bytes = typeof TextEncoder !== 'undefined'
        ? Array.from(new TextEncoder().encode(input))
        : Array.from(input).map(c => c.charCodeAt(0) & 0xff);

    let bits = 0;
    let value = 0;
    let output = '';

    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
    }

    if (padding) {
        while (output.length % 8 !== 0) output += '=';
    }

    return output;
}

function decodeBase32(input: string): string {
    const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of clean) {
        const idx = BASE32_ALPHABET.indexOf(char);
        if (idx === -1) throw new Error(`Invalid Base32 character: ${char}`);
        value = (value << 5) | idx;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(new Uint8Array(bytes));
    }
    return bytes.map(b => String.fromCharCode(b)).join('');
}

// === Base58 helpers (Bitcoin alphabet) ===
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(input: string): string {
    const bytes = typeof TextEncoder !== 'undefined'
        ? Array.from(new TextEncoder().encode(input))
        : Array.from(input).map(c => c.charCodeAt(0) & 0xff);

    let leadingZeros = 0;
    while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) leadingZeros++;

    let num = BigInt(0);
    for (const byte of bytes) num = (num << BigInt(8)) + BigInt(byte);

    const result: string[] = [];
    while (num > BigInt(0)) {
        result.unshift(BASE58_ALPHABET[Number(num % BigInt(58))]);
        num = num / BigInt(58);
    }

    return '1'.repeat(leadingZeros) + result.join('');
}

function decodeBase58(input: string): string {
    const clean = input.replace(/\s/g, '');

    let leadingZeros = 0;
    while (leadingZeros < clean.length && clean[leadingZeros] === '1') leadingZeros++;

    let num = BigInt(0);
    for (const char of clean) {
        const idx = BASE58_ALPHABET.indexOf(char);
        if (idx === -1) throw new Error(`Invalid Base58 character: ${char}`);
        num = num * BigInt(58) + BigInt(idx);
    }

    const bytes: number[] = [];
    while (num > BigInt(0)) {
        bytes.unshift(Number(num & BigInt(0xff)));
        num >>= BigInt(8);
    }

    const allBytes = new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes]);

    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(allBytes);
    }
    return Array.from(allBytes).map(b => String.fromCharCode(b)).join('');
}

// === Ascii85 (Base85 / Adobe) helpers ===

function encodeBase85(input: string): string {
    const bytes: number[] = typeof TextEncoder !== 'undefined'
        ? Array.from(new TextEncoder().encode(input))
        : Array.from(input).map(c => c.charCodeAt(0) & 0xff);

    const parts: string[] = ['<~'];

    for (let i = 0; i < bytes.length; i += 4) {
        const chunk = bytes.slice(i, i + 4);
        const n = chunk.length;
        while (chunk.length < 4) chunk.push(0);

        const val = ((chunk[0] << 24) | (chunk[1] << 16) | (chunk[2] << 8) | chunk[3]) >>> 0;

        if (val === 0 && n === 4) {
            parts.push('z');
        } else {
            const c: number[] = new Array(5);
            let v = val;
            for (let j = 4; j >= 0; j--) {
                c[j] = 33 + (v % 85);
                v = Math.floor(v / 85);
            }
            parts.push(String.fromCharCode(...c.slice(0, n + 1)));
        }
    }

    parts.push('~>');
    return parts.join('');
}

function decodeBase85(input: string): string {
    let clean = input.trim();
    if (clean.startsWith('<~')) clean = clean.slice(2);
    if (clean.endsWith('~>')) clean = clean.slice(0, -2);
    clean = clean.replace(/\s/g, '');

    const bytes: number[] = [];
    let i = 0;

    while (i < clean.length) {
        if (clean[i] === 'z') {
            bytes.push(0, 0, 0, 0);
            i++;
            continue;
        }
        const chunkLen = Math.min(5, clean.length - i);
        const padded = clean.slice(i, i + chunkLen).padEnd(5, 'u');
        i += chunkLen;

        let val = 0;
        for (let j = 0; j < 5; j++) {
            const code = padded.charCodeAt(j) - 33;
            if (code < 0 || code > 84) throw new Error(`Invalid Ascii85 character: ${JSON.stringify(padded[j])}`);
            val = val * 85 + code;
        }
        val = val >>> 0;

        const outBytes = [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
        bytes.push(...outBytes.slice(0, chunkLen - 1));
    }

    if (typeof TextDecoder !== 'undefined') {
        return new TextDecoder().decode(new Uint8Array(bytes));
    }
    return bytes.map(b => String.fromCharCode(b)).join('');
}

// === Morse code lookup tables ===
const MORSE_ENCODE_MAP: Record<string, string> = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
    H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
    O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
    V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
    "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
    "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
    ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
    "!": "-.-.--", "/": "-..-.", "(": "-.--.", ")": "-.--.-",
    "&": ".-...", ":": "---...", ";": "-.-.-.", "=": "-...-",
    "+": ".-.-.", "-": "-....-", "_": "..--.-", '"': ".-..-.",
    "$": "...-..-", "@": ".--.-.",
};

const MORSE_DECODE_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(MORSE_ENCODE_MAP).map(([k, v]) => [v, k]),
);

// === NATO phonetic alphabet lookup table ===
const NATO_PHONETIC_MAP: Record<string, string> = {
    A: "Alfa", B: "Bravo", C: "Charlie", D: "Delta", E: "Echo",
    F: "Foxtrot", G: "Golf", H: "Hotel", I: "India", J: "Juliet",
    K: "Kilo", L: "Lima", M: "Mike", N: "November", O: "Oscar",
    P: "Papa", Q: "Quebec", R: "Romeo", S: "Sierra", T: "Tango",
    U: "Uniform", V: "Victor", W: "Whiskey", X: "X-ray", Y: "Yankee",
    Z: "Zulu",
    "0": "Zero", "1": "One", "2": "Two", "3": "Three", "4": "Four",
    "5": "Five", "6": "Six", "7": "Seven", "8": "Eight", "9": "Nine",
    " ": "(space)",
};

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

    // === BINARY STRING ===
    {
        id: "encoding.to-binary",
        name: "To Binary",
        description: "Convert text to binary bit string (e.g. A → 01000001)",
        categories: ["encoding", "binary"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "space",
                options: [
                    { value: "space", label: "Space (01000001 01000010)" },
                    { value: "none", label: "None (0100000101000010)" },
                    { value: "newline", label: "Newline" },
                    { value: "comma", label: "Comma" },
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) || "space";
            const sep = delimiter === "newline" ? "\n" : delimiter === "comma" ? "," : delimiter === "none" ? "" : " ";
            return Array.from(input)
                .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
                .join(sep);
        },
        keywords: ["binary", "encode", "bits", "convert", "bitstring"],
        source: "core",
    },
    {
        id: "encoding.from-binary",
        name: "From Binary",
        description: "Convert binary bit string back to text",
        categories: ["encoding", "binary"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "auto",
                options: [
                    { value: "auto", label: "Auto" },
                    { value: "space", label: "Space" },
                    { value: "none", label: "None (8-bit groups)" },
                    { value: "newline", label: "Newline" },
                    { value: "comma", label: "Comma" },
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) || "auto";
            let groups: string[];

            const splitIntoBytes = (s: string) => {
                const clean = s.replace(/\s/g, '');
                const out: string[] = [];
                for (let i = 0; i < clean.length; i += 8) out.push(clean.slice(i, i + 8));
                return out;
            };

            if (delimiter === "none") {
                groups = splitIntoBytes(input);
            } else if (delimiter === "space") {
                groups = input.trim().split(/\s+/);
            } else if (delimiter === "newline") {
                groups = input.trim().split('\n');
            } else if (delimiter === "comma") {
                groups = input.split(',');
            } else {
                // auto: detect by presence of delimiter chars
                const t = input.trim();
                if (t.includes(' ')) groups = t.split(/\s+/);
                else if (t.includes(',')) groups = t.split(',');
                else if (t.includes('\n')) groups = t.split('\n');
                else groups = splitIntoBytes(t);
            }

            return groups
                .map(g => g.trim())
                .filter(g => g.length > 0)
                .map(g => {
                    const code = parseInt(g, 2);
                    return isNaN(code) ? '' : String.fromCharCode(code);
                })
                .join('');
        },
        keywords: ["binary", "decode", "bits", "convert"],
        source: "core",
    },

    // === OCTAL ===
    {
        id: "encoding.to-octal",
        name: "To Octal",
        description: "Convert text to octal byte values (e.g. A → 101)",
        categories: ["encoding"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "space",
                options: [
                    { value: "space", label: "Space" },
                    { value: "none", label: "None" },
                    { value: "backslash", label: "Backslash (\\101)" },
                    { value: "comma", label: "Comma" },
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) || "space";
            const octChars = Array.from(input).map(char => char.charCodeAt(0).toString(8));
            switch (delimiter) {
                case "none": return octChars.join('');
                case "backslash": return octChars.map(o => '\\' + o).join('');
                case "comma": return octChars.join(',');
                default: return octChars.join(' ');
            }
        },
        keywords: ["octal", "encode", "convert", "base8"],
        source: "core",
    },
    {
        id: "encoding.from-octal",
        name: "From Octal",
        description: "Convert octal values back to text",
        categories: ["encoding"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "auto",
                options: [
                    { value: "auto", label: "Auto" },
                    { value: "space", label: "Space" },
                    { value: "backslash", label: "Backslash" },
                    { value: "comma", label: "Comma" },
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) || "auto";
            let groups: string[];

            if (delimiter === "backslash") {
                groups = input.split('\\').filter(g => g.length > 0);
            } else if (delimiter === "comma") {
                groups = input.split(',');
            } else if (delimiter === "space") {
                groups = input.trim().split(/\s+/);
            } else {
                const t = input.trim();
                if (t.startsWith('\\')) groups = t.split('\\').filter(g => g.length > 0);
                else if (t.includes(',')) groups = t.split(',');
                else groups = t.split(/\s+/);
            }

            return groups
                .map(g => g.trim())
                .filter(g => g.length > 0)
                .map(g => {
                    const code = parseInt(g, 8);
                    return isNaN(code) ? '' : String.fromCharCode(code);
                })
                .join('');
        },
        keywords: ["octal", "decode", "convert", "base8"],
        source: "core",
    },

    // === BASE32 ===
    {
        id: "encoding.base32-encode",
        name: "Base32 Encode",
        description: "Encode text to Base32 (RFC 4648)",
        categories: ["encoding"],
        parameters: [
            {
                name: "padding",
                label: "Padding",
                type: "boolean",
                default: true,
                description: "Append = padding to make output length a multiple of 8"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            return encodeBase32(input, (params.padding ?? true) as boolean);
        },
        keywords: ["base32", "encode", "rfc4648", "totp"],
        source: "core",
    },
    {
        id: "encoding.base32-decode",
        name: "Base32 Decode",
        description: "Decode Base32 back to text",
        categories: ["encoding"],
        parameters: [
            {
                name: "padding",
                label: "Padding",
                type: "boolean",
                default: true,
                description: "Input uses = padding (stripped automatically)"
            }
        ],
        processingMode: "entire",
        execute: (input) => {
            return decodeBase32(input);
        },
        keywords: ["base32", "decode", "rfc4648", "totp"],
        source: "core",
    },

    // === BASE58 ===
    {
        id: "encoding.base58-encode",
        name: "Base58 Encode",
        description: "Encode text to Base58 (Bitcoin/IPFS alphabet)",
        categories: ["encoding"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return encodeBase58(input);
        },
        keywords: ["base58", "encode", "bitcoin", "ipfs", "wallet"],
        source: "core",
    },
    {
        id: "encoding.base58-decode",
        name: "Base58 Decode",
        description: "Decode Base58 back to text",
        categories: ["encoding"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return decodeBase58(input);
        },
        keywords: ["base58", "decode", "bitcoin", "ipfs", "wallet"],
        source: "core",
    },

    // === MORSE CODE ===
    {
        id: "encoding.morse-encode",
        name: "Text to Morse Code",
        description: "Encode text as Morse code (dots and dashes)",
        categories: ["encoding"],
        parameters: [
            {
                name: "wordSeparator",
                label: "Word Separator",
                type: "select",
                default: "/",
                options: [
                    { value: "/", label: "Slash ( / )" },
                    { value: "|", label: "Pipe ( | )" },
                    { value: "newline", label: "Newline" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const wordSep = (params.wordSeparator as string) ?? "/";
            const sep = wordSep === "newline" ? "\n" : ` ${wordSep} `;
            const words = input.trim().toUpperCase().split(/\s+/);
            return words
                .map((word) =>
                    word
                        .split("")
                        .map((char) => MORSE_ENCODE_MAP[char] ?? `[${char}]`)
                        .join(" "),
                )
                .join(sep);
        },
        keywords: ["morse", "encode", "dots", "dashes", "telegraph", "ctf"],
        source: "core",
    },
    {
        id: "encoding.morse-decode",
        name: "Morse Code to Text",
        description: "Decode Morse code (dots and dashes) back to text",
        categories: ["encoding"],
        parameters: [
            {
                name: "wordSeparator",
                label: "Word Separator",
                type: "select",
                default: "/",
                options: [
                    { value: "/", label: "Slash ( / )" },
                    { value: "|", label: "Pipe ( | )" },
                    { value: "newline", label: "Newline" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const wordSep = (params.wordSeparator as string) ?? "/";
            const wordPattern =
                wordSep === "newline" ? /\n/ : wordSep === "|" ? /\s*\|\s*/ : /\s*\/\s*/;
            const words = input.trim().split(wordPattern);
            return words
                .map((word) =>
                    word
                        .trim()
                        .split(/\s+/)
                        .map((code) => {
                            const trimmed = code.trim();
                            if (!trimmed) return "";
                            return MORSE_DECODE_MAP[trimmed] ?? `[${trimmed}]`;
                        })
                        .join(""),
                )
                .join(" ");
        },
        keywords: ["morse", "decode", "dots", "dashes", "telegraph", "ctf"],
        source: "core",
    },

    // === NATO PHONETIC ALPHABET ===
    {
        id: "encoding.nato-phonetic",
        name: "NATO Phonetic Alphabet",
        description: "Convert text to NATO phonetic alphabet words (A → Alfa, B → Bravo…)",
        categories: ["encoding"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: "space",
                options: [
                    { value: "space", label: "Space" },
                    { value: "newline", label: "Newline" },
                    { value: "comma", label: "Comma" },
                    { value: "dash", label: "Dash" },
                ],
            },
            {
                name: "uppercase",
                label: "Uppercase",
                type: "boolean",
                default: false,
                description: "Output in uppercase (ALFA BRAVO…)",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) ?? "space";
            const uppercase = params.uppercase ?? false;
            const sep =
                delimiter === "newline"
                    ? "\n"
                    : delimiter === "comma"
                      ? ", "
                      : delimiter === "dash"
                        ? " - "
                        : " ";
            return input
                .toUpperCase()
                .split("")
                .map((char) => {
                    const word = NATO_PHONETIC_MAP[char] ?? char;
                    return uppercase ? word.toUpperCase() : word;
                })
                .join(sep);
        },
        keywords: ["nato", "phonetic", "alphabet", "radio", "spelling", "aviation"],
        source: "core",
    },

    // === UNICODE ESCAPE ===
    {
        id: "encoding.unicode-escape",
        name: "Unicode Escape",
        description: "Escape characters to \\uXXXX Unicode sequences",
        categories: ["encoding"],
        parameters: [
            {
                name: "mode",
                label: "Mode",
                type: "select",
                default: "non-ascii",
                options: [
                    { value: "non-ascii", label: "Non-ASCII only" },
                    { value: "all", label: "All characters" },
                ],
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const mode = (params.mode as string) ?? "non-ascii";
            return Array.from(input)
                .map((char) => {
                    const code = char.codePointAt(0) ?? 0;
                    if (mode === "all" || code > 127) {
                        if (code > 0xffff) {
                            return `\\u{${code.toString(16).toUpperCase()}}`;
                        }
                        return `\\u${code.toString(16).toUpperCase().padStart(4, "0")}`;
                    }
                    return char;
                })
                .join("");
        },
        keywords: ["unicode", "escape", "codepoint", "uxxxx", "js", "json"],
        source: "core",
    },
    {
        id: "encoding.unicode-unescape",
        name: "Unicode Unescape",
        description: "Decode \\uXXXX and \\u{XXXXX} Unicode escape sequences to characters",
        categories: ["encoding"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            return input
                .replace(
                    /\\u\{([0-9A-Fa-f]+)\}/g,
                    (_, hex) => String.fromCodePoint(parseInt(hex, 16)),
                )
                .replace(
                    /\\u([0-9A-Fa-f]{4})/g,
                    (_, hex) => String.fromCharCode(parseInt(hex, 16)),
                );
        },
        keywords: ["unicode", "unescape", "codepoint", "uxxxx", "js", "json"],
        source: "core",
    },

    // === ASCII85 / BASE85 ===
    {
        id: "encoding.base85-encode",
        name: "Base85 Encode (Ascii85)",
        description: "Encode text to Ascii85 / Base85 (Adobe format, used in PDFs and PostScript)",
        categories: ["encoding"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => encodeBase85(input),
        keywords: ["base85", "ascii85", "encode", "pdf", "postscript", "adobe"],
        source: "core",
    },
    {
        id: "encoding.base85-decode",
        name: "Base85 Decode (Ascii85)",
        description: "Decode Ascii85 / Base85 back to text (strips <~ ~> delimiters automatically)",
        categories: ["encoding"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => decodeBase85(input),
        keywords: ["base85", "ascii85", "decode", "pdf", "postscript", "adobe"],
        source: "core",
    },

    // === PUNYCODE ===
    {
        id: "encoding.punycode-encode",
        name: "Punycode Encode",
        description: "Encode a Unicode domain name to Punycode ACE form (e.g. münchen.de → xn--mnchen-3ya.de)",
        categories: ["encoding", "web"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            const trimmed = input.trim();
            if (!trimmed) return "";
            try {
                return punycode.toASCII(trimmed);
            } catch (e) {
                throw new Error(`Punycode encode failed: ${(e as Error).message}`);
            }
        },
        keywords: ["punycode", "idn", "domain", "unicode", "internationalized", "xn--"],
        source: "core",
    },
    {
        id: "encoding.punycode-decode",
        name: "Punycode Decode",
        description: "Decode a Punycode domain back to Unicode (e.g. xn--mnchen-3ya.de → münchen.de)",
        categories: ["encoding", "web"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            const trimmed = input.trim();
            if (!trimmed) return "";
            try {
                return punycode.toUnicode(trimmed);
            } catch (e) {
                throw new Error(`Punycode decode failed: ${(e as Error).message}`);
            }
        },
        keywords: ["punycode", "idn", "domain", "unicode", "internationalized", "xn--"],
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
