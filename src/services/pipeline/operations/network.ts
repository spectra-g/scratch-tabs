import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

// === CIDR helpers ===

function ipToInt(ip: string): number {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        throw new Error(`Invalid IPv4 address: ${ip}`);
    }
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIp(n: number): string {
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
}

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
    {
        id: "network.cidr-expand",
        name: "CIDR Expand",
        description: "Expand a CIDR range to a list of IPv4 addresses (one per line, max 65536)",
        categories: ["networking"],
        parameters: [
            {
                name: "includeNetwork",
                label: "Include Network Address",
                type: "boolean",
                default: true,
                description: "Include the network address (first IP)"
            },
            {
                name: "includeBroadcast",
                label: "Include Broadcast Address",
                type: "boolean",
                default: true,
                description: "Include the broadcast address (last IP)"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const trimmed = input.trim();
            if (!trimmed) return "";

            const parts = trimmed.split('/');
            if (parts.length !== 2) throw new Error("Input must be in CIDR notation (e.g. 192.168.1.0/24)");

            const prefix = parseInt(parts[1], 10);
            if (isNaN(prefix) || prefix < 0 || prefix > 32) {
                throw new Error(`Invalid prefix length: ${parts[1]} (must be 0-32)`);
            }

            const networkInt = ipToInt(parts[0]);
            const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
            const networkStart = (networkInt & mask) >>> 0;
            const networkEnd = (networkStart | (~mask >>> 0)) >>> 0;
            const count = networkEnd - networkStart + 1;

            if (count > 65536) {
                throw new Error(`CIDR range /${prefix} contains ${count.toLocaleString()} addresses — limit is 65,536. Use /16 or smaller.`);
            }

            const includeNetwork = params.includeNetwork ?? true;
            const includeBroadcast = params.includeBroadcast ?? true;

            const ips: string[] = [];
            const start = includeNetwork ? networkStart : networkStart + 1;
            const end = includeBroadcast ? networkEnd : networkEnd - 1;

            for (let ip = start; ip <= end; ip++) {
                ips.push(intToIp(ip));
            }
            return ips.join('\n');
        },
        keywords: ["cidr", "ip", "network", "range", "expand", "subnet", "ipv4"],
        source: "core",
    },
];

// Self-register all operations
networkOperations.forEach((op) => operationRegistry.register(op));
