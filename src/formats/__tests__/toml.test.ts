import "../index";
import { formatRegistry } from "../registry";
import { HclFormatDetector } from "../hcl";
import { IniFormatDetector } from "../ini";
import { TomlFormatDetector } from "../toml";
import { TomlFormatModule } from "../toml/index";

describe("TomlFormatDetector", () => {
  let detector: TomlFormatDetector;
  let iniDetector: IniFormatDetector;
  let hclDetector: HclFormatDetector;

  beforeEach(() => {
    detector = new TomlFormatDetector();
    iniDetector = new IniFormatDetector();
    hclDetector = new HclFormatDetector();
  });

  test("registers TOML in the format registry", () => {
    const toml = formatRegistry.getById("toml");

    expect(toml).toBeDefined();
    expect(toml).toMatchObject({
      id: "toml",
      name: "TOML",
      extensions: expect.arrayContaining(["toml"]),
    });
  });

  test("sampleContent returns representative TOML", () => {
    const sample = detector.sampleContent();

    expect(sample).toContain("[database]");
    expect(sample).toContain('server = "localhost"');
  });

  test("exposes both toml and tml extensions", () => {
    expect(detector.extensions).toEqual(["toml", "tml"]);
  });

  test("getFileExtension returns .toml from the format module contract", () => {
    const module = new TomlFormatModule();

    expect(module.getFileExtension()).toBe(".toml");
  });

  test("registerProvider registers the TOML language with Monaco", () => {
    const module = new TomlFormatModule();
    const register = jest.fn();
    const setMonarchTokensProvider = jest.fn();
    const getLanguages = jest.fn(() => []);

    module.registerProvider({
      languages: {
        getLanguages,
        register,
        setMonarchTokensProvider,
      },
    });

    expect(getLanguages).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith({ id: "toml" });
    expect(setMonarchTokensProvider).toHaveBeenCalledWith(
      "toml",
      expect.any(Object),
    );
  });

  test("detects complex TOML content as a definitive high-confidence match", () => {
    const content = `# TOML document
title = "Scratch Tabs"

[database]
server = "localhost"
enabled = true
ports = [8000, 8001, 8002]
connection.timeout = 30
metadata = { owner = "ops", region = "eu-west-2" }

[[service.instances]]
name = "api"
started_at = 2026-03-11T09:00:00Z`;

    const result = detector.detect(content);

    expect(result).toEqual(
      expect.objectContaining({
        match: true,
        matchedDefinitive: true,
      }),
    );
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  test("treats array-of-tables as a decisive TOML signal", () => {
    const content = `title = "Services"

[[services]]
name = "api"

[[services]]
name = "worker"`;

    const tomlResult = detector.detect(content);
    const iniResult = iniDetector.detect(content);
    const hclResult = hclDetector.detect(content);

    expect(tomlResult.match).toBe(true);
    expect(tomlResult.confidence).toBeGreaterThan(0.9);
    expect(iniResult.confidence).toBeLessThan(0.5);
    expect(hclResult.confidence).toBeLessThan(0.5);
  });

  test("elevates dotted keys above INI-style ambiguity", () => {
    const content = `title = "Server config"
server.host = "localhost"
server.port = 8080`;

    const tomlResult = detector.detect(content);
    const iniResult = iniDetector.detect(content);

    expect(tomlResult.match).toBe(true);
    expect(tomlResult.confidence).toBeGreaterThan(iniResult.confidence);
  });

  test("treats quoted dotted keys as TOML-specific structure", () => {
    const content = `"server.host" = "localhost"
"server.port" = 8080
title = "Scratch Tabs"`;

    const result = detector.detect(content);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test("treats inline tables and datetime literals as strong TOML evidence", () => {
    const content = `title = "Release"
metadata = { owner = "ops", region = "eu-west-2" }
released_at = 2026-03-11T09:00:00Z`;

    const result = detector.detect(content);

    expect(result.match).toBe(true);
    expect(result.matchedDefinitive).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  test("does not treat INI-style semicolon comments as a TOML match", () => {
    const content = `; INI comment
[database]
server = localhost
enabled = true`;

    const result = detector.detect(content);

    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
  });

  test("detects quoted table segments as TOML", () => {
    const content = `title = "Quoted tables"

[servers."us-east-1"]
ip = "10.0.0.1"
role = "primary"`;

    const result = detector.detect(content);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
