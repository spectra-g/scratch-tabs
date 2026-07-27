/**
 * Small rehype passes for the Markdown preview.
 *
 * These run on the hast tree rather than being handled in the React components,
 * because both need to *rewrite* content - stripping a callout marker out of a
 * paragraph, or reading a heading's full text - which is awkward once the tree
 * has already become React elements.
 */

import type { Element, Node, Parent, Root, Text } from "hast";
import { createSlugger } from "./slug";

const HEADING_TAGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

/** GitHub's five alert kinds. */
export const CALLOUT_KINDS = [
  "note",
  "tip",
  "important",
  "warning",
  "caution",
] as const;

export type CalloutKind = (typeof CALLOUT_KINDS)[number];

const CALLOUT_MARKER = new RegExp(
  `^\\[!(${CALLOUT_KINDS.join("|")})\\][ \\t]*\\r?\\n?`,
  "i",
);

const isElement = (node: Node): node is Element => node.type === "element";
const isText = (node: Node): node is Text => node.type === "text";
const isParent = (node: Node): node is Parent =>
  Array.isArray((node as Parent).children);

/** Depth-first walk over every element in the tree. */
function visitElements(node: Node, visit: (element: Element) => void): void {
  if (isElement(node)) visit(node);
  if (isParent(node)) node.children.forEach((child) => visitElements(child, visit));
}

/** Concatenated text content of a subtree, used for heading slugs. */
export function textContent(node: Node): string {
  if (isText(node)) return node.value;
  if (isParent(node)) return node.children.map(textContent).join("");
  return "";
}

/**
 * Gives every heading a stable `id` so it can be linked and tracked by the
 * outline. Headings that already carry an id are left alone.
 */
export function rehypeHeadingIds() {
  return (tree: Root): void => {
    const slug = createSlugger();

    visitElements(tree, (element) => {
      if (!HEADING_TAGS.has(element.tagName)) return;

      element.properties ??= {};
      if (typeof element.properties.id === "string" && element.properties.id) {
        return;
      }
      element.properties.id = slug(textContent(element));
    });
  };
}

/**
 * Turns GitHub alert blockquotes into callouts.
 *
 * ```markdown
 * > [!NOTE]
 * > Useful information.
 * ```
 *
 * The marker is removed from the rendered text and recorded on the blockquote
 * as `data-callout`, which the preview component reads to pick an icon and a
 * title. A blockquote without a marker stays an ordinary blockquote.
 */
export function rehypeCallouts() {
  return (tree: Root): void => {
    visitElements(tree, (element) => {
      if (element.tagName !== "blockquote") return;

      const paragraph = element.children.find(
        (child): child is Element =>
          isElement(child) && child.tagName === "p",
      );
      const firstText = paragraph?.children[0];
      if (!firstText || !isText(firstText)) return;

      const match = firstText.value.match(CALLOUT_MARKER);
      if (!match) return;

      firstText.value = firstText.value.slice(match[0].length);
      // An alert with no body leaves an empty paragraph behind; drop it so the
      // callout does not render a blank line under its title.
      if (!firstText.value && paragraph.children.length === 1) {
        element.children = element.children.filter((child) => child !== paragraph);
      }

      const kind = match[1].toLowerCase() as CalloutKind;
      element.properties ??= {};
      element.properties.dataCallout = kind;
    });
  };
}
