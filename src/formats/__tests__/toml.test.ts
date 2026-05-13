import { TomlFormatDetector } from "../toml";
import { IniFormatDetector } from "../ini";

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
      expect(detector.priority).toBe(7);
    });

    test("should return correct file extension", () => {
      expect(detector.getFileExtension()).toBe("toml");
    });
  });

  describe("Sample Content", () => {
    test("should contain representative TOML content", () => {
      const sample = detector.sampleContent();
      expect(sample).toContain("[server]");
      expect(sample).toContain("[[products]]");
      expect(sample).toMatch(/\d{4}-\d{2}-\d{2}T/); // datetime literal
    });
  });

  describe("Detection Logic", () => {
    test("should require more than 2 non-empty lines", () => {
      expect(detector.detect("[table]\nkey = 1").match).toBe(false);
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
    });

    test("should detect standard TOML with table and typed values", () => {
      const toml = `[server]
host = "localhost"
port = 8080
debug = false

[database]
max_connections = 10
timeout = 30.5`;

      const result = detector.detect(toml);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect TOML with array-of-tables as definitive match", () => {
      const toml = `[[products]]
name = "Widget"
price = 9.99

[[products]]
name = "Gadget"
price = 24.99`;

      const result = detector.detect(toml);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should detect TOML with dotted keys", () => {
      const toml = `[database]
server.host = "localhost"
server.port = 5432
client.timeout = 30
client.pool_size = 5`;

      const result = detector.detect(toml);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect TOML with inline tables", () => {
      const toml = `[geometry]
point = { x = 1, y = 2 }
origin = { x = 0, y = 0 }
scale = 1.5
label = "test"`;

      const result = detector.detect(toml);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should detect TOML with RFC 3339 datetime values", () => {
      const toml = `[metadata]
created_at = 2024-01-15T10:30:00Z
updated_at = 2024-06-01T00:00:00Z
title = "My Config"
version = 1`;

      const result = detector.detect(toml);
      expect(result.match).toBe(true);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should detect TOML with multi-line basic strings", () => {
      const toml = `[doc]
description = """
This is a
multi-line string
"""
version = 1
name = "test"`;

      const result = detector.detect(toml);
      expect(result.match).toBe(true);
      expect(result.matchedDefinitive).toBe(true);
    });

    test("should detect TOML with all-scalar tables", () => {
      const toml = `[app]
name = "MyApp"
version = "1.0.0"
port = 3000
debug = true
ratio = 0.95`;

      const result = detector.detect(toml);
      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should NOT detect INI with semicolon comments", () => {
      const ini = `; This is an INI file
[section1]
key1 = value1
; another comment
key2 = value2

[section2]
key3 = value3`;

      const result = detector.detect(ini);
      expect(result.match).toBe(false);
    });

    test("should NOT detect INI with colon-delimited values", () => {
      const ini = `[section]
host: localhost
port: 5432
user: admin
password: secret`;

      const result = detector.detect(ini);
      expect(result.match).toBe(false);
    });

    test("should NOT detect JSON content", () => {
      const json = `{
  "name": "MyApp",
  "version": "1.0.0",
  "settings": {
    "debug": true,
    "port": 3000
  }
}`;

      expect(detector.detect(json).match).toBe(false);
    });

    test("should NOT detect YAML with colon syntax", () => {
      const yaml = `server:
  host: localhost
  port: 8080
database:
  url: postgres://localhost/db
  pool: 5`;

      expect(detector.detect(yaml).match).toBe(false);
    });

    test("should NOT detect Markdown", () => {
      const md = `# My Document

This is a paragraph of text.

## Section 2

Some more content here with **bold** and *italic*.

- item 1
- item 2`;

      expect(detector.detect(md).match).toBe(false);
    });

    test("should NOT detect empty content", () => {
      expect(detector.detect("").match).toBe(false);
      expect(detector.detect("   ").match).toBe(false);
    });

    test("should NOT detect content with only 2 non-empty lines", () => {
      expect(detector.detect("[table]\nkey = 1").match).toBe(false);
    });
  });

  describe("Priority over INI", () => {
    test("TOML detector should yield higher confidence than INI when TOML-specific signals are present", () => {
      const toml = `[server]
host = "localhost"
created_at = 2024-01-01T00:00:00Z
server.port = 8080
server.debug = false`;

      const iniDetector = new IniFormatDetector();
      const tomlResult = detector.detect(toml);
      const iniResult = iniDetector.detect(toml);

      expect(tomlResult.match).toBe(true);
      expect(tomlResult.confidence).toBeGreaterThan(iniResult.confidence);
    });

    test("TOML priority should be higher than INI priority", () => {
      expect(detector.priority).toBeGreaterThan(new IniFormatDetector().priority);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("should register monaco provider without errors", () => {
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

      expect(() => detector.registerProvider(mockMonaco)).not.toThrow();
      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "toml" });
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalled();
      expect(mockMonaco.languages.registerDocumentFormattingEditProvider).toHaveBeenCalled();
    });

    test("should not re-register if toml language already exists", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => [{ id: "toml" }]),
          register: jest.fn(),
          setMonarchTokensProvider: jest.fn(),
          registerDocumentFormattingEditProvider: jest.fn(),
        },
        editor: {
          defineTheme: jest.fn(),
        },
      };

      detector.registerProvider(mockMonaco);
      expect(mockMonaco.languages.register).not.toHaveBeenCalled();
      expect(mockMonaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
    });
  });
});
