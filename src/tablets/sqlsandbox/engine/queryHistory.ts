import { QueryExecutionResult, QueryHistoryItem } from "../sqlSandboxTypes";

const MAX_HISTORY_ITEMS = 50;

export function createHistoryItem(result: QueryExecutionResult): QueryHistoryItem {
  return {
    id: createId("query"),
    sql: result.sql,
    timestamp: Date.now(),
    executionMs: result.executionMs,
    rowCount: result.rowCount,
    error: result.error?.message,
  };
}

export function addHistoryItem(
  history: QueryHistoryItem[],
  item: QueryHistoryItem,
): QueryHistoryItem[] {
  return [item, ...history].slice(0, MAX_HISTORY_ITEMS);
}

function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}
