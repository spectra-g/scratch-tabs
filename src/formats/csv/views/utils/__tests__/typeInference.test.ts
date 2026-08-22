import { inferColumnType, inferColumnTypes } from "../typeInference";

describe("typeInference", () => {
  describe("inferColumnType", () => {
    it("returns text for empty input", () => {
      expect(inferColumnType([])).toBe("text");
    });

    it("returns text when all values are empty or whitespace", () => {
      expect(inferColumnType(["", "   ", ""])).toBe("text");
    });

    it("infers boolean for true/false values regardless of case", () => {
      expect(inferColumnType(["true", "false", "TRUE", "False"])).toBe(
        "boolean",
      );
    });

    it("infers number for integer and decimal values", () => {
      expect(inferColumnType(["1", "-2.5", "+3", ".75", "1e3"])).toBe("number");
    });

    it("does not treat hex, NaN, or Infinity as numbers", () => {
      expect(inferColumnType(["0x1A", "1", "2"])).not.toBe("number");
      expect(inferColumnType(["NaN", "1", "2"])).not.toBe("number");
      expect(inferColumnType(["Infinity", "1", "2"])).not.toBe("number");
    });

    it("infers date for ISO date and datetime values", () => {
      expect(inferColumnType(["2024-01-15", "2023-12-31"])).toBe("date");
      expect(
        inferColumnType(["2024-01-15T10:30:00Z", "2024-02-20 08:00"]),
      ).toBe("date");
    });

    it("ignores empty cells when computing confidence", () => {
      expect(inferColumnType(["1", "", " ", "2", "3"])).toBe("number");
      expect(inferColumnType(["true", "", "false"])).toBe("boolean");
    });

    it("falls back to text below the 90% threshold", () => {
      const values = ["1", "2", "3", "4", "5", "6", "7", "8", "ten", "eleven"];
      expect(inferColumnType(values)).toBe("text");
    });

    it("falls back to text when types are mixed", () => {
      expect(inferColumnType(["1", "true", "2024-01-01"])).toBe("text");
    });

    it("returns text for free-form strings that parse as neither number nor date", () => {
      expect(inferColumnType(["hello", "world"])).toBe("text");
    });
  });

  describe("inferColumnTypes", () => {
    it("infers a type per column from row-major data", () => {
      const rows = [
        ["Alice", "30", "true"],
        ["Bob", "25", "false"],
        ["Carol", "41", "true"],
      ];
      expect(inferColumnTypes(rows)).toEqual(["text", "number", "boolean"]);
    });

    it("handles ragged rows by treating missing cells as empty", () => {
      const rows = [["1", "x"], ["2"], ["3"]];
      expect(inferColumnTypes(rows)).toEqual(["number", "text"]);
    });

    it("returns an empty array when there are no rows", () => {
      expect(inferColumnTypes([])).toEqual([]);
    });

    it("samples only the requested number of rows", () => {
      const rows: string[][] = Array.from({ length: 5 }, (_, i) => [
        i === 4 ? "not a number" : String(i),
      ]);
      expect(inferColumnTypes(rows, 4)).toEqual(["number"]);
      expect(inferColumnTypes(rows, 5)).toEqual(["text"]);
    });

    it("uses the default sample size for invalid sample sizes", () => {
      const rows: string[][] = Array.from({ length: 5 }, (_, i) => [String(i)]);
      expect(inferColumnTypes(rows, 0)).toEqual(["number"]);
    });
  });
});
