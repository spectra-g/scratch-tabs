import { collectAnchors, lineForTop, topForLine, type SyncAnchor } from "../scrollSync";

/**
 * A scroll container whose children report fixed geometry.
 * jsdom has no layout, so `getBoundingClientRect` is stubbed per element.
 */
function container(
  children: Array<{ line?: number; top: number }>,
  { scrollTop = 0, containerTop = 0 } = {},
): HTMLElement {
  const root = document.createElement("div");
  Object.defineProperty(root, "scrollTop", { value: scrollTop, writable: true });
  root.getBoundingClientRect = () =>
    ({ top: containerTop }) as DOMRect;

  children.forEach(({ line, top }) => {
    const child = document.createElement("p");
    if (line !== undefined) child.setAttribute("data-source-line", String(line));
    // Offsets in the fixture are given in scroll space; convert to viewport space
    child.getBoundingClientRect = () =>
      ({ top: containerTop - scrollTop + top }) as DOMRect;
    root.appendChild(child);
  });

  return root;
}

const anchors = (...pairs: Array<[number, number]>): SyncAnchor[] =>
  pairs.map(([line, top]) => ({ line, top }));

describe("collectAnchors", () => {
  it("reads line and offset for each annotated element", () => {
    const root = container([
      { line: 1, top: 0 },
      { line: 5, top: 100 },
      { line: 9, top: 260 },
    ]);

    expect(collectAnchors(root)).toEqual(anchors([1, 0], [5, 100], [9, 260]));
  });

  it("measures in scroll space, not viewport space", () => {
    // Same content, but the container is scrolled and offset on screen
    const root = container(
      [
        { line: 1, top: 0 },
        { line: 5, top: 100 },
      ],
      { scrollTop: 400, containerTop: 60 },
    );

    expect(collectAnchors(root)).toEqual(anchors([1, 0], [5, 100]));
  });

  it("ignores elements with no source line", () => {
    const root = container([
      { line: 1, top: 0 },
      { top: 50 },
      { line: 5, top: 100 },
    ]);

    expect(collectAnchors(root)).toEqual(anchors([1, 0], [5, 100]));
  });

  it("drops anchors that move backwards in line", () => {
    // An inline element inside an earlier block can report a lower line
    const root = container([
      { line: 5, top: 0 },
      { line: 3, top: 20 },
      { line: 8, top: 90 },
    ]);

    expect(collectAnchors(root)).toEqual(anchors([5, 0], [8, 90]));
  });

  it("drops anchors that move backwards in offset", () => {
    const root = container([
      { line: 1, top: 0 },
      { line: 4, top: 200 },
      { line: 6, top: 150 },
      { line: 9, top: 300 },
    ]);

    expect(collectAnchors(root)).toEqual(anchors([1, 0], [4, 200], [9, 300]));
  });

  it("drops a duplicate line rather than emitting a flat segment", () => {
    const root = container([
      { line: 3, top: 0 },
      { line: 3, top: 40 },
      { line: 7, top: 90 },
    ]);

    expect(collectAnchors(root)).toEqual(anchors([3, 0], [7, 90]));
  });

  describe("top of document", () => {
    it("pins line 1 to offset 0 when the first block sits below the page edge", () => {
      // The page's top padding and rounded edge push the h1 down. Mapping line 1
      // to that offset scrolls the top of the page out of view.
      const root = container([
        { line: 1, top: 64 },
        { line: 3, top: 140 },
      ]);

      expect(collectAnchors(root)).toEqual(anchors([1, 0], [3, 140]));
      expect(topForLine(collectAnchors(root), 1)).toBe(0);
    });

    it("adds a document-start anchor when the first block is not line 1", () => {
      // Frontmatter renders as a card above the first heading, so lines 1-9 do
      // have something to scroll through.
      const root = container([
        { line: 10, top: 210 },
        { line: 12, top: 300 },
      ]);

      expect(collectAnchors(root)).toEqual(anchors([1, 0], [10, 210], [12, 300]));
    });

    it("still reaches the first block's own offset", () => {
      const table = collectAnchors(
        container([
          { line: 10, top: 210 },
          { line: 12, top: 300 },
        ]),
      );

      expect(topForLine(table, 10)).toBe(210);
      expect(topForLine(table, 1)).toBe(0);
      // Halfway through the frontmatter scrolls halfway down the card
      expect(topForLine(table, 5.5)).toBeCloseTo(105);
    });

    it("leaves a table that already starts at offset 0 alone", () => {
      const root = container([
        { line: 4, top: 0 },
        { line: 9, top: 90 },
      ]);

      expect(collectAnchors(root)).toEqual(anchors([4, 0], [9, 90]));
    });

    it("maps offset 0 back to line 1", () => {
      const table = collectAnchors(
        container([
          { line: 1, top: 64 },
          { line: 3, top: 140 },
        ]),
      );

      expect(lineForTop(table, 0)).toBe(1);
    });
  });

  it("returns nothing for a preview with no annotations", () => {
    expect(collectAnchors(container([{ top: 0 }, { top: 40 }]))).toEqual([]);
  });

  it("returns nothing for an empty container", () => {
    expect(collectAnchors(container([]))).toEqual([]);
  });

  it("ignores a malformed line attribute", () => {
    const root = document.createElement("div");
    Object.defineProperty(root, "scrollTop", { value: 0 });
    root.getBoundingClientRect = () => ({ top: 0 }) as DOMRect;

    const bad = document.createElement("p");
    bad.setAttribute("data-source-line", "not-a-number");
    bad.getBoundingClientRect = () => ({ top: 10 }) as DOMRect;
    root.appendChild(bad);

    expect(collectAnchors(root)).toEqual([]);
  });
});

describe("topForLine", () => {
  const table = anchors([1, 0], [10, 100], [20, 500]);

  it("returns an exact anchor's offset", () => {
    expect(topForLine(table, 10)).toBe(100);
  });

  it("interpolates between anchors", () => {
    // Halfway from line 1 to line 10 is halfway from 0px to 100px
    expect(topForLine(table, 5.5)).toBeCloseTo(50);
  });

  it("interpolates across a segment with a different density", () => {
    // A fenced block: 10 source lines spanning 400px
    expect(topForLine(table, 15)).toBeCloseTo(300);
  });

  it("clamps above the first anchor", () => {
    expect(topForLine(table, 0)).toBe(0);
  });

  it("clamps below the last anchor", () => {
    expect(topForLine(table, 999)).toBe(500);
  });

  it("returns the only anchor's offset when there is one", () => {
    expect(topForLine(anchors([4, 80]), 900)).toBe(80);
  });

  it("returns null with no anchors", () => {
    expect(topForLine([], 5)).toBeNull();
  });
});

describe("lineForTop", () => {
  const table = anchors([1, 0], [10, 100], [20, 500]);

  it("returns an exact anchor's line", () => {
    expect(lineForTop(table, 100)).toBe(10);
  });

  it("interpolates between anchors", () => {
    expect(lineForTop(table, 50)).toBeCloseTo(5.5);
  });

  it("interpolates across a segment with a different density", () => {
    expect(lineForTop(table, 300)).toBeCloseTo(15);
  });

  it("clamps above the first anchor", () => {
    expect(lineForTop(table, -20)).toBe(1);
  });

  it("clamps below the last anchor", () => {
    expect(lineForTop(table, 9999)).toBe(20);
  });

  it("returns null with no anchors", () => {
    expect(lineForTop([], 100)).toBeNull();
  });
});

describe("round tripping", () => {
  // A document where rendered density varies sharply: prose, then a fence that
  // renders tall, then a table that collapses many lines into little height.
  const table = anchors([1, 0], [12, 220], [18, 900], [40, 1000], [55, 1400]);

  it.each([1, 6.5, 12, 15, 18, 30, 40, 48, 55])(
    "maps line %p to an offset and back",
    (line) => {
      const top = topForLine(table, line);
      expect(top).not.toBeNull();
      expect(lineForTop(table, top as number)).toBeCloseTo(line);
    },
  );

  it("is monotonic across the document", () => {
    const offsets = [1, 5, 12, 20, 35, 55].map((line) => topForLine(table, line) as number);
    const sorted = [...offsets].sort((a, b) => a - b);
    expect(offsets).toEqual(sorted);
  });

  it("keeps a tall fenced block from dragging the panes apart", () => {
    // Lines 12-18 render 680px tall; proportional mapping would put line 15
    // near 27% of the document, anchors put it at the block's midpoint.
    const proportional = ((15 - 1) / (55 - 1)) * 1400;
    expect(topForLine(table, 15)).toBeCloseTo(560);
    expect(Math.abs(proportional - 560)).toBeGreaterThan(190);
  });
});
