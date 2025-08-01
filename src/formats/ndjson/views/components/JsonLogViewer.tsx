import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight } from "lucide-react";
import { SmartViewProps } from "../../../../views/registry";
import { useJsonLogData } from "../hooks/useJsonLogData";
import { LogEntry } from "../types";
import { JsonLogToolbar } from "./JsonLogToolbar";
import { JsonLogStatsModal } from "./JsonLogStatsModal";
import { EditableCell } from "../../../csv/views/components/EditableCell";
import JsonTreeView from "../../../json/components/JsonTreeView/JsonTreeView";

interface NestedObjectPopover {
  data: any;
  position: { x: number; y: number };
  entryId: string;
  columnKey: string;
}

export const JsonLogViewer: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCell, setSelectedCell] = useState<{
    entryId: string;
    columnKey: string;
  } | null>(null);
  const [editingCellTrigger, setEditingCellTrigger] = useState<{
    entryId: string;
    columnKey: string;
  } | null>(null);
  const [isAnyCellEditing, setIsAnyCellEditing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [nestedObjectPopover, setNestedObjectPopover] = useState<NestedObjectPopover | null>(null);

  const logData = useJsonLogData(content, onContentChange);
  const {
    entries,
    columns,
    filteredEntries,
    stats,
    filter,
    loading,
    error,
    setFilter,
    updateEntry,
    toggleColumnVisibility,
    getColumnStats,
    exportFiltered,
  } = logData;

  const columnHelper = createColumnHelper<LogEntry>();

  // Handle nested object click
  const handleNestedObjectClick = useCallback((
    data: any,
    event: React.MouseEvent,
    entryId: string,
    columnKey: string,
  ) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setNestedObjectPopover({
      data,
      position: { x: rect.left, y: rect.bottom + 5 },
      entryId,
      columnKey,
    });
  }, []);

  // Close nested object popover
  const closeNestedObjectPopover = useCallback(() => {
    setNestedObjectPopover(null);
  }, []);

  // Create table columns
  const tableColumns = useMemo<ColumnDef<LogEntry, any>[]>(() => {
    const visibleColumns = columns.filter(col => col.isVisible);
    
    return [
      // Line number column
      columnHelper.display({
        id: "lineNumber",
        header: "#",
        size: 60,
        cell: ({ row }) => (
          <div className="flex h-full items-center justify-center font-mono text-gray-400 text-xs">
            {row.original.lineNumber}
          </div>
        ),
      }),
      
      // Data columns
      ...visibleColumns.map((column) =>
        columnHelper.accessor(
          (row) => row.parsedData[column.key],
          {
            id: column.id,
            header: column.name,
            size: 150,
            cell: ({ row, getValue }) => {
              const value = getValue();
              const entryId = row.original.id;
              const columnKey = column.key;

              // Handle nested objects/arrays
              if (typeof value === "object" && value !== null) {
                return (
                  <div className="flex items-center h-full px-2">
                    <button
                      onClick={(e) => handleNestedObjectClick(value, e, entryId, columnKey)}
                      className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
                      title="Click to inspect nested data"
                    >
                      <ChevronRight size={12} />
                      <span className="text-xs">
                        {Array.isArray(value) ? `Array(${value.length})` : "Object"}
                      </span>
                    </button>
                  </div>
                );
              }

              // Handle primitive values with EditableCell
              return (
                <EditableCell
                  value={String(value || "")}
                  isSelected={
                    selectedCell?.entryId === entryId &&
                    selectedCell?.columnKey === columnKey
                  }
                  isValid={true}
                  startEditing={
                    editingCellTrigger?.entryId === entryId &&
                    editingCellTrigger?.columnKey === columnKey
                  }
                  onSelect={() => {
                    setSelectedCell({ entryId, columnKey });
                    setEditingCellTrigger(null);
                  }}
                  onStartEdit={() => {
                    setSelectedCell({ entryId, columnKey });
                    setEditingCellTrigger({ entryId, columnKey });
                  }}
                  onChange={(newValue) => {
                    setEditingCellTrigger(null);
                    
                    // Try to parse as appropriate type
                    let parsedValue: any = newValue;
                    if (newValue === "null") {
                      parsedValue = null;
                    } else if (newValue === "true") {
                      parsedValue = true;
                    } else if (newValue === "false") {
                      parsedValue = false;
                    } else if (!isNaN(Number(newValue)) && newValue.trim() !== "") {
                      parsedValue = Number(newValue);
                    }
                    
                    updateEntry(entryId, columnKey, parsedValue);
                  }}
                  onEditingChange={(isEditing) => {
                    setIsAnyCellEditing(isEditing);
                    if (
                      !isEditing &&
                      editingCellTrigger?.entryId === entryId &&
                      editingCellTrigger?.columnKey === columnKey
                    ) {
                      setEditingCellTrigger(null);
                    }
                  }}
                />
              );
            },
            enableSorting: true,
          }
        )
      ),
    ];
  }, [
    columns,
    selectedCell,
    editingCellTrigger,
    updateEntry,
    handleNestedObjectClick,
  ]);

  const table = useReactTable({
    data: filteredEntries,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Virtualization setup
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 35,
    overscan: 10,
  });

  // Calculate column widths
  const columnWidths = useMemo(() => {
    const headers = table.getHeaderGroups()[0]?.headers || [];
    const rows = table.getRowModel().rows;
    const sampleSize = Math.min(50, rows.length);

    const widths: string[] = [];

    headers.forEach((header, colIndex) => {
      if (header.id === "lineNumber") {
        widths.push("60px");
      } else {
        // Sample content to determine width
        let maxWidth = header.column.columnDef.header?.toString().length || 0;

        for (let i = 0; i < sampleSize; i++) {
          const row = rows[i];
          if (row) {
            const cell = row.getVisibleCells()[colIndex];
            if (cell) {
              const cellValue = cell.getValue();
              let cellText = "";
              
              if (typeof cellValue === "object" && cellValue !== null) {
                cellText = Array.isArray(cellValue) 
                  ? `Array(${cellValue.length})` 
                  : "Object";
              } else {
                cellText = String(cellValue || "");
              }
              
              maxWidth = Math.max(maxWidth, cellText.length);
            }
          }
        }

        const minWidth = 100;
        const maxWidthPx = 300;
        const calculatedWidth = Math.min(
          Math.max(minWidth, maxWidth * 8 + 16),
          maxWidthPx,
        );
        widths.push(`${calculatedWidth}px`);
      }
    });

    return widths;
  }, [table, filteredEntries]);

  const gridTemplateColumns = columnWidths.join(" ");

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isAnyCellEditing) return;
      
      if (!selectedCell) {
        if (filteredEntries.length > 0 && columns.length > 0) {
          const firstVisibleColumn = columns.find(col => col.isVisible);
          if (firstVisibleColumn) {
            setSelectedCell({
              entryId: filteredEntries[0].id,
              columnKey: firstVisibleColumn.key,
            });
          }
        }
        return;
      }

      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        setEditingCellTrigger(selectedCell);
        return;
      }

      const currentEntryIndex = filteredEntries.findIndex(
        (entry) => entry.id === selectedCell.entryId,
      );
      const visibleColumns = columns.filter(col => col.isVisible);
      const currentColumnIndex = visibleColumns.findIndex(
        (col) => col.key === selectedCell.columnKey,
      );

      let newEntryIndex = currentEntryIndex;
      let newColumnIndex = currentColumnIndex;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newEntryIndex = Math.max(0, currentEntryIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newEntryIndex = Math.min(filteredEntries.length - 1, currentEntryIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newColumnIndex = Math.max(0, currentColumnIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newColumnIndex = Math.min(visibleColumns.length - 1, currentColumnIndex + 1);
          break;
        default:
          return;
      }

      if (newEntryIndex !== currentEntryIndex || newColumnIndex !== currentColumnIndex) {
        const newEntryId = filteredEntries[newEntryIndex].id;
        const newColumnKey = visibleColumns[newColumnIndex].key;
        setSelectedCell({ entryId: newEntryId, columnKey: newColumnKey });

        // Scroll to the selected cell
        rowVirtualizer.scrollToIndex(newEntryIndex, {
          align: "auto",
          behavior: "smooth",
        });
      }
    },
    [
      selectedCell,
      isAnyCellEditing,
      filteredEntries,
      columns,
      rowVirtualizer,
    ],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">Loading log data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full bg-gray-900 text-gray-200"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      data-testid="json-log-viewer"
    >
      {/* Toolbar */}
      <JsonLogToolbar
        filter={filter}
        onFilterChange={setFilter}
        columns={columns}
        onToggleColumnVisibility={toggleColumnVisibility}
        stats={stats}
        onShowStats={() => setShowStatsModal(true)}
        onExport={exportFiltered}
        filteredCount={filteredEntries.length}
        totalCount={entries.length}
      />

      {/* Virtualized Table */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto custom-scrollbar"
        style={{ contain: "strict" }}
        data-testid="json-log-table-container"
      >
        {/* Fixed Header */}
        <div
          className="bg-gray-800 sticky top-0 z-10 border-b border-gray-700"
          style={{
            display: "grid",
            gridTemplateColumns,
            width: "fit-content",
          }}
          data-testid="json-log-table"
        >
          {table.getHeaderGroups()[0]?.headers.map((header) => (
            <div
              key={header.id}
              className="border-r border-gray-700 p-2 text-left font-medium text-gray-300 bg-gray-800 cursor-pointer hover:bg-gray-700/50"
              data-testid="log-column-header"
              onClick={() => header.column.toggleSorting()}
            >
              <div className="flex items-center space-x-1">
                <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                {header.column.getIsSorted() && (
                  <span className="text-blue-400">
                    {header.column.getIsSorted() === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Virtual Rows Container */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
          data-testid="virtualized-log-table"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            if (!row) return null;

            return (
              <div
                key={virtualRow.key}
                className="absolute border-b border-gray-700 hover:bg-gray-800/50"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns,
                  width: "fit-content",
                }}
                data-testid="log-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} className="border-r border-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Modal */}
      {showStatsModal && (
        <JsonLogStatsModal
          columns={columns.filter(col => col.isVisible)}
          getColumnStats={getColumnStats}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {/* Nested Object Popover */}
      {nestedObjectPopover && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeNestedObjectPopover}
          />
          <div
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl max-w-2xl max-h-96 overflow-hidden"
            style={{
              left: Math.min(nestedObjectPopover.position.x, window.innerWidth - 600),
              top: Math.min(nestedObjectPopover.position.y, window.innerHeight - 400),
            }}
          >
            <div className="p-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-200">
                {nestedObjectPopover.columnKey}
              </h3>
              <button
                onClick={closeNestedObjectPopover}
                className="text-gray-400 hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <div className="h-80">
              <JsonTreeView
                jsonString={JSON.stringify(nestedObjectPopover.data, null, 2)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};