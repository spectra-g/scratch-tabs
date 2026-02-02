import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

/**
 * Utility Pipeline Operations
 *
 * Operations for generating UUIDs, random strings, and other utilities.
 */
export const utilityOperations: OperationDefinition[] = [
    {
        id: "utilities.uuid",
        name: "Generate UUID",
        description: "Generate random UUID(s)",
        categories: ["utilities"],
        parameters: [
            {
                name: "count",
                label: "Count",
                type: "number",
                default: 1,
                min: 1,
                max: 100,
                description: "Number of UUIDs to generate"
            },
            {
                name: "version",
                label: "Version",
                type: "select",
                default: "v4",
                options: [
                    { value: "v4", label: "Version 4 (Random)" },
                    { value: "v7", label: "Version 7 (Time-ordered)" },
                ]
            },
            {
                name: "format",
                label: "Format",
                type: "select",
                default: "lowercase",
                options: [
                    { value: "lowercase", label: "Lowercase" },
                    { value: "uppercase", label: "Uppercase" },
                    { value: "no-dashes", label: "No Dashes" },
                ]
            }
        ],
        execute: (_input, params) => {
            const count = Math.min((params.count as number) ?? 1, 100);
            const version = (params.version as string) ?? "v4";
            const format = (params.format as string) ?? "lowercase";

            const generateV4 = (): string => {
                // RFC 4122 version 4 UUID
                const bytes = new Uint8Array(16);
                crypto.getRandomValues(bytes);

                // Set version (4) and variant (10xx)
                bytes[6] = (bytes[6] & 0x0f) | 0x40;
                bytes[8] = (bytes[8] & 0x3f) | 0x80;

                const hex = Array.from(bytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');

                return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
            };

            const generateV7 = (): string => {
                // RFC 9562 version 7 UUID (time-ordered)
                const timestamp = Date.now();
                const bytes = new Uint8Array(16);
                crypto.getRandomValues(bytes);

                // Set timestamp (48 bits)
                const ts = BigInt(timestamp);
                bytes[0] = Number((ts >> 40n) & 0xffn);
                bytes[1] = Number((ts >> 32n) & 0xffn);
                bytes[2] = Number((ts >> 24n) & 0xffn);
                bytes[3] = Number((ts >> 16n) & 0xffn);
                bytes[4] = Number((ts >> 8n) & 0xffn);
                bytes[5] = Number(ts & 0xffn);

                // Set version (7) and variant (10xx)
                bytes[6] = (bytes[6] & 0x0f) | 0x70;
                bytes[8] = (bytes[8] & 0x3f) | 0x80;

                const hex = Array.from(bytes)
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('');

                return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
            };

            const uuids: string[] = [];
            for (let i = 0; i < count; i++) {
                let uuid = version === "v7" ? generateV7() : generateV4();

                if (format === "uppercase") {
                    uuid = uuid.toUpperCase();
                } else if (format === "no-dashes") {
                    uuid = uuid.replace(/-/g, '');
                }

                uuids.push(uuid);
            }

            return uuids.join('\n');
        },
        keywords: ["uuid", "guid", "random", "generate", "unique", "identifier"],
        source: "core",
    },
    {
        id: "utilities.random-string",
        name: "Generate Random String",
        description: "Generate random strings for passwords, tokens, etc.",
        categories: ["utilities"],
        parameters: [
            {
                name: "length",
                label: "Length",
                type: "number",
                default: 16,
                min: 1,
                max: 1000,
                description: "Length of each string"
            },
            {
                name: "count",
                label: "Count",
                type: "number",
                default: 1,
                min: 1,
                max: 100,
                description: "Number of strings to generate"
            },
            {
                name: "charset",
                label: "Character Set",
                type: "select",
                default: "alphanumeric",
                options: [
                    { value: "alphanumeric", label: "Alphanumeric (a-z, A-Z, 0-9)" },
                    { value: "alpha", label: "Letters only (a-z, A-Z)" },
                    { value: "lowercase", label: "Lowercase (a-z)" },
                    { value: "uppercase", label: "Uppercase (A-Z)" },
                    { value: "numeric", label: "Numbers only (0-9)" },
                    { value: "hex", label: "Hexadecimal (0-9, a-f)" },
                    { value: "symbols", label: "With Symbols (!@#$%...)" },
                    { value: "base64", label: "Base64 Safe (a-z, A-Z, 0-9, +/)" },
                    { value: "url-safe", label: "URL Safe (a-z, A-Z, 0-9, -_)" },
                ]
            }
        ],
        execute: (_input, params) => {
            const length = Math.min((params.length as number) ?? 16, 1000);
            const count = Math.min((params.count as number) ?? 1, 100);
            const charset = (params.charset as string) ?? "alphanumeric";

            const charsets: Record<string, string> = {
                alphanumeric: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                alpha: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
                lowercase: 'abcdefghijklmnopqrstuvwxyz',
                uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                numeric: '0123456789',
                hex: '0123456789abcdef',
                symbols: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
                base64: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/',
                'url-safe': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_',
            };

            const chars = charsets[charset] || charsets.alphanumeric;

            const generateString = (len: number): string => {
                const array = new Uint32Array(len);
                crypto.getRandomValues(array);
                return Array.from(array)
                    .map(n => chars[n % chars.length])
                    .join('');
            };

            const results: string[] = [];
            for (let i = 0; i < count; i++) {
                results.push(generateString(length));
            }

            return results.join('\n');
        },
        keywords: ["random", "string", "password", "token", "generate", "secret"],
        source: "core",
    },
    {
        id: "utilities.lorem-ipsum",
        name: "Generate Lorem Ipsum",
        description: "Generate placeholder Lorem Ipsum text",
        categories: ["utilities"],
        parameters: [
            {
                name: "type",
                label: "Type",
                type: "select",
                default: "paragraphs",
                options: [
                    { value: "paragraphs", label: "Paragraphs" },
                    { value: "sentences", label: "Sentences" },
                    { value: "words", label: "Words" },
                ]
            },
            {
                name: "count",
                label: "Count",
                type: "number",
                default: 3,
                min: 1,
                max: 100,
            }
        ],
        execute: (_input, params) => {
            const type = (params.type as string) ?? "paragraphs";
            const count = Math.min((params.count as number) ?? 3, 100);

            const words = [
                'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
                'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
                'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
                'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
                'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
                'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint',
                'occaecat', 'cupidatat', 'non', 'proident', 'sunt', 'culpa', 'qui', 'officia',
                'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum', 'at', 'vero', 'eos',
                'accusamus', 'iusto', 'odio', 'dignissimos', 'ducimus', 'blanditiis',
                'praesentium', 'voluptatum', 'deleniti', 'atque', 'corrupti', 'quos',
                'dolores', 'quas', 'molestias', 'excepturi', 'occaecati', 'cupiditate',
                'provident', 'similique', 'mollitia', 'animi', 'dolorem', 'ipsam'
            ];

            const randomWord = () => words[Math.floor(Math.random() * words.length)];

            const generateSentence = (minWords = 5, maxWords = 15): string => {
                const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
                const sentenceWords = Array.from({ length: wordCount }, randomWord);
                sentenceWords[0] = sentenceWords[0].charAt(0).toUpperCase() + sentenceWords[0].slice(1);
                return sentenceWords.join(' ') + '.';
            };

            const generateParagraph = (minSentences = 3, maxSentences = 6): string => {
                const sentenceCount = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;
                return Array.from({ length: sentenceCount }, () => generateSentence()).join(' ');
            };

            switch (type) {
                case "words":
                    return Array.from({ length: count }, randomWord).join(' ');
                case "sentences":
                    return Array.from({ length: count }, () => generateSentence()).join(' ');
                case "paragraphs":
                default:
                    return Array.from({ length: count }, () => generateParagraph()).join('\n\n');
            }
        },
        keywords: ["lorem", "ipsum", "placeholder", "text", "dummy", "generate"],
        source: "core",
    },
    {
        id: "utilities.sequence",
        name: "Generate Sequence",
        description: "Generate a sequence of numbers or letters",
        categories: ["utilities"],
        parameters: [
            {
                name: "type",
                label: "Type",
                type: "select",
                default: "numbers",
                options: [
                    { value: "numbers", label: "Numbers (1, 2, 3...)" },
                    { value: "letters-lower", label: "Letters (a, b, c...)" },
                    { value: "letters-upper", label: "Letters (A, B, C...)" },
                    { value: "roman", label: "Roman (I, II, III...)" },
                ]
            },
            {
                name: "start",
                label: "Start",
                type: "number",
                default: 1,
                description: "Starting value (for numbers)"
            },
            {
                name: "end",
                label: "End",
                type: "number",
                default: 10,
                description: "Ending value"
            },
            {
                name: "step",
                label: "Step",
                type: "number",
                default: 1,
                min: 1,
                description: "Increment between values"
            },
            {
                name: "separator",
                label: "Separator",
                type: "select",
                default: "newline",
                options: [
                    { value: "newline", label: "New Line" },
                    { value: "comma", label: "Comma" },
                    { value: "space", label: "Space" },
                    { value: "tab", label: "Tab" },
                ]
            }
        ],
        execute: (_input, params) => {
            const type = (params.type as string) ?? "numbers";
            const start = (params.start as number) ?? 1;
            const end = (params.end as number) ?? 10;
            const step = Math.max(1, (params.step as number) ?? 1);
            const separatorType = (params.separator as string) ?? "newline";

            const separators: Record<string, string> = {
                newline: '\n',
                comma: ', ',
                space: ' ',
                tab: '\t',
            };
            const separator = separators[separatorType] || '\n';

            const toRoman = (num: number): string => {
                const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
                const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
                let result = '';
                for (let i = 0; i < values.length; i++) {
                    while (num >= values[i]) {
                        result += symbols[i];
                        num -= values[i];
                    }
                }
                return result;
            };

            const toLetter = (num: number, uppercase: boolean): string => {
                let result = '';
                while (num > 0) {
                    num--;
                    result = String.fromCharCode((uppercase ? 65 : 97) + (num % 26)) + result;
                    num = Math.floor(num / 26);
                }
                return result;
            };

            const sequence: string[] = [];
            const actualEnd = Math.min(end, start + 1000); // Limit to 1000 items

            for (let i = start; i <= actualEnd; i += step) {
                switch (type) {
                    case "letters-lower":
                        sequence.push(toLetter(i, false));
                        break;
                    case "letters-upper":
                        sequence.push(toLetter(i, true));
                        break;
                    case "roman":
                        sequence.push(toRoman(i));
                        break;
                    default:
                        sequence.push(i.toString());
                }
            }

            return sequence.join(separator);
        },
        keywords: ["sequence", "numbers", "letters", "generate", "list", "range"],
        source: "core",
    }
];

// Self-register all operations
utilityOperations.forEach(op => operationRegistry.register(op));

export default utilityOperations;
