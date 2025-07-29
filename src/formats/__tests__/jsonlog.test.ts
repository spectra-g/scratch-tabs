import { JsonLogFormatDetector } from "../jsonlog";

describe("JsonLogFormatDetector", () => {
  let detector: JsonLogFormatDetector;

  beforeEach(() => {
    detector = new JsonLogFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("jsonlog");
      expect(detector.name).toBe("JSON Log");
      expect(detector.extensions).toEqual(["jsonl", "ndjson", "log"]);
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("jsonl");
    });
  });

  describe("Sample Content", () => {
    test("should provide valid JSON log sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("timestamp");
      expect(sample).toContain("level");
      expect(sample).toContain("message");
      expect(sample).toContain("service");

      // Should have multiple lines
      const lines = sample.split("\n").filter((line) => line.trim());
      expect(lines.length).toBeGreaterThan(1);

      // Each line should be valid JSON
      lines.forEach((line) => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });
  });

  describe("Detection", () => {
    test("should detect valid JSON log content", () => {
      const content = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Application started", "service": "web-server"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "debug", "message": "Database connected", "service": "web-server"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "error", "message": "Connection failed", "service": "api-gateway"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should detect JSON logs with various log levels", () => {
      const content = `{"time": "2024-01-01T10:00:00Z", "level": "warn", "msg": "Warning message"}
{"time": "2024-01-01T10:00:01Z", "level": "fatal", "msg": "Fatal error occurred"}
{"time": "2024-01-01T10:00:02Z", "level": "trace", "msg": "Trace information"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect JSON logs with Unix timestamps", () => {
      const content = `{"timestamp": 1640995200, "level": "info", "message": "Unix timestamp log"}
{"timestamp": 1640995201, "level": "debug", "message": "Another log entry"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should detect logs with service identifiers", () => {
      const content = `{"date": "2024-01-01", "severity": "info", "event": "User login", "component": "auth-service"}
{"date": "2024-01-01", "severity": "error", "event": "Database error", "module": "user-api"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should handle mixed valid and invalid JSON lines", () => {
      const content = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Valid log"}
This is not JSON
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Another valid log"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Third valid log"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    test("should reject regular JSON (not JSONL)", () => {
      const content = `{
  "name": "Regular JSON",
  "type": "object",
  "properties": {
    "timestamp": "2024-01-01T10:00:00Z",
    "level": "info"
  }
}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject HTML content", () => {
      const content = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <p>This is HTML, not JSON logs</p>
</body>
</html>`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject JavaScript content", () => {
      const content = `function processLogs() {
  const logs = [
    { timestamp: "2024-01-01", level: "info" },
    { timestamp: "2024-01-01", level: "error" }
  ];
  return logs;
}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should reject single line content", () => {
      const content = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Single line"}`;
      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle empty content", () => {
      const result = detector.detect("");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle very short content", () => {
      const result = detector.detect("test");
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should detect logs with application identifiers", () => {
      const content = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "App started", "app": "my-service"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "debug", "message": "Processing request", "application": "api-server"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    test("should reject JSON array logs", () => {
      const content = `[{"timestamp": "2024-01-01T10:00:00Z", "level": "info"}]
[{"timestamp": "2024-01-01T10:00:01Z", "level": "error"}]`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should handle logs without traditional log fields but with JSON structure", () => {
      const content = `{"user_id": "12345", "action": "login", "ip": "192.168.1.1"}
{"user_id": "67890", "action": "logout", "ip": "192.168.1.2"}
{"user_id": "11111", "action": "view_page", "page": "/dashboard"}`;

      const result = detector.detect(content);
      // Should still detect as JSON log format due to structure, but with lower confidence
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.2);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
      const mockMonaco = {
        languages: {
          register: jest.fn(),
          setLanguageConfiguration: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn(),
          getLanguages: jest.fn(() => []),
          registerCompletionItemProvider: jest.fn(),
          CompletionItemKind: {
            Property: 1,
            Snippet: 2,
          },
          CompletionItemInsertTextRule: {
            InsertAsSnippet: 1,
          },
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };

      expect(() => {
        detector.registerProvider(mockMonaco);
      }).not.toThrow();

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({
        id: "jsonlog",
      });
      expect(
        mockMonaco.languages.setLanguageConfiguration,
      ).toHaveBeenCalledWith("jsonlog", expect.any(Object));
      expect(
        mockMonaco.languages.setMonarchTokensProvider,
      ).toHaveBeenCalledWith("jsonlog", expect.any(Object));
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        "jsonlog-dark",
        expect.any(Object),
      );
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        "jsonlog-light",
        expect.any(Object),
      );
      expect(
        mockMonaco.languages.registerDocumentFormattingEditProvider,
      ).toHaveBeenCalledWith("jsonlog", expect.any(Object));
      expect(
        mockMonaco.languages.registerCompletionItemProvider,
      ).toHaveBeenCalledWith("jsonlog", expect.any(Object));
    });
  });
});
