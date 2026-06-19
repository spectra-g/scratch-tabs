export interface XmlToJsonOptions {
  attributeKey?: string;
  textKey?: string;
  cdataKey?: string;
  includeComments?: boolean;
  commentKey?: string;
  arrayMode?: "repeated-only" | "always" | "compact";
  namespaceMode?: "prefix" | "local" | "clark";
}

type JsonObject = Record<string, unknown>;

export function convertXmlToJson(content: string, options: XmlToJsonOptions = {}): unknown {
  const parser = new DOMParser();
  const document = parser.parseFromString(content, "application/xml");
  if (document.getElementsByTagName("parsererror")[0]) {
    throw new Error("Cannot convert malformed XML.");
  }

  const root = document.documentElement;
  return {
    [getElementKey(root, options)]: convertElement(root, normalizeOptions(options)),
  };
}

function normalizeOptions(options: XmlToJsonOptions): Required<XmlToJsonOptions> {
  return {
    attributeKey: options.attributeKey ?? "@attributes",
    textKey: options.textKey ?? "#text",
    cdataKey: options.cdataKey ?? "#cdata",
    includeComments: options.includeComments ?? false,
    commentKey: options.commentKey ?? "#comment",
    arrayMode: options.arrayMode ?? "repeated-only",
    namespaceMode: options.namespaceMode ?? "prefix",
  };
}

function convertElement(element: Element, options: Required<XmlToJsonOptions>): unknown {
  const output: JsonObject = {};

  if (element.attributes.length > 0) {
    output[options.attributeKey] = Array.from(element.attributes).reduce<JsonObject>((attrs, attr) => {
      attrs[getAttributeKey(attr, options)] = attr.value;
      return attrs;
    }, {});
  }

  const groupedChildren = new Map<string, unknown[]>();
  const textValues: string[] = [];
  const cdataValues: string[] = [];
  const commentValues: string[] = [];

  Array.from(element.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as Element;
      const key = getElementKey(childElement, options);
      const values = groupedChildren.get(key) ?? [];
      values.push(convertElement(childElement, options));
      groupedChildren.set(key, values);
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) textValues.push(text);
    } else if (child.nodeType === Node.CDATA_SECTION_NODE) {
      cdataValues.push(child.textContent ?? "");
    } else if (child.nodeType === Node.COMMENT_NODE && options.includeComments) {
      commentValues.push(child.textContent ?? "");
    }
  });

  groupedChildren.forEach((values, key) => {
    output[key] = shouldUseArray(values, options) ? values : values[0];
  });

  if (textValues.length > 0) {
    output[options.textKey] = textValues.join(" ");
  }
  if (cdataValues.length > 0) {
    output[options.cdataKey] = cdataValues.length === 1 ? cdataValues[0] : cdataValues;
  }
  if (commentValues.length > 0) {
    output[options.commentKey] = commentValues.length === 1 ? commentValues[0] : commentValues;
  }

  const keys = Object.keys(output);
  if (keys.length === 0) return "";
  if (keys.length === 1 && keys[0] === options.textKey && options.arrayMode === "compact") {
    return output[options.textKey];
  }

  return output;
}

function shouldUseArray(values: unknown[], options: Required<XmlToJsonOptions>): boolean {
  if (options.arrayMode === "always") return true;
  if (options.arrayMode === "compact") return values.length > 1;
  return values.length > 1;
}

function getElementKey(element: Element, options: XmlToJsonOptions): string {
  if (options.namespaceMode === "local") return element.localName || element.nodeName;
  if (options.namespaceMode === "clark" && element.namespaceURI) {
    return `{${element.namespaceURI}}${element.localName || element.nodeName}`;
  }
  return element.nodeName;
}

function getAttributeKey(attr: Attr, options: Required<XmlToJsonOptions>): string {
  if (options.namespaceMode === "local") return attr.localName || attr.name;
  if (options.namespaceMode === "clark" && attr.namespaceURI) {
    return `{${attr.namespaceURI}}${attr.localName || attr.name}`;
  }
  return attr.name;
}
