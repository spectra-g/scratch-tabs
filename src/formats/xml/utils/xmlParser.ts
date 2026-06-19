import {
  XmlDiagnostic,
  XmlDocumentStats,
  XmlNamespaceInfo,
  XmlNodeInfo,
  XmlParseResult,
  XmlSourceRange,
} from "../views/types";
import {
  buildLineStarts,
  createAttributeInfo,
  createChildPath,
  createRange,
  createXPath,
  getClarkName,
  getNodeDisplayName,
} from "./xmlPath";
import { detectXmlSecurityWarnings } from "./xmlSecurity";

interface BuildContext {
  content: string;
  lineStarts: number[];
  stats: XmlDocumentStats;
  namespaces: Map<string, XmlNamespaceInfo>;
  searchOffset: number;
}

export function parseXmlDocument(content: string): XmlParseResult {
  const parser = new DOMParser();
  const document = parser.parseFromString(content, "application/xml");
  const parserError = extractParserError(document, content);
  const lineStarts = buildLineStarts(content);
  const stats = createEmptyStats(content);

  if (parserError) {
    const root = createDocumentRoot();
    return {
      isValid: false,
      root,
      nodesById: new Map([[root.id, root]]),
      namespaces: [],
      diagnostics: [parserError],
      securityWarnings: detectXmlSecurityWarnings(content),
      stats,
      document: null,
    };
  }

  const context: BuildContext = {
    content,
    lineStarts,
    stats,
    namespaces: new Map(),
    searchOffset: 0,
  };

  const root = createDocumentRoot();
  root.children = Array.from(document.childNodes)
    .map((child, childIndex) => buildNodeInfo(child, root, context, 1, childIndex))
    .filter((node): node is XmlNodeInfo => Boolean(node));
  root.childElementCount = root.children.filter((child) => child.kind === "element").length;
  context.stats.maxDepth = Math.max(context.stats.maxDepth, getMaxDepth(root));

  const nodesById = new Map<string, XmlNodeInfo>();
  const collect = (node: XmlNodeInfo) => {
    nodesById.set(node.id, node);
    node.children.forEach(collect);
  };
  collect(root);

  return {
    isValid: true,
    root,
    nodesById,
    namespaces: Array.from(context.namespaces.values()),
    diagnostics: [],
    securityWarnings: detectXmlSecurityWarnings(content, root),
    stats: context.stats,
    document,
  };
}

function createEmptyStats(content: string): XmlDocumentStats {
  return {
    elementCount: 0,
    attributeCount: 0,
    textNodeCount: 0,
    commentCount: 0,
    cdataCount: 0,
    processingInstructionCount: 0,
    maxDepth: 0,
    byteLength: new TextEncoder().encode(content).length,
  };
}

function createDocumentRoot(): XmlNodeInfo {
  return {
    id: "node-0",
    kind: "document",
    name: "#document",
    localName: "#document",
    prefix: null,
    namespaceUri: null,
    path: "/",
    xpath: "/",
    clarkName: "#document",
    attributes: [],
    children: [],
    valuePreview: "",
    textLength: 0,
    hasMixedContent: false,
    isEmptyElement: false,
    childElementCount: 0,
  };
}

function buildNodeInfo(
  domNode: Node,
  parent: XmlNodeInfo,
  context: BuildContext,
  depth: number,
  childIndex: number,
): XmlNodeInfo | null {
  switch (domNode.nodeType) {
    case Node.ELEMENT_NODE:
      return buildElementInfo(domNode as Element, parent, context, depth);
    case Node.TEXT_NODE:
      return buildLeafNode("text", domNode, parent, context, childIndex);
    case Node.CDATA_SECTION_NODE:
      context.stats.cdataCount += 1;
      return buildLeafNode("cdata", domNode, parent, context, childIndex);
    case Node.COMMENT_NODE:
      context.stats.commentCount += 1;
      return buildLeafNode("comment", domNode, parent, context, childIndex);
    case Node.PROCESSING_INSTRUCTION_NODE:
      context.stats.processingInstructionCount += 1;
      return buildLeafNode("processing-instruction", domNode, parent, context, childIndex);
    case Node.DOCUMENT_TYPE_NODE:
      return buildLeafNode("doctype", domNode, parent, context, childIndex);
    default:
      return null;
  }
}

function buildElementInfo(
  element: Element,
  parent: XmlNodeInfo,
  context: BuildContext,
  depth: number,
): XmlNodeInfo {
  context.stats.elementCount += 1;
  const siblingIndex = getElementSiblingIndex(element);
  const display = getNodeDisplayName(element);
  const range = findElementRange(element, context);
  const path = createChildPath(parent.path, element, siblingIndex);
  const xpath = createXPath(parent.xpath, element, siblingIndex);
  const id = xpath;
  const elementChildren = Array.from(element.childNodes).filter((child) => child.nodeType === Node.ELEMENT_NODE);
  const meaningfulTextChildren = Array.from(element.childNodes).filter(
    (child) =>
      (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) &&
      (child.textContent ?? "").trim().length > 0,
  );

  const node: XmlNodeInfo = {
    id,
    kind: "element",
    name: display.name,
    localName: display.localName,
    prefix: display.prefix,
    namespaceUri: display.namespaceUri,
    path,
    xpath,
    clarkName: display.clarkName,
    attributes: [],
    children: [],
    valuePreview: compactPreview(element.textContent ?? ""),
    textLength: (element.textContent ?? "").length,
    range,
    hasMixedContent: elementChildren.length > 0 && meaningfulTextChildren.length > 0,
    isEmptyElement: element.childNodes.length === 0,
    childElementCount: elementChildren.length,
  };

  node.attributes = Array.from(element.attributes).map((attr, index) => {
    context.stats.attributeCount += 1;
    collectNamespace(attr, node, context);
    return createAttributeInfo(node, attr, index, findAttributeRange(attr, range, context));
  });

  if (element.namespaceURI) {
    collectElementNamespace(element, node, context);
  }

  node.children = Array.from(element.childNodes)
    .map((child, childIndex) => buildNodeInfo(child, node, context, depth + 1, childIndex))
    .filter((child): child is XmlNodeInfo => Boolean(child))
    .filter((child) => child.kind !== "text" || child.valuePreview.length > 0);

  context.stats.maxDepth = Math.max(context.stats.maxDepth, depth);
  return node;
}

function buildLeafNode(
  kind: XmlNodeInfo["kind"],
  domNode: Node,
  parent: XmlNodeInfo,
  context: BuildContext,
  childIndex: number,
): XmlNodeInfo {
  if (kind === "text") {
    context.stats.textNodeCount += 1;
  }

  const name = kind === "processing-instruction" ? domNode.nodeName : `#${kind}`;
  const range = findTextRange(domNode.textContent ?? "", context);
  const id = `${parent.id}/${name}[${childIndex}]`;

  return {
    id,
    kind,
    name,
    localName: name,
    prefix: null,
    namespaceUri: null,
    path: `${parent.path}/${name}[${childIndex}]`,
    xpath: `${parent.xpath}/${name}`,
    clarkName: name,
    attributes: [],
    children: [],
    valuePreview: compactPreview(domNode.textContent ?? ""),
    textLength: (domNode.textContent ?? "").length,
    range,
    hasMixedContent: false,
    isEmptyElement: !(domNode.textContent ?? ""),
    childElementCount: 0,
  };
}

function getElementSiblingIndex(element: Element): number {
  let index = 1;
  let previous = element.previousSibling;
  while (previous) {
    if (previous.nodeType === Node.ELEMENT_NODE && (previous as Element).nodeName === element.nodeName) {
      index += 1;
    }
    previous = previous.previousSibling;
  }
  return index;
}

function findElementRange(element: Element, context: BuildContext): XmlSourceRange | undefined {
  const openTagPattern = new RegExp(`<${escapeRegExp(element.nodeName)}(?:\\s|>|/)`, "g");
  openTagPattern.lastIndex = context.searchOffset;
  const match = openTagPattern.exec(context.content) ?? firstRegexMatch(openTagPattern, context.content);
  if (!match) return undefined;

  const start = match.index;
  const openEnd = context.content.indexOf(">", start);
  if (openEnd === -1) return undefined;

  let end = openEnd + 1;
  if (!/\/\s*>$/.test(context.content.slice(start, end))) {
    const closeTag = `</${element.nodeName}>`;
    const closeIndex = findMatchingCloseTag(context.content, element.nodeName, openEnd + 1);
    if (closeIndex >= 0) {
      end = closeIndex + closeTag.length;
    }
  }

  context.searchOffset = openEnd + 1;
  return createRange(context.content, context.lineStarts, start, end);
}

function findMatchingCloseTag(content: string, nodeName: string, searchFrom: number): number {
  const openToken = `<${nodeName}`;
  const closeTag = `</${nodeName}>`;
  let depth = 1;
  let pos = searchFrom;

  while (pos < content.length && depth > 0) {
    const nextOpen = findNextOpenTag(content, openToken, pos);
    const nextClose = content.indexOf(closeTag, pos);

    if (nextClose === -1) return -1;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      const gtIdx = content.indexOf(">", nextOpen);
      if (gtIdx === -1) return -1;
      if (!content.slice(nextOpen, gtIdx + 1).endsWith("/>")) {
        depth++;
      }
      pos = gtIdx + 1;
    } else {
      depth--;
      if (depth === 0) return nextClose;
      pos = nextClose + closeTag.length;
    }
  }

  return -1;
}

function findNextOpenTag(content: string, openToken: string, fromPos: number): number {
  let pos = fromPos;
  while (pos < content.length) {
    const idx = content.indexOf(openToken, pos);
    if (idx === -1) return -1;
    const charAfter = content[idx + openToken.length];
    if (charAfter === ">" || charAfter === "/" || charAfter === " " || charAfter === "\t" || charAfter === "\n" || charAfter === "\r") {
      return idx;
    }
    pos = idx + openToken.length;
  }
  return -1;
}

function findAttributeRange(
  attr: Attr,
  elementRange: XmlSourceRange | undefined,
  context: BuildContext,
): XmlSourceRange | undefined {
  if (!elementRange) return undefined;
  const openTag = context.content.slice(elementRange.startOffset, context.content.indexOf(">", elementRange.startOffset) + 1);
  const pattern = new RegExp(`${escapeRegExp(attr.name)}\\s*=\\s*(?:"[^"]*"|'[^']*')`);
  const match = pattern.exec(openTag);
  if (!match) return undefined;

  const start = elementRange.startOffset + match.index;
  return createRange(context.content, context.lineStarts, start, start + match[0].length);
}

function findTextRange(value: string, context: BuildContext): XmlSourceRange | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const index = context.content.indexOf(trimmed, context.searchOffset);
  if (index < 0) return undefined;
  return createRange(context.content, context.lineStarts, index, index + trimmed.length);
}

function collectNamespace(attr: Attr, node: XmlNodeInfo, context: BuildContext): void {
  if (attr.name !== "xmlns" && !attr.name.startsWith("xmlns:")) return;
  const prefix = attr.name === "xmlns" ? "d" : attr.name.slice("xmlns:".length);
  const key = `${prefix}\u0000${attr.value}`;
  if (!context.namespaces.has(key)) {
    context.namespaces.set(key, {
      prefix,
      uri: attr.value,
      declaredOnPath: node.path,
      generatedPrefix: attr.name === "xmlns",
    });
  }
}

function collectElementNamespace(element: Element, node: XmlNodeInfo, context: BuildContext): void {
  const prefix = element.prefix || "d";
  const key = `${prefix}\u0000${element.namespaceURI}`;
  if (!context.namespaces.has(key)) {
    context.namespaces.set(key, {
      prefix,
      uri: element.namespaceURI ?? "",
      declaredOnPath: node.path,
      generatedPrefix: !element.prefix,
    });
  }
}

function extractParserError(document: Document, content: string): XmlDiagnostic | null {
  const parserError = document.getElementsByTagName("parsererror")[0];
  if (!parserError) return null;

  const message = compactPreview(parserError.textContent || "Invalid XML");
  const position = extractErrorPosition(message);
  const excerpt = position.line ? getLineExcerpt(content, position.line) : undefined;

  return {
    id: "parser-error",
    severity: "error",
    message,
    line: position.line,
    column: position.column,
    excerpt,
    hint: inferParserHint(message),
  };
}

function extractErrorPosition(message: string): { line?: number; column?: number } {
  const patterns = [
    /line\s+(\d+)[^\d]+column\s+(\d+)/i,
    /(\d+):(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return { line: Number(match[1]), column: Number(match[2]) };
    }
  }

  return {};
}

function inferParserHint(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("mismatch") || lower.includes("expected")) return "Check for a mismatched closing tag near this location.";
  if (lower.includes("entity") || lower.includes("reference")) return "Check for an unescaped ampersand. Use &amp; for literal ampersands.";
  if (lower.includes("duplicate")) return "Check for duplicate attributes on the same element.";
  if (lower.includes("cdata")) return "Check that CDATA sections close with ]] > without spaces: ]]>";
  if (lower.includes("namespace") || lower.includes("prefix")) return "Check that every namespace prefix has an xmlns declaration.";
  return "Check the nearby tag, attribute quoting, and nesting.";
}

function getLineExcerpt(content: string, line: number): string {
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, line - 2);
  const end = Math.min(lines.length, line + 1);
  return lines.slice(start, end).join("\n");
}

function getMaxDepth(node: XmlNodeInfo): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(getMaxDepth));
}

function compactPreview(value: string, limit = 160): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 1)}…` : compact;
}

function firstRegexMatch(pattern: RegExp, content: string): RegExpExecArray | null {
  pattern.lastIndex = 0;
  return pattern.exec(content);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
