import { XmlAttributeInfo, XmlNodeInfo, XmlSourceRange } from "../views/types";

export function buildLineStarts(content: string): number[] {
  const starts = [0];
  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

export function offsetToLineColumn(lineStarts: number[], offset: number) {
  let low = 0;
  let high = lineStarts.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= offset) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const lineIndex = Math.max(0, high);
  return {
    line: lineIndex + 1,
    column: offset - lineStarts[lineIndex] + 1,
  };
}

export function createRange(
  content: string,
  lineStarts: number[],
  startOffset: number,
  endOffset: number,
): XmlSourceRange {
  const boundedStart = Math.max(0, Math.min(content.length, startOffset));
  const boundedEnd = Math.max(boundedStart, Math.min(content.length, endOffset));
  const start = offsetToLineColumn(lineStarts, boundedStart);
  const end = offsetToLineColumn(lineStarts, boundedEnd);

  return {
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
    startOffset: boundedStart,
    endOffset: boundedEnd,
  };
}

export function getClarkName(namespaceUri: string | null, localName: string): string {
  return namespaceUri ? `{${namespaceUri}}${localName}` : localName;
}

export function getNodeDisplayName(node: Element): {
  name: string;
  localName: string;
  prefix: string | null;
  namespaceUri: string | null;
  clarkName: string;
} {
  const localName = node.localName || node.nodeName;
  const namespaceUri = node.namespaceURI || null;
  return {
    name: node.nodeName,
    localName,
    prefix: node.prefix || null,
    namespaceUri,
    clarkName: getClarkName(namespaceUri, localName),
  };
}

export function createChildPath(parentPath: string, element: Element, siblingIndex: number): string {
  const name = element.nodeName;
  return parentPath === "/" ? `/${name}[${siblingIndex}]` : `${parentPath}/${name}[${siblingIndex}]`;
}

export function createXPath(parentXPath: string, element: Element, siblingIndex: number): string {
  const name = element.nodeName;
  return parentXPath === "/" ? `/${name}[${siblingIndex}]` : `${parentXPath}/${name}[${siblingIndex}]`;
}

export function createAttributeInfo(
  owner: XmlNodeInfo,
  attr: Attr,
  index: number,
  range?: XmlSourceRange,
): XmlAttributeInfo {
  const localName = attr.localName || attr.name;
  const namespaceUri = attr.namespaceURI || null;

  return {
    id: `${owner.id}:attr:${index}`,
    kind: "attribute",
    name: attr.name,
    localName,
    prefix: attr.prefix || null,
    namespaceUri,
    value: attr.value,
    path: `${owner.path}/@${attr.name}`,
    xpath: `${owner.xpath}/@${attr.name}`,
    clarkName: getClarkName(namespaceUri, localName),
    range,
  };
}

export function flattenXmlNodes(root: XmlNodeInfo): XmlNodeInfo[] {
  const nodes: XmlNodeInfo[] = [];
  const visit = (node: XmlNodeInfo) => {
    nodes.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return nodes;
}

export function findNodeByPath(root: XmlNodeInfo, path: string): XmlNodeInfo | null {
  return flattenXmlNodes(root).find((node) => node.path === path || node.xpath === path) ?? null;
}

export function findNodeAtPosition(root: XmlNodeInfo, line: number, column: number): XmlNodeInfo | null {
  function contains(node: XmlNodeInfo): boolean {
    if (!node.range) return false;
    const { startLine, startColumn, endLine, endColumn } = node.range;
    if (line < startLine || line > endLine) return false;
    if (line === startLine && column < startColumn) return false;
    if (line === endLine && column > endColumn) return false;
    return true;
  }

  function deepestElement(node: XmlNodeInfo): XmlNodeInfo | null {
    if (!contains(node)) return null;
    for (const child of node.children) {
      if (child.kind === "element") {
        const hit = deepestElement(child);
        if (hit) return hit;
      }
    }
    return node.kind === "element" ? node : null;
  }

  for (const child of root.children) {
    const hit = deepestElement(child);
    if (hit) return hit;
  }
  return null;
}

export function getCssLikePath(node: XmlNodeInfo): string {
  return node.path
    .split("/")
    .filter(Boolean)
    .map((part) => {
      const tagName = part.replace(/\[\d+]$/, "");
      const indexMatch = part.match(/\[(\d+)]$/);
      // Escape namespace colons so they aren't misread as CSS pseudo-class separators
      const escapedTag = tagName.replace(/:/g, "\\:");
      return indexMatch ? `${escapedTag}:nth-of-type(${indexMatch[1]})` : escapedTag;
    })
    .join(" > ");
}
