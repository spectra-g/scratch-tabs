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
    {
        id: "network.cidr-info",
        name: "CIDR Info",
        description:
            "Show CIDR block metadata: network address, broadcast, subnet mask, wildcard mask, usable host range, and host count",
        categories: ["networking"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            const trimmed = input.trim();
            if (!trimmed) return "";

            const parts = trimmed.split("/");
            if (parts.length !== 2)
                throw new Error(
                    "Input must be in CIDR notation (e.g. 192.168.1.0/24)",
                );

            const prefix = parseInt(parts[1], 10);
            if (isNaN(prefix) || prefix < 0 || prefix > 32)
                throw new Error(
                    `Invalid prefix length: ${parts[1]} (must be 0-32)`,
                );

            const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
            const wildcard = (~mask) >>> 0;
            const networkAddr = (ipToInt(parts[0]) & mask) >>> 0;
            const broadcastAddr = (networkAddr | wildcard) >>> 0;

            // /31 and /32 are special — no dedicated network/broadcast
            const totalAddresses = wildcard + 1;
            const usableHosts =
                prefix >= 31 ? totalAddresses : Math.max(0, totalAddresses - 2);
            const firstHost =
                prefix >= 31 ? networkAddr : networkAddr + 1;
            const lastHost =
                prefix >= 31 ? broadcastAddr : broadcastAddr - 1;

            const pad = (s: string) => s.padEnd(18);
            return [
                `${pad("CIDR:")}${trimmed}`,
                `${pad("Network address:")}${intToIp(networkAddr)}`,
                `${pad("Broadcast address:")}${intToIp(broadcastAddr)}`,
                `${pad("Subnet mask:")}${intToIp(mask)}`,
                `${pad("Wildcard mask:")}${intToIp(wildcard)}`,
                `${pad("First usable host:")}${intToIp(firstHost)}`,
                `${pad("Last usable host:")}${intToIp(lastHost)}`,
                `${pad("Total addresses:")}${totalAddresses.toLocaleString()}`,
                `${pad("Usable hosts:")}${usableHosts.toLocaleString()}`,
                `${pad("Prefix length:")}/${prefix}`,
            ].join("\n");
        },
        keywords: ["cidr", "ip", "network", "subnet", "mask", "broadcast", "wildcard", "host", "ipv4", "info"],
        source: "core",
    },

    // === IPv6 EXPAND ===
    {
        id: "network.ipv6-expand",
        name: "IPv6 Expand",
        description: "Expand a compressed IPv6 address to its full 8-group notation (e.g. ::1 → 0000:0000:…:0001)",
        categories: ["networking"],
        parameters: [],
        processingMode: "line",
        execute: (input) => {
            const trimmed = input.trim().toLowerCase();
            if (!trimmed) return "";

            const zoneIdx = trimmed.indexOf("%");
            const zone = zoneIdx >= 0 ? trimmed.slice(zoneIdx) : "";
            let addr = zoneIdx >= 0 ? trimmed.slice(0, zoneIdx) : trimmed;

            // Handle IPv4-mapped suffix (e.g. ::ffff:192.0.2.1)
            const ipv4Match = addr.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
            if (ipv4Match) {
                const parts = ipv4Match[2].split(".").map(Number);
                if (parts.some(p => p < 0 || p > 255)) throw new Error(`Invalid IPv4 in address: ${input}`);
                const h1 = ((parts[0] << 8) | parts[1]).toString(16).padStart(4, "0");
                const h2 = ((parts[2] << 8) | parts[3]).toString(16).padStart(4, "0");
                addr = ipv4Match[1] + h1 + ":" + h2;
                // Remove trailing colon before the IPv4-replaced part if any
                addr = addr.replace(/:$/, "");
            }

            let groups: string[];
            if (addr.includes("::")) {
                const halves = addr.split("::");
                const left = halves[0] ? halves[0].split(":") : [];
                const right = halves[1] ? halves[1].split(":") : [];
                const zeros = 8 - left.length - right.length;
                if (zeros < 0) throw new Error(`Invalid IPv6 address: ${input}`);
                groups = [...left, ...Array(zeros).fill("0"), ...right];
            } else {
                groups = addr.split(":");
            }

            if (groups.length !== 8) throw new Error(`Invalid IPv6 address: expected 8 groups, got ${groups.length}`);
            for (const g of groups) {
                if (!/^[0-9a-f]{0,4}$/.test(g)) throw new Error(`Invalid IPv6 group: "${g}"`);
            }

            return groups.map(g => g.padStart(4, "0")).join(":") + zone;
        },
        keywords: ["ipv6", "expand", "full", "notation", "network", "address", "ip"],
        source: "core",
    },

    // === IPv6 COMPRESS ===
    {
        id: "network.ipv6-compress",
        name: "IPv6 Compress",
        description: "Compress a full IPv6 address to its shortest form using :: notation (e.g. 0000:…:0001 → ::1)",
        categories: ["networking"],
        parameters: [],
        processingMode: "line",
        execute: (input) => {
            const trimmed = input.trim().toLowerCase();
            if (!trimmed) return "";

            const zoneIdx = trimmed.indexOf("%");
            const zone = zoneIdx >= 0 ? trimmed.slice(zoneIdx) : "";
            const addr = zoneIdx >= 0 ? trimmed.slice(0, zoneIdx) : trimmed;

            // Expand first to normalise, then compress
            const expanded = (() => {
                if (addr.includes("::")) {
                    const halves = addr.split("::");
                    const left = halves[0] ? halves[0].split(":") : [];
                    const right = halves[1] ? halves[1].split(":") : [];
                    const zeros = 8 - left.length - right.length;
                    if (zeros < 0) throw new Error(`Invalid IPv6 address: ${input}`);
                    return [...left, ...Array(zeros).fill("0"), ...right];
                }
                return addr.split(":");
            })();

            if (expanded.length !== 8) throw new Error(`Invalid IPv6 address: expected 8 groups, got ${expanded.length}`);
            const ints = expanded.map(g => parseInt(g, 16));
            if (ints.some(n => isNaN(n) || n < 0 || n > 0xffff)) throw new Error(`Invalid IPv6 address: ${input}`);

            // Find the longest consecutive run of zero groups (min 2 to qualify for ::)
            let bestStart = -1, bestLen = 0, i = 0;
            while (i < 8) {
                if (ints[i] === 0) {
                    let j = i;
                    while (j < 8 && ints[j] === 0) j++;
                    if (j - i >= 2 && j - i > bestLen) { bestStart = i; bestLen = j - i; }
                    i = j;
                } else { i++; }
            }

            const hex = ints.map(n => n.toString(16));
            if (bestStart < 0) return hex.join(":") + zone;

            const left = hex.slice(0, bestStart).join(":");
            const right = hex.slice(bestStart + bestLen).join(":");
            const compressed = (left && right) ? `${left}::${right}` : left ? `${left}::` : right ? `::${right}` : "::";
            return compressed + zone;
        },
        keywords: ["ipv6", "compress", "compact", "shorten", "notation", "network", "address", "ip"],
        source: "core",
    },
];

// Self-register all operations
networkOperations.forEach((op) => operationRegistry.register(op));
