import { Check, Database, ExternalLink, FileText, Pencil, Plus, Table2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { RegisteredSource, SandboxSchema } from "../sqlSandboxTypes";
import { quoteIdentifier } from "../engine/sourceRegistry";

interface SchemaSidebarProps {
  schema: SandboxSchema;
  onInsertSql: (sql: string) => void;
  onRenameSource: (sourceId: string, newTableName: string) => void;
  onDeleteSource: (sourceId: string) => void;
  onExportSourceCsv: (tableName: string, sourceName: string) => void;
}

export function SchemaSidebar({
  schema,
  onInsertSql,
  onRenameSource,
  onDeleteSource,
  onExportSourceCsv,
}: SchemaSidebarProps) {
  const relations = [...schema.views, ...schema.tables];
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [editingTableName, setEditingTableName] = useState("");

  const startRename = (source: RegisteredSource) => {
    setEditingSourceId(source.id);
    setEditingTableName(source.tableName);
  };

  const cancelRename = () => {
    setEditingSourceId(null);
    setEditingTableName("");
  };

  const submitRename = (sourceId: string, currentTableName: string) => {
    const trimmed = editingTableName.trim();
    if (trimmed && trimmed !== currentTableName) {
      onRenameSource(sourceId, trimmed);
    }
    setEditingSourceId(null);
    setEditingTableName("");
  };

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-base bg-surface" data-testid="sqlsandbox-schema">
      <div className="border-b border-base px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-main">
          <Database size={16} />
          Schema
        </div>
      </div>
      <div className="custom-scrollbar flex-1 overflow-auto p-3">
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted">
            <FileText size={14} />
            Sources
          </div>
          {schema.sources.length === 0 ? (
            <div className="text-xs text-muted">No files loaded</div>
          ) : (
            <div className="space-y-2">
              {schema.sources.map((source) => (
                <div key={source.id} className="rounded-md border border-base bg-surface-secondary p-2">
                  {editingSourceId === source.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editingTableName}
                        onChange={(e) => setEditingTableName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRename(source.id, source.tableName);
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="min-w-0 flex-1 rounded border border-primary bg-surface px-1.5 py-0.5 text-xs text-main focus:outline-none"
                        data-testid="source-rename-input"
                      />
                      <button
                        type="button"
                        onClick={() => submitRename(source.id, source.tableName)}
                        className="shrink-0 rounded p-0.5 text-success hover:bg-element-hover"
                        title="Confirm rename"
                        data-testid="source-rename-confirm"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="shrink-0 rounded p-0.5 text-muted hover:bg-element-hover hover:text-main"
                        title="Cancel rename"
                        data-testid="source-rename-cancel"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-sm text-main" title={source.name}>
                        {source.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => startRename(source)}
                        className="shrink-0 rounded p-0.5 text-muted hover:bg-element-hover hover:text-main"
                        title="Rename table"
                        data-testid="source-rename-btn"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSource(source.id)}
                        className="shrink-0 rounded p-0.5 text-muted hover:bg-element-hover hover:text-danger"
                        title="Delete source"
                        data-testid="source-delete-btn"
                      >
                        <Trash2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onExportSourceCsv(source.tableName, source.name)}
                        className="shrink-0 rounded p-0.5 text-muted hover:bg-element-hover hover:text-main"
                        title="Open source as CSV in a new tab"
                        data-testid="source-export-csv-btn"
                      >
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  )}

                  <div className="mt-1 text-xs text-muted">
                    {source.kind.toUpperCase()} · {formatBytes(source.size)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted">
            <Table2 size={14} />
            Tables & Views
          </div>
          {relations.length === 0 ? (
            <div className="text-xs text-muted">Import a source to inspect columns</div>
          ) : (
            <div className="space-y-3">
              {relations.map((table) => (
                <div key={table.name} className="rounded-md border border-base bg-surface-secondary">
                  <button
                    type="button"
                    onClick={() => onInsertSql(`SELECT * FROM ${quoteIdentifier(table.name)} LIMIT 100;`)}
                    className="flex w-full items-center justify-between gap-2 border-b border-base px-2 py-2 text-left text-sm font-medium text-main hover:bg-element-hover"
                  >
                    <span className="truncate">{table.name}</span>
                    <Plus size={13} className="text-muted" />
                  </button>
                  <div className="custom-scrollbar max-h-56 overflow-auto">
                    {table.columns.map((column) => (
                      <button
                        key={column.name}
                        type="button"
                        onClick={() => onInsertSql(quoteIdentifier(column.name))}
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-element-hover"
                      >
                        <span className="truncate text-secondary">{column.name}</span>
                        <span className="shrink-0 text-muted">{column.friendlyType}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
