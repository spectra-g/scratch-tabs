import {
  getLineFromElement,
  getElementSelectorFromLine,
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
});
