import { BaseFormatDetector } from "./baseDetector";
import { formatRegistry } from "./registry";
import { DetectionResult, FormatModule } from "./types";

/**
 * NDJSON/JSON Log format detector
 * Handles newline-delimited JSON where each line is a separate JSON object
 */
export class JsonLogFormatDetector extends BaseFormatDetector implements FormatModule {
  id = "ndjson";
  name = "JSON Log";
  extensions = ["jsonl", "ndjson", "log"];
  priority = 8; // Higher than regular JSON and properties to ensure it gets chosen for multi-line JSON

  sampleContent(): string {
    const timestamp = new Date().toISOString();
    const samples = [
      {
        timestamp,
        level: "info",
        message: "Application started successfully",
        service: "web-server",
        version: "1.2.3",
        environment: "production",
        requestId: "req_001",
      },
      {
        timestamp: new Date(Date.now() + 1000).toISOString(),
        level: "debug",
        message: "Database connection established",
        service: "web-server",
        database: "postgresql",
        connectionPoolSize: 10,
        requestId: "req_002",
      },
      {
        timestamp: new Date(Date.now() + 2000).toISOString(),
        level: "warn",
        message: "High memory usage detected",
        service: "web-server",
        memoryUsage: "85%",
        threshold: "80%",
        action: "alert_sent",
        requestId: "req_003",
      },
      {
        timestamp: new Date(Date.now() + 3000).toISOString(),
        level: "error",
        message: "Failed to process request",
        service: "api-gateway",
        error: "Connection timeout",
        requestId: "req_004",
        durationMs: 5000,
        retryCount: 3,
        stack: "Error: Connection timeout\n    at processRequest (server.js:123:45)",
      },
      {
        timestamp: new Date(Date.now() + 4000).toISOString(),
        level: "info",
        message: "User authentication successful",
        service: "auth-service",
        userId: "user_789",
        sessionId: "sess_abc123",
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        requestId: "req_005",
      },
    ];

    return samples.map((obj) => JSON.stringify(obj)).join("\n");
  }

  detect(content: string): DetectionResult {
    if (!content || content.trim().length < 10) {
      return this.noMatch();
    }

    const trimmedContent = content.trim();

    // Strong negative signal: If it's a standard JSON array, it's not NDJSON
    if (trimmedContent.startsWith("[") && trimmedContent.endsWith("]")) {
      return this.noMatch();
    }

    const lines = content.split("\n").filter((line) => line.trim().length > 0);

    // Need at least 2 lines to be considered NDJSON
    if (lines.length < 2) {
      return this.noMatch();
    }

    let confidenceScore = 0.0;
    let structuralMatchCount = 0;
    let validJsonObjectCount = 0;
    let logPatternMatches = 0;

    // Common log fields that boost confidence
    const commonLogFields = [
      "timestamp",
      "level",
      "message",
      "time",
      "msg",
      "log",
      "event",
      "severity",
      "date",
      "service",
      "component",
      "requestId",
      "traceId",
      "spanId",
    ];

    const logLevels = [
      "debug",
      "info",
      "warn",
      "warning",
      "error",
      "fatal",
      "trace",
      "critical",
    ];

    // Sample first 50 lines for performance
    const sampleLines = lines.slice(0, Math.min(50, lines.length));
    const totalSampledLines = sampleLines.length;

    for (const line of sampleLines) {
      const trimmedLine = line.trim();

      // Check structural match (starts with { and ends with })
      const jsonStart = trimmedLine.indexOf("{");
      if (jsonStart !== -1 && trimmedLine.endsWith("}")) {
        structuralMatchCount++;

        try {
          const jsonPart = trimmedLine.substring(jsonStart);
          if (jsonPart.length > 100_000) {
            continue;
          }

          const parsed = JSON.parse(jsonPart);

          if (
            typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed)
          ) {
            validJsonObjectCount++;

            // Check for common log patterns
            const keys = Object.keys(parsed).map((k) => k.toLowerCase());

            // Check for common log fields
            const hasLogFields = commonLogFields.some((field) =>
              keys.includes(field.toLowerCase()),
            );
            if (hasLogFields) {
              logPatternMatches++;
            }

            // Check for log levels in values
            const values = Object.values(parsed).map((v) =>
              typeof v === "string" ? v.toLowerCase() : "",
            );
            const hasLogLevel = logLevels.some((level) =>
              values.some((val) => val.includes(level)),
            );
            if (hasLogLevel) {
              logPatternMatches++;
            }

            // Check for timestamp patterns
            const hasTimestamp = values.some(
              (val) =>
                /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(val) || // ISO timestamp
                /\d{10,13}/.test(val), // Unix timestamp
            );
            if (hasTimestamp) {
              logPatternMatches++;
            }
          }
        } catch (e) {
          // Invalid JSON line - still counts as structural match but not valid JSON
        }
      }
    }

    // Calculate structural ratio
    const structuralRatio = structuralMatchCount / totalSampledLines;
    const validJsonRatio = validJsonObjectCount / totalSampledLines;

    // Base confidence based on structural ratio
    if (structuralRatio > 0.8) {
      confidenceScore = 0.8;
    } else if (structuralRatio > 0.5) {
      confidenceScore = 0.6;
    } else if (structuralRatio > 0.3) {
      confidenceScore = 0.4;
    } else {
      confidenceScore = 0.1;
    }

    // Boost confidence for valid JSON ratio
    if (validJsonRatio >= 0.8) {
      confidenceScore += 0.15;
    } else if (validJsonRatio >= 0.6) {
      confidenceScore += 0.1;
    }

    // Significant bonus for log patterns
    if (logPatternMatches >= 3) {
      confidenceScore += 0.2;
    } else if (logPatternMatches >= 2) {
      confidenceScore += 0.15;
    } else if (logPatternMatches >= 1) {
      confidenceScore += 0.1;
    }

    // Anti-patterns: reduce confidence for certain content types
    if (content.includes("<!DOCTYPE") || content.includes("<html")) {
      confidenceScore -= 0.5; // HTML content
    }

    if (
      content.includes("function ") ||
      content.includes("const ") ||
      content.includes("let ")
    ) {
      confidenceScore -= 0.3; // JavaScript content
    }

    confidenceScore = Math.min(1.0, Math.max(0.0, confidenceScore));

    // Determine if it's a match
    const isMatch = confidenceScore > 0.5;
    const isDefinitive = confidenceScore > 0.9;

    return {
      match: isMatch,
      confidence: isMatch ? confidenceScore : 0.0,
      matchedDefinitive: isDefinitive,
    };
  }

  getFileExtension(): string {
    return "jsonl";
  }

  registerProvider(monaco: any): void {
    // Register NDJSON as a language variant of JSON
    monaco.languages.register({ id: "ndjson" });

    // Use Monaco's built-in JSON language configuration
    monaco.languages.setLanguageConfiguration("ndjson", {
      brackets: [
        ["{", "}"],
        ["[", "]"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: '"', close: '"' },
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: '"', close: '"' },
      ],
    });

    // Use Monaco's built-in JSON tokenizer with custom semantic tokens
    monaco.languages.setMonarchTokensProvider("ndjson", {
      defaultToken: "",
      tokenPostfix: ".ndjson",

      keywords: ["true", "false", "null"],
      typeKeywords: [],
      operators: [],
      symbols: /[=>{}<>=!]+/,
      escapes:
        /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      tokenizer: {
        root: [
          // Comments (though not standard in JSON)
          [/\/\/.*$/, "comment"],
          [/\/\*/, "comment", "@comment"],

          // JSON property names (keys) - these should be distinct from string values
          [/"([^"\\]|\\.)*"(?=\s*:)/, "key.ndjson"],

          // Regular strings (values)
          [/"(?:[^"\\]|\\.)*"/, "string.ndjson"],

          // Numbers
          [/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/, "number.ndjson"],

          // Keywords (true, false, null)
          [/\b(?:true|false|null)\b/, "keyword.ndjson"],

          // Brackets and delimiters
          [/[{}]/, "delimiter.bracket.ndjson"],
          [/[[\]]/, "delimiter.array.ndjson"],
          [/:/, "delimiter.colon.ndjson"],
          [/,/, "delimiter.comma.ndjson"],

          [/\s+/, "white"],
        ],

        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"],
        ],
      },
    });

    // Define color theme with distinct key and value colors
    monaco.editor.defineTheme("ndjson-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "key.ndjson", foreground: "4FC1FF", fontStyle: "bold" }, // Bright cyan for keys
        { token: "string.ndjson", foreground: "CE9178" }, // Orange for string values
        { token: "number.ndjson", foreground: "B5CEA8" }, // Light green for numbers
        { token: "keyword.ndjson", foreground: "569CD6" }, // Blue for true/false/null
        { token: "delimiter.bracket.ndjson", foreground: "FFD700" }, // Gold for {}
        { token: "delimiter.array.ndjson", foreground: "FFD700" }, // Gold for []
        { token: "delimiter.colon.ndjson", foreground: "D4D4D4" }, // Light gray for :
        { token: "delimiter.comma.ndjson", foreground: "D4D4D4" }, // Light gray for ,
        { token: "comment", foreground: "6A9955" }, // Green for comments
      ],
      colors: {},
    });

    // Provide formatting support to ensure each JSON object is on its own line
    monaco.languages.registerDocumentFormattingEditProvider("ndjson", {
      provideDocumentFormattingEdits: (
        model: any,
        _options: any,
        _token: any,
      ) => {
        const text = model.getValue();
        const lines = text.split("\n");
        const formattedLines: string[] = [];

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue; // Skip empty lines

          // Try to parse and reformat each line as JSON
          try {
            if (trimmedLine.startsWith("{") && trimmedLine.endsWith("}")) {
              // Safety check: don't parse very large lines
              if (trimmedLine.length > 100_000) {
                formattedLines.push(trimmedLine); // Keep original line
                continue;
              }

              const parsed = JSON.parse(trimmedLine);
              // Format as compact JSON (no extra spaces, single line)
              formattedLines.push(JSON.stringify(parsed));
            } else {
              // Keep non-JSON lines as-is
              formattedLines.push(trimmedLine);
            }
          } catch (e) {
            // If parsing fails, keep the original line
            formattedLines.push(trimmedLine);
          }
        }

        return [
          {
            range: model.getFullModelRange(),
            text: formattedLines.join("\n"),
          },
        ];
      },
    });
  }
}

// Create instance and register with the language registry
const jsonLogDetector = new JsonLogFormatDetector();
formatRegistry.register(jsonLogDetector);

// Export for testing or manual registration
export const registerJsonLogProvider = (monaco: any) => {
  jsonLogDetector.registerProvider(monaco);
};