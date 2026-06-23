import { prettyPrint, needsPrettyPrint } from "./prettyPrintXmlJson";
import { ArchiveEntry, PreviewResult } from "../types";

export const PREVIEW_TEXT_LIMIT = 512 * 1024;
export const HEX_PAGE_SIZE = 64 * 1024;

const TEXT_EXTS = new Set([
  "txt", "md", "log", "sh", "py", "go", "rs", "java", "kt", "ts", "tsx",
  "js", "jsx", "css", "html", "htm", "xml", "json", "yaml", "yml", "toml",
  "ini", "properties", "env", "gitignore", "sql", "csv", "conf", "cfg",
]);

export function buildPreviewFromBytes(
  path: string,
  bytes: Uint8Array,
  truncated: boolean,
  entry: ArchiveEntry | null,
  hexPage: number,
): PreviewResult {
  const name = path.split("/").pop() ?? path;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (entry?.isImagePreviewable) {
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    return {
      path,
      type: "image",
      content: `data:${entry.mimeType};base64,${btoa(binary)}`,
      truncated: false,
      hexPage: 0,
      originalSize: entry.sizeUncompressed,
    };
  }

  if (entry?.isTextPreviewable || TEXT_EXTS.has(ext)) {
    // fatal: false replaces truncated multi-byte chars with U+FFFD rather than throwing
    let text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const type = ext === "json" ? "json" : ext === "xml" ? "xml" : "text";
    if ((ext === "json" || ext === "xml") && needsPrettyPrint(text)) {
      text = prettyPrint(text, ext as "json" | "xml");
    }
    return {
      path,
      type,
      content: text,
      truncated,
      hexPage: 0,
      originalSize: entry?.sizeUncompressed ?? bytes.length,
    };
  }

  const hexLines: string[] = [];
  for (let row = 0; row < bytes.length; row += 16) {
    const chunk = bytes.slice(row, row + 16);
    const absOffset = hexPage * HEX_PAGE_SIZE + row;
    const offset = absOffset.toString(16).padStart(8, "0").toUpperCase();
    const hex = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ")
      .padEnd(47, " ");
    const ascii = Array.from(chunk)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
      .join("");
    hexLines.push(`${offset}  ${hex}  ${ascii}`);
  }

  return {
    path,
    type: "binary-hex",
    content: hexLines.join("\n"),
    truncated,
    hexPage,
    originalSize: entry?.sizeUncompressed ?? bytes.length,
  };
}
