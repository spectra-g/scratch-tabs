import {
  applyFilters,
  applyRuleFilters,
  flatFiltersToRule,
  isFilterGroup,
  ColumnFilter,
  FilterMatchMode,
  FilterRule,
} from "../filtering";
import { CsvColumn, CsvRow } from "../../types";

function makeColumns(
  defs: Array<Pick<CsvColumn, "id" | "type"> & { name?: string }>,
): CsvColumn[] {
  return defs.map((def, index) => ({
    id: def.id,
    name: def.name ?? def.id,
    type: def.type,
    index,
  }));
}

function makeRows(values: string[][]): CsvRow[] {
  return values.map((row, rowIndex) => ({
    id: `row_${rowIndex}`,
    cells: row.map((value) => ({ value, isValid: true })),
    originalIndex: rowIndex,
    isValid: true,
  }));
}

describe("compound filtering", () => {
  const columns = makeColumns([
    { id: "name", type: "text" },
    { id: "amount", type: "number" },
  ]);

  const rows = makeRows([
    ["Apple", "10"],
    ["banana", "25"],
    ["Cherry", "40"],
    ["date", ""],
  ]);

  const amountGt15: ColumnFilter = { columnId: "amount", operator: "gt", value: "15" };
  const amountLt30: ColumnFilter = { columnId: "amount", operator: "lt", value: "30" };
  const nameContainsAn: ColumnFilter = { columnId: "name", operator: "contains", value: "an" };

  function filterNames(rule: FilterRule): string[] {
    return applyRuleFilters(rows, columns, rule).map((row) => row.cells[0].value);
  }

  describe("isFilterGroup / flatFiltersToRule", () => {
    it("identifies leaf filters as non-groups", () => {
      expect(isFilterGroup(amountGt15)).toBe(false);
    });

    it("identifies and/or groups", () => {
      expect(isFilterGroup({ and: [] })).toBe(true);
      expect(isFilterGroup({ or: [amountGt15] })).toBe(true);
    });

    it("wraps flat filters using the match mode", () => {
      const filters = [amountGt15, nameContainsAn];
      expect(flatFiltersToRule(filters, "and")).toEqual({ and: filters });
      expect(flatFiltersToRule(filters, "or")).toEqual({ or: filters });
      // Copies instead of aliasing caller-owned arrays
      const wrapped = flatFiltersToRule(filters, "and");
      expect(wrapped).not.toBe(filters);
    });
  });

  describe("flat rules (graceful fallback to flat semantics)", () => {
    it("applies a single leaf filter directly", () => {
      expect(filterNames(amountGt15)).toEqual(["banana", "Cherry"]);
    });

    it("an empty and-group matches every row (vacuous truth)", () => {
      expect(filterNames({ and: [] })).toEqual([
        "Apple",
        "banana",
        "Cherry",
        "date",
      ]);
    });

    it("an empty or-group matches no rows", () => {
      expect(filterNames({ or: [] })).toEqual([]);
    });
  });

  describe("grouped conditions", () => {
    it("AND group requires all children to match", () => {
      expect(filterNames({ and: [amountGt15, amountLt30] })).toEqual([
        "banana",
      ]);
    });

    it("OR group matches any child", () => {
      expect(filterNames({ or: [nameContainsAn, amountGt15] })).toEqual([
        "banana",
        "Cherry",
      ]);
    });

    it("supports nested groups: (10 <= amount <= 40) AND (contains 'an' OR amount > 35)", () => {
      const rule: FilterRule = {
        and: [
          { and: [amountGt15, amountLt30] },
          {
            or: [
              nameContainsAn,
              { columnId: "amount", operator: "gt", value: "39" },
            ],
          },
        ],
      };
      expect(filterNames(rule)).toEqual(["banana"]);
    });

    it("deeply nests or-groups inside and-groups inside or-groups", () => {
      const rule: FilterRule = {
        or: [
          { columnId: "name", operator: "equals", value: "Apple" },
          {
            and: [
              { or: [amountLt30] },
              { columnId: "name", operator: "startsWith", value: "cher" },
            ],
          },
        ],
      };
      expect(filterNames(rule)).toEqual(["Apple"]);
    });

    it("respects column types inside groups (numeric vs string comparison)", () => {
      // "9" > "40" as a string but not as a number
      const numericRows = makeRows([["a", "9"], ["b", "100"]]);
      const result = applyRuleFilters(numericRows, columns, {
        and: [{ columnId: "amount", operator: "gt", value: "50" }],
      });
      expect(result.map((row) => row.cells[0].value)).toEqual(["b"]);
    });

    it("matches nothing when an unknown column is referenced in an AND group", () => {
      const unknown: ColumnFilter = { columnId: "missing", operator: "equals", value: "x" };
      expect(filterNames({ and: [unknown, amountGt15] })).toEqual([]);
      // OR keeps rows satisfying the other branch
      expect(filterNames({ or: [unknown, amountGt15] })).toEqual([
        "banana",
        "Cherry",
      ]);
    });

    it("round-trips through JSON (serializable structure)", () => {
      const rule: FilterRule = {
        or: [amountGt15, { and: [amountLt30, nameContainsAn] }],
      };
      const parsed = JSON.parse(JSON.stringify(rule)) as FilterRule;
      expect(filterNames(parsed)).toEqual(["banana", "Cherry"]);
    });
  });

  describe("parity with applyFilters", () => {
    const cases: Array<[ColumnFilter[], FilterMatchMode]> = [
      [[amountGt15, nameContainsAn], "and"],
      [[amountGt15, nameContainsAn], "or"],
      [[amountLt30], "and"],
    ];

    cases.forEach(([filters, matchMode]) => {
      it(`matches flat ${matchMode.toUpperCase()} results for ${filters.length} filters`, () => {
        const expected = applyFilters(rows, filters, columns, { matchMode });
        expect(applyRuleFilters(rows, columns, flatFiltersToRule(filters, matchMode))).toEqual(expected);
      });
    });
  });
});
