import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Copy, ExternalLink, FileJson } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { QueryExecutionResult } from "../sqlSandboxTypes";
import { stringifyJsonSafe, toCsv } from "../engine/exportResults";
import { useTabletTabCreation } from "../../bridge/hook";

interface ResultsTableProps {
  result: QueryExecutionResult | null;
  isRunning: boolean;
}

export function ResultsTable({ result, isRunning }: ResultsTableProps) {
  const { createBackgroundTab } = useTabletTabCreation();
  const parentRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState<{ column: string; direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    setSort(null);
  }, [result?.sql]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!result || !sort) return result?.rows ?? [];
    return [...result.rows].sort((left, right) => {
      const a = left[sort.column];
      const b = right[sort.column];
      const comparison = String(a ?? "").localeCompare(String(b ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [result, sort]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 12,
  });

  if (isRunning) {
    return <EmptyState label="Running query..." />;
  }
  if (!result) {
    return <EmptyState label="Import data or run SQL to see results" />;
  }
  if (result.error) {
    return null;
  }
  if (result.rows.length === 0 && result.columns.length === 0) {
    return <EmptyState label={`Statement completed in ${result.executionMs}ms`} />;
  }
  if (result.rows.length === 0) {
    return <EmptyState label="Query returned no rows" />;
  }

  const openCsvResult = () =>
    createBackgroundTab("SQL Result.csv", toCsv(result.columns, result.rows), "csv").catch((error) =>
      console.error("Failed to open CSV result:", error),
    );
  const openJsonResult = () =>
    createBackgroundTab("SQL Result.json", stringifyJsonSafe(result.rows, 2), "json").catch((error) =>
      console.error("Failed to open JSON result:", error),
    );
  const copyText = async (id: string, text: string) => {
    await navigator.clipboard?.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 2000);
  };
  const gridTemplateColumns = `36px repeat(${result.columns.length}, minmax(160px, 1fr))`;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-canvas" data-testid="sqlsandbox-results">
      <div className="flex items-center justify-between border-b border-base bg-surface-secondary px-3 py-2 text-xs text-secondary">
        <div>
          {result.rowCount} rows{result.truncated ? " - display capped" : ""} - {result.executionMs}ms
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openCsvResult} className="inline-flex items-center gap-1 hover:text-main">
            <ExternalLink size={13} />
            Open CSV
          </button>
          <button type="button" onClick={openJsonResult} className="inline-flex items-center gap-1 hover:text-main">
            <FileJson size={13} />
            Open JSON
          </button>
        </div>
      </div>
      <div ref={parentRef} className="custom-scrollbar min-h-0 flex-1 overflow-auto">
        <div className="w-max min-w-full">
          <div
            className="sticky top-0 z-10 grid border-b border-base bg-surface"
            style={{ gridTemplateColumns }}
          >
            <div className="border-r border-base px-2 py-2 text-xs font-semibold text-muted" />
            {result.columns.map((column) => (
              <div
                key={column}
                className="flex min-w-0 items-center gap-1 border-r border-base px-2 py-1.5 text-xs font-semibold text-main hover:bg-element-hover"
                title={`${column} - click to sort`}
              >
                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      `column-${column}`,
                      [column, ...result.rows.map((row) => formatCell(row[column]))].join("\n"),
                    ).catch((error) => console.error("Failed to copy column:", error))
                  }
                  className={`shrink-0 rounded p-0.5 transition-colors ${
                    copiedId === `column-${column}`
                      ? "bg-success/20 text-success"
                      : "text-muted hover:bg-element-hover hover:text-main"
                  }`}
                  title={copiedId === `column-${column}` ? "Copied!" : "Copy column"}
                >
                  {copiedId === `column-${column}` ? <Check size={13} /> : <Copy size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSort((current) => ({
                      column,
                      direction: current?.column === column && current.direction === "asc" ? "desc" : "asc",
                    }))
                  }
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {column}
                  {sort?.column === column ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}
                </button>
              </div>
            ))}
          </div>
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 grid w-full border-b border-base/50 text-sm"
                  style={{
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns,
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      copyText(`row-${virtualRow.index}`, toCsvRow(result.columns, row)).catch(
                        (error) => console.error("Failed to copy row:", error),
                      )
                    }
                    className={`flex items-center justify-center border-r border-base/50 transition-colors ${
                      copiedId === `row-${virtualRow.index}`
                        ? "bg-success/20 text-success"
                        : "text-muted hover:bg-element-hover hover:text-main"
                    }`}
                    title={copiedId === `row-${virtualRow.index}` ? "Copied!" : "Copy row"}
                  >
                    {copiedId === `row-${virtualRow.index}` ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  {result.columns.map((column) => (
                    <div
                      key={column}
                      className="select-text truncate border-r border-base/50 px-2 py-1 text-left text-secondary"
                      title={formatCell(row[column])}
                    >
                      {formatCell(row[column])}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center bg-canvas text-sm text-muted">{label}</div>;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object") return stringifyJsonSafe(value);
  return String(value);
}

function toCsvRow(columns: string[], row: Record<string, unknown>): string {
  return toCsv(columns, [row]).split("\n").slice(1).join("\n");
}
