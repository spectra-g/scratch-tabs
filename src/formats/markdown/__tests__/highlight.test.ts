import {
  getLoadedHighlighter,
  highlightCode,
  isLanguageSupported,
  loadHighlighter,
} from "../highlight";

describe("highlight", () => {
  describe("before the grammar chunk loads", () => {
    // Module state, so these have to run before loadHighlighter is called
    it("reports nothing loaded", () => {
      expect(getLoadedHighlighter()).toBeNull();
    });

    it("falls back to plain text rather than throwing", () => {
      expect(highlightCode("const a = 1;", "javascript")).toBeNull();
      expect(isLanguageSupported("javascript")).toBe(false);
    });
  });

  describe("once loaded", () => {
    beforeAll(async () => {
      await loadHighlighter();
    });

    it("caches the instance across calls", async () => {
      expect(getLoadedHighlighter()).not.toBeNull();
      expect(await loadHighlighter()).toBe(getLoadedHighlighter());
    });

    it("highlights a registered language", () => {
      const result = highlightCode("const a = 1;", "javascript");

      expect(result?.type).toBe("root");
      expect(result?.children.length).toBeGreaterThan(0);
    });

    it("matches a language case-insensitively", () => {
      expect(highlightCode("SELECT 1", "SQL")).not.toBeNull();
      expect(isLanguageSupported("SQL")).toBe(true);
    });

    it("returns null for an unregistered language rather than guessing", () => {
      // Auto-detection on a short snippet is unreliable, and a wrong guess
      // colours the code with nothing to tell the reader it was a guess.
      expect(highlightCode("some text", "notalanguage")).toBeNull();
      expect(isLanguageSupported("notalanguage")).toBe(false);
    });

    it("returns null for a fence with no language", () => {
      expect(highlightCode("plain text", null)).toBeNull();
      expect(isLanguageSupported(null)).toBe(false);
      expect(isLanguageSupported("")).toBe(false);
    });
  });
});
