import { __internal, parseToml } from "../tomlParser";

describe("tomlParser", () => {
  it("AC-004: surfaces a meaningful error for invalid TOML", () => {
    const result = parseToml("title \"missing_equals\"");

    expect(result.error).toContain("Failed to parse TOML");
    expect(result.data).toEqual({});
  });

  it("AC-006: handles empty input safely", () => {
    const result = parseToml("");

    expect(result.error).toBeNull();
    expect(result.data).toEqual({});
  });

  it("AC-006: handles mixed inline and standard tables", () => {
    const content = [
      "title = \"demo\"",
      "app = { mode = \"dev\", retries = 3 }",
      "[database]",
      "host = \"localhost\"",
      "port = 5432",
    ].join("\n");

    const result = parseToml(content);

    expect(result.error).toBeNull();
    expect(result.data.app).toEqual({ mode: "dev", retries: 3 });
    expect(result.data.database).toEqual({ host: "localhost", port: 5432 });
  });

  it("AC-006: parses special characters in quoted keys", () => {
    const content = '"service.url" = "https://example.com"\n"x y" = "value"';

    const result = parseToml(content);

    expect(result.error).toBeNull();
    expect(result.data["service.url"]).toBe("https://example.com");
    expect(result.data["x y"]).toBe("value");
  });

  it("parses arrays and datetime values in fallback parser", () => {
    const parsed = __internal.parseTomlFallback(
      "numbers = [1, 2, 3]\ncreated_at = 2024-11-12T08:30:00Z",
    );

    expect(parsed.numbers).toEqual([1, 2, 3]);
    expect(parsed.created_at).toBeInstanceOf(Date);
  });
});
