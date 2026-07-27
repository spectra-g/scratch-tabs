/**
 * YAML frontmatter, lifted out of the document and shown as a metadata card.
 *
 * react-markdown renders a leading `---` block as a thematic break followed by
 * a heading, which is both wrong and ugly. Splitting it off first also means
 * the body's own structure is what gets rendered.
 */

import { load } from "js-yaml";

export interface FrontmatterEntry {
  key: string;
  value: string;
}

export interface FrontmatterSplit {
  /** Parsed key/value pairs, empty when there is no usable frontmatter. */
  entries: FrontmatterEntry[];
  /** The document with the frontmatter block removed. */
  body: string;
  /**
   * Lines the frontmatter occupied. Source-line attributes in the rendered body
   * are relative to `body`, so this has to be added back to keep editor sync
   * pointing at the right line.
   */
  lineOffset: number;
}

const DELIMITER = /^---\s*$/;

/** Renders a parsed YAML value as a single line of display text. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Splits a leading `---` YAML block off the document.
 *
 * Anything that is not a well-formed block of key/value pairs is left in the
 * body untouched - a document that opens with a thematic break is far more
 * common than one with broken frontmatter, and silently eating its first
 * section would be much worse than not showing a card.
 */
export function splitFrontmatter(content: string): FrontmatterSplit {
  const none: FrontmatterSplit = { entries: [], body: content, lineOffset: 0 };

  const lines = content.split("\n");
  if (!DELIMITER.test(lines[0] ?? "")) return none;

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && DELIMITER.test(line),
  );
  if (closingIndex === -1) return none;

  const block = lines.slice(1, closingIndex).join("\n");
  if (!block.trim()) return none;

  let parsed: unknown;
  try {
    parsed = load(block);
  } catch {
    return none;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return none;

  const entries = Object.entries(parsed as Record<string, unknown>)
    .map(([key, value]) => ({ key, value: formatValue(value) }))
    .filter((entry) => entry.value !== "");

  if (entries.length === 0) return none;

  return {
    entries,
    body: lines.slice(closingIndex + 1).join("\n"),
    lineOffset: closingIndex + 1,
  };
}
