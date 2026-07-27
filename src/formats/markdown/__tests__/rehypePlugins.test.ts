import type { Element, Root } from "hast";
import { rehypeCallouts, rehypeHeadingIds, textContent } from "../rehypePlugins";

const text = (value: string) => ({ type: "text", value }) as const;

const element = (
  tagName: string,
  children: unknown[] = [],
  properties: Record<string, unknown> = {},
) =>
  ({ type: "element", tagName, properties, children }) as unknown as Element;

const tree = (...children: unknown[]) =>
  ({ type: "root", children }) as unknown as Root;

/** A `> [!KIND]` blockquote as remark-rehype produces it: one paragraph whose
 *  first text node holds the marker and the soft-wrapped body. */
const alertQuote = (body: string) =>
  element("blockquote", [element("p", [text(body)])]);

describe("textContent", () => {
  it("flattens nested inline markup", () => {
    const heading = element("h2", [
      text("Getting "),
      element("code", [text("started")]),
    ]);
    expect(textContent(heading)).toBe("Getting started");
  });
});

describe("rehypeHeadingIds", () => {
  const run = (root: Root) => {
    rehypeHeadingIds()(root);
    return root;
  };

  it("slugs every heading level", () => {
    const root = run(
      tree(
        element("h1", [text("Getting Started")]),
        element("h3", [text("Deep Dive")]),
      ),
    );

    const [h1, h3] = root.children as Element[];
    expect(h1.properties?.id).toBe("getting-started");
    expect(h3.properties?.id).toBe("deep-dive");
  });

  it("uses the heading's full text, including inline markup", () => {
    const root = run(
      tree(element("h2", [text("Use "), element("code", [text("npm run dev")])])),
    );
    expect((root.children[0] as Element).properties?.id).toBe("use-npm-run-dev");
  });

  it("suffixes duplicates in document order", () => {
    const root = run(
      tree(element("h2", [text("Usage")]), element("h2", [text("Usage")])),
    );

    const ids = (root.children as Element[]).map((h) => h.properties?.id);
    expect(ids).toEqual(["usage", "usage-1"]);
  });

  it("leaves an existing id alone", () => {
    const root = run(tree(element("h2", [text("Usage")], { id: "custom" })));
    expect((root.children[0] as Element).properties?.id).toBe("custom");
  });

  it("finds headings nested inside other elements", () => {
    const root = run(tree(element("section", [element("h2", [text("Nested")])])));
    const section = root.children[0] as Element;
    expect((section.children[0] as Element).properties?.id).toBe("nested");
  });

  it("ignores non-heading elements", () => {
    const root = run(tree(element("p", [text("Not a heading")])));
    expect((root.children[0] as Element).properties?.id).toBeUndefined();
  });
});

describe("rehypeCallouts", () => {
  const run = (root: Root) => {
    rehypeCallouts()(root);
    return root;
  };

  it.each(["note", "tip", "important", "warning", "caution"])(
    "tags a [!%s] blockquote",
    (kind) => {
      const root = run(tree(alertQuote(`[!${kind.toUpperCase()}]\nBody text.`)));
      expect((root.children[0] as Element).properties?.dataCallout).toBe(kind);
    },
  );

  it("accepts a lowercase marker", () => {
    const root = run(tree(alertQuote("[!note]\nBody.")));
    expect((root.children[0] as Element).properties?.dataCallout).toBe("note");
  });

  it("strips the marker and its newline from the text", () => {
    const root = run(tree(alertQuote("[!NOTE]\nRemember this.")));
    expect(textContent(root.children[0] as Element)).toBe("Remember this.");
  });

  it("drops a paragraph left empty by the marker", () => {
    const root = run(tree(alertQuote("[!WARNING]")));
    const quote = root.children[0] as Element;

    expect(quote.properties?.dataCallout).toBe("warning");
    expect(quote.children).toHaveLength(0);
  });

  it("keeps later paragraphs of a multi-paragraph callout", () => {
    const quote = element("blockquote", [
      element("p", [text("[!TIP]\nFirst.")]),
      element("p", [text("Second.")]),
    ]);
    const root = run(tree(quote));

    expect((root.children[0] as Element).children).toHaveLength(2);
    expect(textContent(root.children[0] as Element)).toBe("First.Second.");
  });

  it("leaves an ordinary blockquote untouched", () => {
    const root = run(tree(alertQuote("Just a quotation.")));
    const quote = root.children[0] as Element;

    expect(quote.properties?.dataCallout).toBeUndefined();
    expect(textContent(quote)).toBe("Just a quotation.");
  });

  it("does not match an unknown marker", () => {
    const root = run(tree(alertQuote("[!SOMETHING]\nBody.")));
    expect((root.children[0] as Element).properties?.dataCallout).toBeUndefined();
  });

  it("only matches a marker at the very start", () => {
    const root = run(tree(alertQuote("See [!NOTE] below.")));
    expect((root.children[0] as Element).properties?.dataCallout).toBeUndefined();
  });

  it("ignores a marker in a blockquote that opens with something else", () => {
    const quote = element("blockquote", [
      element("p", [element("strong", [text("Heads up")])]),
    ]);
    expect(
      (run(tree(quote)).children[0] as Element).properties?.dataCallout,
    ).toBeUndefined();
  });
});
