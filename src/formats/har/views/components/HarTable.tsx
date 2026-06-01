import React, { useRef, useMemo, useState, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ShieldAlert } from "lucide-react";
import { ProcessedEntry, StatusCategory } from "../types";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(ms: number): string {
  if (ms < 0) return "—";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

const STATUS_BADGE: Record<StatusCategory, string> = {
  "1xx": "text-blue-500",
  "2xx": "text-green-500",
  "3xx": "text-yellow-400",
  "4xx": "text-orange-500",
  "5xx": "text-red-500",
  unknown: "text-secondary",
};

const METHOD_COLOR: Record<string, string> = {
  GET: "text-blue-400",
  POST: "text-green-400",
  PUT: "text-yellow-400",
  PATCH: "text-yellow-300",
  DELETE: "text-red-400",
  HEAD: "text-purple-400",
};

const ROW_HEIGHT = 36;

interface HarTableProps {
  entries: ProcessedEntry[];
  selectedId: string | null;
  onSelectEntry: (entry: ProcessedEntry | null) => void;
  selectedEntryIndexes: Set<number>;
  onToggleEntrySelection: (index: number) => void;
  onToggleAllVisible: () => void;
  allVisibleSelected: boolean;
}

const columnHelper = createColumnHelper<ProcessedEntry>();

export const HarTable: React.FC<HarTableProps> = ({
  entries,
  selectedId,
  onSelectEntry,
  selectedEntryIndexes,
  onToggleEntrySelection,
  onToggleAllVisible,
  allVisibleSelected,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const columns = useMemo<ColumnDef<ProcessedEntry, unknown>[]>(
    () => [
      columnHelper.display({
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={onToggleAllVisible}
            onClick={(event) => event.stopPropagation()}
            className="rounded border-base bg-element"
            aria-label="Select all visible HAR requests"
          />
        ),
        size: 44,
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedEntryIndexes.has(row.original.index)}
            onChange={() => onToggleEntrySelection(row.original.index)}
            onClick={(event) => event.stopPropagation()}
            className="rounded border-base bg-element"
            aria-label={`Select HAR request ${row.original.index + 1}`}
          />
        ),
      }),
      columnHelper.display({
        id: "index",
        header: "#",
        size: 48,
        cell: ({ row }) => (
          <span className="text-secondary text-xs font-mono">{row.original.index + 1}</span>
        ),
      }),
      columnHelper.accessor("method", {
        header: "Method",
        size: 72,
        cell: ({ getValue }) => {
          const m = getValue() as string;
          return (
            <span className={`text-xs font-bold font-mono ${METHOD_COLOR[m] ?? "text-secondary"}`}>{m}</span>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        size: 64,
        cell: ({ row, getValue }) => (
          <span className={`text-xs font-mono ${STATUS_BADGE[row.original.statusCategory]}`}>
            {getValue() || "—"}
          </span>
        ),
      }),
      columnHelper.accessor((row) => row.entry.request.url, {
        id: "url",
        header: "URL",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs text-secondary flex-shrink-0">{row.original.hostname}</span>
            <span className="text-xs text-main truncate">{row.original.pathname}</span>
            {row.original.hasSensitiveData && (
              <ShieldAlert size={10} className="flex-shrink-0 text-yellow-500" title="Contains sensitive data" />
            )}
          </div>
        ),
      }),
      columnHelper.accessor("resourceType", {
        header: "Type",
        size: 90,
        cell: ({ getValue }) => (
          <span className="text-xs text-secondary">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("mimeType", {
        header: "MIME",
        size: 140,
        cell: ({ getValue }) => (
          <span className="text-xs text-secondary truncate block">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("transferSize", {
        header: "Transferred",
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-xs text-secondary font-mono">{formatBytes(getValue())}</span>
        ),
      }),
      columnHelper.accessor("contentSize", {
        header: "Size",
        size: 90,
        cell: ({ getValue }) => (
          <span className="text-xs text-secondary font-mono">{formatBytes(getValue())}</span>
        ),
      }),
      columnHelper.accessor("totalTime", {
        header: "Time",
        size: 90,
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-secondary">{formatTime(getValue())}</span>
        ),
      }),
      columnHelper.accessor("startOffset", {
        header: "Start",
        size: 90,
        cell: ({ getValue }) => (
          <span className="text-xs font-mono text-secondary">{formatTime(getValue())}</span>
        ),
      }),
    ],
    [allVisibleSelected, onToggleAllVisible, onToggleEntrySelection, selectedEntryIndexes],
  );

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const handleRowClick = useCallback(
    (entry: ProcessedEntry) => {
      onSelectEntry(selectedId === entry.id ? null : entry);
    },
    [selectedId, onSelectEntry],
  );

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary text-sm">
        No requests match the current filter.
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="flex-none flex items-center border-b border-base bg-surface sticky top-0 z-10">
        {table.getHeaderGroups()[0]?.headers.map((header) => (
          <div
            key={header.id}
            className="flex items-center px-2 py-1.5 text-xs font-medium text-secondary border-r border-base cursor-pointer hover:bg-element-hover select-none"
            style={{ width: header.column.getSize(), minWidth: header.id === "url" ? 200 : undefined, flex: header.id === "url" ? "1 1 0%" : `0 0 ${header.column.getSize()}px` }}
            onClick={() => header.column.toggleSorting()}
          >
            <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
            {header.column.getIsSorted() && (
              <span className="ml-1 text-primary">{header.column.getIsSorted() === "asc" ? "↑" : "↓"}</span>
            )}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
          {rowVirtualizer.getVirtualItems().map((vRow) => {
            const row = table.getRowModel().rows[vRow.index];
            if (!row) return null;
            const entry = row.original;
            const isSelected = entry.id === selectedId;

            return (
              <div
                key={vRow.key}
                style={{
                  position: "absolute",
                  top: vRow.start,
                  left: 0,
                  right: 0,
                  height: ROW_HEIGHT,
                  display: "flex",
                  alignItems: "stretch",
                }}
                className={`border-b border-base cursor-pointer transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-element-hover"}`}
                onClick={() => handleRowClick(entry)}
                data-testid="har-table-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="flex items-center px-2 border-r border-base overflow-hidden"
                    style={{
                      width: cell.column.getSize(),
                      minWidth: cell.column.id === "url" ? 200 : undefined,
                      flex: cell.column.id === "url" ? "1 1 0%" : `0 0 ${cell.column.getSize()}px`,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
