export interface XmlFormatOptions {
  indentSize?: number;
  preserveComments?: boolean;
  sortAttributes?: boolean;
}

export interface XmlMinifyOptions {
  removeComments?: boolean;
}

export function formatXml(content: string, options: XmlFormatOptions = {}): string {
  const indentSize = options.indentSize ?? 2;
  const preserveComments = options.preserveComments ?? true;
  const sortAttributes = options.sortAttributes ?? false;
  const parser = new DOMParser();
  const document = parser.parseFromString(content, "application/xml");

  if (document.getElementsByTagName("parsererror")[0]) {
    throw new Error("Cannot format malformed XML.");
  }

  const declaration = content.trimStart().startsWith("<?xml")
    ? content.trimStart().match(/^<\?xml[\s\S]*?\?>/)?.[0]
    : undefined;
  const lines: string[] = [];

  if (declaration) {
    lines.push(declaration);
  }

  Array.from(document.childNodes).forEach((node) => {
    if (node.nodeType === Node.PROCESSING_INSTRUCTION_NODE && node.nodeName === "xml") return;
    renderNode(node, lines, 0, " ".repeat(indentSize), { preserveComments, sortAttributes }, false);
  });

  return lines.filter(Boolean).join("\n");
}

export function minifyXml(content: string, options: XmlMinifyOptions = {}): string {
  const parser = new DOMParser();
  const document = parser.parseFromString(content, "application/xml");
  if (document.getElementsByTagName("parsererror")[0]) {
    throw new Error("Cannot minify malformed XML.");
  }

  let output = new XMLSerializer().serializeToString(document);
  if (options.removeComments) {
    output = output.replace(/<!--[\s\S]*?-->/g, "");
  }
  return output.replace(/>\s+</g, "><").trim();
}

function renderNode(
  node: Node,
  lines: string[],
  depth: number,
  indent: string,
  options: Required<Pick<XmlFormatOptions, "preserveComments" | "sortAttributes">>,
  preserveSpace: boolean,
): void {
  const pad = indent.repeat(depth);

  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      renderElement(node as Element, lines, depth, indent, options, preserveSpace);
      break;
    case Node.TEXT_NODE: {
      if (preserveSpace) {
        if (node.textContent !== null) lines.push(`${pad}${escapeText(node.textContent)}`);
      } else {
        const text = node.textContent?.trim();
        if (text) lines.push(`${pad}${escapeText(text)}`);
      }
      break;
    }
    case Node.CDATA_SECTION_NODE:
      lines.push(`${pad}<![CDATA[${node.textContent ?? ""}]]>`);
      break;
    case Node.COMMENT_NODE:
      if (options.preserveComments) lines.push(`${pad}<!--${node.textContent ?? ""}-->`);
      break;
    case Node.PROCESSING_INSTRUCTION_NODE:
      lines.push(`${pad}<?${node.nodeName}${node.textContent ? ` ${node.textContent}` : ""}?>`);
      break;
    case Node.DOCUMENT_TYPE_NODE:
      lines.push(`${pad}${new XMLSerializer().serializeToString(node)}`);
      break;
  }
}

function renderElement(
  element: Element,
  lines: string[],
  depth: number,
  indent: string,
  options: Required<Pick<XmlFormatOptions, "preserveComments" | "sortAttributes">>,
  preserveSpace: boolean,
): void {
  const pad = indent.repeat(depth);
  const attrs = Array.from(element.attributes);
  if (options.sortAttributes) {
    attrs.sort((left, right) => left.name.localeCompare(right.name));
  }
  const attrText = attrs.map((attr) => ` ${attr.name}="${escapeAttribute(attr.value)}"`).join("");
  const elementPreserveSpace = preserveSpace || element.getAttribute("xml:space") === "preserve";
  const children = Array.from(element.childNodes);
  const meaningfulChildren = elementPreserveSpace
    ? children
    : children.filter((child) => child.nodeType !== Node.TEXT_NODE || (child.textContent ?? "").trim());

  if (meaningfulChildren.length === 0) {
    lines.push(`${pad}<${element.nodeName}${attrText}/>`);
    return;
  }

  if (
    meaningfulChildren.length === 1 &&
    (meaningfulChildren[0].nodeType === Node.TEXT_NODE || meaningfulChildren[0].nodeType === Node.CDATA_SECTION_NODE)
  ) {
    const child = meaningfulChildren[0];
    const value =
      child.nodeType === Node.CDATA_SECTION_NODE
        ? `<![CDATA[${child.textContent ?? ""}]]>`
        : escapeText(elementPreserveSpace ? (child.textContent ?? "") : (child.textContent ?? "").trim());
    lines.push(`${pad}<${element.nodeName}${attrText}>${value}</${element.nodeName}>`);
    return;
  }

  lines.push(`${pad}<${element.nodeName}${attrText}>`);
  meaningfulChildren.forEach((child) => renderNode(child, lines, depth + 1, indent, options, elementPreserveSpace));
  lines.push(`${pad}</${element.nodeName}>`);
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}
