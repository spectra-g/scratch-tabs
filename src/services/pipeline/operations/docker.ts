import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

interface ComposeService {
    name?: string;
    image?: string;
    ports: string[];
    volumes: string[];
    environment: string[];
    envFile?: string[];
    restart?: string;
    hostname?: string;
    user?: string;
    workingDir?: string;
    entrypoint?: string;
    networks?: string[];
    labels?: string[];
    memoryLimit?: string;
    cpus?: string;
    command?: string[];
    privileged?: boolean;
    readOnly?: boolean;
    links?: string[];
    capAdd?: string[];
    capDrop?: string[];
    devices?: string[];
    dns?: string[];
}

// Flags that consume the next token as their value
const FLAGS_WITH_VALUES = new Set([
    "--name",
    "--publish", "-p",
    "--volume", "-v",
    "--env", "-e",
    "--env-file",
    "--network", "--net",
    "--restart",
    "--hostname", "-h",
    "--user", "-u",
    "--workdir", "-w",
    "--entrypoint",
    "--memory", "-m",
    "--cpus",
    "--label", "-l",
    "--link",
    "--add-host",
    "--cap-add",
    "--cap-drop",
    "--device",
    "--dns",
    "--log-driver",
    "--log-opt",
    "--platform",
    "--stop-signal",
    "--stop-timeout",
    "--health-cmd",
    "--health-interval",
    "--health-retries",
    "--health-timeout",
    "--health-start-period",
    "--blkio-weight",
    "--cpu-shares",
    "--cpu-period",
    "--cpu-quota",
]);

// Map single-char short flags to their long forms for value-bearing flags
const SHORT_TO_LONG: Record<string, string> = {
    p: "--publish",
    v: "--volume",
    e: "--env",
    u: "--user",
    w: "--workdir",
    m: "--memory",
    l: "--label",
    h: "--hostname",
};

function tokenize(cmd: string): string[] {
    const tokens: string[] = [];
    let i = 0;

    while (i < cmd.length) {
        while (i < cmd.length && /\s/.test(cmd[i])) i++;
        if (i >= cmd.length) break;

        let token = "";

        if (cmd[i] === '"') {
            i++;
            while (i < cmd.length && cmd[i] !== '"') {
                if (cmd[i] === "\\" && i + 1 < cmd.length) {
                    i++;
                    token += cmd[i];
                } else {
                    token += cmd[i];
                }
                i++;
            }
            i++; // closing quote
        } else if (cmd[i] === "'") {
            i++;
            while (i < cmd.length && cmd[i] !== "'") {
                token += cmd[i++];
            }
            i++; // closing quote
        } else {
            while (i < cmd.length && !/\s/.test(cmd[i])) {
                token += cmd[i++];
            }
        }

        if (token) tokens.push(token);
    }

    return tokens;
}

function applyFlag(service: ComposeService, key: string, value: string | undefined): void {
    switch (key) {
        case "--name":
            service.name = value;
            break;
        case "--publish":
            if (value) service.ports.push(value);
            break;
        case "--volume":
            if (value) service.volumes.push(value);
            break;
        case "--env":
            if (value) service.environment.push(value);
            break;
        case "--env-file":
            if (!service.envFile) service.envFile = [];
            if (value) service.envFile.push(value);
            break;
        case "--network":
        case "--net":
            if (!service.networks) service.networks = [];
            if (value) service.networks.push(value);
            break;
        case "--restart":
            service.restart = value;
            break;
        case "--hostname":
            service.hostname = value;
            break;
        case "--user":
            service.user = value;
            break;
        case "--workdir":
            service.workingDir = value;
            break;
        case "--entrypoint":
            service.entrypoint = value;
            break;
        case "--memory":
            service.memoryLimit = value;
            break;
        case "--cpus":
            service.cpus = value;
            break;
        case "--label":
            if (!service.labels) service.labels = [];
            if (value) service.labels.push(value);
            break;
        case "--privileged":
            service.privileged = true;
            break;
        case "--read-only":
            service.readOnly = true;
            break;
        case "--link":
            if (!service.links) service.links = [];
            if (value) service.links.push(value);
            break;
        case "--cap-add":
            if (!service.capAdd) service.capAdd = [];
            if (value) service.capAdd.push(value);
            break;
        case "--cap-drop":
            if (!service.capDrop) service.capDrop = [];
            if (value) service.capDrop.push(value);
            break;
        case "--device":
            if (!service.devices) service.devices = [];
            if (value) service.devices.push(value);
            break;
        case "--dns":
            if (!service.dns) service.dns = [];
            if (value) service.dns.push(value);
            break;
        // Boolean flags and known-ignored flags fall through to default (no-op)
        default:
            break;
    }
}

function parseDockerRun(raw: string): { service: ComposeService; serviceName: string } {
    let cmd = raw.trim();
    if (cmd.startsWith("sudo ")) cmd = cmd.slice(5).trim();
    if (cmd.startsWith("docker container run")) {
        cmd = cmd.slice("docker container run".length).trim();
    } else if (cmd.startsWith("docker run")) {
        cmd = cmd.slice("docker run".length).trim();
    } else {
        throw new Error("Input must start with 'docker run'");
    }

    const tokens = tokenize(cmd);
    const service: ComposeService = { ports: [], volumes: [], environment: [] };
    let imageFound = false;
    let i = 0;

    while (i < tokens.length) {
        const token = tokens[i];

        if (token.startsWith("--")) {
            const eqIdx = token.indexOf("=");
            let key: string;
            let value: string | undefined;

            if (eqIdx !== -1) {
                key = token.slice(0, eqIdx);
                value = token.slice(eqIdx + 1);
            } else {
                key = token;
                if (FLAGS_WITH_VALUES.has(key) && i + 1 < tokens.length) {
                    value = tokens[++i];
                }
            }

            applyFlag(service, key, value);
        } else if (token.startsWith("-") && token.length > 1) {
            // Short option(s) — may be combined, e.g. -it, -dit, -p8080:80
            const chars = token.slice(1);
            let j = 0;

            while (j < chars.length) {
                const shortFlag = `-${chars[j]}`;
                const longKey = SHORT_TO_LONG[chars[j]];

                if (longKey !== undefined && FLAGS_WITH_VALUES.has(longKey)) {
                    const remaining = chars.slice(j + 1);
                    let value: string;
                    if (remaining.length > 0) {
                        value = remaining;
                    } else if (i + 1 < tokens.length) {
                        value = tokens[++i];
                    } else {
                        break;
                    }
                    applyFlag(service, longKey, value);
                    break; // value consumed all remaining chars
                } else {
                    // Boolean short flag
                    applyFlag(service, shortFlag, undefined);
                    j++;
                }
            }
        } else if (!imageFound) {
            service.image = token;
            imageFound = true;
        } else {
            if (!service.command) service.command = [];
            service.command.push(token);
        }

        i++;
    }

    const serviceName = service.name
        ?? service.image?.split("/").pop()?.split(":")[0].replace(/[^a-z0-9_-]/gi, "_")
        ?? "app";

    return { service, serviceName };
}

function buildComposeYaml(service: ComposeService, serviceName: string): string {
    const lines: string[] = ["services:", `  ${serviceName}:`];

    if (service.image) lines.push(`    image: ${service.image}`);

    if (service.ports.length > 0) {
        lines.push("    ports:");
        service.ports.forEach(p => lines.push(`      - "${p}"`));
    }

    if (service.volumes.length > 0) {
        lines.push("    volumes:");
        service.volumes.forEach(v => lines.push(`      - ${v}`));
    }

    if (service.environment.length > 0) {
        lines.push("    environment:");
        service.environment.forEach(e => lines.push(`      - ${e}`));
    }

    if (service.envFile && service.envFile.length > 0) {
        lines.push("    env_file:");
        service.envFile.forEach(f => lines.push(`      - ${f}`));
    }

    if (service.restart) lines.push(`    restart: ${service.restart}`);
    if (service.hostname) lines.push(`    hostname: ${service.hostname}`);
    if (service.user) lines.push(`    user: "${service.user}"`);
    if (service.workingDir) lines.push(`    working_dir: ${service.workingDir}`);
    if (service.entrypoint) lines.push(`    entrypoint: ${service.entrypoint}`);

    if (service.networks && service.networks.length > 0) {
        lines.push("    networks:");
        service.networks.forEach(n => lines.push(`      - ${n}`));
    }

    if (service.labels && service.labels.length > 0) {
        lines.push("    labels:");
        service.labels.forEach(l => lines.push(`      - ${l}`));
    }

    if (service.privileged) lines.push("    privileged: true");
    if (service.readOnly) lines.push("    read_only: true");

    if (service.links && service.links.length > 0) {
        lines.push("    links:");
        service.links.forEach(l => lines.push(`      - ${l}`));
    }

    if (service.capAdd && service.capAdd.length > 0) {
        lines.push("    cap_add:");
        service.capAdd.forEach(c => lines.push(`      - ${c}`));
    }

    if (service.capDrop && service.capDrop.length > 0) {
        lines.push("    cap_drop:");
        service.capDrop.forEach(c => lines.push(`      - ${c}`));
    }

    if (service.devices && service.devices.length > 0) {
        lines.push("    devices:");
        service.devices.forEach(d => lines.push(`      - ${d}`));
    }

    if (service.dns && service.dns.length > 0) {
        lines.push("    dns:");
        service.dns.forEach(d => lines.push(`      - ${d}`));
    }

    if (service.memoryLimit || service.cpus) {
        lines.push("    deploy:");
        lines.push("      resources:");
        lines.push("        limits:");
        if (service.memoryLimit) lines.push(`          memory: ${service.memoryLimit}`);
        if (service.cpus) lines.push(`          cpus: '${service.cpus}'`);
    }

    if (service.command && service.command.length > 0) {
        if (service.command.length === 1) {
            lines.push(`    command: ${service.command[0]}`);
        } else {
            lines.push("    command:");
            service.command.forEach(c => lines.push(`      - ${c}`));
        }
    }

    return lines.join("\n");
}

export const dockerOperations: OperationDefinition[] = [
    {
        id: "docker.run-to-compose",
        name: "docker run to Compose",
        description: "Convert a `docker run` command into an equivalent docker-compose.yml service definition",
        categories: ["utilities", "docker"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            const { service, serviceName } = parseDockerRun(input);
            return buildComposeYaml(service, serviceName);
        },
        keywords: ["docker", "compose", "convert", "container", "run", "yaml", "yml"],
        source: "core",
    },
];

// Self-register
dockerOperations.forEach(op => operationRegistry.register(op));

export default dockerOperations;
