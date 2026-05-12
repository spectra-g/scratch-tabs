import {
    format,
    formatDistanceToNow,
    formatRFC3339,
    formatRFC7231,
} from "date-fns";

import { operationRegistry } from "../../services/pipeline/OperationRegistry";
import { OperationDefinition } from "../../services/pipeline/types";
import { intelligentParse } from "./utils/dateUtils";

const dateTimeOperations: OperationDefinition[] = [
    {
        id: "datetime.to-unix",
        name: "To Unix Timestamp",
        description: "Convert date strings to Unix timestamp",
        categories: ["utilities", "datetime"],
        parameters: [
            {
                name: "units",
                label: "Output Units",
                type: "select",
                default: "seconds",
                options: [
                    { value: "seconds", label: "Seconds" },
                    { value: "milliseconds", label: "Milliseconds" }
                ]
            },
            {
                name: "mode",
                label: "Mode",
                type: "select",
                default: "parse",
                options: [
                    { value: "parse", label: "Parse date strings" },
                    { value: "now", label: "Current time (ignore input)" }
                ]
            }
        ],
        execute: (input, params) => {
            const units = (params.units as string) || "seconds";
            const mode = (params.mode as string) || "parse";

            if (mode === "now") {
                const now = Date.now();
                return units === "seconds" ? Math.floor(now / 1000).toString() : now.toString();
            }

            // Try to parse the input as a date
            // Handle common formats
            const trimmed = input.trim();

            // Check if input is already a number (might be trying to convert timestamp)
            if (/^\d+$/.test(trimmed)) {
                // Already a number, return as-is or convert units
                const num = parseInt(trimmed);
                if (units === "seconds" && trimmed.length > 10) {
                    // Looks like milliseconds, convert to seconds
                    return Math.floor(num / 1000).toString();
                } else if (units === "milliseconds" && trimmed.length <= 10) {
                    // Looks like seconds, convert to milliseconds
                    return (num * 1000).toString();
                }
                return trimmed;
            }

            // Try to parse as date
            const date = new Date(trimmed);
            if (isNaN(date.getTime())) {
                throw new Error(`Could not parse date: "${trimmed}"`);
            }

            const timestamp = date.getTime();
            return units === "seconds"
                ? Math.floor(timestamp / 1000).toString()
                : timestamp.toString();
        },
        keywords: ["date", "time", "timestamp", "epoch", "convert", "unix"],
        icon: "Clock",
        source: "tablet",
    },
    {
        id: "datetime.from-unix",
        name: "From Unix Timestamp",
        description: "Convert Unix timestamp to readable date",
        categories: ["utilities", "datetime"],
        parameters: [
            {
                name: "units",
                label: "Units",
                type: "select",
                default: "seconds",
                options: [{ value: "seconds", label: "Seconds" }, { value: "milliseconds", label: "Milliseconds" }]
            },
            {
                name: "format",
                label: "Format",
                type: "select",
                default: "iso",
                options: [
                    { value: "iso", label: "ISO 8601 (2026-01-23T14:00:00Z)" },
                    { value: "local", label: "Local String" },
                    { value: "utc", label: "UTC String" }
                ]
            }
        ],
        execute: (input, params) => {
            // Heuristic: try to handle lists of timestamps (simple number matching)
            // or single timestamps.

            const units = (params.units as string) || "seconds";
            const format = (params.format as string) || "iso";

            // If input is purely digits, treat as single timestamp (but return string)
            // If input is text containing timestamps, we should probably only replace them?
            // "Log entry at 1706019000 error occurred" -> "Log entry at 2024-01-23... error occurred"

            return input.replace(/\b\d{9,13}\b/g, (match) => {
                let ts = parseInt(match);
                // Simple heuristic for auto-detection fallback if we wanted, 
                // but user specified units.
                // If seconds, ts is usually 10 digits (for now). Millis 13 digits.

                if (units === "seconds") {
                    // Check if it looks more like millis? (e.g. > 30000000000 ?)
                    // But trusting user input is safer.
                    ts *= 1000;
                }

                const date = new Date(ts);
                if (isNaN(date.getTime())) return match;

                if (format === "iso") return date.toISOString();
                if (format === "utc") return date.toUTCString();
                return date.toLocaleString();
            });
        },
        keywords: ["date", "time", "timestamp", "epoch", "convert"],
        icon: "Clock",
        source: "tablet",
    },
    {
        id: "datetime.format",
        name: "Format Date",
        description: "Parse a date string and reformat it into a different representation",
        categories: ["datetime"],
        processingMode: "configurable",
        parameters: [
            {
                name: "outputFormat",
                label: "Output Format",
                type: "select",
                default: "iso",
                options: [
                    { value: "iso", label: "ISO 8601 (2026-01-23T14:00:00.000Z)" },
                    { value: "iso-date", label: "Date only (2026-01-23)" },
                    { value: "sql", label: "SQL (2026-01-23 14:00:00)" },
                    { value: "rfc3339", label: "RFC 3339 (2026-01-23T14:00:00+00:00)" },
                    { value: "http", label: "HTTP / RFC 7231 (Thu, 23 Jan 2026 14:00:00 GMT)" },
                    { value: "human", label: "Human (January 23, 2026)" },
                    { value: "human-full", label: "Full human (Thursday, January 23, 2026, 2:00:00 PM)" },
                    { value: "relative", label: "Relative (2 hours ago)" },
                    { value: "unix-s", label: "Unix seconds" },
                    { value: "unix-ms", label: "Unix milliseconds" },
                    { value: "custom", label: "Custom (date-fns format string)" },
                ],
            },
            {
                name: "customFormat",
                label: "Custom Format",
                type: "string",
                default: "yyyy-MM-dd HH:mm:ss",
                placeholder: "yyyy-MM-dd HH:mm:ss",
                description: "date-fns format string. Used when Output Format is set to Custom.",
            },
        ],
        execute: (input, params) => {
            const outputFormat = (params.outputFormat as string) || "iso";
            const customFormat = (params.customFormat as string) || "yyyy-MM-dd HH:mm:ss";

            const trimmed = input.trim();
            if (!trimmed) return "";

            const { date } = intelligentParse(trimmed);
            if (!date) {
                throw new Error(`Could not parse date: "${trimmed}"`);
            }

            switch (outputFormat) {
                case "iso": return date.toISOString();
                case "iso-date": return format(date, "yyyy-MM-dd");
                case "sql": return format(date, "yyyy-MM-dd HH:mm:ss");
                case "rfc3339": return formatRFC3339(date);
                case "http": return formatRFC7231(date);
                case "human": return format(date, "MMMM d, yyyy");
                case "human-full": return format(date, "EEEE, MMMM d, yyyy, h:mm:ss a");
                case "relative": return formatDistanceToNow(date, { addSuffix: true });
                case "unix-s": return Math.floor(date.getTime() / 1000).toString();
                case "unix-ms": return date.getTime().toString();
                case "custom": return format(date, customFormat);
                default: return date.toISOString();
            }
        },
        keywords: ["date", "time", "format", "convert", "reformat", "transform", "datetime", "parse"],
        icon: "Calendar",
        source: "tablet",
    },
];

// Self-register all operations
dateTimeOperations.forEach((op) => operationRegistry.register(op));

// Export for testing
export { dateTimeOperations };
