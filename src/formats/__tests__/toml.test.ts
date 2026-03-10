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
      expect(detector.priority).toBe(6);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("toml");
    });
  });

  describe("Sample Content", () => {
    test("should provide canonical TOML sample content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain('title = "Scratch Tabs"');
      expect(sample).toContain("[server]");
      expect(sample).toContain("[[users]]");
    });
  });

  describe("Detection Logic", () => {
    test("should detect canonical TOML with high confidence", () => {
      const content = detector.sampleContent();
      const result = detector.detect(content);

      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    test("should reject JSON and YAML content as TOML", () => {
      const json = '{"name":"test","enabled":true}';
      const yaml = "name: test\nenabled: true\nitems:\n  - a\n  - b";

      expect(detector.detect(json).match).toBe(false);
      expect(detector.detect(yaml).match).toBe(false);
    });
  });

  describe("Provider Registration", () => {
    test("registerProvider should be a safe no-op", () => {
      expect(() => detector.registerProvider({})).not.toThrow();
    });
  });
});
