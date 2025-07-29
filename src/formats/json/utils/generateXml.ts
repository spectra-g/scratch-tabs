function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function isValidXmlName(str: string): boolean {
  return /^[a-zA-Z_][\w.-]*$/.test(str);
}

function sanitizeXmlName(str: string): string {
  if (!str) return "item";
  // Replace invalid characters with underscores
  let sanitized = str.replace(/[^\w.-]/g, "_");
  // Ensure it starts with a letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    sanitized = "_" + sanitized;
  }
  return sanitized;
}

export function convertToXml(
  json: any,
  rootName: string = "root",
  indent: number = 0,
): string {
  const spaces = " ".repeat(indent);

  function processValue(value: any, name: string): string {
    if (value === null || value === undefined) {
      return `${spaces}<${name} xsi:nil="true"/>`;
    }

    if (typeof value !== "object") {
      return `${spaces}<${name}>${escapeXml(String(value))}</${name}>`;
    }

    if (Array.isArray(value)) {
      return value.map((item) => processValue(item, "item")).join("\n");
    }

    const childElements = Object.entries(value)
      .map(([key, val]) => {
        const safeName = sanitizeXmlName(key);
        return processValue(val, safeName);
      })
      .join("\n");

    return `${spaces}<${name}>\n${childElements}\n${spaces}</${name}>`;
  }

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
  const safeRootName = sanitizeXmlName(rootName);
  const rootAttributes =
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';

  return `${xmlHeader}\n<${safeRootName} ${rootAttributes}>\n${processValue(json, safeRootName)}\n</${safeRootName}>`;
}
