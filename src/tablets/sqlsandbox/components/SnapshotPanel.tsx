import { SqlSandboxSnapshot } from "../sqlSandboxTypes";

interface SnapshotPanelProps {
  snapshots: SqlSandboxSnapshot[];
  onRestoreQuery: (sql: string) => void;
}

export function SnapshotPanel({ snapshots, onRestoreQuery }: SnapshotPanelProps) {
  return (
    <div className="border-t border-base bg-surface-secondary px-3 py-2">
      <div className="mb-2 text-xs font-semibold uppercase text-muted">Saved Queries</div>
      {snapshots.length === 0 ? (
        <div className="text-xs text-muted">No saved queries yet</div>
      ) : (
        <div className="custom-scrollbar flex gap-2 overflow-x-auto">
          {snapshots.map((snapshot) => (
            <button
              key={snapshot.id}
              type="button"
              onClick={() => onRestoreQuery(snapshot.sql)}
              className="shrink-0 rounded-md border border-base bg-surface px-2 py-1 text-left text-xs text-secondary hover:bg-element-hover"
            >
              <div className="font-medium text-main">{snapshot.name}</div>
              <div>{new Date(snapshot.createdAt).toLocaleTimeString()}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
