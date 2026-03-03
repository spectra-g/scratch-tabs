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
