import { formatRegistry } from "../registry";
import { TomlFormatDetector } from "../toml";
import { TomlFormatModule } from "../toml/index";

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

  describe("Detection Logic", () => {
    test("should detect TOML documents with tables and key value pairs", () => {
      const content = `title = "TOML Example"

[database]
server = "192.168.1.1"
ports = [ 8001, 8001, 8002 ]
enabled = true
`;

      const result = detector.detect(content);

      expect(result.match).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should reject JSON, YAML, and plain text content", () => {
      expect(detector.detect('{"name":"test"}').match).toBe(false);
      expect(detector.detect("name: test\nversion: 1").match).toBe(false);
      expect(detector.detect("just some plain text").match).toBe(false);
    });

    test("should reject properties-style content without TOML structure", () => {
      const content = `app.name = My Application
app.version = 1.0.3
database.host = localhost
database.port = 5432
server.debug = true`;

      expect(detector.detect(content).match).toBe(false);
    });

    test("should handle empty content", () => {
      expect(detector.detect("").match).toBe(false);
    });
  });

  describe("Module Contract and Registry", () => {
    test("should comply with the format module contract", () => {
      const module = new TomlFormatModule();

      expect(module.id).toBe("toml");
      expect(module.name).toBe("TOML");
      expect(module.extensions).toEqual(["toml"]);
      expect(module.priority).toBe(6);
      expect(typeof module.detect).toBe("function");
      expect(typeof module.registerProvider).toBe("function");
      expect(typeof module.sampleContent).toBe("function");
      expect(typeof module.getFileExtension).toBe("function");
      expect(module.sampleContent()).toContain("[database]");
      expect(module.getFileExtension()).toBe("toml");
    });

    test("registers TOML in the format registry", () => {
      const registryModule = formatRegistry.getAll().find((module) => module.id === "toml");

      expect(registryModule).toBeDefined();
      expect(registryModule?.id).toBe("toml");
    });

    test("registers under the same id as the detector", () => {
      const registryModule = formatRegistry.getById("toml");

      expect(registryModule).toBeDefined();
      expect(registryModule?.id).toBe(detector.id);
    });
  });

  describe("Monaco Provider Registration", () => {
    test("registers the TOML language with Monaco", () => {
      const mockMonaco = {
        languages: {
          getLanguages: jest.fn(() => []),
          register: jest.fn(),
        },
      };

      detector.registerProvider(mockMonaco);

      expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "toml" });
    });
  });
});
