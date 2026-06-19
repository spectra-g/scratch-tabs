import { evaluateXPath } from "../xmlXPath";
import { parseXmlDocument } from "../xmlParser";

describe("evaluateXPath", () => {
  it("evaluates node queries with generated default namespace prefix", () => {
    const parsed = parseXmlDocument('<feed xmlns="urn:feed"><entry id="1">Ada</entry></feed>');
    const result = evaluateXPath(parsed.document, "//d:entry", parsed.namespaces);

    expect(result.ok).toBe(true);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(expect.objectContaining({ name: "entry", valuePreview: "Ada" }));
  });

  it("evaluates scalar expressions", () => {
    const parsed = parseXmlDocument("<root><item/><item/></root>");
    const result = evaluateXPath(parsed.document, "count(//item)", parsed.namespaces);

    expect(result.resultType).toBe("number");
    expect(result.scalarValue).toBe("2");
  });

  it("returns expression errors without throwing", () => {
    const parsed = parseXmlDocument("<root/>");
    const result = evaluateXPath(parsed.document, "//* [", parsed.namespaces);

    expect(result.ok).toBe(false);
    expect(result.error).toEqual(expect.any(String));
  });
});
