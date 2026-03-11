import "../index";
import { formatRegistry } from "../registry";
import { TomlFormatDetector } from "../toml";
import { TomlFormatModule } from "../toml/index";

describe("TOML format wiring", () => {
  it("includes TOML in the registered formats", () => {
    const toml = formatRegistry.getById("toml");

    expect(toml).toBeDefined();
    expect(toml).toMatchObject({
      id: "toml",
      name: "TOML",
      extensions: expect.arrayContaining(["toml"]),
    });
  });

  it("matches minimal TOML signatures in the detector stub", () => {
    const detector = new TomlFormatDetector();

    expect(detector.detect("")).toEqual({ match: false, confidence: 0 });

    const result = detector.detect(`[package]
name = "scratch-tabs"
version = "1.0.0"`);

    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("returns the TOML file extension from the format module contract", () => {
    const module = new TomlFormatModule();

    expect(module.getFileExtension()).toBe("toml");
  });
});
