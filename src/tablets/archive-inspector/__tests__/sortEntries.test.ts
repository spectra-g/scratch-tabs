import { sortEntries, filterEntries } from "../utils/sortEntries";
import { ArchiveEntry } from "../types";

function makeEntry(overrides: Partial<ArchiveEntry> & { path: string; name: string }): ArchiveEntry {
  return {
    isDirectory: false,
    sizeUncompressed: 0,
    sizeCompressed: 0,
    compressionRatio: 0,
    modified: null,
    comment: "",
    encryptionType: "none",
    crc32: "00000000",
    mimeType: "application/octet-stream",
    isTextPreviewable: false,
    isImagePreviewable: false,
    depth: 0,
    ...overrides,
  };
}

const entries: ArchiveEntry[] = [
  makeEntry({ path: "c.txt", name: "c.txt", sizeUncompressed: 300 }),
  makeEntry({ path: "a.txt", name: "a.txt", sizeUncompressed: 100 }),
  makeEntry({ path: "b.txt", name: "b.txt", sizeUncompressed: 200 }),
  makeEntry({ path: ".hidden", name: ".hidden", sizeUncompressed: 50 }),
  makeEntry({ path: "dir/", name: "dir", isDirectory: true }),
];

describe("sortEntries", () => {
  it("sorts by name ascending, directories first", () => {
    const sorted = sortEntries(entries, "name", "asc");
    expect(sorted[0].isDirectory).toBe(true);
    const files = sorted.filter((e) => !e.isDirectory);
    expect(files.map((e) => e.name)).toEqual([".hidden", "a.txt", "b.txt", "c.txt"]);
  });

  it("sorts by name descending", () => {
    const sorted = sortEntries(entries, "name", "desc");
    const files = sorted.filter((e) => !e.isDirectory);
    expect(files[0].name).toBe("c.txt");
  });

  it("sorts by size ascending", () => {
    const sorted = sortEntries(entries, "size", "asc");
    const files = sorted.filter((e) => !e.isDirectory);
    expect(files[0].sizeUncompressed).toBe(50);
  });

  it("sorts by size descending", () => {
    const sorted = sortEntries(entries, "size", "desc");
    const files = sorted.filter((e) => !e.isDirectory);
    expect(files[0].sizeUncompressed).toBe(300);
  });

  it("does not mutate the original array", () => {
    const original = [...entries];
    sortEntries(entries, "name", "asc");
    expect(entries).toEqual(original);
  });
});

describe("filterEntries", () => {
  it("filters by search query on name", () => {
    const result = filterEntries(entries, "a.tx", "name", true, []);
    expect(result.every((e) => e.isDirectory || e.name.toLowerCase().includes("a.tx"))).toBe(true);
  });

  it("filters by search query on path", () => {
    const result = filterEntries(entries, "dir/", "path", true, []);
    expect(result.some((e) => e.path.includes("dir/"))).toBe(true);
  });

  it("hides dotfiles when showDotFiles is false", () => {
    const result = filterEntries(entries, "", "name", false, []);
    expect(result.every((e) => !e.name.startsWith("."))).toBe(true);
  });

  it("shows dotfiles when showDotFiles is true", () => {
    const result = filterEntries(entries, "", "name", true, []);
    expect(result.some((e) => e.name.startsWith("."))).toBe(true);
  });

  it("filters to only listed extensions", () => {
    const result = filterEntries(entries, "", "name", true, ["txt"]);
    expect(result.filter((e) => !e.isDirectory).every((e) => e.name.endsWith(".txt"))).toBe(true);
  });

  it("returns all entries when filterExtensions is empty", () => {
    const result = filterEntries(entries, "", "name", true, []);
    expect(result.length).toBe(entries.length);
  });

  it("does not filter directories even when extension filter is active", () => {
    const result = filterEntries(entries, "", "name", true, ["json"]);
    expect(result.some((e) => e.isDirectory)).toBe(true);
  });
});
