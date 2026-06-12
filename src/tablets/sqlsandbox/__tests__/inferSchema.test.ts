import { normalizeSchemaColumns, toFriendlyType } from "../engine/inferSchema";

describe("SQL sandbox schema inference", () => {
  it.each([
    ["INTEGER", "integer"],
    ["DOUBLE", "decimal"],
    ["BOOLEAN", "boolean"],
    ["DATE", "date"],
    ["TIMESTAMP", "timestamp"],
    ["STRUCT(name VARCHAR)", "nested"],
    ["BLOB", "binary"],
    ["VARCHAR", "text"],
  ])("maps %s to %s", (engineType, friendlyType) => {
    expect(toFriendlyType(engineType)).toBe(friendlyType);
  });

  it("normalizes DuckDB information_schema rows", () => {
    expect(
      normalizeSchemaColumns([
        { column_name: "id", data_type: "INTEGER", is_nullable: "NO" },
        { column_name: "tags", data_type: "LIST", is_nullable: "YES" },
      ]),
    ).toEqual([
      { name: "id", engineType: "INTEGER", friendlyType: "integer", nullable: false },
      { name: "tags", engineType: "LIST", friendlyType: "nested", nullable: true },
    ]);
  });
});
