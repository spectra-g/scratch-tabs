import { XmlNodeInfo, XmlSecurityWarning } from "../views/types";

const REMOTE_URL_PATTERN = /\bhttps?:\/\/[^\s"']+/gi;
const LARGE_BASE64_PATTERN = /^[A-Za-z0-9+/=\s]{80,}$/;
const TOKEN_PATTERN = /\b(?:eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.?[a-zA-Z0-9_-]*|AKIA[0-9A-Z]{16})\b/;

export function detectXmlSecurityWarnings(content: string, root?: XmlNodeInfo): XmlSecurityWarning[] {
  const warnings: XmlSecurityWarning[] = [];

  if (/<!ENTITY\s+[^>]*(?:SYSTEM|PUBLIC)\s+["'][^"']+["']/i.test(content)) {
    warnings.push({
      id: "external-entity",
      severity: "danger",
      title: "External entity declaration",
      message: "This XML declares an external entity. Scratch Tabs parses locally and does not fetch it automatically.",
    });
  }

  const remoteSchemas = content.match(REMOTE_URL_PATTERN) ?? [];
  const schemaUrls = remoteSchemas.filter((url) =>
    /(?:\.xsd|\.dtd|schema|stylesheet|\.xsl|\.xslt)/i.test(url),
  );
  if (schemaUrls.length > 0) {
    warnings.push({
      id: "remote-schema",
      severity: "warning",
      title: "Remote schema or stylesheet reference",
      message: `Found ${schemaUrls.length} remote reference${schemaUrls.length === 1 ? "" : "s"}. They are not fetched automatically.`,
    });
  }

  if (TOKEN_PATTERN.test(content)) {
    warnings.push({
      id: "token-looking-value",
      severity: "warning",
      title: "Token-looking value",
      message: "The document contains text that resembles a JWT or access key. Keep it local and avoid sharing derived output.",
    });
  }

  if (root) {
    const base64Node = findFirstLargeBase64Node(root);
    if (base64Node) {
      warnings.push({
        id: "large-base64-text",
        severity: "warning",
        title: "Large base64-looking text node",
        message: "A text node looks like encoded binary data. Decode or inspect it locally before sharing.",
        path: base64Node.path,
      });
    }
  }

  return warnings;
}

function findFirstLargeBase64Node(node: XmlNodeInfo): XmlNodeInfo | null {
  if ((node.kind === "text" || node.kind === "cdata") && LARGE_BASE64_PATTERN.test(node.valuePreview.trim())) {
    return node;
  }

  for (const child of node.children) {
    const match = findFirstLargeBase64Node(child);
    if (match) return match;
  }

  return null;
}
