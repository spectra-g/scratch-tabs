/**
 * Fenced-code segmentation, shared by everything that has to treat a fence as
 * quoted content rather than as part of the document.
 *
 * Three callers depend on this being one implementation: the formatter (which
 * must not rewrite code as markdown), format detection (which must not let a
 * JavaScript sample decide the document is JavaScript), and the outline (which
 * must not read a shell comment as a heading).
 */

/** Opening or closing fence of a code block (``` or ~~~, up to 3 spaces indent). */
export const FENCE_REGEX = /^\s{0,3}(`{3,}|~{3,})/;
/** A closing fence carries nothing after the marker. */
export const CLOSING_FENCE_REGEX = /^\s{0,3}(`{3,}|~{3,})\s*$/;

export interface MarkdownSegment {
  /** Fenced code - contents must survive formatting byte for byte. */
  code: boolean;
  lines: string[];
  /** 1-based line number of this segment's first line in the source. */
  startLine: number;
}

/**
 * Splits markdown into alternating prose and fenced-code segments.
 *
 * A fence only closes on a fence of the same character, so a `~~~` inside a
 * ``` block stays code. An unterminated fence runs to the end of the document,
 * which is also how CommonMark reads it.
 */
export function splitByFences(content: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  const sourceLines = content.split("\n");
  let current: MarkdownSegment = { code: false, lines: [], startLine: 1 };
  let openMarker: string | null = null;

  sourceLines.forEach((line, index) => {
    if (openMarker === null) {
      const match = line.match(FENCE_REGEX);
      if (match) {
        if (current.lines.length) segments.push(current);
        current = { code: true, lines: [line], startLine: index + 1 };
        openMarker = match[1][0];
        return;
      }
      current.lines.push(line);
      return;
    }

    current.lines.push(line);
    const closing = line.match(CLOSING_FENCE_REGEX);
    if (closing && closing[1][0] === openMarker && current.lines.length > 1) {
      segments.push(current);
      current = { code: false, lines: [], startLine: index + 2 };
      openMarker = null;
    }
  });

  if (current.lines.length) segments.push(current);
  return segments;
}

/**
 * Blanks the body of every fenced code block, keeping the fence markers.
 *
 * Registered with the format registry as a content mask, so that quoted code
 * stops voting in format detection. Left in place it votes loudly: a Markdown
 * page with a JavaScript sample scored javascript 1.0 alongside markdown 1.0
 * and lost the tie on priority, after which the document was handed to the
 * JavaScript formatter and re-indented as source.
 *
 * The markers themselves are kept because a fence *is* a Markdown signal; only
 * what is inside them is silenced. Content with no fences is returned by
 * identity, so no other format's detection is affected.
 */
export function maskFencedCode(content: string): string {
  if (!content.includes("```") && !content.includes("~~~")) return content;

  const out: string[] = [];

  for (const segment of splitByFences(content)) {
    if (!segment.code) {
      out.push(...segment.lines);
      continue;
    }

    // Opening marker, one blank stand-in (the markdown detector's fence
    // pattern requires a body), then the closing marker if the block has one.
    const last = segment.lines[segment.lines.length - 1];
    const closed = segment.lines.length > 1 && CLOSING_FENCE_REGEX.test(last);
    out.push(segment.lines[0], "");
    if (closed) out.push(last);
  }

  return out.join("\n");
}
