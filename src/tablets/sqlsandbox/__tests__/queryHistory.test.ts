import { addHistoryItem, createHistoryItem } from "../engine/queryHistory";
import { QueryExecutionResult } from "../sqlSandboxTypes";

function result(sql: string): QueryExecutionResult {
  return {
    sql,
    columns: ["value"],
    rows: [{ value: 1 }],
    rowCount: 1,
    executionMs: 5,
  };
}

describe("SQL sandbox query history", () => {
  it("creates history item summaries from execution results", () => {
    const item = createHistoryItem(result("select 1"));

    expect(item.sql).toBe("select 1");
    expect(item.rowCount).toBe(1);
    expect(item.executionMs).toBe(5);
  });

  it("prepends and caps history", () => {
    const history = Array.from({ length: 55 }, (_, index) => createHistoryItem(result(`select ${index}`))).reduce(
      (items, item) => addHistoryItem(items, item),
      [] as ReturnType<typeof createHistoryItem>[],
    );

    expect(history).toHaveLength(50);
    expect(history[0].sql).toBe("select 54");
  });
});
