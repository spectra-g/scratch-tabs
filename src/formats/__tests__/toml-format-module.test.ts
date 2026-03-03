import { formatRegistry } from "../registry";
import { TomlFormatModule } from "../toml/toml-format-module";
import { getTomlSampleContent } from "../toml/toml-sample-content";
import { registerTomlProvider } from "../toml/toml-monaco-provider";

describe("TomlFormatModule", () => {
  test("registers TOML format with expected metadata", async () => {
    await import("../toml/index");
    const module = formatRegistry.getById("toml");

    expect(module).toBeDefined();
    expect(module?.id).toBe("toml");
    expect(module?.name).toBe("TOML");
    expect(module?.extensions).toEqual(["toml"]);
    expect(module?.priority).toBe(6);
  });

  test("getSampleContent returns representative TOML", () => {
    const module = new TomlFormatModule();
    const content = module.getSampleContent();

    expect(content).toContain("[database]");
    expect(content).toContain("title = \"TOML Example\"");
    expect(content).toContain("enabled = true");
    expect(content).toContain("ports = [8001, 8002, 8003]");
    expect(content).toContain("[[products]]");
    expect(content).toContain("colors = { primary = \"gray\", secondary = \"silver\" }");
  });

  test("sample content helper stays aligned with module sample content", () => {
    const module = new TomlFormatModule();
    expect(module.sampleContent()).toBe(getTomlSampleContent());
  });

  test("registerProvider registers language and does not throw", () => {
    const module = new TomlFormatModule();
    const mockMonaco = {
      languages: {
        getLanguages: jest.fn(() => []),
        register: jest.fn(),
      },
    };

    expect(() => module.registerProvider(mockMonaco)).not.toThrow();
    expect(mockMonaco.languages.register).toHaveBeenCalledWith({ id: "toml" });
  });

  test("registerProvider handles missing monaco gracefully", () => {
    expect(() => registerTomlProvider(undefined)).not.toThrow();
    expect(() => registerTomlProvider({})).not.toThrow();
  });
});
