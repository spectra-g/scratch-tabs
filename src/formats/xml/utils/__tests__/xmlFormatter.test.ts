import { formatXml, minifyXml } from "../xmlFormatter";

describe("xmlFormatter", () => {
  it("formats nested XML", () => {
    const formatted = formatXml("<root><child>text</child><empty/></root>", { indentSize: 2 });

    expect(formatted).toContain("\n  <child>text</child>");
    expect(formatted).toContain("\n  <empty/>");
  });

  it("sorts attributes when requested", () => {
    const formatted = formatXml('<root z="2" a="1"/>', { sortAttributes: true });

    expect(formatted).toContain('<root a="1" z="2"/>');
  });

  it("preserves whitespace inside xml:space='preserve' elements", () => {
    const formatted = formatXml('<root><pre xml:space="preserve">  indented  </pre></root>', { indentSize: 2 });

    expect(formatted).toContain('<pre xml:space="preserve">  indented  </pre>');
  });

  it("inherits preserve-space for descendants of a preserve-space element", () => {
    const formatted = formatXml('<root><pre xml:space="preserve"><span>  spaced  </span></pre></root>', {
      indentSize: 2,
    });

    expect(formatted).toContain("  spaced  ");
  });

  it("minifies XML and can remove comments", () => {
    const minified = minifyXml("<root>\n  <!-- note -->\n  <child>text</child>\n</root>", {
      removeComments: true,
    });

    expect(minified).toBe("<root><child>text</child></root>");
  });
});
