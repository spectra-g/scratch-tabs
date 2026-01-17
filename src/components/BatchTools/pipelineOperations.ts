/**
 * BatchTools Pipeline Operations
 *
 * Self-registers batch tool transformations to the pipeline registry.
 *
 * MIGRATION STATUS:
 * ================
 *
 * MIGRATED:
 * ---------
 * - trim
 * - uppercase
 * - lowercase
 * - title-case
 * - remove-duplicates
 * - sort-asc
 * - sort-desc
 * - reverse-lines
 * - remove-blank-lines
 * - remove-extra-blank-lines
 * - join-lines
 * - split-lines
 * - add-prefix
 * - add-suffix
 * - find-replace-regex
 *
 * NOT YET MIGRATED:
 * -----------------
 * - remove-extra-whitespace (preserve-single, remove-all)
 * - case: camel, pascal, kebab, snake, invert, alternating, screaming-snake, sentence
 * - filter-by-regex
 * - filter-by-keyword
 * - keep-first-n-lines
 * - keep-last-n-lines
 * - duplicate-lines
 * - number-lines (numeric, roman, alpha)
 * - change-indentation
 * - pad-lines
 * - shuffle-lines
 * - sort: natural, numeric-asc, numeric-desc, length
 * - convert-tabs-spaces
 * - normalize-line-endings
 * - wrap-lines
 * - redaction (all built-in patterns and custom)
 * - javascript-snippet
 */

import { OperationDefinition } from "../../services/pipeline/types";
import { operationRegistry } from "../../services/pipeline";

const batchToolsOperations: OperationDefinition[] = [
  // === WHITESPACE & CLEANUP ===
  {
    id: "text.trim",
    name: "Trim Lines",
    description: "Remove leading and trailing whitespace from each line",
    categories: ["text", "cleanup"],
    parameters: [],
    execute: (input) => {
      return input
        .split("\n")
        .map((line) => line.trim())
        .join("\n");
    },
    keywords: ["trim", "whitespace", "strip"],
    source: "core",
  },
  {
    id: "text.remove-blank-lines",
    name: "Remove Blank Lines",
    description: "Remove all empty or whitespace-only lines",
    categories: ["text", "cleanup"],
    parameters: [],
    execute: (input) => {
      return input
        .split("\n")
        .filter((line) => line.trim() !== "")
        .join("\n");
    },
    keywords: ["blank", "empty", "remove"],
    source: "core",
  },
  {
    id: "text.remove-extra-blank-lines",
    name: "Remove Extra Blank Lines",
    description: "Collapse consecutive blank lines into single blank lines",
    categories: ["text", "cleanup"],
    parameters: [],
    execute: (input) => {
      const lines = input.split("\n");
      const result: string[] = [];
      let lastWasEmpty = false;

      for (const line of lines) {
        const isEmpty = line.trim() === "";
        if (!isEmpty || !lastWasEmpty) {
          result.push(line);
        }
        lastWasEmpty = isEmpty;
      }

      return result.join("\n");
    },
    keywords: ["blank", "empty", "collapse", "consecutive"],
    source: "core",
  },

  // === CASE CONVERSION ===
  {
    id: "text.uppercase",
    name: "Uppercase",
    description: "Convert all text to uppercase",
    categories: ["text", "case"],
    parameters: [],
    execute: (input) => input.toUpperCase(),
    keywords: ["upper", "capitalize", "case"],
    source: "core",
  },
  {
    id: "text.lowercase",
    name: "Lowercase",
    description: "Convert all text to lowercase",
    categories: ["text", "case"],
    parameters: [],
    execute: (input) => input.toLowerCase(),
    keywords: ["lower", "case"],
    source: "core",
  },
  {
    id: "text.title-case",
    name: "Title Case",
    description: "Capitalize the first letter of each word",
    categories: ["text", "case"],
    parameters: [],
    execute: (input) => {
      return input.replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(),
      );
    },
    keywords: ["title", "capitalize", "case"],
    source: "core",
  },

  // === DUPLICATES ===
  {
    id: "text.remove-duplicates",
    name: "Remove Duplicate Lines",
    description: "Remove duplicate lines, keeping first occurrence",
    categories: ["text", "cleanup"],
    parameters: [],
    execute: (input) => {
      const seen = new Set<string>();
      const result: string[] = [];

      for (const line of input.split("\n")) {
        if (!seen.has(line)) {
          seen.add(line);
          result.push(line);
        }
      }

      return result.join("\n");
    },
    keywords: ["duplicate", "unique", "distinct"],
    source: "core",
  },

  // === SORTING & LINE ORDER ===
  {
    id: "text.sort-asc",
    name: "Sort Lines (A-Z)",
    description: "Sort lines alphabetically in ascending order",
    categories: ["text", "sorting"],
    parameters: [],
    execute: (input) => {
      return input.split("\n").sort().join("\n");
    },
    keywords: ["sort", "alphabetical", "ascending"],
    source: "core",
  },
  {
    id: "text.sort-desc",
    name: "Sort Lines (Z-A)",
    description: "Sort lines alphabetically in descending order",
    categories: ["text", "sorting"],
    parameters: [],
    execute: (input) => {
      return input.split("\n").sort().reverse().join("\n");
    },
    keywords: ["sort", "alphabetical", "descending"],
    source: "core",
  },
  {
    id: "text.reverse-lines",
    name: "Reverse Lines",
    description: "Reverse the order of all lines",
    categories: ["text", "sorting"],
    parameters: [],
    execute: (input) => {
      return input.split("\n").reverse().join("\n");
    },
    keywords: ["reverse", "flip", "order"],
    source: "core",
  },

  // === JOIN/SPLIT ===
  {
    id: "text.join-lines",
    name: "Join Lines",
    description: "Join all lines with a specified separator",
    categories: ["text", "formatting"],
    parameters: [
      {
        name: "separator",
        label: "Separator",
        type: "string",
        default: ", ",
        description: "String to use between lines",
      },
    ],
    execute: (input, params) => {
      const separator = (params.separator as string) ?? ", ";
      return input.split("\n").join(separator);
    },
    keywords: ["join", "merge", "combine", "concatenate"],
    source: "core",
  },
  {
    id: "text.split-lines",
    name: "Split into Lines",
    description: "Split text by a separator into separate lines",
    categories: ["text", "formatting"],
    parameters: [
      {
        name: "separator",
        label: "Separator",
        type: "string",
        default: ", ",
        description: "String to split on",
      },
    ],
    execute: (input, params) => {
      const separator = (params.separator as string) ?? ", ";
      return input.split(separator).join("\n");
    },
    keywords: ["split", "divide", "separate"],
    source: "core",
  },

  // === PREFIX/SUFFIX ===
  {
    id: "text.add-prefix",
    name: "Add Prefix",
    description: "Add text to the beginning of each line",
    categories: ["text", "formatting"],
    parameters: [
      {
        name: "prefix",
        label: "Prefix",
        type: "string",
        default: "",
        description: "Text to add at the start of each line",
        placeholder: "Enter prefix text...",
      },
    ],
    execute: (input, params) => {
      const prefix = (params.prefix as string) ?? "";
      return input
        .split("\n")
        .map((line) => prefix + line)
        .join("\n");
    },
    keywords: ["prefix", "prepend", "start"],
    source: "core",
  },
  {
    id: "text.add-suffix",
    name: "Add Suffix",
    description: "Add text to the end of each line",
    categories: ["text", "formatting"],
    parameters: [
      {
        name: "suffix",
        label: "Suffix",
        type: "string",
        default: "",
        description: "Text to add at the end of each line",
        placeholder: "Enter suffix text...",
      },
    ],
    execute: (input, params) => {
      const suffix = (params.suffix as string) ?? "";
      return input
        .split("\n")
        .map((line) => line + suffix)
        .join("\n");
    },
    keywords: ["suffix", "append", "end"],
    source: "core",
  },

  // === FIND/REPLACE ===
  {
    id: "text.find-replace-regex",
    name: "Find & Replace (Regex)",
    description: "Find and replace using regular expressions",
    categories: ["text", "search"],
    parameters: [
      {
        name: "find",
        label: "Find Pattern",
        type: "string",
        default: "",
        description: "Regular expression pattern to find",
        placeholder: "e.g. \\d+ or [a-z]+",
      },
      {
        name: "replace",
        label: "Replace With",
        type: "string",
        default: "",
        description: "Replacement text (supports $1, $2, etc.)",
        placeholder: "Replacement text",
      },
      {
        name: "flags",
        label: "Flags",
        type: "string",
        default: "gm",
        description: "Regex flags (g=global, m=multiline, i=case-insensitive)",
      },
    ],
    execute: (input, params) => {
      const find = params.find as string;
      const replace = (params.replace as string) ?? "";
      const flags = (params.flags as string) ?? "gm";

      if (!find) return input;

      try {
        const regex = new RegExp(find, flags);
        return input.replace(regex, replace);
      } catch (e) {
        return input;
      }
    },
    keywords: ["find", "replace", "regex", "search", "substitute"],
    source: "core",
  },
];

// Register all operations
batchToolsOperations.forEach((op) => operationRegistry.register(op));
