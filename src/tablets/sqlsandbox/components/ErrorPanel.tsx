import { AlertTriangle } from "lucide-react";
import { SqlExecutionError } from "../sqlSandboxTypes";

export function ErrorPanel({ error }: { error?: SqlExecutionError }) {
  if (!error) return null;

  return (
    <div className="border-t border-danger/30 bg-danger-subtle p-3 text-sm" data-testid="sqlsandbox-error">
      <div className="mb-1 flex items-center gap-2 font-medium text-danger">
        <AlertTriangle size={16} />
        SQL Error
      </div>
      <pre className="custom-scrollbar max-h-32 overflow-auto whitespace-pre-wrap text-danger">{error.message}</pre>
      {(error.line || error.column) && (
        <div className="mt-1 text-xs text-danger/80">
          {error.line ? `Line ${error.line}` : ""}
          {error.line && error.column ? ", " : ""}
          {error.column ? `Column ${error.column}` : ""}
        </div>
      )}
    </div>
  );
}
