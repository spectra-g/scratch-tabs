import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";
import * as jsYaml from "js-yaml";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

/**
 * Data Format Pipeline Operations
 *
 * Operations for converting between data formats like YAML, JSON, CSV.
 */
export const dataFormatOperations: OperationDefinition[] = [
    // === YAML <-> JSON ===
    {
        id: "yaml.to-json",
        name: "YAML to JSON",
        description: "Convert YAML content to JSON format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "Number of spaces for JSON indentation (0 = minified)"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;

            try {
                const parsed = jsYaml.load(input);
                // Handle undefined result (empty input)
                const result = parsed === undefined ? null : parsed;
                return indent === 0
                    ? JSON.stringify(result)
                    : JSON.stringify(result, null, indent);
            } catch (e: any) {
                throw new Error(`Failed to parse YAML: ${e.message}`);
            }
        },
        keywords: ["yaml", "json", "convert", "yml"],
        source: "core",
    },
    {
        id: "json.to-yaml",
        name: "JSON to YAML",
        description: "Convert JSON content to YAML format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 1,
                max: 8,
                description: "Number of spaces for YAML indentation"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;

            try {
                const parsed = JSON.parse(input);
                return jsYaml.dump(parsed, {
                    indent,
                    quotingType: '"',  // Use double quotes
                    forceQuotes: false  // Only quote when necessary
                });
            } catch (e: any) {
                if (e.message?.includes('JSON')) {
                    throw new Error(`Failed to parse JSON: ${e.message}`);
                }
                throw new Error(`Failed to convert to YAML: ${e.message}`);
            }
        },
        keywords: ["json", "yaml", "convert", "yml"],
        source: "core",
    },

    // === TOML ===
    {
        id: "toml.to-json",
        name: "TOML to JSON",
        description: "Convert TOML content to JSON format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "Number of spaces for JSON indentation (0 = minified)",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;
            try {
                const parsed = parseToml(input);
                return indent === 0
                    ? JSON.stringify(parsed)
                    : JSON.stringify(parsed, null, indent);
            } catch (e: any) {
                throw new Error(`Failed to parse TOML: ${e.message}`);
            }
        },
        keywords: ["toml", "json", "convert"],
        source: "core",
    },
    {
        id: "json.to-toml",
        name: "JSON to TOML",
        description: "Convert JSON content to TOML format",
        categories: ["formatting", "utilities"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            try {
                const parsed = JSON.parse(input);
                return stringifyToml(parsed);
            } catch (e: any) {
                throw new Error(`Failed to convert to TOML: ${e.message}`);
            }
        },
        keywords: ["json", "toml", "convert"],
        source: "core",
    },
    {
        id: "toml.to-yaml",
        name: "TOML to YAML",
        description: "Convert TOML content to YAML format",
        categories: ["formatting", "utilities"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 1,
                max: 8,
                description: "Number of spaces for YAML indentation",
            },
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indent = (params.indent as number) ?? 2;
            try {
                const parsed = parseToml(input);
                return jsYaml.dump(parsed, { indent, quotingType: '"', forceQuotes: false });
            } catch (e: any) {
                throw new Error(`Failed to convert TOML to YAML: ${e.message}`);
            }
        },
        keywords: ["toml", "yaml", "convert"],
        source: "core",
    },
    {
        id: "yaml.to-toml",
        name: "YAML to TOML",
        description: "Convert YAML content to TOML format",
        categories: ["formatting", "utilities"],
        parameters: [],
        processingMode: "entire",
        execute: (input) => {
            try {
                const parsed = jsYaml.load(input);
                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                    throw new Error("TOML root must be a table (object). Arrays at root level are not supported.");
                }
                return stringifyToml(parsed as Record<string, unknown>);
            } catch (e: any) {
                throw new Error(`Failed to convert YAML to TOML: ${e.message}`);
            }
        },
        keywords: ["yaml", "toml", "convert"],
        source: "core",
    },

    // === CSV ===
    {
        id: "csv.extract-column",
        name: "Extract CSV Column",
        description: "Extract a specific column from CSV data",
        categories: ["extraction", "utilities"],
        parameters: [
            {
                name: "column",
                label: "Column",
                type: "string",
                default: "0",
                description: "Column index (0-based) or header name"
            },
            {
                name: "hasHeaders",
                label: "Has Headers",
                type: "boolean",
                default: true,
                description: "First row contains column headers"
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const columnSpec = (params.column as string) ?? "0";
            const hasHeaders = params.hasHeaders ?? true;
            const delimiter = (params.delimiter as string) ?? ",";

            const lines = input.trim().split('\n');
            if (lines.length === 0) {
                return '';
            }

            // CSV parser that handles quoted fields containing delimiters
            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let currentCell = '';
                let inQuotes = false;

                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    const nextChar = row[i + 1];

                    if (char === '"') {
                        // Handle escaped quotes ("" inside quoted string)
                        if (inQuotes && nextChar === '"') {
                            currentCell += '"';
                            i++; // Skip next quote
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === delimiter && !inQuotes) {
                        cells.push(currentCell.trim());
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                cells.push(currentCell.trim());

                // Remove surrounding quotes from cells
                return cells.map(c => {
                    const trimmed = c.trim();
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        return trimmed.slice(1, -1);
                    }
                    return trimmed;
                });
            };

            let columnIndex: number;
            let startRow = 0;

            if (hasHeaders) {
                const headers = parseRow(lines[0]);
                // Check if columnSpec is a number or header name
                const numericIndex = parseInt(columnSpec);
                if (!isNaN(numericIndex)) {
                    columnIndex = numericIndex;
                } else {
                    // Find by header name (case-insensitive)
                    columnIndex = headers.findIndex(h =>
                        h.toLowerCase() === columnSpec.toLowerCase()
                    );
                    if (columnIndex === -1) {
                        throw new Error(`Column "${columnSpec}" not found in headers: ${headers.join(', ')}`);
                    }
                }
                startRow = 1; // Skip header row
            } else {
                columnIndex = parseInt(columnSpec);
                if (isNaN(columnIndex)) {
                    throw new Error('Column must be numeric when hasHeaders is false');
                }
            }

            const result: string[] = [];
            for (let i = startRow; i < lines.length; i++) {
                const cells = parseRow(lines[i]);
                if (columnIndex >= 0 && columnIndex < cells.length) {
                    result.push(cells[columnIndex]);
                }
            }

            return result.join('\n');
        },
        keywords: ["csv", "column", "extract", "field", "data"],
        source: "core",
    },
    {
        id: "csv.to-json",
        name: "CSV to JSON",
        description: "Convert CSV data to JSON array of objects",
        categories: ["conversion", "utilities"],
        parameters: [
            {
                name: "hasHeaders",
                label: "Has Headers",
                type: "boolean",
                default: true,
                description: "First row contains column headers (used as object keys)"
            },
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            },
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 0,
                max: 8,
                description: "JSON indentation (0 = minified)"
            },
            {
                name: "parseNumbers",
                label: "Parse Numbers",
                type: "boolean",
                default: true,
                description: "Convert numeric strings to numbers"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const hasHeaders = params.hasHeaders ?? true;
            const delimiter = (params.delimiter as string) ?? ",";
            const indent = (params.indent as number) ?? 2;
            const parseNumbers = params.parseNumbers ?? true;

            const lines = input.trim().split('\n').filter(l => l.trim());
            if (lines.length === 0) {
                return '[]';
            }

            // CSV parser that handles quoted fields
            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let currentCell = '';
                let inQuotes = false;

                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    const nextChar = row[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            currentCell += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === delimiter && !inQuotes) {
                        cells.push(currentCell);
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                cells.push(currentCell);

                return cells.map(c => {
                    let trimmed = c.trim();
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        trimmed = trimmed.slice(1, -1).replace(/""/g, '"');
                    }
                    return trimmed;
                });
            };

            const parseValue = (val: string): string | number | boolean | null => {
                if (val === '') return null;
                if (val.toLowerCase() === 'true') return true;
                if (val.toLowerCase() === 'false') return false;
                if (val.toLowerCase() === 'null') return null;
                if (parseNumbers && /^-?\d+(\.\d+)?$/.test(val)) {
                    const num = parseFloat(val);
                    if (!isNaN(num)) return num;
                }
                return val;
            };

            let headers: string[];
            let startRow: number;

            if (hasHeaders) {
                headers = parseRow(lines[0]);
                startRow = 1;
            } else {
                // Generate column names: col0, col1, col2, ...
                const firstRow = parseRow(lines[0]);
                headers = firstRow.map((_, i) => `col${i}`);
                startRow = 0;
            }

            const result: Record<string, unknown>[] = [];

            for (let i = startRow; i < lines.length; i++) {
                const cells = parseRow(lines[i]);
                const obj: Record<string, unknown> = {};

                headers.forEach((header, idx) => {
                    const value = idx < cells.length ? cells[idx] : '';
                    obj[header] = parseValue(value);
                });

                result.push(obj);
            }

            return indent === 0
                ? JSON.stringify(result)
                : JSON.stringify(result, null, indent);
        },
        keywords: ["csv", "json", "convert", "array", "objects"],
        source: "core",
    },
    {
        id: "json.to-csv",
        name: "JSON to CSV",
        description: "Convert JSON array of objects to CSV",
        categories: ["conversion", "utilities"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            },
            {
                name: "includeHeaders",
                label: "Include Headers",
                type: "boolean",
                default: true,
                description: "Add header row with column names"
            },
            {
                name: "flattenObjects",
                label: "Flatten Nested Objects",
                type: "boolean",
                default: true,
                description: "Convert nested objects to dot-notation columns"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) ?? ",";
            const includeHeaders = params.includeHeaders ?? true;
            const flattenObjects = params.flattenObjects ?? true;

            let data: unknown;
            try {
                data = JSON.parse(input);
            } catch (e: any) {
                throw new Error(`Failed to parse JSON: ${e.message}`);
            }

            // Ensure it's an array
            if (!Array.isArray(data)) {
                // If it's an object, wrap in array
                if (typeof data === 'object' && data !== null) {
                    data = [data];
                } else {
                    throw new Error('Input must be a JSON array of objects');
                }
            }

            if (data.length === 0) {
                return '';
            }

            // Flatten nested objects if requested
            const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
                const result: Record<string, unknown> = {};

                for (const [key, value] of Object.entries(obj)) {
                    const newKey = prefix ? `${prefix}.${key}` : key;

                    if (flattenObjects && value && typeof value === 'object' && !Array.isArray(value)) {
                        Object.assign(result, flatten(value as Record<string, unknown>, newKey));
                    } else if (Array.isArray(value)) {
                        result[newKey] = JSON.stringify(value);
                    } else {
                        result[newKey] = value;
                    }
                }

                return result;
            };

            // Process all objects and collect all unique keys
            const processedData = (data as Record<string, unknown>[]).map(item => {
                if (typeof item !== 'object' || item === null) {
                    return { value: item };
                }
                return flatten(item as Record<string, unknown>);
            });

            const allKeys = new Set<string>();
            processedData.forEach(obj => {
                Object.keys(obj).forEach(key => allKeys.add(key));
            });

            const headers = Array.from(allKeys);

            // Escape CSV value
            const escapeValue = (val: unknown): string => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Quote if contains delimiter, newline, or quote
                if (str.includes(delimiter) || str.includes('\n') || str.includes('"')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const rows: string[] = [];

            if (includeHeaders) {
                rows.push(headers.map(escapeValue).join(delimiter));
            }

            processedData.forEach(obj => {
                const row = headers.map(header => escapeValue(obj[header]));
                rows.push(row.join(delimiter));
            });

            return rows.join('\n');
        },
        keywords: ["json", "csv", "convert", "export", "spreadsheet"],
        source: "core",
    },

    // === MARKDOWN TABLES ===
    {
        id: "csv.to-markdown",
        name: "CSV to Markdown Table",
        description: "Convert CSV data to a Markdown table",
        categories: ["conversion", "formatting"],
        parameters: [
            {
                name: "delimiter",
                label: "Delimiter",
                type: "select",
                default: ",",
                options: [
                    { value: ",", label: "Comma" },
                    { value: "\t", label: "Tab" },
                    { value: ";", label: "Semicolon" },
                    { value: "|", label: "Pipe" }
                ]
            },
            {
                name: "alignment",
                label: "Alignment",
                type: "select",
                default: "left",
                options: [
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                ]
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const delimiter = (params.delimiter as string) ?? ",";
            const alignment = (params.alignment as string) ?? "left";

            const lines = input.trim().split('\n').filter(l => l.trim());
            if (lines.length === 0) {
                return '';
            }

            // CSV parser
            const parseRow = (row: string): string[] => {
                const cells: string[] = [];
                let currentCell = '';
                let inQuotes = false;

                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    const nextChar = row[i + 1];

                    if (char === '"') {
                        if (inQuotes && nextChar === '"') {
                            currentCell += '"';
                            i++;
                        } else {
                            inQuotes = !inQuotes;
                        }
                    } else if (char === delimiter && !inQuotes) {
                        cells.push(currentCell.trim());
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                cells.push(currentCell.trim());

                return cells.map(c => {
                    let trimmed = c.trim();
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        trimmed = trimmed.slice(1, -1).replace(/""/g, '"');
                    }
                    // Escape pipe characters in cell content
                    return trimmed.replace(/\|/g, '\\|');
                });
            };

            const rows = lines.map(parseRow);
            const headers = rows[0];
            const dataRows = rows.slice(1);

            // Build separator row
            let separatorChar: string;
            switch (alignment) {
                case "center": separatorChar = ':---:'; break;
                case "right": separatorChar = '---:'; break;
                default: separatorChar = '---';
            }
            const separator = headers.map(() => separatorChar);

            // Build markdown table
            const result: string[] = [];
            result.push('| ' + headers.join(' | ') + ' |');
            result.push('| ' + separator.join(' | ') + ' |');
            dataRows.forEach(row => {
                // Pad row if needed
                while (row.length < headers.length) {
                    row.push('');
                }
                result.push('| ' + row.slice(0, headers.length).join(' | ') + ' |');
            });

            return result.join('\n');
        },
        keywords: ["csv", "markdown", "table", "convert", "documentation"],
        source: "core",
    },
    {
        id: "json.to-markdown",
        name: "JSON to Markdown Table",
        description: "Convert JSON array of objects to a Markdown table",
        categories: ["conversion", "formatting"],
        parameters: [
            {
                name: "alignment",
                label: "Alignment",
                type: "select",
                default: "left",
                options: [
                    { value: "left", label: "Left" },
                    { value: "center", label: "Center" },
                    { value: "right", label: "Right" },
                ]
            },
            {
                name: "flattenObjects",
                label: "Flatten Nested Objects",
                type: "boolean",
                default: true,
                description: "Convert nested objects to dot-notation columns"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const alignment = (params.alignment as string) ?? "left";
            const flattenObjects = params.flattenObjects ?? true;

            let data: unknown;
            try {
                data = JSON.parse(input);
            } catch (e: any) {
                throw new Error(`Failed to parse JSON: ${e.message}`);
            }

            // Ensure it's an array
            if (!Array.isArray(data)) {
                if (typeof data === 'object' && data !== null) {
                    data = [data];
                } else {
                    throw new Error('Input must be a JSON array of objects');
                }
            }

            if (data.length === 0) {
                return '';
            }

            // Flatten nested objects if requested
            const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
                const result: Record<string, unknown> = {};

                for (const [key, value] of Object.entries(obj)) {
                    const newKey = prefix ? `${prefix}.${key}` : key;

                    if (flattenObjects && value && typeof value === 'object' && !Array.isArray(value)) {
                        Object.assign(result, flatten(value as Record<string, unknown>, newKey));
                    } else if (Array.isArray(value)) {
                        result[newKey] = JSON.stringify(value);
                    } else {
                        result[newKey] = value;
                    }
                }

                return result;
            };

            // Process all objects and collect all unique keys
            const processedData = (data as Record<string, unknown>[]).map(item => {
                if (typeof item !== 'object' || item === null) {
                    return { value: item };
                }
                return flatten(item as Record<string, unknown>);
            });

            const allKeys = new Set<string>();
            processedData.forEach(obj => {
                Object.keys(obj).forEach(key => allKeys.add(key));
            });

            const headers = Array.from(allKeys);

            // Escape special markdown characters in cell content
            const escapeCell = (val: unknown): string => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                return str.replace(/\|/g, '\\|').replace(/\n/g, ' ');
            };

            // Build separator row
            let separatorChar: string;
            switch (alignment) {
                case "center": separatorChar = ':---:'; break;
                case "right": separatorChar = '---:'; break;
                default: separatorChar = '---';
            }
            const separator = headers.map(() => separatorChar);

            // Build markdown table
            const result: string[] = [];
            result.push('| ' + headers.join(' | ') + ' |');
            result.push('| ' + separator.join(' | ') + ' |');

            processedData.forEach(obj => {
                const row = headers.map(header => escapeCell(obj[header]));
                result.push('| ' + row.join(' | ') + ' |');
            });

            return result.join('\n');
        },
        keywords: ["json", "markdown", "table", "convert", "documentation"],
        source: "core",
    }
];

// Self-register all operations
dataFormatOperations.forEach(op => operationRegistry.register(op));

export default dataFormatOperations;
