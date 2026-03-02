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

  test("AC-001: INI-like content confidence outranks TOML confidence", () => {
    const content = `; INI sample
[database]
host = localhost
port = 5432
enabled = true`;

    const detected = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 10);
    const tomlMatch = matches.find((match) => match.id === "toml");
    const iniMatch = matches.find((match) => match.id === "ini");

    expect(detected).toBe("ini");
    expect(iniMatch).toBeDefined();
    expect(tomlMatch).toBeDefined();
    expect(tomlMatch!.score).toBeLessThan(iniMatch!.score);
    expect(tomlMatch!.score).toBeLessThan(0.6);
  });

  test("AC-002: Properties-like flat key=value lowers TOML confidence", () => {
    const content = `app.name=ScratchTabs
app.version=1.0.0
server.port=8080
feature.experimental=true`;

    const detected = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 10);
    const tomlMatch = matches.find((match) => match.id === "toml");
    const propertiesMatch = matches.find((match) => match.id === "properties");

    expect(detected).toBe("properties");
    expect(propertiesMatch).toBeDefined();
    if (tomlMatch) {
      expect(tomlMatch.score).toBeLessThan(propertiesMatch!.score);
      expect(tomlMatch.score).toBeLessThan(0.5);
    }
  });

  test("AC-003: YAML-like content does not produce definitive TOML match", () => {
    const content = `---
name: scratch-tabs
version: 1.0.0
features:
  - detection
  - parsing`;

    const detected = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 10);
    const tomlMatch = matches.find((match) => match.id === "toml");

    expect(detected).toBe("yaml");
    if (tomlMatch) {
      expect(tomlMatch.score).toBeLessThan(0.8);
    }
  });

  test("AC-004: HCL-like block syntax does not false-positive as TOML", () => {
    const content = `resource "aws_instance" "web" {
  ami = "ami-0abcdef1234567890"
  instance_type = "t2.micro"
  tags = {
    Name = "web"
  }
}`;

    const detected = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 10);
    const tomlMatch = matches.find((match) => match.id === "toml");
    const hclMatch = matches.find((match) => match.id === "hcl");

    expect(detected).toBe("hcl");
    expect(hclMatch).toBeDefined();
    if (tomlMatch) {
      expect(tomlMatch.score).toBeLessThan(hclMatch!.score);
    }
  });

  test("AC-005: TOML arrays, inline tables, and datetime win detection", () => {
    const content = `title = "TOML Demo"
created_at = 2026-03-01T10:15:30Z
ports = [8000, 8001, 8002]
metadata = { owner = "ops", tier = "gold" }
enabled = true`;

    const detected = detectFormat(content);
    const matches = getPotentialFormatMatches(content, 5);
    const tomlMatch = matches.find((match) => match.id === "toml");

    expect(detected).toBe("toml");
    expect(tomlMatch).toBeDefined();
    expect(matches[0].id).toBe("toml");
    expect(tomlMatch!.score).toBeGreaterThanOrEqual(0.85);
  });
});
