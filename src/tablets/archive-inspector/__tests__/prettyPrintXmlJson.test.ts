import { needsPrettyPrint, prettyPrint } from "../utils/prettyPrintXmlJson";

describe("needsPrettyPrint", () => {
  it("detects minified JSON as needing pretty-print", () => {
    expect(needsPrettyPrint('{"a":1,"b":2,"c":{"d":3}}')).toBe(true);
  });

  it("does not flag already-formatted JSON", () => {
    expect(needsPrettyPrint('{\n  "a": 1\n}')).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(needsPrettyPrint("")).toBe(false);
  });

  it("returns true for single-line content with no newlines", () => {
    expect(needsPrettyPrint("<root><child/></root>")).toBe(true);
  });

  it("returns false for content that already has newlines", () => {
    expect(needsPrettyPrint("<root>\n  <child/>\n</root>")).toBe(false);
  });
});

describe("prettyPrint JSON", () => {
  it("pretty-prints minified JSON with 2-space indent", () => {
    const result = prettyPrint('{"a":1,"b":2}', "json");
    expect(result).toContain("\n");
    expect(result).toContain("  ");
    expect(JSON.parse(result)).toEqual({ a: 1, b: 2 });
  });

  it("returns already-formatted JSON unchanged", () => {
    const formatted = '{\n  "a": 1\n}';
    expect(prettyPrint(formatted, "json")).toBe(formatted);
  });

  it("returns invalid JSON unchanged", () => {
    const bad = "{not valid json";
    expect(prettyPrint(bad, "json")).toBe(bad);
  });
});

describe("prettyPrint XML", () => {
  it("pretty-prints minified XML", () => {
    const result = prettyPrint("<root><child>text</child></root>", "xml");
    expect(result).toContain("\n  <child>");
  });

  it("does not double-format already-indented XML", () => {
    const formatted = "<root>\n  <child>text</child>\n</root>";
    expect(prettyPrint(formatted, "xml")).toBe(formatted);
  });

  it("handles self-closing tags", () => {
    const result = prettyPrint("<root><item/><item/></root>", "xml");
    expect(result).toContain("\n  <item/>");
  });

  it("handles nested elements", () => {
    const result = prettyPrint("<a><b><c>text</c></b></a>", "xml");
    expect(result).toContain("\n    <c>");
  });

  it("returns CDATA content unchanged to avoid corruption", () => {
    const xml = "<root><![CDATA[<b>not a tag</b>]]></root>";
    expect(prettyPrint(xml, "xml")).toBe(xml);
  });

  it("does not insert newlines inside CDATA when input has no existing newlines", () => {
    const xml = '<doc><data><![CDATA[x<y&z]]></data></doc>';
    const result = prettyPrint(xml, "xml");
    expect(result).toContain("<![CDATA[x<y&z]]>");
  });
});
