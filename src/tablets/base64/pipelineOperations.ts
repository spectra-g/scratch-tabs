/**
 * Base64 Pipeline Operations
 *
 * Registers Base64-specific operations to the pipeline registry.
 * This file self-registers operations when imported.
 *
 * These operations wrap the existing base64Utils.ts functions,
 * making them available to the pipeline system.
 */

import { operationRegistry } from "../../services/pipeline/OperationRegistry";
import { OperationDefinition } from "../../services/pipeline/types";
import { encodeBase64, decodeBase64 } from "./utils/base64Utils";
import { base64Formats } from "./utils/base64Formats";

/**
 * Build format options from the available Base64 formats
 */
const formatOptions = base64Formats.map((f) => ({
  value: f.id,
  label: f.name,
}));

/**
 * Encoding options
 */
const encodingOptions = [
  { value: "utf8", label: "UTF-8" },
  { value: "ascii", label: "ASCII" },
  { value: "latin1", label: "Latin-1 (ISO-8859-1)" },
];

/**
 * Base64 operations for the pipeline
 */
const base64Operations: OperationDefinition[] = [
  {
    id: "base64.encode",
    name: "Base64 Encode",
    description: "Encode text to Base64 format",
    categories: ["encoding"],
    parameters: [
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "standard",
        options: formatOptions,
        description: "The Base64 variant to use",
      },
      {
        name: "encoding",
        label: "Text Encoding",
        type: "select",
        default: "utf8",
        options: encodingOptions,
        description: "Character encoding of the input text",
      },
    ],
    execute: (input, params) => {
      const format = (params.format as string) ?? "standard";
      const encoding = (params.encoding as string) ?? "utf8";
      return encodeBase64(input, format, encoding);
    },
    keywords: ["encode", "convert", "base64", "binary"],
    icon: "FileCode",
    source: "tablet",
  },
  {
    id: "base64.decode",
    name: "Base64 Decode",
    description: "Decode Base64 back to text",
    categories: ["encoding"],
    parameters: [
      {
        name: "format",
        label: "Format",
        type: "select",
        default: "standard",
        options: formatOptions,
        description: "The Base64 variant to decode",
      },
      {
        name: "encoding",
        label: "Text Encoding",
        type: "select",
        default: "utf8",
        options: encodingOptions,
        description: "Character encoding for the output text",
      },
    ],
    execute: (input, params) => {
      const format = (params.format as string) ?? "standard";
      const encoding = (params.encoding as string) ?? "utf8";
      return decodeBase64(input, format, encoding);
    },
    keywords: ["decode", "convert", "base64", "binary"],
    icon: "FileText",
    source: "tablet",
  },
];

// Self-register all operations
base64Operations.forEach((op) => operationRegistry.register(op));

// Export for testing and direct access if needed
export { base64Operations };
