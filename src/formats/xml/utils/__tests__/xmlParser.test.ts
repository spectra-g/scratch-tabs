import { parseXmlDocument } from "../xmlParser";

describe("parseXmlDocument", () => {
  it("builds a tree with elements, attributes, comments, cdata, and processing instructions", () => {
    const result = parseXmlDocument(`<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="style.xsl"?>
<!-- feed -->
<feed xmlns="urn:feed" xmlns:a="urn:author">
  <entry id="1"><a:name><![CDATA[Ada <Lovelace>]]></a:name></entry>
</feed>`);

    expect(result.isValid).toBe(true);
    expect(result.stats.elementCount).toBe(3);
    expect(result.stats.attributeCount).toBe(3);
    expect(result.stats.commentCount).toBe(1);
    expect(result.stats.cdataCount).toBe(1);
    expect(result.stats.processingInstructionCount).toBe(1);
    expect(result.namespaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ prefix: "d", uri: "urn:feed", generatedPrefix: true }),
        expect.objectContaining({ prefix: "a", uri: "urn:author" }),
      ]),
    );
  });

  it("returns actionable diagnostics for malformed XML", () => {
    const result = parseXmlDocument("<root><child></root>");

    expect(result.isValid).toBe(false);
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({
        severity: "error",
        hint: expect.any(String),
      }),
    );
  });

  it("detects mixed content and empty elements", () => {
    const result = parseXmlDocument("<root>hello <b>world</b><empty/></root>");
    const root = result.root.children.find((node) => node.name === "root");

    expect(root?.hasMixedContent).toBe(true);
    expect(root?.children.find((node) => node.name === "empty")?.isEmptyElement).toBe(true);
  });

  it("assigns deterministic xpath-based ids to elements so selection survives re-parse", () => {
    const xml = "<root><item>first</item><item>second</item></root>";
    const r1 = parseXmlDocument(xml);
    const r2 = parseXmlDocument("<root><item>changed</item><item>second</item></root>");

    const firstItem1 = [...r1.nodesById.values()].find((n) => n.kind === "element" && n.name === "item");
    const firstItem2 = [...r2.nodesById.values()].find((n) => n.kind === "element" && n.name === "item");

    expect(firstItem1?.id).toBe("/root[1]/item[1]");
    expect(firstItem1?.id).toBe(firstItem2?.id);
  });

  it("assigns correct source ranges to nested elements with identical tag names", () => {
    const xml = "<root><item><item>inner</item></item></root>";
    const result = parseXmlDocument(xml);

    const root = result.root.children.find((n) => n.name === "root");
    const outerItem = root?.children.find((n) => n.name === "item");
    const innerItem = outerItem?.children.find((n) => n.name === "item");

    // outer <item> range must span the entire nested structure
    expect(outerItem?.range?.startOffset).toBe(xml.indexOf("<item>"));
    expect(outerItem?.range?.endOffset).toBe(xml.lastIndexOf("</item>") + "</item>".length);

    // inner <item> range must be contained within the outer one
    expect(innerItem?.range?.startOffset).toBeGreaterThan(outerItem!.range!.startOffset);
    expect(innerItem?.range?.endOffset).toBeLessThan(outerItem!.range!.endOffset);
  });

  it("flags external entities and remote schema references", () => {
    const result = parseXmlDocument(`<!DOCTYPE root [<!ENTITY ext SYSTEM "file:///etc/passwd">]>
<root xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:noNamespaceSchemaLocation="https://example.com/schema.xsd"/>`);

    expect(result.securityWarnings.map((warning) => warning.id)).toEqual(
      expect.arrayContaining(["external-entity", "remote-schema"]),
    );
  });
});
