import { detectFormat, getPotentialFormatMatches } from "../index";
import { formatRegistry } from "../registry";

describe("TomlFormatDetector", () => {
  test("detects canonical TOML content at format utility boundary", () => {
    const content = '[section]\nkey = "value"';

    const detected = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 5);
    const tomlMatch = matches.find((match) => match.id === "toml");

    expect(detected).toBe("toml");
    expect(tomlMatch).toBeDefined();
    expect(tomlMatch!.score).toBeGreaterThanOrEqual(0.8);
  });

  test("registers TOML module metadata in the format registry", () => {
    const module = formatRegistry.getById("toml");

    expect(module).toBeDefined();
    expect(module!.id).toBe("toml");
    expect(module!.name).toBe("TOML");
    expect(module!.extensions).toContain("toml");
  });

  test("returns the TOML file extension", () => {
    const module = formatRegistry.getById("toml");

    expect(module).toBeDefined();
    expect(module!.getFileExtension()).toBe("toml");
  });
});
