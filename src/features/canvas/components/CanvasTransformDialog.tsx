import { useMemo, useState } from "react";
import { operationRegistry } from "../../../services/pipeline/OperationRegistry";
import type { OperationDefinition } from "../../../services/pipeline/types";
import { resolveDefaultParams } from "../transforms/transformExecutor";
import { CanvasTransformParamsForm } from "./CanvasTransformParamsForm";

interface CanvasTransformDialogProps {
  sourceTitle: string;
  onClose: () => void;
  onRun: (
    operationId: string,
    params: Record<string, unknown>,
  ) => Promise<string>;
}

const visibleOperations = (): OperationDefinition[] =>
  operationRegistry.getAll();

/**
 * Quick transform picker: search operations, tweak params, run.
 * Execution lives in useCanvasItems.quickTransform; this dialog only collects intent.
 */
export const CanvasTransformDialog = ({
  sourceTitle,
  onClose,
  onRun,
}: CanvasTransformDialogProps) => {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const operations = useMemo(() => {
    const all = visibleOperations();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return all.slice(0, 50);
    return operationRegistry.search(query).slice(0, 50);
  }, [query]);

  const selected = selectedId
    ? (operations.find((op) => op.id === selectedId) ??
      operationRegistry.getById(selectedId) ??
      null)
    : null;

  const select = (operation: OperationDefinition) => {
    setSelectedId(operation.id);
    setParams(resolveDefaultParams(operation));
    setError(null);
  };

  const run = async () => {
    if (!selected || isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      await onRun(selected.id, params);
      onClose();
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "Transform failed.",
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4"
      data-testid="canvas-transform-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick transform ${sourceTitle}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-base bg-surface shadow-xl">
        <header className="flex items-center justify-between border-b border-base px-4 py-3">
          <h2 className="text-sm font-semibold text-main">
            Quick transform <span className="text-muted">{sourceTitle}</span>
          </h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-secondary hover:bg-element-hover"
            data-testid="canvas-transform-close"
            aria-label="Close quick transform"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="border-b border-base px-4 py-2">
          <input
            type="search"
            className="w-full rounded border border-base bg-surface px-2 py-1.5 text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="canvas-transform-search"
            aria-label="Search transforms"
            placeholder="Search transforms, e.g. base64, jq, prettify..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
          />
        </div>

        <div className="min-h-32 flex-1 overflow-auto px-2 py-2">
          {operations.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted" data-testid="canvas-transform-empty">
              No transforms match this search.
            </p>
          ) : (
            <ul role="listbox" aria-label="Available transforms">
              {operations.map((operation) => (
                <li key={operation.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedId === operation.id}
                    data-testid={`canvas-transform-op-${operation.id}`}
                    className={`flex w-full flex-col gap-0.5 rounded px-2 py-1.5 text-left hover:bg-element-hover ${
                      selectedId === operation.id ? "bg-element-hover ring-1 ring-primary" : ""
                    }`}
                    onClick={() => select(operation)}
                    onDoubleClick={() => {
                      select(operation);
                      void run();
                    }}
                  >
                    <span className="text-sm font-medium text-main">{operation.name}</span>
                    <span className="text-xs text-muted">
                      {operation.id} - {operation.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && selected.parameters.length > 0 ? (
          <div className="max-h-80 shrink-0 overflow-auto border-t border-base px-4 py-3">
            <CanvasTransformParamsForm
              parameters={selected.parameters}
              values={params}
              onChange={(name, value) =>
                setParams((current) => ({ ...current, [name]: value }))
              }
            />
          </div>
        ) : null}

        {error ? (
          <p className="border-t border-danger/40 px-4 py-2 text-sm text-danger" role="alert" data-testid="canvas-transform-error">
            {error}
          </p>
        ) : null}

        <footer className="flex items-center justify-end gap-2 border-t border-base px-4 py-3">
          <button
            type="button"
            className="rounded px-3 py-1.5 text-sm text-secondary hover:bg-element-hover"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="canvas-transform-run"
            disabled={!selected || isRunning}
            onClick={() => void run()}
          >
            {isRunning ? "Running..." : "Create linked card"}
          </button>
        </footer>
      </div>
    </div>
  );
};
