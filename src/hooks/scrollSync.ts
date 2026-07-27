/**
 * Anchor-based mapping between source lines and preview scroll offsets.
 *
 * Percentage mapping - "the editor is 40% down, so scroll the preview to 40%" -
 * assumes a source line and its rendered output occupy the same fraction of
 * their respective heights. In Markdown they never do: a three-line fenced block
 * renders taller than the prose around it, a table collapses many lines into a
 * compact grid, and an image is one line that renders hundreds of pixels tall.
 * The two panes drift apart in the middle of any real document.
 *
 * These functions instead interpolate between known fixed points - the
 * `data-source-line` attributes the preview emits - so the panes agree exactly
 * at every anchor and degrade to a straight line only between them.
 */

/** A rendered element's source line paired with its offset in the scroller. */
export interface SyncAnchor {
  line: number;
  top: number;
}

/**
 * Reads the anchor table out of a rendered preview.
 *
 * Offsets are measured in the scroll container's own coordinate space rather
 * than with `offsetTop`, whose meaning depends on the nearest positioned
 * ancestor - `.md-code-block` and `.md-doc` are both positioned, so `offsetTop`
 * is relative to different origins depending on where an element sits.
 *
 * Anchors are kept strictly increasing in both line and offset. Inline elements
 * carry source lines too, and a wrapped paragraph can put its link on a later
 * line than the paragraph itself; keeping the first element seen for each line
 * and discarding anything that moves backwards leaves a table that is safe to
 * binary search.
 */
export function collectAnchors(container: HTMLElement): SyncAnchor[] {
  const elements = container.querySelectorAll<HTMLElement>("[data-source-line]");
  if (elements.length === 0) return [];

  // Scroll-space origin: where the container's content starts, independent of
  // how far it is currently scrolled.
  const origin = container.getBoundingClientRect().top - container.scrollTop;

  const anchors: SyncAnchor[] = [];
  elements.forEach((element) => {
    const line = Number(element.getAttribute("data-source-line"));
    if (!Number.isFinite(line) || line < 1) return;

    const top = element.getBoundingClientRect().top - origin;
    const previous = anchors[anchors.length - 1];
    if (previous && (line <= previous.line || top < previous.top)) return;

    anchors.push({ line, top });
  });

  // Whatever sits above the first block - the page's top padding and rounded
  // edge, or a frontmatter card - belongs to the start of the document rather
  // than to any source line. Without this, syncing to line 1 scrolls that
  // chrome out of view, so being "at the top" in the editor does not look like
  // being at the top in the preview.
  const first = anchors[0];
  if (first && first.top > 0) {
    if (first.line === 1) anchors[0] = { line: 1, top: 0 };
    else anchors.unshift({ line: 1, top: 0 });
  }

  return anchors;
}

/** Index of the last anchor at or before `value`, or -1 if none. */
function findFloor(
  anchors: SyncAnchor[],
  value: number,
  key: keyof SyncAnchor,
): number {
  let low = 0;
  let high = anchors.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (anchors[mid][key] <= value) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

/** Linear interpolation between two anchors, guarding a zero-width span. */
function interpolate(
  fromStart: number,
  fromEnd: number,
  toStart: number,
  toEnd: number,
  value: number,
): number {
  const span = fromEnd - fromStart;
  if (span <= 0) return toStart;
  const ratio = (value - fromStart) / span;
  return toStart + ratio * (toEnd - toStart);
}

/**
 * Scroll offset for a (possibly fractional) source line.
 * Returns null when there are no anchors to interpolate between.
 */
export function topForLine(anchors: SyncAnchor[], line: number): number | null {
  if (anchors.length === 0) return null;
  if (anchors.length === 1 || line <= anchors[0].line) return anchors[0].top;

  const last = anchors[anchors.length - 1];
  if (line >= last.line) return last.top;

  const index = findFloor(anchors, line, "line");
  const start = anchors[index];
  const end = anchors[index + 1];

  return interpolate(start.line, end.line, start.top, end.top, line);
}

/**
 * Source line for a scroll offset, fractional between anchors.
 * Returns null when there are no anchors to interpolate between.
 */
export function lineForTop(anchors: SyncAnchor[], top: number): number | null {
  if (anchors.length === 0) return null;
  if (anchors.length === 1 || top <= anchors[0].top) return anchors[0].line;

  const last = anchors[anchors.length - 1];
  if (top >= last.top) return last.line;

  const index = findFloor(anchors, top, "top");
  const start = anchors[index];
  const end = anchors[index + 1];

  return interpolate(start.top, end.top, start.line, end.line, top);
}
