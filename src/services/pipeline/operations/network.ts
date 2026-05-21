import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

export const networkOperations: OperationDefinition[] = [
    // === DEFANG / REFANG ===
    {
        id: "network.defang-url",
        name: "Defang URL",
        description: "Defang URLs for safe sharing in threat reports (hxxps://, [.])",
        categories: ["networking"],
        parameters: [
            {
                name: "scheme",
                label: "Defang Scheme",
                type: "boolean",
                default: true,
                description: "Replace http:// with hxxp:// and https:// with hxxps://",
            },
            {
                name: "dots",
                label: "Defang Dots",
                type: "boolean",
                default: true,
                description: "Replace . with [.]",
            },
            {
                name: "at",
                label: "Defang @",
                type: "boolean",
                default: true,
                description: "Replace @ with [@]",
            },
        ],
        processingMode: "line",
        execute: (input, params) => {
            const defangScheme = params.scheme ?? true;
            const defangDots = params.dots ?? true;
            const defangAt = params.at ?? true;
            let result = input;
            if (defangScheme) {
                result = result
                    .replace(/https:\/\//gi, "hxxps://")
                    .replace(/http:\/\//gi, "hxxp://");
            }
            if (defangDots) result = result.replace(/\./g, "[.]");
            if (defangAt) result = result.replace(/@/g, "[@]");
            return result;
        },
        keywords: ["defang", "url", "security", "threat", "intel", "ioc", "indicator"],
        source: "core",
    },
    {
        id: "network.refang-url",
        name: "Refang URL",
        description: "Refang defanged URLs back to working form (hxxps:// → https://, [.] → .)",
        categories: ["networking"],
        parameters: [],
        processingMode: "line",
        execute: (input) => {
            return input
                .replace(/\[:\]/g, ":")
                .replace(/hxxps:\/\//gi, "https://")
                .replace(/hxxp:\/\//gi, "http://")
                .replace(/\[\.\]/g, ".")
                .replace(/\[@\]/g, "@");
        },
        keywords: ["refang", "url", "security", "threat", "intel", "ioc"],
        source: "core",
    },
];

// Self-register all operations
networkOperations.forEach((op) => operationRegistry.register(op));
