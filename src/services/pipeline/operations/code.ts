import { OperationDefinition } from "../types";
import { operationRegistry } from "../OperationRegistry";

/**
 * Code & Developer Pipeline Operations
 *
 * Operations for code formatting and developer-specific tasks.
 */
export const codeOperations: OperationDefinition[] = [
    // === SQL ===
    {
        id: "code.sql-escape",
        name: "SQL Escape",
        description: "Escape single quotes and backslashes for safe SQL insertion",
        categories: ["encoding", "utilities"],
        parameters: [
            {
                name: "quoteStyle",
                label: "Quote Style",
                type: "select",
                default: "single",
                options: [
                    { value: "single", label: "Single Quotes (PostgreSQL, MySQL)" },
                    { value: "double", label: "Double Quotes (SQL Server)" }
                ]
            }
        ],
        processingMode: "configurable",
        execute: (input, params) => {
            const quoteStyle = (params.quoteStyle as string) ?? "single";

            if (quoteStyle === "single") {
                // Escape backslashes first, then single quotes
                return input.replace(/\\/g, '\\\\').replace(/'/g, "''");
            } else {
                // Escape backslashes first, then double quotes
                return input.replace(/\\/g, '\\\\').replace(/"/g, '""');
            }
        },
        keywords: ["sql", "escape", "quote", "database", "sanitize"],
        source: "core",
    },
    {
        id: "sql.prettify",
        name: "Format SQL",
        description: "Format and indent SQL queries for readability",
        categories: ["formatting"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 1,
                max: 8
            },
            {
                name: "uppercase",
                label: "Uppercase Keywords",
                type: "boolean",
                default: true,
                description: "Convert SQL keywords to uppercase"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indentSize = (params.indent as number) ?? 2;
            const uppercaseKeywords = params.uppercase ?? true;
            const indent = ' '.repeat(indentSize);

            // SQL keywords to format
            const keywords = [
                'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
                'ON', 'AND', 'OR', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET',
                'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
                'DROP', 'ALTER', 'ADD', 'COLUMN', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
                'INDEX', 'UNIQUE', 'NOT NULL', 'DEFAULT', 'CHECK', 'CONSTRAINT',
                'AS', 'DISTINCT', 'UNION', 'ALL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
                'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL'
            ];

            let sql = input.trim();

            // Convert keywords to uppercase if requested
            if (uppercaseKeywords) {
                keywords.forEach(keyword => {
                    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
                    sql = sql.replace(regex, keyword);
                });
            }

            // Basic formatting: Add newlines before major clauses
            const majorClauses = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN',
                'RIGHT JOIN', 'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'UNION'];

            majorClauses.forEach(clause => {
                const regex = new RegExp(`\\s+(${clause})\\s+`, 'gi');
                sql = sql.replace(regex, (match, p1) => {
                    return '\n' + (uppercaseKeywords ? clause : p1) + ' ';
                });
            });

            // Add indentation to sub-clauses
            const lines = sql.split('\n').map(line => line.trim());
            let indentLevel = 0;
            const formatted: string[] = [];

            lines.forEach(line => {
                if (!line) return;

                // Decrease indent for certain keywords
                if (/^(WHERE|ORDER BY|GROUP BY|HAVING|LIMIT)/.test(line)) {
                    indentLevel = 1;
                } else if (/^(FROM|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN)/.test(line)) {
                    indentLevel = 1;
                } else if (/^SELECT/.test(line)) {
                    indentLevel = 0;
                }

                formatted.push(indent.repeat(indentLevel) + line);
            });

            return formatted.join('\n').trim();
        },
        keywords: ["sql", "format", "prettify", "beautify", "query", "database"],
        source: "core",
    },

    // === CSS ===
    {
        id: "css.prettify",
        name: "Format CSS",
        description: "Format and indent CSS for readability",
        categories: ["formatting"],
        parameters: [
            {
                name: "indent",
                label: "Indent Size",
                type: "number",
                default: 2,
                min: 1,
                max: 8
            },
            {
                name: "spaceBraces",
                label: "Space Before Braces",
                type: "boolean",
                default: true,
                description: "Add space before opening brace"
            }
        ],
        processingMode: "entire",
        execute: (input, params) => {
            const indentSize = (params.indent as number) ?? 2;
            const spaceBraces = params.spaceBraces ?? true;
            const indent = ' '.repeat(indentSize);

            let css = input
                // Remove existing formatting
                .replace(/\s+/g, ' ')
                .trim();

            // Add newlines after closing braces
            css = css.replace(/}/g, '}\n');

            // Add newlines after opening braces
            css = css.replace(/{/g, '{\n');

            // Add newlines after semicolons (but not inside url() etc)
            css = css.replace(/;(?!\s*})/g, ';\n');

            // Split into lines and indent
            const lines = css.split('\n').map(line => line.trim()).filter(line => line);
            let indentLevel = 0;
            const formatted: string[] = [];

            lines.forEach(line => {
                // Decrease indent before closing brace
                if (line === '}') {
                    indentLevel = Math.max(0, indentLevel - 1);
                }

                // Add line with current indentation
                formatted.push(indent.repeat(indentLevel) + line);

                // Increase indent after opening brace
                if (line.endsWith('{')) {
                    indentLevel++;
                }
            });

            let result = formatted.join('\n');

            // Add space after colons in properties (only within rule blocks)
            // Match colons that are NOT followed by another colon (::pseudo-element)
            // and are followed by a non-space character
            const lines2 = result.split('\n');
            result = lines2.map(line => {
                // Only add space after colon if line doesn't end with {
                // (which means it's a property, not a selector)
                if (!line.trim().endsWith('{')) {
                    // Add space after colon if not already present
                    line = line.replace(/:(?!:)(?!\s)/g, ': ');
                }
                return line;
            }).join('\n');

            // Add space after commas in value lists
            result = result.replace(/,(?!\s)/g, ', ');

            // Add space before !important
            result = result.replace(/!important/g, ' !important');

            // Add space before opening brace if requested
            if (spaceBraces) {
                result = result.replace(/(\S){/g, '$1 {');
            }

            return result;
        },
        keywords: ["css", "format", "prettify", "beautify", "style", "stylesheet"],
        source: "core",
    }
];

// Self-register all operations
codeOperations.forEach(op => operationRegistry.register(op));

export default codeOperations;
