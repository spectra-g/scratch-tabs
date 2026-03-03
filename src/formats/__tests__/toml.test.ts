import { TomlFormatDetector } from "../toml";

describe("TomlFormatDetector", () => {
  let detector: TomlFormatDetector;

  beforeEach(() => {
    detector = new TomlFormatDetector();
  });

  describe("Basic Properties", () => {
    test("should have correct basic properties", () => {
      expect(detector.id).toBe("toml");
      expect(detector.name).toBe("TOML");
      expect(detector.extensions).toEqual(["toml"]);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("toml");
    });
  });

  describe("Sample Content", () => {
    test("should provide TOML sample content that can be detected", () => {
      const sample = detector.sampleContent();
      const result = detector.detect(sample);

      expect(sample).toContain("[database]");
      expect(sample).toContain("host = \"localhost\"");
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe("Detection Logic", () => {
    test("should detect canonical TOML content", () => {
      const content = `[section]
key = "value"
enabled = true
count = 42`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    test("should reward TOML-specific syntax like array tables and inline tables", () => {
      const content = `title = "Example"

[[products]]
name = "Hammer"
sku = 738594937
meta = { enabled = true, retries = 3 }`;

      const result = detector.detect(content);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.75);
    });

    test("should apply INI-style ambiguity penalty for bare key=value table content", () => {
      const content = `[database]
host=localhost
port=5432
enabled=true`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });

    test("should apply YAML anti-pattern penalties for colon-style mappings", () => {
      const content = `---
database:
  host: localhost
  port: 5432
  enabled: true`;

      const result = detector.detect(content);
      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register provider without errors", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
        },
      };

      expect(() => detector.registerProvider(mockMonaco)).not.toThrow();
      expect(mockMonaco.languages.register).toHaveBeenCalledWith({
        id: "toml",
      });
    });
  });
});
