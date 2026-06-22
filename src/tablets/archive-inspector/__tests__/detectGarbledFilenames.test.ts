import { hasGarbledFilenames } from "../utils/detectGarbledFilenames";
import { ArchiveEntry } from "../types";

function makeEntries(paths: string[]): Pick<ArchiveEntry, "path">[] {
  return paths.map((path) => ({ path }));
}

describe("hasGarbledFilenames", () => {
  it("returns true when > 10% of paths contain replacement character", () => {
    const entries = makeEntries([
      "file0.txt",
      "file1.txt",
      "file2.txt",
      "file3.txt",
      "file4.txt",
      "file5.txt",
      "file6.txt",
      "file7.txt",
      "��.txt",
      "��2.txt",
    ]);
    expect(hasGarbledFilenames(entries)).toBe(true);
  });

  it("returns false for clean filenames", () => {
    const entries = makeEntries(["a.txt", "b.txt", "folder/c.json"]);
    expect(hasGarbledFilenames(entries)).toBe(false);
  });

  it("returns false for empty entries array", () => {
    expect(hasGarbledFilenames([])).toBe(false);
  });

  it("returns false when exactly 10% are garbled (threshold is > 10%)", () => {
    const entries = makeEntries([
      "�.txt",
      "a.txt",
      "b.txt",
      "c.txt",
      "d.txt",
      "e.txt",
      "f.txt",
      "g.txt",
      "h.txt",
      "i.txt",
    ]);
    expect(hasGarbledFilenames(entries)).toBe(false);
  });

  it("returns true when all files are garbled", () => {
    const entries = makeEntries(["�1.txt", "�2.txt"]);
    expect(hasGarbledFilenames(entries)).toBe(true);
  });

  it("uses the replacement character U+FFFD", () => {
    const entries = makeEntries(["normal.txt", "also-normal.txt"]);
    expect(hasGarbledFilenames(entries)).toBe(false);
  });
});
