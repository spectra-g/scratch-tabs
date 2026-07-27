import type { Element } from "hast";
import { getCodeLanguage, getCodeText } from "../nodeUtils";

/**
 * Builds the hast shape react-markdown passes to the `pre` component for a
 * fenced code block.
 */
const preNode = (className: unknown, ...text: string[]) =>
  ({
    type: "element",
    tagName: "pre",
    properties: {},
    children: [
      {
        type: "element",
        tagName: "code",
        properties: className === undefined ? {} : { className },
        children: text.map((value) => ({ type: "text", value })),
      },
    ],
  }) as unknown as Element;

describe("Markdown code block node helpers", () => {
  describe("getCodeLanguage", () => {
    it("reads the language from a language-* class", () => {
      expect(getCodeLanguage(preNode(["language-typescript"]))).toBe("typescript");
    });

    it("ignores unrelated classes alongside the language", () => {
      expect(getCodeLanguage(preNode(["hljs", "language-sql"]))).toBe("sql");
    });

    it("accepts a plain string className", () => {
      expect(getCodeLanguage(preNode("language-js"))).toBe("js");
    });

    it("returns null for an unlabelled fence", () => {
      expect(getCodeLanguage(preNode(undefined, "plain"))).toBeNull();
    });

    it("returns null when the language is empty", () => {
      expect(getCodeLanguage(preNode(["language-"]))).toBeNull();
    });

    it("returns null for a missing node", () => {
      expect(getCodeLanguage(undefined)).toBeNull();
    });
  });

  describe("getCodeText", () => {
    it("returns the fenced content", () => {
      expect(getCodeText(preNode(["language-js"], "const a = 1;\n"))).toBe(
        "const a = 1;\n",
      );
    });

    it("joins adjacent text children", () => {
      expect(getCodeText(preNode(["language-js"], "line one\n", "line two"))).toBe(
        "line one\nline two",
      );
    });

    it("returns an empty string when there is no code child", () => {
      const empty = {
        type: "element",
        tagName: "pre",
        properties: {},
        children: [],
      } as unknown as Element;

      expect(getCodeText(empty)).toBe("");
    });

    it("returns an empty string for a missing node", () => {
      expect(getCodeText(undefined)).toBe("");
    });
  });
});
