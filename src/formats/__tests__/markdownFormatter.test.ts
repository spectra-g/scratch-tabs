import { formatMarkdown, splitByFences } from "../markdown";

describe("formatMarkdown", () => {
  describe("list markers", () => {
    it("leaves a correctly spaced bullet untouched", () => {
      expect(formatMarkdown("- Item 1\n- Item 2")).toBe("- Item 1\n- Item 2");
    });

    it("adds the missing space after a bullet", () => {
      expect(formatMarkdown("-Item 1")).toBe("- Item 1");
    });

    it("does not double the space after a bullet", () => {
      // Regression: the old rule captured the existing space and added another,
      // producing "-  Item" and shifting the list's content offset.
      expect(formatMarkdown("- Item")).not.toContain("-  ");
    });

    it("preserves nesting of an indented sub-list", () => {
      const source = "- Item 2\n  - Subitem\n- Item 3";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("keeps a deeply nested list intact", () => {
      const source = "- One\n  - Two\n    - Three\n- Four";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("normalises ordered markers without doubling the space", () => {
      expect(formatMarkdown("1.First\n2. Second")).toBe("1. First\n2. Second");
    });

    it("preserves task list checkboxes", () => {
      const source = "- [x] Done\n- [ ] Pending";
      expect(formatMarkdown(source)).toBe(source);
    });
  });

  describe("fenced code blocks", () => {
    it("preserves indentation inside a fence", () => {
      const source = "```js\nfunction f() {\n  return 1;\n}\n```";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("does not insert a blank line before the closing fence", () => {
      const source = "```js\nconst a = 1;\n```";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("does not rewrite comment lines that look like headings", () => {
      const source = "```bash\n#!/bin/bash\n#comment\necho hi\n```";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("does not rewrite diff lines that look like bullets", () => {
      const source = "```diff\n-removed line\n+added line\n```";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("does not collapse blank lines inside a fence", () => {
      const source = "```py\na = 1\n\n\n\nb = 2\n```";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("does not treat a dashed line inside a fence as a thematic break", () => {
      const source = "```\n---\n```";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("supports tilde fences", () => {
      const source = "~~~js\n  indented();\n~~~";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("does not let a tilde fence close a backtick fence", () => {
      const source = "```js\n~~~\n  still code\n```";
      expect(formatMarkdown(source)).toBe(source);
    });

    it("adds a blank line before a fence that follows prose", () => {
      expect(formatMarkdown("Text\n```js\na\n```")).toBe("Text\n\n```js\na\n```");
    });

    it("adds a blank line after a fence followed by prose", () => {
      expect(formatMarkdown("```js\na\n```\nText")).toBe("```js\na\n```\n\nText");
    });

    it("leaves an unterminated fence's contents alone", () => {
      const source = "```js\n  return 1;";
      expect(formatMarkdown(source)).toBe(source);
    });
  });

  describe("prose", () => {
    it("adds the missing space after a heading marker", () => {
      expect(formatMarkdown("#Title")).toBe("# Title");
    });

    it("leaves a correctly spaced heading untouched", () => {
      expect(formatMarkdown("## Introduction")).toBe("## Introduction");
    });

    it("normalises thematic breaks", () => {
      expect(formatMarkdown("***")).toBe("---");
      expect(formatMarkdown("___")).toBe("---");
      expect(formatMarkdown("- - -")).toBe("---");
    });

    it("collapses runs of blank lines to one", () => {
      expect(formatMarkdown("a\n\n\n\nb")).toBe("a\n\nb");
    });

    it("preserves a single trailing newline", () => {
      expect(formatMarkdown("# Title\n")).toBe("# Title\n");
    });

    it("drops a trailing newline when the source had none", () => {
      expect(formatMarkdown("# Title")).toBe("# Title");
    });

    it("returns an empty string unchanged", () => {
      expect(formatMarkdown("")).toBe("");
    });
  });

  it("is idempotent across a mixed document", () => {
    const source = [
      "# Title",
      "",
      "- Item 2",
      "  - Subitem",
      "",
      "```js",
      "function f() {",
      "  return 1;",
      "}",
      "```",
      "",
      "Done.",
      "",
    ].join("\n");

    const once = formatMarkdown(source);
    expect(once).toBe(source);
    expect(formatMarkdown(once)).toBe(once);
  });
});

describe("splitByFences", () => {
  it("separates prose from fenced code", () => {
    const segments = splitByFences("a\n```\ncode\n```\nb");

    expect(segments.map((s) => s.code)).toEqual([false, true, false]);
    expect(segments[1].lines).toEqual(["```", "code", "```"]);
  });

  it("treats content with no fences as a single prose segment", () => {
    const segments = splitByFences("just prose\nmore prose");

    expect(segments).toHaveLength(1);
    expect(segments[0].code).toBe(false);
  });

  it("keeps an unterminated fence as a code segment", () => {
    const segments = splitByFences("```js\nunclosed");

    expect(segments).toHaveLength(1);
    expect(segments[0].code).toBe(true);
  });
});
