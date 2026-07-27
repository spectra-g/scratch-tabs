import { detectFormat } from "../../index";
import { formatRegistry } from "../../registry";
import { maskFencedCode } from "../fences";

describe("maskFencedCode", () => {
  it("returns content without fences unchanged", () => {
    const source = "# Title\n\nJust prose.\n- a list";
    expect(maskFencedCode(source)).toBe(source);
  });

  it("drops the body but keeps both fence markers", () => {
    expect(maskFencedCode("```js\nconst a = 1;\nconst b = 2;\n```")).toBe(
      "```js\n\n```",
    );
  });

  it("keeps prose on either side of a fence", () => {
    expect(maskFencedCode("before\n```\ncode\n```\nafter")).toBe(
      "before\n```\n\n```\nafter",
    );
  });

  it("masks tilde fences", () => {
    expect(maskFencedCode("~~~py\nimport os\n~~~")).toBe("~~~py\n\n~~~");
  });

  it("does not let a tilde fence close a backtick fence", () => {
    expect(maskFencedCode("```js\n~~~\nstill code\n```")).toBe("```js\n\n```");
  });

  it("masks every fence in a document", () => {
    expect(maskFencedCode("```\na\n```\ntext\n```\nb\n```")).toBe(
      "```\n\n```\ntext\n```\n\n```",
    );
  });

  it("swallows the remainder of an unterminated fence", () => {
    expect(maskFencedCode("intro\n```js\nconst a = 1;")).toBe("intro\n```js\n");
  });
});

describe("detectFormat with fenced code", () => {
  it("detects the built-in Markdown sample as markdown", () => {
    // Regression: the JavaScript fence in the sample scored a definitive 1.0
    // and won the tie on priority, so auto-format ran the JavaScript formatter
    // over the document and stripped the indentation off nested lists.
    const sample = formatRegistry.getById("markdown")!.sampleContent!();
    expect(detectFormat(sample)).toBe("markdown");
  });

  it("is not swayed by a SQL fence", () => {
    const source =
      "# Report\n\nThe query:\n\n```sql\nSELECT id, name FROM users WHERE active = 1 ORDER BY name;\n```\n\n- one\n- two\n";
    expect(detectFormat(source)).toBe("markdown");
  });

  it("is not swayed by a fence that dominates the document", () => {
    const source =
      "# Notes\n\n```python\nimport os\ndef main():\n    print(os.getcwd())\n```\n";
    expect(detectFormat(source)).toBe("markdown");
  });

  it("still detects a plain source file that has no fences", () => {
    const source = formatRegistry.getById("javascript")!.sampleContent!();
    expect(detectFormat(source)).toBe("javascript");
  });
});
