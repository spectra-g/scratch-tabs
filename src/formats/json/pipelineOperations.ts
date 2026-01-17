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
  formatJson,
  minifyJson,
  sortJsonKeys,
  flattenJson,
  unflattenJson,
  removeEmptyValues,
  removeComments,
  stringifyJson,
  unstringifyJsonContent,
} from "./actions/jsonOperations";

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
    execute: (input) => minifyJson(input),
    keywords: ["compress", "compact", "minimize"],
    icon: "Minimize2",
    source: "format",
  },
  {
    id: "json.sortKeys",
    name: "Sort JSON Keys",
    description: "Alphabetically sort all object keys recursively",
    categories: ["json", "sorting"],
    parameters: [],
    execute: (input) => sortJsonKeys(input),
    keywords: ["alphabetize", "order", "organize"],
    icon: "ArrowDownAZ",
    source: "format",
  },
  {
    id: "json.flatten",
    name: "Flatten JSON",
    description: "Convert nested objects to dot-notation keys (e.g., {a:{b:1}} → {\"a.b\":1})",
    categories: ["json"],
    parameters: [],
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
    execute: (input) => unstringifyJsonContent(input),
    keywords: ["unescape", "unquote", "parse"],
    icon: "Ungroup",
    source: "format",
  },
];

// Self-register all operations
jsonOperations.forEach((op) => operationRegistry.register(op));

// Export for testing and direct access if needed
export { jsonOperations };
