/**
 * Markdown synchronization utilities
 * Maps between markdown source lines and rendered preview elements
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

/**
 * Calculate line numbers for markdown elements
 * Creates a mapping from element index to source line number
 * @param content - The markdown source content
 * @returns Map of element index to line number
 */
export function calculateLineNumbers(content: string): Map<number, number> {
  const lines = content.split('\n');
  const elementLineMap = new Map<number, number>(); // element index -> line number

  let elementIndex = 0;
  let currentLine = 1;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code blocks
    if (trimmed.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        elementLineMap.set(elementIndex++, currentLine);
      } else {
        inCodeBlock = false;
      }
      currentLine++;
      continue;
    }

    if (inCodeBlock) {
      currentLine++;
      continue;
    }

    // Skip empty lines
    if (trimmed === '') {
      currentLine++;
      continue;
    }

    // Headers
    if (trimmed.startsWith('#')) {
      elementLineMap.set(elementIndex++, currentLine);
      currentLine++;
      continue;
    }

    // Horizontal rules
    if (trimmed.match(/^(---+|___+|\*\*\*+)$/)) {
      elementLineMap.set(elementIndex++, currentLine);
      currentLine++;
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('>')) {
      elementLineMap.set(elementIndex++, currentLine);
      currentLine++;
      continue;
    }

    // Lists - track list items
    if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
      elementLineMap.set(elementIndex++, currentLine);
      currentLine++;
      continue;
    }

    // Tables
    if (trimmed.includes('|')) {
      elementLineMap.set(elementIndex++, currentLine);
      currentLine++;
      continue;
    }

    // Regular paragraphs
    elementLineMap.set(elementIndex++, currentLine);
    currentLine++;
  }

  return elementLineMap;
}
