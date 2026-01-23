import { OperationDefinition } from "../types";

/**
 * Logic & Math Pipeline Operations
 * 
 * Operations for bitwise logic, arithmetic, and simple ciphers.
 */
export const logicOperations: OperationDefinition[] = [
    {
        id: "logic.xor",
        name: "XOR",
        description: "Bitwise XOR the input with a key",
        categories: ["logic", "encryption"],
        parameters: [
            {
                name: "key",
                label: "Key (Hex)",
                type: "string",
                required: true,
                default: "62",
                description: "Hex string key (e.g. 'AA', 'DEADBEEF')"
            },
            {
                name: "mode",
                label: "Mode",
                type: "select",
                default: "standard",
                options: [
                    { value: "standard", label: "Standard (Cyclic)" },
                    // Differential is more complex, let's stick to Standard for now as MVP
                    // {value: "differential", label: "Differential"} 
                ]
            }
        ],
        execute: (input, params) => {
            const keyHex = ((params.key as string) || "").replace(/\s/g, '');
            if (!keyHex) return input;

            // Parse key bytes
            const keyBytes: number[] = [];
            for (let i = 0; i < keyHex.length; i += 2) {
                const byte = parseInt(keyHex.substr(i, 2), 16);
                if (!isNaN(byte)) {
                    keyBytes.push(byte);
                }
            }

            if (keyBytes.length === 0) return input;

            let output = '';
            for (let i = 0; i < input.length; i++) {
                const charCode = input.charCodeAt(i);
                const keyByte = keyBytes[i % keyBytes.length];
                // The bitwise XOR
                output += String.fromCharCode(charCode ^ keyByte);
            }
            return output;
        },
        keywords: ["xor", "bitwise", "logic", "encrypt"],
        source: "core",
    },
    {
        id: "logic.subtract",
        name: "Subtract",
        description: "Subtract a value from each byte",
        categories: ["logic", "math"],
        parameters: [
            { name: "value", label: "Amount", type: "number", default: 0 }
        ],
        execute: (input, params) => {
            const amount = Number(params.value) || 0;
            if (amount === 0) return input;

            let output = '';
            for (let i = 0; i < input.length; i++) {
                const val = input.charCodeAt(i);
                // Keep within 0-255 range using modulo if we assume byte stream,
                // BUT JavaScript strings are UTF-16.
                // For malware analysis (often bytes), wrap 0-255 is common.
                // Let's standardise on & 0xFF for 'byte' simulation.
                output += String.fromCharCode((val - amount) & 0xFF);
            }
            return output;
        },
        keywords: ["subtract", "minus", "math", "shift"],
        source: "core",
    },
    {
        id: "encryption.rot13",
        name: "ROT13",
        description: "Rotate characters by 13 positions",
        categories: ["encryption", "logic"],
        parameters: [],
        execute: (input) => {
            return input.replace(/[a-zA-Z]/g, (c) => {
                const base = c <= 'Z' ? 65 : 97;
                return String.fromCharCode(base + (c.charCodeAt(0) - base + 13) % 26);
            });
        },
        keywords: ["rot13", "cipher", "caesar", "rotate"],
        source: "core",
    }
];

// Self-register all operations
import { operationRegistry } from "../OperationRegistry";
logicOperations.forEach(op => operationRegistry.register(op));
