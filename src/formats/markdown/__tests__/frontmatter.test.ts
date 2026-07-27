import { splitFrontmatter } from "../frontmatter";

describe("splitFrontmatter", () => {
  it("extracts key/value pairs and strips the block", () => {
    const result = splitFrontmatter("---\ntitle: My Doc\nauthor: Ada\n---\n# Heading");

    expect(result.entries).toEqual([
      { key: "title", value: "My Doc" },
      { key: "author", value: "Ada" },
    ]);
    expect(result.body).toBe("# Heading");
  });

  it("reports the lines the block occupied so source lines stay aligned", () => {
    // ---, title, --- => the body's line 1 is the document's line 4
    const result = splitFrontmatter("---\ntitle: My Doc\n---\n# Heading");
    expect(result.lineOffset).toBe(3);
  });

  it("renders a list value as a comma-separated string", () => {
    const result = splitFrontmatter("---\ntags:\n  - one\n  - two\n---\nBody");
    expect(result.entries).toEqual([{ key: "tags", value: "one, two" }]);
  });

  it("renders a nested object as JSON", () => {
    const result = splitFrontmatter("---\nmeta:\n  draft: true\n---\nBody");
    expect(result.entries).toEqual([{ key: "meta", value: '{"draft":true}' }]);
  });

  it("keeps boolean and numeric values", () => {
    const result = splitFrontmatter("---\ndraft: true\norder: 3\n---\nBody");
    expect(result.entries).toEqual([
      { key: "draft", value: "true" },
      { key: "order", value: "3" },
    ]);
  });

  it("drops keys with empty values rather than showing a blank row", () => {
    const result = splitFrontmatter("---\ntitle: Doc\nsubtitle:\n---\nBody");
    expect(result.entries).toEqual([{ key: "title", value: "Doc" }]);
  });

  it("leaves a document with no frontmatter untouched", () => {
    const source = "# Heading\n\nBody";
    expect(splitFrontmatter(source)).toEqual({
      entries: [],
      body: source,
      lineOffset: 0,
    });
  });

  it("does not treat a leading thematic break as frontmatter", () => {
    // A document opening with a rule is far more common than a broken block,
    // and eating its first section would be much worse than showing no card.
    const source = "---\n\n# Heading\n\nSome prose.";
    expect(splitFrontmatter(source).body).toBe(source);
    expect(splitFrontmatter(source).entries).toEqual([]);
  });

  it("leaves an unterminated block in the body", () => {
    const source = "---\ntitle: Doc\n\n# Heading";
    expect(splitFrontmatter(source).body).toBe(source);
  });

  it("leaves malformed YAML in the body", () => {
    const source = "---\n\ttitle: : :\n---\nBody";
    expect(splitFrontmatter(source).body).toBe(source);
    expect(splitFrontmatter(source).entries).toEqual([]);
  });

  it("ignores a block that parses to a scalar rather than a mapping", () => {
    const source = "---\njust a string\n---\nBody";
    expect(splitFrontmatter(source).entries).toEqual([]);
    expect(splitFrontmatter(source).body).toBe(source);
  });
});
