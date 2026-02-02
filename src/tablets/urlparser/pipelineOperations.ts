/**
 * URL Parser Pipeline Operations
 *
 * Registers URL-related operations to the pipeline registry.
 * This file self-registers operations when imported.
 *
 * These operations wrap the existing urlUtils.ts functions,
 * making them available to the pipeline system.
 */

import { operationRegistry } from "../../services/pipeline/OperationRegistry";
import { OperationDefinition } from "../../services/pipeline/types";
import { parseUrl, composeUrl, toCurl } from "./utils/urlUtils";

/**
 * URL Parser operations for the pipeline
 */
const urlParserOperations: OperationDefinition[] = [
  {
    id: "url.encode",
    name: "URL Encode",
    description: "Encode text for safe use in URLs",
    categories: ["encoding"],
    parameters: [
      {
        name: "mode",
        label: "Encoding Mode",
        type: "select",
        default: "component",
        options: [
          { value: "component", label: "Component (encodeURIComponent)" },
          { value: "uri", label: "Full URI (encodeURI)" },
        ],
        description: "Component encoding is stricter and encodes more characters",
      },
    ],
    processingMode: "configurable",
    execute: (input, params) => {
      if (!input) return "";
      const mode = (params.mode as string) ?? "component";
      return mode === "uri" ? encodeURI(input) : encodeURIComponent(input);
    },
    keywords: ["url", "encode", "percent", "escape", "uri"],
    icon: "Link",
    source: "tablet",
  },
  {
    id: "url.decode",
    name: "URL Decode",
    description: "Decode URL-encoded text back to plain text",
    categories: ["encoding"],
    parameters: [
      {
        name: "mode",
        label: "Decoding Mode",
        type: "select",
        default: "component",
        options: [
          { value: "component", label: "Component (decodeURIComponent)" },
          { value: "uri", label: "Full URI (decodeURI)" },
        ],
        description: "Use the same mode that was used for encoding",
      },
    ],
    processingMode: "configurable",
    execute: (input, params) => {
      if (!input) return "";
      const mode = (params.mode as string) ?? "component";
      try {
        return mode === "uri" ? decodeURI(input) : decodeURIComponent(input);
      } catch (e) {
        throw new Error(`Failed to decode URL: ${(e as Error).message}`);
      }
    },
    keywords: ["url", "decode", "percent", "unescape", "uri"],
    icon: "Link2",
    source: "tablet",
  },
  {
    id: "url.parse",
    name: "Parse URL",
    description: "Parse URL into components and output as JSON",
    categories: ["parsing"],
    parameters: [
      {
        name: "format",
        label: "Output Format",
        type: "select",
        default: "json",
        options: [
          { value: "json", label: "JSON (all components)" },
          { value: "json-pretty", label: "JSON (pretty printed)" },
        ],
        description: "Format for the parsed URL output",
      },
      {
        name: "includeWarnings",
        label: "Include Warnings",
        type: "boolean",
        default: false,
        description: "Include security warnings in the output",
      },
    ],
    processingMode: "entire",
    execute: (input, params) => {
      if (!input.trim()) return "{}";
      const format = (params.format as string) ?? "json";
      const includeWarnings = params.includeWarnings ?? false;

      const parsed = parseUrl(input.trim());

      const output = includeWarnings
        ? { components: parsed.components, warnings: parsed.warnings }
        : parsed.components;

      return format === "json-pretty"
        ? JSON.stringify(output, null, 2)
        : JSON.stringify(output);
    },
    keywords: ["url", "parse", "extract", "components", "query", "host"],
    icon: "Search",
    source: "tablet",
  },
  {
    id: "url.extract-host",
    name: "Extract Host",
    description: "Extract the hostname from a URL",
    categories: ["parsing"],
    parameters: [
      {
        name: "includePort",
        label: "Include Port",
        type: "boolean",
        default: false,
        description: "Include port number if present",
      },
      {
        name: "includeScheme",
        label: "Include Scheme",
        type: "boolean",
        default: false,
        description: "Include the protocol (http://, https://)",
      },
    ],
    processingMode: "configurable",
    execute: (input, params) => {
      if (!input.trim()) return "";
      const includePort = params.includePort ?? false;
      const includeScheme = params.includeScheme ?? false;

      const { components } = parseUrl(input.trim());

      let result = components.host;
      if (includePort && components.port) {
        result += `:${components.port}`;
      }
      if (includeScheme && components.scheme) {
        result = `${components.scheme}://${result}`;
      }

      return result;
    },
    keywords: ["url", "host", "hostname", "domain", "extract"],
    icon: "Globe",
    source: "tablet",
  },
  {
    id: "url.extract-path",
    name: "Extract Path",
    description: "Extract the path from a URL",
    categories: ["parsing"],
    parameters: [
      {
        name: "includeQuery",
        label: "Include Query String",
        type: "boolean",
        default: false,
        description: "Include the query string after the path",
      },
      {
        name: "includeFragment",
        label: "Include Fragment",
        type: "boolean",
        default: false,
        description: "Include the fragment (#hash) after the path",
      },
    ],
    processingMode: "configurable",
    execute: (input, params) => {
      if (!input.trim()) return "";
      const includeQuery = params.includeQuery ?? false;
      const includeFragment = params.includeFragment ?? false;

      const { components } = parseUrl(input.trim());

      let result = components.path;
      if (includeQuery && components.query) {
        result += `?${components.query}`;
      }
      if (includeFragment && components.fragment) {
        result += `#${components.fragment}`;
      }

      return result;
    },
    keywords: ["url", "path", "pathname", "route", "extract"],
    icon: "FolderOpen",
    source: "tablet",
  },
  {
    id: "url.extract-query",
    name: "Extract Query Params",
    description: "Extract query parameters from a URL",
    categories: ["parsing"],
    parameters: [
      {
        name: "format",
        label: "Output Format",
        type: "select",
        default: "json",
        options: [
          { value: "json", label: "JSON object" },
          { value: "json-pretty", label: "JSON (pretty printed)" },
          { value: "raw", label: "Raw query string" },
          { value: "lines", label: "One param per line (key=value)" },
        ],
        description: "Format for the extracted query parameters",
      },
    ],
    processingMode: "entire",
    execute: (input, params) => {
      if (!input.trim()) return "";
      const format = (params.format as string) ?? "json";

      const { components } = parseUrl(input.trim());

      switch (format) {
        case "raw":
          return components.query;
        case "lines":
          return Object.entries(components.queryParams)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n");
        case "json-pretty":
          return JSON.stringify(components.queryParams, null, 2);
        case "json":
        default:
          return JSON.stringify(components.queryParams);
      }
    },
    keywords: ["url", "query", "params", "parameters", "extract", "search"],
    icon: "ListFilter",
    source: "tablet",
  },
  {
    id: "url.to-curl",
    name: "URL to cURL",
    description: "Convert a URL to a cURL command",
    categories: ["conversion"],
    parameters: [],
    processingMode: "configurable",
    execute: (input) => {
      if (!input.trim()) return "";
      return toCurl(input.trim());
    },
    keywords: ["url", "curl", "command", "http", "request"],
    icon: "Terminal",
    source: "tablet",
  },
  {
    id: "url.compose",
    name: "Compose URL",
    description: "Compose URL from JSON components object",
    categories: ["conversion"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => {
      if (!input.trim()) return "";
      try {
        const components = JSON.parse(input);
        return composeUrl(components);
      } catch (e) {
        throw new Error(`Invalid JSON input: ${(e as Error).message}`);
      }
    },
    keywords: ["url", "compose", "build", "construct", "create"],
    icon: "Link",
    source: "tablet",
  },
  {
    id: "url.json-to-querystring",
    name: "JSON to Query String",
    description: "Convert JSON object to URL query string",
    categories: ["conversion", "encoding"],
    parameters: [
      {
        name: "includeQuestionMark",
        label: "Include ?",
        type: "boolean",
        default: true,
        description: "Prefix output with ?"
      },
      {
        name: "arrayFormat",
        label: "Array Format",
        type: "select",
        default: "repeat",
        options: [
          { value: "repeat", label: "Repeat key (key=1&key=2)" },
          { value: "brackets", label: "Brackets (key[]=1&key[]=2)" },
          { value: "indices", label: "Indices (key[0]=1&key[1]=2)" },
          { value: "comma", label: "Comma separated (key=1,2)" },
        ]
      },
      {
        name: "encodeValues",
        label: "Encode Values",
        type: "boolean",
        default: true,
        description: "URL-encode special characters"
      }
    ],
    processingMode: "entire",
    execute: (input, params) => {
      if (!input.trim()) return "";

      const includeQuestionMark = params.includeQuestionMark ?? true;
      const arrayFormat = (params.arrayFormat as string) ?? "repeat";
      const encodeValues = params.encodeValues ?? true;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(input);
      } catch (e) {
        throw new Error(`Invalid JSON input: ${(e as Error).message}`);
      }

      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Input must be a JSON object (not array)');
      }

      const encode = (val: string): string => {
        return encodeValues ? encodeURIComponent(val) : val;
      };

      const pairs: string[] = [];

      const addPair = (key: string, value: unknown) => {
        if (value === null || value === undefined) {
          return;
        }

        if (Array.isArray(value)) {
          switch (arrayFormat) {
            case "brackets":
              value.forEach(v => {
                pairs.push(`${encode(key)}[]=${encode(String(v))}`);
              });
              break;
            case "indices":
              value.forEach((v, i) => {
                pairs.push(`${encode(key)}[${i}]=${encode(String(v))}`);
              });
              break;
            case "comma":
              pairs.push(`${encode(key)}=${value.map(v => encode(String(v))).join(',')}`);
              break;
            default: // repeat
              value.forEach(v => {
                pairs.push(`${encode(key)}=${encode(String(v))}`);
              });
          }
        } else if (typeof value === 'object') {
          // Nested objects - flatten with dot notation
          for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            addPair(`${key}.${k}`, v);
          }
        } else {
          pairs.push(`${encode(key)}=${encode(String(value))}`);
        }
      };

      for (const [key, value] of Object.entries(data)) {
        addPair(key, value);
      }

      const queryString = pairs.join('&');
      return includeQuestionMark ? `?${queryString}` : queryString;
    },
    keywords: ["json", "query", "querystring", "params", "url", "convert"],
    icon: "ListFilter",
    source: "tablet",
  },
  {
    id: "url.querystring-to-json",
    name: "Query String to JSON",
    description: "Convert URL query string to JSON object",
    categories: ["conversion", "parsing"],
    parameters: [
      {
        name: "parseNumbers",
        label: "Parse Numbers",
        type: "boolean",
        default: true,
        description: "Convert numeric strings to numbers"
      },
      {
        name: "parseBooleans",
        label: "Parse Booleans",
        type: "boolean",
        default: true,
        description: "Convert 'true'/'false' to booleans"
      },
      {
        name: "indent",
        label: "Indent",
        type: "number",
        default: 2,
        min: 0,
        max: 8,
      }
    ],
    processingMode: "entire",
    execute: (input, params) => {
      const parseNumbers = params.parseNumbers ?? true;
      const parseBooleans = params.parseBooleans ?? true;
      const indent = (params.indent as number) ?? 2;

      // Remove leading ? if present
      let queryString = input.trim();
      if (queryString.startsWith('?')) {
        queryString = queryString.substring(1);
      }

      if (!queryString) {
        return '{}';
      }

      const parseValue = (val: string): unknown => {
        if (parseBooleans) {
          if (val.toLowerCase() === 'true') return true;
          if (val.toLowerCase() === 'false') return false;
        }
        if (parseNumbers && /^-?\d+(\.\d+)?$/.test(val)) {
          const num = parseFloat(val);
          if (!isNaN(num)) return num;
        }
        return val;
      };

      const result: Record<string, unknown> = {};

      queryString.split('&').forEach(pair => {
        if (!pair) return;

        const [rawKey, rawValue = ''] = pair.split('=');
        const key = decodeURIComponent(rawKey);
        const value = decodeURIComponent(rawValue);

        // Handle array notation: key[], key[0], etc.
        const bracketMatch = key.match(/^(.+?)\[(\d*)\]$/);
        if (bracketMatch) {
          const baseKey = bracketMatch[1];
          if (!result[baseKey]) {
            result[baseKey] = [];
          }
          (result[baseKey] as unknown[]).push(parseValue(value));
        } else if (result[key] !== undefined) {
          // Key already exists - convert to array
          if (!Array.isArray(result[key])) {
            result[key] = [result[key]];
          }
          (result[key] as unknown[]).push(parseValue(value));
        } else {
          result[key] = parseValue(value);
        }
      });

      return indent === 0
        ? JSON.stringify(result)
        : JSON.stringify(result, null, indent);
    },
    keywords: ["query", "querystring", "json", "params", "url", "parse"],
    icon: "Braces",
    source: "tablet",
  },
];

// Self-register all operations
urlParserOperations.forEach((op) => operationRegistry.register(op));

// Export for testing and direct access if needed
export { urlParserOperations };
