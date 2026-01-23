/**
 * DateTime Pipeline Operations
 *
 * Registers DateTime-related operations to the pipeline registry.
 * This file self-registers operations when imported.
 */

import { operationRegistry } from "../../services/pipeline/OperationRegistry";
import { OperationDefinition } from "../../services/pipeline/types";

/**
 * DateTime operations for the pipeline
 */
const dateTimeOperations: OperationDefinition[] = [
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
    }
];

// Self-register all operations
dateTimeOperations.forEach((op) => operationRegistry.register(op));

// Export for testing
export { dateTimeOperations };
