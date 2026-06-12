import { createExportBlob, serializeResult, stringifyJsonSafe, toCsv } from "../engine/exportResults";
import { QueryExecutionResult } from "../sqlSandboxTypes";

const result: QueryExecutionResult = {
  sql: "select * from people",
  columns: ["id", "name", "note"],
  rows: [
    { id: 1, name: "Ada", note: "plain" },
    { id: 2, name: "Grace, Hopper", note: 'quoted "value"' },
  ],
  rowCount: 2,
  executionMs: 3,
};

describe("SQL sandbox result exports", () => {
  it("serializes rows to CSV with escaping", () => {
    expect(toCsv(result.columns, result.rows)).toBe(
      'id,name,note\n1,Ada,plain\n2,"Grace, Hopper","quoted ""value"""',
    );
  });

  it("serializes objects and arrays to JSON strings within CSV cells", () => {
    const complexResult: QueryExecutionResult = {
      sql: "select * from complex",
      columns: ["id", "tags", "meta"],
      rows: [
        { id: 1, tags: ["a", "b"], meta: { score: 10 } }
      ],
      rowCount: 1,
      executionMs: 1,
    };
    expect(toCsv(complexResult.columns, complexResult.rows)).toBe(
      'id,tags,meta\n1,"[""a"",""b""]","{""score"":10}"',
    );
  });

  it("serializes rows to formatted JSON", () => {
    expect(serializeResult(result, "json")).toContain('"name": "Ada"');
  });

  it("serializes BigInt values safely in JSON", () => {
    expect(stringifyJsonSafe([{ count: 3n, nested: { id: 9n } }], 2)).toBe(
      '[\n  {\n    "count": "3",\n    "nested": {\n      "id": "9"\n    }\n  }\n]',
    );
  });

  it("creates typed export blobs", () => {
    expect(createExportBlob(result, "csv").type).toBe("text/csv;charset=utf-8");
    expect(createExportBlob(result, "json").type).toBe("application/json;charset=utf-8");
  });
});
