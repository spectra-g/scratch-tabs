import { detectFormat, getPotentialFormatMatches } from "../index";
import { formatRegistry } from "../registry";

const validTomlSample = `# TOML example
[database]
server = "192.168.1.1"
ports = [8001, 8001, 8002]
connection_max = 5000
enabled = true

[servers.alpha]
ip = "10.0.0.1"
dc = "eqdc10"

[[products]]
name = "Hammer"
sku = 738594937
`;

describe("Toml format integration", () => {
  test("detectFormat returns TOML with high confidence for valid TOML", () => {
    const detected = detectFormat(validTomlSample);
    const matches = getPotentialFormatMatches(validTomlSample, 10);
    const toml = matches.find((m) => m.id === "toml");

    expect(detected).toBe("toml");
    expect(toml).toBeDefined();
    expect(toml!.score).toBeGreaterThan(0.8);
  });

  test("ambiguous config content does not overmatch TOML", () => {
    const ambiguousConfig = `host=localhost\nport=5432\ndebug=true\napp.name=sample-app`;
    const definitiveTomlMatches = getPotentialFormatMatches(validTomlSample, 10);
    const ambiguousMatches = getPotentialFormatMatches(ambiguousConfig, 10);

    const definitiveToml = definitiveTomlMatches.find((m) => m.id === "toml");
    const ambiguousToml = ambiguousMatches.find((m) => m.id === "toml");

    expect(definitiveToml).toBeDefined();
    const ambiguousTomlScore = ambiguousToml?.score ?? 0;
    expect(ambiguousTomlScore).toBeLessThan(definitiveToml!.score);
    expect(ambiguousTomlScore).toBeLessThan(0.65);
  });

  test("TOML extension is registered and file extension mapping is correct", () => {
    const toml = formatRegistry.getAll().find((format) => format.id === "toml");

    expect(toml).toBeDefined();
    expect(toml!.extensions).toContain(".toml");
    expect(toml!.getFileExtension()).toBe("toml");
  });

  test("registerProvider registers Monaco language provider for TOML", () => {
    const toml = formatRegistry.getById("toml");
    expect(toml).toBeDefined();

    const mockMonaco = {
      languages: {
        getLanguages: jest.fn(() => []),
        register: jest.fn(),
        setMonarchTokensProvider: jest.fn(),
        registerDocumentFormattingEditProvider: jest.fn(),
      },
      editor: {
        defineTheme: jest.fn(),
      },
    };

    toml!.registerProvider(mockMonaco);

    expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "toml" });
    expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
  });

  test("invalid or underspecified content yields TOML noMatch semantics", () => {
    const toml = formatRegistry.getById("toml");
    expect(toml).toBeDefined();

    const invalid = "random text without structure";
    const result = toml!.detect(invalid);

    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
