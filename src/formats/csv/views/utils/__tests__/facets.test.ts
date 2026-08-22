import { computeFacetCounts } from "../facets";
import { ColumnFilter } from "../filtering";
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

describe("computeFacetCounts", () => {
  const columns = makeColumns([
    { id: "name", type: "text" },
    { id: "region", type: "text" },
    { id: "amount", type: "number" },
  ]);

  const rows = makeRows([
    ["Apple", "east", "10"],
    ["Banana", "west", "20"],
    ["Cherry", "east", "30"],
    ["Date", " east ", ""],
    ["Elderberry", "", "50"],
  ]);

  it("counts distinct non-blank values of the facet column", () => {
    expect(computeFacetCounts(rows, columns, "region")).toEqual([
      { value: "east", count: 3 },
      { value: "west", count: 1 },
    ]);
  });

  it("trims cell values before tallying", () => {
    // " east " collapses into the same bucket as "east"
    const trimmed = computeFacetCounts(rows.slice(0, 4), columns, "region");
    expect(trimmed).toEqual([
      { value: "east", count: 3 },
      { value: "west", count: 1 },
    ]);
  });

  it("sorts by count desc then value asc", () => {
    const counts = computeFacetCounts(rows, columns, "amount");
    expect(counts.map((facet) => facet.value)).toEqual(["10", "20", "30", "50"]);
  });

  it("excludes the facet column's own filter but applies all others", () => {
    const filters: ColumnFilter[] = [
      { columnId: "region", operator: "equals", value: "east" },
      { columnId: "amount", operator: "gte", value: "20" },
    ];
    // Amount >= 20 keeps Banana (west), Cherry (east) and Elderberry ("")
    expect(computeFacetCounts(rows, columns, "region", filters)).toEqual([
      { value: "east", count: 1 },
      { value: "west", count: 1 },
    ]);
  });

  it("respects match mode when combining other filters", () => {
    const filters: ColumnFilter[] = [
      { columnId: "region", operator: "equals", value: "west" },
      { columnId: "amount", operator: "gte", value: "20" },
    ];
    const andValues = computeFacetCounts(
      rows,
      columns,
      "name",
      filters,
      "and",
    ).map((facet) => facet.value);
    const orValues = computeFacetCounts(
      rows,
      columns,
      "name",
      filters,
      "or",
    ).map((facet) => facet.value);

    expect(andValues).toEqual(["Banana"]); // west AND >= 20
    expect(orValues.sort()).toEqual([
      "Banana",
      "Cherry",
      "Elderberry",
    ]); // west OR >= 20
  });

  it("returns no facets for a column that does not exist", () => {
    expect(computeFacetCounts(rows, columns, "missing")).toEqual([]);
  });

  it("returns no facets when every scoped value is blank", () => {
    const emptyOnly = rows.map((row) => ({
      ...row,
      cells: row.cells.map((cell, index) =>
        index === 1 ? { value: "", isValid: true } : cell,
      ),
    }));
    expect(computeFacetCounts(emptyOnly, columns, "region")).toEqual([]);
  });
});
