import { __internal, serializeToml } from "../tomlSerializer";
import { parseToml } from "../../parsers/tomlParser";

describe("tomlSerializer", () => {
  it("serializes a simple model into TOML", () => {
    const output = serializeToml({ title: "App", debug: true, retries: 2 });

    expect(output).toContain('title = "App"');
    expect(output).toContain("debug = true");
    expect(output).toContain("retries = 2");
  });

  it("serializes nested objects as inline tables", () => {
    const output = serializeToml({
      server: {
        host: "localhost",
        ports: [80, 443],
      },
    });

    expect(output).toContain('server = { host = "localhost", ports = [80, 443] }');
  });

  it("returns an empty string for an empty model", () => {
    expect(serializeToml({})).toBe("");
  });

  it("produces TOML that can be parsed back", () => {
    const data = {
      app: {
        name: "scratch-tabs",
        flags: ["a", "b"],
      },
      enabled: true,
    };

    const output = serializeToml(data);
    const parsed = parseToml(output);

    expect(parsed.error).toBeNull();
    expect(parsed.data).toEqual(data);
  });

  it("quotes special keys in fallback serializer", () => {
    expect(__internal.serializeKey("service.url")).toBe('"service.url"');
    expect(__internal.serializeKey("normal_key")).toBe("normal_key");
  });
});
