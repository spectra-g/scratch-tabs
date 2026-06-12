import { QueryHistoryItem } from "../sqlSandboxTypes";

interface QueryHistoryPanelProps {
  history: QueryHistoryItem[];
  onRestore: (sql: string) => void;
}

export function QueryHistoryPanel({ history, onRestore }: QueryHistoryPanelProps) {
  return (
    <div className="custom-scrollbar h-full overflow-auto border-l border-base bg-surface" data-testid="sqlsandbox-history">
      <div className="border-b border-base px-3 py-2 text-sm font-semibold text-main">History</div>
      {history.length === 0 ? (
        <div className="p-3 text-sm text-muted">No queries yet</div>
      ) : (
        <div className="divide-y divide-base">
          {history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onRestore(item.sql)}
              className="block w-full px-3 py-2 text-left hover:bg-element-hover"
            >
              <div className="mb-1 text-xs text-muted">
                {new Date(item.timestamp).toLocaleTimeString()} - {item.executionMs}ms - {item.rowCount} rows
              </div>
              <pre className="line-clamp-3 whitespace-pre-wrap text-xs text-secondary">{item.sql}</pre>
              {item.error && <div className="mt-1 text-xs text-danger">{item.error}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
