import { createSlugger, slugify } from "../slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Getting Started")).toBe("getting-started");
  });

  it("strips punctuation", () => {
    expect(slugify("What's new?")).toBe("whats-new");
  });

  it("keeps existing hyphens", () => {
    expect(slugify("Built-in helpers")).toBe("built-in-helpers");
  });

  it("collapses runs of whitespace", () => {
    expect(slugify("Too   many    spaces")).toBe("too-many-spaces");
  });

  it("drops symbols but keeps digits", () => {
    expect(slugify("Section 2 (v1.5) & beyond")).toBe("section-2-v15-beyond");
  });

  it("keeps non-ASCII letters", () => {
    expect(slugify("Café déjà vu")).toBe("café-déjà-vu");
  });

  it("returns an empty string for punctuation only", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("createSlugger", () => {
  it("leaves the first occurrence unsuffixed", () => {
    const slug = createSlugger();
    expect(slug("Usage")).toBe("usage");
  });

  it("suffixes repeats in document order", () => {
    const slug = createSlugger();
    expect(slug("Usage")).toBe("usage");
    expect(slug("Usage")).toBe("usage-1");
    expect(slug("Usage")).toBe("usage-2");
  });

  it("counts headings that slug to the same value", () => {
    const slug = createSlugger();
    expect(slug("Set up")).toBe("set-up");
    expect(slug("Set-up!")).toBe("set-up-1");
  });

  it("falls back to a stable name for empty slugs", () => {
    const slug = createSlugger();
    expect(slug("***")).toBe("section");
    expect(slug("###")).toBe("section-1");
  });

  it("keeps separate sluggers independent", () => {
    expect(createSlugger()("Usage")).toBe("usage");
    expect(createSlugger()("Usage")).toBe("usage");
  });
});
