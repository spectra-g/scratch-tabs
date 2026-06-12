import { SqlSandboxSnapshot } from "../sqlSandboxTypes";

const DESTRUCTIVE_STATEMENT_PATTERN = /\b(DROP|DELETE|UPDATE|ALTER|TRUNCATE)\b/i;

export function containsDestructiveStatement(sql: string): boolean {
  return DESTRUCTIVE_STATEMENT_PATTERN.test(sql);
}

export function createSnapshotRecord(sql: string, name?: string): SqlSandboxSnapshot {
  const createdAt = Date.now();
  return {
    id: createId("snapshot"),
    name: name?.trim() || `Snapshot ${new Date(createdAt).toLocaleTimeString()}`,
    createdAt,
    sql,
  };
}

export function addSnapshot(
  snapshots: SqlSandboxSnapshot[],
  snapshot: SqlSandboxSnapshot,
): SqlSandboxSnapshot[] {
  return [snapshot, ...snapshots].slice(0, 20);
}

function createId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}
