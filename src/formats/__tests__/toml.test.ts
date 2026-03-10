import { detectFormat, getPotentialFormatMatches } from "../index";
import { formatRegistry } from "../registry";
import { TomlFormatDetector } from "../toml";

describe("TOML Format Detection (Acceptance)", () => {
  describe("Inner Detector Loops", () => {
    test("detect() recognizes TOML table header syntax", () => {
      const detector = new TomlFormatDetector();
      const content = `[server]
host = "localhost"`;

      const result = detector.detect(content);

      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    test("detect() recognizes TOML key-value syntax", () => {
      const detector = new TomlFormatDetector();
      const content = `title = "TOML Example"
enabled = true
retries = 3`;

      const result = detector.detect(content);

      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("detect() returns no match for empty content", () => {
      const detector = new TomlFormatDetector();
      const result = detector.detect("   ");

      expect(result.match).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  test("AC-001: detectFormat identifies TOML table sections", () => {
    const content = `# App config
[server]
host = "localhost"
port = 8080

[database]
enabled = true`;

    const formatId = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 5);
    const tomlMatch = matches.find((m) => m.id === "toml");

    expect(formatId).toBe("toml");
    expect(tomlMatch).toBeDefined();
    expect(tomlMatch!.score).toBeGreaterThan(0);
  });

  test("AC-002: detectFormat identifies basic TOML key-value pairs", () => {
    const content = `title = "TOML Example"
enabled = true
retries = 3`;

    const formatId = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 5);
    const tomlMatch = matches.find((m) => m.id === "toml");

    expect(formatId).toBe("toml");
    expect(tomlMatch).toBeDefined();
    expect(tomlMatch!.score).toBeGreaterThan(0.5);
  });

  test("AC-004: sampleContent returns introductory TOML syntax", () => {
    const tomlFormat = formatRegistry.getById("toml");

    expect(tomlFormat).toBeDefined();

    const sample = tomlFormat!.sampleContent();

    expect(sample).toContain("[server]");
    expect(sample).toContain("host =");
    expect(sample).toContain("enabled =");
    expect(sample.trim().length).toBeGreaterThan(0);
  });
});
