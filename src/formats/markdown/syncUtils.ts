/**
 * Markdown synchronization utilities
 * Maps between markdown source lines and rendered preview elements
 *
 * The `data-source-line` attributes these read are emitted by MarkdownPreview
 * straight from the syntax tree (`node.position.start.line`), so they are exact
 * for every block-level element.
 */

/**
 * Get the source line number from a preview element
 * Uses data-source-line attribute set during rendering
 */
export function getLineFromElement(
  element: HTMLElement,
  _content: string
): number | null {
  // Walk up the DOM tree to find the nearest element with line info
  let current: HTMLElement | null = element;

  while (current) {
    const lineAttr = current.getAttribute('data-source-line');
    if (lineAttr !== null) {
      const lineNum = parseInt(lineAttr, 10);
      if (!isNaN(lineNum)) {
        return lineNum;
      }
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Get a CSS selector for the element corresponding to a source line
 */
export function getElementSelectorFromLine(
  line: number,
  _content: string
): string | null {
  // Return attribute selector for the line
  return `[data-source-line="${line}"]`;
}
