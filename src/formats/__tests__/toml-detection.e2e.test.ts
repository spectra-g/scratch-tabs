import { detectFormat } from "../index";
import { formatRegistry } from "../registry";

describe("TOML detection acceptance", () => {
  test("AC-001: valid TOML content is detected as toml", () => {
    const tomlContent = `title = "My App"

[server]
host = "localhost"
port = 3000
enabled = true

[[workers]]
name = "alpha"
`;

    expect(detectFormat(tomlContent)).toBe("toml");
  });

  test("AC-002: INI/properties/YAML/HCL samples are not classified as toml", () => {
    const samples = [
      `[section]\nkey=value\nother=true`,
      `app.name=value\napp.port=8080\nfeature.flag=true`,
      `service:\n  name: api\n  enabled: true`,
      `resource "aws_instance" "web" {\n  ami = "ami-1"\n}`,
    ];

    for (const sample of samples) {
      expect(detectFormat(sample)).not.toBe("toml");
    }
  });

  test("AC-003: format registry contains TOML metadata", async () => {
    await import("../toml/index");
    const module = formatRegistry.getById("toml");

    expect(module).toBeDefined();
    expect(module?.id).toBe("toml");
    expect(module?.name).toBe("TOML");
    expect(module?.extensions).toEqual(["toml"]);
    expect(module?.priority).toBe(6);
  });
});
