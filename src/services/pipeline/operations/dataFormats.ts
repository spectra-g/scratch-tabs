import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";
import * as jsYaml from "js-yaml";

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
    }
];

// Self-register all operations
dataFormatOperations.forEach(op => operationRegistry.register(op));

export default dataFormatOperations;
