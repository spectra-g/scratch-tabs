import { getCssLikePath, findNodeAtPosition } from "../xmlPath";
import { parseXmlDocument } from "../xmlParser";
import { XmlNodeInfo } from "../../views/types";

function makeNode(path: string): XmlNodeInfo {
  return { path } as XmlNodeInfo;
}

describe("findNodeAtPosition", () => {
  const xml = "<catalog>\n  <book id=\"1\">\n    <title>Guide</title>\n  </book>\n</catalog>";

  it("returns the deepest element node containing the cursor", () => {
    const { root } = parseXmlDocument(xml);
    const node = findNodeAtPosition(root, 2, 5);

    expect(node?.name).toBe("book");
  });

  it("returns the inner-most element when the cursor is on a leaf tag line", () => {
    const { root } = parseXmlDocument(xml);
    const node = findNodeAtPosition(root, 3, 10);

    expect(node?.name).toBe("title");
  });

  it("returns null when the cursor is outside all element ranges", () => {
    const { root } = parseXmlDocument(xml);
    expect(findNodeAtPosition(root, 99, 1)).toBeNull();
  });

  it("returns the root element when the cursor is on the opening tag line", () => {
    const { root } = parseXmlDocument(xml);
    const node = findNodeAtPosition(root, 1, 1);

    expect(node?.name).toBe("catalog");
  });
});

describe("getCssLikePath", () => {
  it("converts a simple path to CSS selector notation", () => {
    expect(getCssLikePath(makeNode("/root[1]/child[1]"))).toBe("root:nth-of-type(1) > child:nth-of-type(1)");
  });

  it("escapes namespace colons so they are not treated as pseudo-class separators", () => {
    expect(getCssLikePath(makeNode("/soap:Envelope[1]/soap:Body[1]"))).toBe(
      "soap\\:Envelope:nth-of-type(1) > soap\\:Body:nth-of-type(1)",
    );
  });

  it("handles elements without positional indices", () => {
    expect(getCssLikePath(makeNode("/root"))).toBe("root");
  });

  it("handles mixed namespaced and plain elements", () => {
    expect(getCssLikePath(makeNode("/catalog[1]/dc:title[2]"))).toBe(
      "catalog:nth-of-type(1) > dc\\:title:nth-of-type(2)",
    );
  });
});
