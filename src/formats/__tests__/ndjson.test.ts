import { JsonLogFormatDetector } from "../ndjson";

describe("JsonLogFormatDetector", () => {
  let detector: JsonLogFormatDetector;

  beforeEach(() => {
    detector = new JsonLogFormatDetector();
  });

  describe("detect", () => {
    it("should detect valid NDJSON content", () => {
      const content = `{"level": "info", "message": "test 1"}
{"level": "error", "message": "test 2"}
{"level": "debug", "message": "test 3"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should detect NDJSON with log patterns", () => {
      const content = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Application started", "service": "web-server"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "debug", "message": "Database connected", "service": "web-server"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "error", "message": "Request failed", "service": "api-gateway"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.matchedDefinitive).toBe(true);
    });

    it("should not match single line content", () => {
      const content = `{"level": "info", "message": "single line"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
    });

    it("should not match JSON arrays", () => {
      const content = `[
  {"level": "info", "message": "test 1"},
  {"level": "error", "message": "test 2"}
]`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
    });

    it("should not match content with low JSON ratio", () => {
      const content = `This is a regular text file
{"level": "info", "message": "only one JSON line"}
More regular text here
And some more text`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
    });

    it("should handle malformed JSON lines gracefully", () => {
      const content = `{"level": "info", "message": "valid line"}
{invalid json line}
{"level": "error", "message": "another valid line"}`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it("should not match HTML content", () => {
      const content = `<!DOCTYPE html>
<html>
<body>
{"level": "info", "message": "embedded JSON"}
</body>
</html>`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
    });

    it("should not match JavaScript code", () => {
      const content = `function test() {
  const obj = {"level": "info", "message": "test"};
  console.log(obj);
}`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
    });

    it("should handle empty content", () => {
      const result = detector.detect("");
      expect(result.match).toBe(false);
    });

    it("should handle whitespace-only content", () => {
      const result = detector.detect("   \n\t  ");
      expect(result.match).toBe(false);
    });
  });

  describe("properties", () => {
    it("should have correct properties", () => {
      expect(detector.id).toBe("ndjson");
      expect(detector.name).toBe("JSON Log");
      expect(detector.extensions).toEqual(["jsonl", "ndjson", "log"]);
      expect(detector.priority).toBe(7);
    });

    it("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("jsonl");
    });
  });

  describe("sampleContent", () => {
    it("should generate valid NDJSON sample", () => {
      const sample = detector.sampleContent();
      const lines = sample.split("\n").filter(line => line.trim());
      
      expect(lines.length).toBeGreaterThan(1);
      
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
        const parsed = JSON.parse(line);
        expect(typeof parsed).toBe("object");
        expect(parsed).not.toBeNull();
        expect(Array.isArray(parsed)).toBe(false);
      });
    });

    it("should include common log fields in sample", () => {
      const sample = detector.sampleContent();
      const lines = sample.split("\n").filter(line => line.trim());
      const firstLine = JSON.parse(lines[0]);
      
      expect(firstLine).toHaveProperty("timestamp");
      expect(firstLine).toHaveProperty("level");
      expect(firstLine).toHaveProperty("message");
      expect(firstLine).toHaveProperty("service");
    });
  });
});