export function needsPrettyPrint(content: string): boolean {
  return content.length > 0 && !content.includes("\n");
}

export function prettyPrint(content: string, type: "json" | "xml"): string {
  if (type === "json") {
    if (content.includes("\n")) return content;
    try {
      return JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      return content;
    }
  }

  if (type === "xml") {
    if (content.includes("\n")) return content;
    return formatXml(content);
  }

  return content;
}

function formatXml(xml: string): string {
  const normalized = xml.replace(/>\s*</g, ">\n<");
  const tokens = normalized.split("\n");
  let indent = 0;
  const lines: string[] = [];

  for (const token of tokens) {
    const t = token.trim();
    if (!t) continue;

    if (t.startsWith("</")) {
      indent = Math.max(0, indent - 1);
      lines.push("  ".repeat(indent) + t);
    } else if (t.endsWith("/>") || t.startsWith("<?") || t.startsWith("<!")) {
      lines.push("  ".repeat(indent) + t);
    } else if (t.startsWith("<") && t.includes("</")) {
      lines.push("  ".repeat(indent) + t);
    } else if (t.startsWith("<")) {
      lines.push("  ".repeat(indent) + t);
      indent++;
    } else {
      lines.push("  ".repeat(indent) + t);
    }
  }

  return lines.join("\n");
}
