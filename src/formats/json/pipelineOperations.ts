/**
 * JSON Pipeline Operations
 *
 * Registers JSON-specific operations to the pipeline registry.
 * This file self-registers operations when imported.
 *
 * These operations wrap the existing jsonOperations.ts functions,
 * making them available to the pipeline system.
 */

import { operationRegistry } from "../../services/pipeline/OperationRegistry";
import { OperationDefinition } from "../../services/pipeline/types";
import {
  minifyJson,
  sortJsonKeys,
  flattenJson,
  unflattenJson,
  removeEmptyValues,
  removeComments,
  stringifyJson,
  unstringifyJsonContent,
} from "./actions/jsonOperations";
import { JSONPath } from "jsonpath-plus";

/**
 * JSON operations for the pipeline
 */
const jsonOperations: OperationDefinition[] = [
  {
    id: "json.format",
    name: "Format JSON",
    description: "Pretty-print JSON with configurable indentation",
    categories: ["json", "formatting"],
    parameters: [
      {
        name: "indent",
        label: "Indent Size",
        type: "number",
        default: 2,
        min: 1,
        max: 8,
        description: "Number of spaces for indentation",
      },
    ],
    processingMode: "entire",
    execute: (input, params) => {
      const indent = (params.indent as number) ?? 2;
      const json = JSON.parse(input);
      return JSON.stringify(json, null, indent);
    },
    keywords: ["pretty", "beautify", "indent", "prettify"],
    icon: "Braces",
    source: "format",
  },
  {
    id: "json.minify",
    name: "Minify JSON",
    description: "Remove all whitespace from JSON",
    categories: ["json", "formatting"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => minifyJson(input),
    keywords: ["compress", "compact", "minimize"],
    icon: "Minimize2",
    source: "format",
  },
  {
    id: "json.sortKeys",
    name: "Sort JSON Keys",
    description: "Alphabetically sort object keys — deep (recursive, default) or shallow (top-level only)",
    categories: ["json", "sorting"],
    parameters: [
      {
        name: "mode",
        label: "Sort Mode",
        type: "select",
        default: "deep",
        options: [
          { value: "deep", label: "Deep (recursive)" },
          { value: "shallow", label: "Shallow (top-level only)" },
        ],
      },
      {
        name: "output",
        label: "Output",
        type: "select",
        default: "pretty",
        options: [
          { value: "pretty", label: "Pretty (indented)" },
          { value: "minified", label: "Minified" },
        ],
      },
      {
        name: "indent",
        label: "Indent Size",
        type: "number",
        default: 2,
        min: 1,
        max: 8,
        description: "Spaces per level (pretty output only)",
      },
    ],
    processingMode: "entire",
    execute: (input, params) => {
      const deep = ((params.mode as string) ?? "deep") === "deep";
      const output = (params.output as string) ?? "pretty";
      const indent = (params.indent as number) ?? 2;

      const parsed = JSON.parse(input);

      const sortKeys = (value: unknown, recursive: boolean): unknown => {
        if (value === null || typeof value !== "object") return value;
        if (Array.isArray(value)) {
          return recursive ? value.map((item) => sortKeys(item, recursive)) : value;
        }
        const obj = value as Record<string, unknown>;
        const sorted: Record<string, unknown> = {};
        for (const key of Object.keys(obj).sort()) {
          sorted[key] = recursive ? sortKeys(obj[key], recursive) : obj[key];
        }
        return sorted;
      };

      const result = sortKeys(parsed, deep);
      return JSON.stringify(result, null, output === "pretty" ? indent : undefined);
    },
    keywords: ["alphabetize", "order", "organize", "sort", "keys"],
    icon: "ArrowDownAZ",
    source: "format",
  },
  {
    id: "json.flatten",
    name: "Flatten JSON",
    description: "Convert nested objects to dot-notation keys (e.g., {a:{b:1}} → {\"a.b\":1})",
    categories: ["json"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => flattenJson(input),
    keywords: ["flat", "denormalize", "dot notation"],
    icon: "Minus",
    source: "format",
  },
  {
    id: "json.unflatten",
    name: "Unflatten JSON",
    description: "Convert dot-notation keys back to nested objects",
    categories: ["json"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => unflattenJson(input),
    keywords: ["nest", "normalize", "expand"],
    icon: "Plus",
    source: "format",
  },
  {
    id: "json.removeEmpty",
    name: "Remove Empty Values",
    description: "Remove null, undefined, empty strings, and empty objects/arrays",
    categories: ["json", "filtering"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => removeEmptyValues(input),
    keywords: ["clean", "strip", "null", "empty"],
    icon: "Eraser",
    source: "format",
  },
  {
    id: "json.removeComments",
    name: "Remove JSON Comments",
    description: "Remove // and /* */ style comments from JSON-like content",
    categories: ["json"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => removeComments(input),
    keywords: ["clean", "strip", "comments", "jsonc"],
    icon: "MessageSquareOff",
    source: "format",
  },
  {
    id: "json.stringify",
    name: "Stringify JSON",
    description: "Wrap JSON in quotes as an escaped string",
    categories: ["json", "encoding"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => stringifyJson(input),
    keywords: ["escape", "quote", "string"],
    icon: "Quote",
    source: "format",
  },
  {
    id: "json.unstringify",
    name: "Unstringify JSON",
    description: "Unwrap a stringified JSON back to normal JSON",
    categories: ["json", "encoding"],
    parameters: [],
    processingMode: "entire",
    execute: (input) => unstringifyJsonContent(input),
    keywords: ["unescape", "unquote", "parse"],
    icon: "Ungroup",
    source: "format",
  },
  {
    id: "json.jsonpath",
    name: "JSONPath Query",
    description: "Extract values from JSON using a JSONPath expression (e.g. $.users[*].name)",
    categories: ["json", "filtering"],
    parameters: [
      {
        name: "path",
        label: "JSONPath Expression",
        type: "string",
        default: "$",
        required: true,
        description: "JSONPath expression to evaluate",
        placeholder: "e.g. $.store.book[*].author",
      },
      {
        name: "outputFormat",
        label: "Output Format",
        type: "select",
        default: "pretty",
        options: [
          { value: "pretty", label: "Pretty JSON" },
          { value: "compact", label: "Compact JSON" },
          { value: "lines", label: "One Value Per Line" },
        ],
      },
      {
        name: "indent",
        label: "Indent Size",
        type: "number",
        default: 2,
        min: 1,
        max: 8,
        description: "Spaces for Pretty JSON output",
      },
    ],
    processingMode: "entire",
    execute: (input, params) => {
      const path = (params.path as string) || "$";
      const outputFormat = (params.outputFormat as string) || "pretty";
      const indent = (params.indent as number) ?? 2;

      let json: unknown;
      try {
        json = JSON.parse(input);
      } catch {
        throw new Error("Invalid JSON input");
      }

      const raw = JSONPath({ path, json });
      // Normalize: real library wraps in array, mock may return raw value
      const results: unknown[] = Array.isArray(raw)
        ? raw
        : raw !== undefined && raw !== null
          ? [raw]
          : [];

      if (outputFormat === "lines") {
        return results
          .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
          .join("\n");
      }

      const indentSize = outputFormat === "pretty" ? indent : undefined;
      return JSON.stringify(results, null, indentSize);
    },
    keywords: ["jsonpath", "query", "filter", "extract", "jq", "select", "search"],
    icon: "Filter",
    source: "format",
  },
];

// Self-register all operations
jsonOperations.forEach((op) => operationRegistry.register(op));

// Export for testing and direct access if needed
export { jsonOperations };
