/**
 * Helpers for reading the hast nodes react-markdown passes to each component.
 */

import type { Element } from "hast";

/**
 * Source line for a rendered element, taken straight from the syntax tree.
 *
 * `offset` adds back lines that were removed before parsing - currently a
 * frontmatter block - so the number still refers to a line in the editor.
 * Undefined lines are dropped by React, so the attribute simply won't render.
 */
export const srcLine = (node?: Element, offset = 0): number | undefined => {
  const line = node?.position?.start?.line;
  return line === undefined ? undefined : line + offset;
};

const findCodeChild = (node?: Element): Element | undefined =>
  node?.children?.find(
    (child): child is Element => child.type === "element" && child.tagName === "code",
  );

/** Language of a fenced block, read from the `language-*` class on its <code>. */
export function getCodeLanguage(node?: Element): string | null {
  const classNames = findCodeChild(node)?.properties?.className;
  const list = Array.isArray(classNames) ? classNames : [classNames];

  for (const entry of list) {
    if (typeof entry === "string" && entry.startsWith("language-")) {
      const language = entry.slice("language-".length).trim();
      if (language) return language;
    }
  }

  return null;
}

/** Raw text of a fenced block, for the copy button. */
export function getCodeText(node?: Element): string {
  const codeChild = findCodeChild(node);
  if (!codeChild) return "";

  return codeChild.children
    .map((child) => ("value" in child ? child.value : ""))
    .join("");
}
