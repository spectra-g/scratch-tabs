import { TomlFormatDetector } from "../toml/toml-detector";

describe("TomlFormatDetector", () => {
  let detector: TomlFormatDetector;

  beforeEach(() => {
    detector = new TomlFormatDetector();
  });

  test("has expected metadata", () => {
    expect(detector.id).toBe("toml");
    expect(detector.name).toBe("TOML");
    expect(detector.extensions).toEqual(["toml"]);
    expect(detector.priority).toBe(6);
  });

  test("detects table-based TOML content", () => {
    const content = `title = "Example"
enabled = true

[database]
host = "localhost"
port = 5432
`;

    const result = detector.detect(content);
    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test("detects TOML array tables and inline tables with high confidence", () => {
    const content = `[[products]]
name = "Hammer"
sku = 738594937

[[products]]
name = "Nail"
colors = { primary = "gray", secondary = "silver" }
`;

    const result = detector.detect(content);
    expect(result.match).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.7);
    expect(result.matchedDefinitive).toBe(true);
  });

  test("returns no match for empty content", () => {
    const result = detector.detect("   \n   ");
    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
  });

  test("rejects INI-style content with section + key=value and no TOML signals", () => {
    const iniLike = `[section]\nkey=value\nother=1`;
    const result = detector.detect(iniLike);

    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
  });

  test("rejects properties-style content", () => {
    const propertiesLike = `app.name=value\napp.port=8080\nfeature.flag=true`;
    const result = detector.detect(propertiesLike);

    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
  });

  test("rejects YAML-style content", () => {
    const yamlLike = `service:\n  name: api\n  enabled: true`;
    const result = detector.detect(yamlLike);

    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
  });

  test("rejects HCL-style block content", () => {
    const hclLike = `resource "aws_instance" "web" {\n  ami = "ami-1"\n  instance_type = "t2.micro"\n}`;
    const result = detector.detect(hclLike);

    expect(result.match).toBe(false);
    expect(result.confidence).toBe(0);
  });
});
