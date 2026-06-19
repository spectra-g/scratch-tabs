import { XPathEvaluationResult, XPathResultRow, XmlNamespaceInfo } from "../views/types";

export function evaluateXPath(
  document: Document | null,
  expression: string,
  namespaces: XmlNamespaceInfo[],
): XPathEvaluationResult {
  if (!document) {
    return {
      ok: false,
      expression,
      resultType: "error",
      rows: [],
      error: "XPath requires well-formed XML.",
    };
  }

  const trimmed = expression.trim();
  if (!trimmed) {
    return {
      ok: true,
      expression,
      resultType: "nodes",
      rows: [],
    };
  }

  try {
    const resolver = createNamespaceResolver(namespaces);
    const result = document.evaluate(trimmed, document, resolver, XPathResult.ANY_TYPE, null);
    const evaluated = xpathResultToEvaluation(expression, result);

    if (evaluated.resultType === "nodes" && evaluated.rows.length === 0) {
      const fallback = evaluateFallbackExpression(document, expression, trimmed, namespaces);
      if (fallback) {
        return fallback;
      }
    }

    return evaluated;
  } catch (error) {
    const fallback = evaluateFallbackExpression(document, expression, trimmed, namespaces);
    if (fallback) {
      return fallback;
    }

    return {
      ok: false,
      expression,
      resultType: "error",
      rows: [],
      error: error instanceof Error ? error.message : "Invalid XPath expression.",
    };
  }
}

function evaluateFallbackExpression(
  document: Document,
  originalExpression: string,
  expression: string,
  namespaces: XmlNamespaceInfo[],
): XPathEvaluationResult | null {
  const fallbackExpressions = [
    rewriteNamespacedSteps(expression, namespaces, true),
    rewriteNamespacedSteps(expression, namespaces, false),
  ].filter((fallbackExpression, index, all) => fallbackExpression !== expression && all.indexOf(fallbackExpression) === index);

  for (const fallbackExpression of fallbackExpressions) {
    try {
      const fallback = document.evaluate(fallbackExpression, document, null, XPathResult.ANY_TYPE, null);
      const evaluated = xpathResultToEvaluation(originalExpression, fallback);
      if (evaluated.resultType !== "nodes" || evaluated.rows.length > 0) {
        return evaluated;
      }
    } catch {
      // Try the next fallback.
    }
  }

  const traversedRows = evaluateSimpleNamespacedNodeQuery(document, expression, namespaces);
  if (traversedRows.length > 0) {
    return {
      ok: true,
      expression: originalExpression,
      resultType: "nodes",
      rows: traversedRows,
    };
  }

  return null;
}

function xpathResultToEvaluation(expression: string, result: XPathResult): XPathEvaluationResult {
  switch (result.resultType) {
    case XPathResult.STRING_TYPE:
      return scalarResult(expression, "string", result.stringValue);
    case XPathResult.NUMBER_TYPE:
      return scalarResult(expression, "number", String(result.numberValue));
    case XPathResult.BOOLEAN_TYPE:
      return scalarResult(expression, "boolean", String(result.booleanValue));
    default:
      return {
        ok: true,
        expression,
        resultType: "nodes",
        rows: collectNodeRows(result),
      };
  }
}

export function createNamespaceResolver(namespaces: XmlNamespaceInfo[]): XPathNSResolver {
  const prefixMap = new Map(namespaces.map((item) => [item.prefix, item.uri]));
  return {
    lookupNamespaceURI(prefix: string | null) {
      if (!prefix) return null;
      return prefixMap.get(prefix) ?? null;
    },
  };
}

function scalarResult(
  expression: string,
  resultType: XPathEvaluationResult["resultType"],
  value: string,
): XPathEvaluationResult {
  return {
    ok: true,
    expression,
    resultType,
    rows: [
      {
        id: "scalar-0",
        type: "value",
        name: resultType,
        valuePreview: value,
        path: expression,
      },
    ],
    scalarValue: value,
  };
}

function collectNodeRows(result: XPathResult): XPathResultRow[] {
  const rows: XPathResultRow[] = [];
  let node = result.iterateNext();
  let index = 0;
  while (node) {
    rows.push(nodeToRow(node, index));
    index += 1;
    node = result.iterateNext();
  }
  return rows;
}

function rewriteNamespacedSteps(expression: string, namespaces: XmlNamespaceInfo[], includeNamespace: boolean): string {
  const namespaceByPrefix = new Map(namespaces.map((namespace) => [namespace.prefix, namespace.uri]));
  return expression.replace(/(^|[/[(\s])([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)/g, (match, prefixChar, prefix, localName) => {
    const uri = namespaceByPrefix.get(prefix);
    if (!uri) return match;
    const namespacePredicate = includeNamespace ? ` and namespace-uri()='${uri}'` : "";
    return `${prefixChar}*[local-name()='${localName}'${namespacePredicate}]`;
  });
}

function nodeToRow(node: Node, index: number): XPathResultRow {
  if (node.nodeType === Node.ATTRIBUTE_NODE) {
    const attr = node as Attr;
    return {
      id: `xpath-${index}`,
      type: "attribute",
      name: attr.name,
      valuePreview: attr.value,
      path: getDomPath(attr.ownerElement) + `/@${attr.name}`,
    };
  }

  if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) {
    return {
      id: `xpath-${index}`,
      type: "text",
      name: node.nodeName,
      valuePreview: compact(node.textContent ?? ""),
      path: getDomPath(node.parentElement),
    };
  }

  return {
    id: `xpath-${index}`,
    type: "node",
    name: node.nodeName,
    valuePreview: compact(node.textContent ?? ""),
    path: getDomPath(node as Element),
    nodeXml: new XMLSerializer().serializeToString(node),
  };
}

function evaluateSimpleNamespacedNodeQuery(
  document: Document,
  expression: string,
  namespaces: XmlNamespaceInfo[],
): XPathResultRow[] {
  const match = expression.match(/^\/\/([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)$/);
  if (!match) return [];

  const [, prefix, localName] = match;
  const namespaceUri = namespaces.find((namespace) => namespace.prefix === prefix)?.uri;
  if (!namespaceUri) return [];

  return Array.from(document.getElementsByTagNameNS(namespaceUri, localName)).map(nodeToRow);
}

function getDomPath(element: Element | null): string {
  if (!element) return "/";
  const parts: string[] = [];
  let current: Element | null = element;

  while (current) {
    let index = 1;
    let previous = current.previousElementSibling;
    while (previous) {
      if (previous.nodeName === current.nodeName) index += 1;
      previous = previous.previousElementSibling;
    }
    parts.unshift(`${current.nodeName}[${index}]`);
    current = current.parentElement;
  }

  return `/${parts.join("/")}`;
}

function compact(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 160 ? `${normalized.slice(0, 159)}…` : normalized;
}
