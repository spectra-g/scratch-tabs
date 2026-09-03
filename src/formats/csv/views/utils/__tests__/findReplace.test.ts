import {
  buildReplaceUpdates,
  cellMatchesFind,
  escapeRegExp,
  findReplaceMatches,
  replaceCellValue,
  summarizeReplaceMatches,
} from "../findReplace";
import { CsvColumn, CsvRow } from "../../types";
import { createCellKey } from "../cellUtils";

const makeColumns = (names: string[]): CsvColumn[] =>
  names.map((name, index) => ({
    id: `col_${index}_${name}`,
    name,
    type: "text" as const,
    index,
  }));

const makeRows = (columns: CsvColumn[], values: string[][]): CsvRow[] =>
  values.map((rowValues, rowIndex) => ({
    id: `row_${rowIndex}`,
    cells: rowValues.map((value) => ({ value, isValid: true })),
    originalIndex: rowIndex,
    isValid: true,
  }));

describe("findReplace utils", () => {
  describe("escapeRegExp", () => {
    it("escapes regex metacharacters", () => {
      expect(escapeRegExp("a.b*c?")).toBe("a\\.b\\*c\\?");
      expect(escapeRegExp("(NY) [x] {1}")).toBe("\\(NY\\) \\[x\\] \\{1\\}");
    });
  });

  describe("cellMatchesFind", () => {
    it("matches substrings case-insensitively by default", () => {
      expect(cellMatchesFind("New York", "new")).toBe(true);
      expect(cellMatchesFind("New York", "YORK")).toBe(true);
      expect(cellMatchesFind("Chicago", "new")).toBe(false);
    });

    it("respects matchCase", () => {
      expect(cellMatchesFind("New York", "new", { matchCase: true })).toBe(
        false,
      );
      expect(cellMatchesFind("New York", "New", { matchCase: true })).toBe(
        true,
      );
    });

    it("matches whole cell only when exactCell is on", () => {
      expect(cellMatchesFind("New York", "New", { exactCell: true })).toBe(
        false,
      );
      expect(cellMatchesFind("New York", "New York", { exactCell: true })).toBe(
        true,
      );
      expect(cellMatchesFind("new york", "New York", { exactCell: true })).toBe(
        true,
      );
      expect(
        cellMatchesFind("new york", "New York", {
          exactCell: true,
          matchCase: true,
        }),
      ).toBe(false);
    });

    it("treats regex characters as literal text", () => {
      expect(cellMatchesFind("price (low)", "(low)")).toBe(true);
      expect(cellMatchesFind("a.b", "a.b")).toBe(true);
      expect(cellMatchesFind("axb", "a.b")).toBe(false);
    });

    it("never matches empty find in substring mode", () => {
      expect(cellMatchesFind("anything", "")).toBe(false);
      expect(cellMatchesFind("", "")).toBe(false);
    });

    it("matches empty cells when find is empty and exactCell is on", () => {
      expect(cellMatchesFind("", "", { exactCell: true })).toBe(true);
      expect(cellMatchesFind("x", "", { exactCell: true })).toBe(false);
    });

    it("handles nullish values as empty string", () => {
      expect(
        cellMatchesFind(undefined as unknown as string, "x"),
      ).toBe(false);
      expect(
        cellMatchesFind(undefined as unknown as string, "", {
          exactCell: true,
        }),
      ).toBe(true);
    });
  });

  describe("replaceCellValue", () => {
    it("replaces substrings while preserving the rest of the cell", () => {
      expect(replaceCellValue("New York, NY", "NY", "New York")).toBe(
        "New York, New York",
      );
    });

    it("replaces case-insensitively by default", () => {
      expect(replaceCellValue("new york vs New York", "new york", "NY")).toBe(
        "NY vs NY",
      );
    });

    it("replaces case-sensitively when matchCase is on", () => {
      expect(
        replaceCellValue("new york vs New York", "New York", "NY", {
          matchCase: true,
        }),
      ).toBe("new york vs NY");
    });

    it("replaces the whole cell when exactCell is on", () => {
      expect(
        replaceCellValue("NY", "NY", "New York", { exactCell: true }),
      ).toBe("New York");
      // Partial content is untouched in exact mode
      expect(
        replaceCellValue("NY, USA", "NY", "New York", { exactCell: true }),
      ).toBe("NY, USA");
    });

    it("supports value->empty (clearing placeholders)", () => {
      expect(
        replaceCellValue("N/A", "N/A", "", { exactCell: true }),
      ).toBe("");
      expect(replaceCellValue("a-N/A-b", "N/A", "")).toBe("a--b");
    });

    it("supports empty->value (filling blanks with exact empty find)", () => {
      expect(
        replaceCellValue("", "", "unknown", { exactCell: true }),
      ).toBe("unknown");
    });

    it("returns the value unchanged when there is no match", () => {
      expect(replaceCellValue("Chicago", "NY", "New York")).toBe("Chicago");
      expect(replaceCellValue("anything", "", "x")).toBe("anything");
    });

    it("replaces all occurrences, not just the first", () => {
      expect(replaceCellValue("yes yes yes", "yes", "1")).toBe("1 1 1");
    });

    it("treats find text with regex chars literally", () => {
      expect(replaceCellValue("a.b.c", ".", "-")).toBe("a-b-c");
      expect(replaceCellValue("price (low)", "(low)", "(high)")).toBe(
        "price (high)",
      );
    });
  });

  describe("findReplaceMatches", () => {
    const columns = makeColumns(["City", "Active"]);
    const rows = makeRows(columns, [
      ["New York", "yes"],
      ["new york", "Y"],
      ["NY", "true"],
      ["Chicago", "N/A"],
    ]);

    it("finds substring matches across all columns", () => {
      const matches = findReplaceMatches(rows, columns, {
        find: "new york",
        replace: "NY",
        scope: "all",
      });
      expect(matches.map((m) => m.rowId)).toEqual(["row_0", "row_1"]);
      expect(matches[0]).toMatchObject({
        columnId: "col_0_City",
        oldValue: "New York",
        newValue: "NY",
      });
    });

    it("finds exact-cell matches only", () => {
      const matches = findReplaceMatches(rows, columns, {
        find: "NY",
        replace: "New York",
        scope: "all",
        exactCell: true,
      });
      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({ rowId: "row_2", oldValue: "NY" });
    });

    it("normalizes boolean-ish variants in one pass (the motivating use case)", () => {
      const boolColumns = makeColumns(["Active"]);
      const boolRows = makeRows(boolColumns, [
        ["yes"],
        ["Y"],
        ["true"],
        ["1"],
        ["no"],
      ]);
      const matches = findReplaceMatches(boolRows, boolColumns, {
        find: "Y",
        replace: "yes",
        scope: "all",
        exactCell: true,
      });
      // Only the exact "Y" cell matches, not "yes"
      expect(matches).toHaveLength(1);
    });

    it("scopes matches to a single column", () => {
      const matches = findReplaceMatches(rows, columns, {
        find: "y",
        replace: "Y",
        scope: "column",
        columnId: "col_1_Active",
      });
      // Only Active column cells containing "y"
      expect(matches.length).toBeGreaterThan(0);
      matches.forEach((m) => expect(m.columnId).toBe("col_1_Active"));
    });

    it("returns no matches for column scope without a columnId", () => {
      expect(
        findReplaceMatches(rows, columns, {
          find: "NY",
          replace: "x",
          scope: "column",
        }),
      ).toEqual([]);
    });

    it("scopes matches to the current selection", () => {
      const selection = new Set([createCellKey("row_0", "col_0_City")]);
      const matches = findReplaceMatches(rows, columns, {
        find: "new york",
        replace: "NY",
        scope: "selection",
        selectionKeys: selection,
      });
      expect(matches).toHaveLength(1);
      expect(matches[0].rowId).toBe("row_0");
    });

    it("accepts selection keys as an array", () => {
      const matches = findReplaceMatches(rows, columns, {
        find: "new york",
        replace: "NY",
        scope: "selection",
        selectionKeys: [createCellKey("row_1", "col_0_City")],
      });
      expect(matches).toHaveLength(1);
      expect(matches[0].rowId).toBe("row_1");
    });

    it("returns no matches for empty selection", () => {
      expect(
        findReplaceMatches(rows, columns, {
          find: "new york",
          replace: "NY",
          scope: "selection",
          selectionKeys: new Set(),
        }),
      ).toEqual([]);
    });

    it("skips no-op matches so updateCells only touches real changes", () => {
      const matches = findReplaceMatches(rows, columns, {
        find: "Chicago",
        replace: "Chicago",
        scope: "all",
        exactCell: true,
      });
      expect(matches).toEqual([]);
    });

    it("includes value->empty matches", () => {
      const matches = findReplaceMatches(rows, columns, {
        find: "N/A",
        replace: "",
        scope: "all",
        exactCell: true,
      });
      expect(matches).toHaveLength(1);
      expect(matches[0].newValue).toBe("");
    });

    it("includes empty->value matches with exact empty find", () => {
      const withBlanks = makeRows(columns, [["", "yes"], ["NY", ""]]);
      const matches = findReplaceMatches(withBlanks, columns, {
        find: "",
        replace: "unknown",
        scope: "all",
        exactCell: true,
      });
      expect(matches).toHaveLength(2);
      matches.forEach((m) => expect(m.newValue).toBe("unknown"));
    });

    it("ignores columns missing from a ragged row", () => {
      const ragged: CsvRow[] = [
        { id: "row_0", cells: [{ value: "NY", isValid: true }], originalIndex: 0, isValid: true },
      ];
      const matches = findReplaceMatches(ragged, columns, {
        find: "NY",
        replace: "New York",
        scope: "all",
        exactCell: true,
      });
      expect(matches).toHaveLength(1);
    });

    it("is a no-op for empty find in substring mode", () => {
      expect(
        findReplaceMatches(rows, columns, {
          find: "",
          replace: "x",
          scope: "all",
        }),
      ).toEqual([]);
    });
  });

  describe("buildReplaceUpdates", () => {
    it("maps matches to updateCells payload", () => {
      expect(
        buildReplaceUpdates([
          { rowId: "row_0", columnId: "col_0", oldValue: "a", newValue: "b" },
        ]),
      ).toEqual([{ rowId: "row_0", columnId: "col_0", value: "b" }]);
    });
  });

  describe("summarizeReplaceMatches", () => {
    it("produces 'N cells in M columns' text", () => {
      const summary = summarizeReplaceMatches([
        { rowId: "r1", columnId: "c1", oldValue: "a", newValue: "b" },
        { rowId: "r2", columnId: "c1", oldValue: "a", newValue: "b" },
        { rowId: "r3", columnId: "c2", oldValue: "a", newValue: "b" },
      ]);
      expect(summary.cellCount).toBe(3);
      expect(summary.columnCount).toBe(2);
      expect(summary.text).toBe("3 cells in 2 columns");
    });

    it("uses singular words for 1 cell / 1 column", () => {
      const summary = summarizeReplaceMatches([
        { rowId: "r1", columnId: "c1", oldValue: "a", newValue: "b" },
      ]);
      expect(summary.text).toBe("1 cell in 1 column");
    });

    it("handles zero matches", () => {
      const summary = summarizeReplaceMatches([]);
      expect(summary.text).toBe("0 cells in 0 columns");
    });
  });
});
