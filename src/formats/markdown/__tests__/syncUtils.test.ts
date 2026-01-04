import {
  getLineFromElement,
  getElementSelectorFromLine,
  calculateLineNumbers,
} from "../syncUtils";

describe("Markdown Sync Utilities", () => {
  describe("getLineFromElement", () => {
    it("should return line number from element with data-source-line", () => {
      const element = document.createElement("div");
      element.setAttribute("data-source-line", "5");

      const lineNum = getLineFromElement(element, "");

      expect(lineNum).toBe(5);
    });

    it("should walk up DOM tree to find line number", () => {
      const parent = document.createElement("div");
      parent.setAttribute("data-source-line", "10");

      const child = document.createElement("span");
      parent.appendChild(child);

      const lineNum = getLineFromElement(child, "");

      expect(lineNum).toBe(10);
    });

    it("should return null if no data-source-line found", () => {
      const element = document.createElement("div");

      const lineNum = getLineFromElement(element, "");

      expect(lineNum).toBeNull();
    });

    it("should return null if data-source-line is not a valid number", () => {
      const element = document.createElement("div");
      element.setAttribute("data-source-line", "invalid");

      const lineNum = getLineFromElement(element, "");

      expect(lineNum).toBeNull();
    });
  });

  describe("getElementSelectorFromLine", () => {
    it("should return attribute selector for line number", () => {
      const selector = getElementSelectorFromLine(5, "");

      expect(selector).toBe('[data-source-line="5"]');
    });

    it("should work with different line numbers", () => {
      expect(getElementSelectorFromLine(1, "")).toBe('[data-source-line="1"]');
      expect(getElementSelectorFromLine(100, "")).toBe('[data-source-line="100"]');
    });
  });

  describe("calculateLineNumbers", () => {
    it("should map single header to line 1", () => {
      const content = "# Header";
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1);
      expect(lineNumbers.size).toBe(1);
    });

    it("should map multiple headers to correct lines", () => {
      const content = `# Title
## Subtitle
### Section`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1); // # Title
      expect(lineNumbers.get(1)).toBe(2); // ## Subtitle
      expect(lineNumbers.get(2)).toBe(3); // ### Section
      expect(lineNumbers.size).toBe(3);
    });

    it("should skip empty lines", () => {
      const content = `# Title

## Subtitle`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1); // # Title
      expect(lineNumbers.get(1)).toBe(3); // ## Subtitle (line 2 is empty)
      expect(lineNumbers.size).toBe(2);
    });

    it("should handle code blocks", () => {
      const content = `# Header
\`\`\`js
code here
more code
\`\`\``;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1); // # Header
      expect(lineNumbers.get(1)).toBe(2); // ``` (code block start)
      expect(lineNumbers.size).toBe(2);
    });

    it("should handle list items", () => {
      const content = `- Item 1
- Item 2
- Item 3`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1); // - Item 1
      expect(lineNumbers.get(1)).toBe(2); // - Item 2
      expect(lineNumbers.get(2)).toBe(3); // - Item 3
      expect(lineNumbers.size).toBe(3);
    });

    it("should handle ordered lists", () => {
      const content = `1. First
2. Second
3. Third`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1);
      expect(lineNumbers.get(1)).toBe(2);
      expect(lineNumbers.get(2)).toBe(3);
      expect(lineNumbers.size).toBe(3);
    });

    it("should handle blockquotes", () => {
      const content = `> Quote 1
> Quote 2`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1);
      expect(lineNumbers.get(1)).toBe(2);
      expect(lineNumbers.size).toBe(2);
    });

    it("should handle horizontal rules", () => {
      const content = `---
___
***`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1); // ---
      expect(lineNumbers.get(1)).toBe(2); // ___
      expect(lineNumbers.get(2)).toBe(3); // ***
      expect(lineNumbers.size).toBe(3);
    });

    it("should handle tables", () => {
      const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1); // Header row
      expect(lineNumbers.get(1)).toBe(2); // Separator
      expect(lineNumbers.get(2)).toBe(3); // Data row
      expect(lineNumbers.size).toBe(3);
    });

    it("should handle paragraphs", () => {
      const content = `This is a paragraph.
Another paragraph.`;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1);
      expect(lineNumbers.get(1)).toBe(2);
      expect(lineNumbers.size).toBe(2);
    });

    it("should handle mixed content", () => {
      const content = `# Title
A paragraph

## Subtitle
- Item 1
- Item 2

\`\`\`js
code
\`\`\``;
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.get(0)).toBe(1);  // # Title
      expect(lineNumbers.get(1)).toBe(2);  // A paragraph
      expect(lineNumbers.get(2)).toBe(4);  // ## Subtitle
      expect(lineNumbers.get(3)).toBe(5);  // - Item 1
      expect(lineNumbers.get(4)).toBe(6);  // - Item 2
      expect(lineNumbers.get(5)).toBe(8);  // ``` (code block)
      expect(lineNumbers.size).toBe(6);
    });

    it("should handle empty content", () => {
      const content = "";
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.size).toBe(0);
    });

    it("should handle content with only empty lines", () => {
      const content = "\n\n\n";
      const lineNumbers = calculateLineNumbers(content);

      expect(lineNumbers.size).toBe(0);
    });
  });
});
