import * as React from "react";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
import {
  Plus,
  Minus,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Copy,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import { SmartViewProps } from "../../../../views/registry";
import { useCsvData } from "../hooks/useCsvData";
import { CsvRow } from "../types";
import { ColumnStatsPopover } from "./ColumnStatsPopover";
import { CsvToolbar } from "./CsvToolbar";
import { CsvSnapshotsPanel } from "./CsvSnapshotsPanel";
import { CsvDiagnosticsFooter } from "./CsvDiagnosticsFooter";
import { useRootStore } from "../../../../stores/rootStore";
import { createTab } from "../../../../utils/tabUtils";
import { EditableCell } from "./EditableCell";
import { MaskedCell } from "./MaskedCell";
import { isSensitiveHeader } from "../utils/sensitiveUtils";

interface DuplicateGroup {
  rowString: string;
  rowIds: string[];
  count: number;
}

export const CsvTableViewer: React.FC<SmartViewProps> = ({
  content,
  onContentChange,
}) => {
  const { addBackgroundTab } = useRootStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [editingCellTrigger, setEditingCellTrigger] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);
  const [isAnyCellEditing, setIsAnyCellEditing] = useState(false);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState("");
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [showSnapshotsPanel, setShowSnapshotsPanel] = useState(false);
  const [duplicateSearchPerformed, setDuplicateSearchPerformed] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatches, setSearchMatches] = useState<Array<{rowId: string, columnId: string, rowIndex: number}>>([]);
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    rowId: string;
    columnId: string;
  } | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  // Stats popover state
  const [statsPopover, setStatsPopover] = useState<{
    columnId: string;
    position: { x: number; y: number };
  } | null>(null);

  // Masking state
  const [maskedColumns, setMaskedColumns] = useState<Set<string>>(new Set());

  const csvData = useCsvData(content, onContentChange);
  const {
    data,
    columns,
    loading,
    error,
    diagnostics,
    isValid,
    updateCell,
    addRow,
    deleteRow,
    deleteRows,
    duplicateRow,
    addColumn,
    deleteColumn,
    duplicateColumn,
    renameColumn,
    canUndo,
    canRedo,
    undo,
    redo,
    snapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    getColumnStats,
    insertAndShift,
    toCsv,
    toJson,
    toMarkdown,
    toSql,
  } = csvData;

  // Auto-detect and mask sensitive columns
  useEffect(() => {
    if (columns.length > 0) {
      const newMaskedColumns = new Set<string>();
      columns.forEach((column) => {
        if (isSensitiveHeader(column.name)) {
          newMaskedColumns.add(column.id);
        }
      });
      setMaskedColumns(newMaskedColumns);
    }
  }, [columns]);

  // Masking functions
  const toggleColumnMask = useCallback((columnId: string) => {
    setMaskedColumns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  }, []);

  const isColumnMasked = useCallback(
    (columnId: string) => {
      return maskedColumns.has(columnId);
    },
    [maskedColumns],
  );


  // Check if a cell is highlighted by search
  const isCellSearchMatch = useCallback((rowId: string, columnId: string) => {
    return searchMatches.some(match => match.rowId === rowId && match.columnId === columnId);
  }, [searchMatches]);

  // Check if a cell is the active search match
  const isCellActiveSearchMatch = useCallback((rowId: string, columnId: string) => {
    if (searchMatches.length === 0) return false;
    const activeMatch = searchMatches[searchActiveIndex];
    return activeMatch && activeMatch.rowId === rowId && activeMatch.columnId === columnId;
  }, [searchMatches, searchActiveIndex]);

  // Context menu functions
  const handleCellRightClick = useCallback((e: React.MouseEvent, rowId: string, columnId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      rowId,
      columnId,
    });
    
    // Add to selected cells
    const cellKey = `${rowId}-${columnId}`;
    setSelectedCells(prev => new Set([...Array.from(prev), cellKey]));
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Check if shift right action is safe for selected cells
  const canShiftRight = useCallback(() => {
    if (selectedCells.size === 0) return false;
    
    // Get all selected cells and group by column
    const cellsByColumn = new Map<string, string[]>();
    selectedCells.forEach(cellKey => {
      const [rowId, columnId] = cellKey.split('-');
      if (!cellsByColumn.has(columnId)) {
        cellsByColumn.set(columnId, []);
      }
      cellsByColumn.get(columnId)!.push(rowId);
    });
    
    // Check if all selected cells are in the same column
    if (cellsByColumn.size !== 1) return false;
    
    // Check if each selected row has fewer columns than the header
    const selectedRowIds = Array.from(cellsByColumn.values())[0];
    return selectedRowIds.every(rowId => {
      const row = data.find(r => r.id === rowId);
      return row && row.cells.length < columns.length;
    });
  }, [selectedCells, data, columns]);

  // Handle shift right action
  const handleShiftRight = useCallback(() => {
    if (!canShiftRight()) return;
    
    const cellIdentifiers = Array.from(selectedCells).map(cellKey => {
      const [rowId, columnId] = cellKey.split('-');
      return { rowId, columnId };
    });
    
    // Execute the shift right operation
    insertAndShift(cellIdentifiers);
    
    // Close context menu and clear selection
    setContextMenu(null);
    setSelectedCells(new Set());
  }, [canShiftRight, selectedCells, insertAndShift]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu, closeContextMenu]);

  // Efficient duplicate detection using hash map - O(n) complexity
  const findDuplicates = useCallback(() => {
    const rowMap = new Map<string, string[]>();

    // Single pass through data to build hash map
    data.forEach((row) => {
      // Create row string by joining all cell values
      const rowString = row.cells.map((cell) => cell.value || "").join("|");

      if (rowMap.has(rowString)) {
        rowMap.get(rowString)!.push(row.id);
      } else {
        rowMap.set(rowString, [row.id]);
      }
    });

    // Filter to only include groups with more than one row (duplicates)
    const duplicates: DuplicateGroup[] = [];
    rowMap.forEach((rowIds, rowString) => {
      if (rowIds.length > 1) {
        duplicates.push({
          rowString,
          rowIds,
          count: rowIds.length,
        });
      }
    });

    setDuplicateGroups(duplicates);
    setShowDuplicatesOnly(duplicates.length > 0);
    setDuplicateSearchPerformed(true);
  }, [data]);

  const clearDuplicates = useCallback(() => {
    setDuplicateGroups([]);
    setShowDuplicatesOnly(false);
    setDuplicateSearchPerformed(false);
  }, []);

  const removeDuplicateRows = useCallback(() => {
    if (duplicateGroups.length === 0) return;

    // Collect all duplicate row IDs except the first one in each group
    const rowsToDelete: string[] = [];
    duplicateGroups.forEach((group) => {
      // Keep the first row, delete the rest
      rowsToDelete.push(...group.rowIds.slice(1));
    });

    // Delete all duplicate rows in a single batch operation
    if (rowsToDelete.length > 0) {
      deleteRows(rowsToDelete);
    }

    // Clear duplicates state
    clearDuplicates();
  }, [duplicateGroups, deleteRows, clearDuplicates]);

  // Export functions
  const exportToTab = useCallback(
    (content: string, filename: string, language: string) => {
      const tab = createTab({
        title: filename,
        content,
        language,
      });
      addBackgroundTab(tab);
    },
    [addBackgroundTab],
  );

  const handleExportCsv = useCallback(() => {
    const csvContent = toCsv();
    exportToTab(csvContent, "Export.csv", "csv");
  }, [toCsv, exportToTab]);

  const handleExportJson = useCallback(() => {
    const jsonContent = toJson();
    exportToTab(jsonContent, "Export.json", "json");
  }, [toJson, exportToTab]);

  const handleExportMarkdown = useCallback(() => {
    const markdownContent = toMarkdown();
    exportToTab(markdownContent, "Export.md", "markdown");
  }, [toMarkdown, exportToTab]);

  const handleExportSql = useCallback(
    (tableName: string) => {
      const sqlContent = toSql(tableName);
      exportToTab(sqlContent, `${tableName}_inserts.sql`, "sql");
    },
    [toSql, exportToTab],
  );

  const columnHelper = createColumnHelper<CsvRow>();

  // Get all duplicate row IDs for highlighting
  const duplicateRowIds = useMemo(() => {
    const ids = new Set<string>();
    duplicateGroups.forEach((group) => {
      group.rowIds.forEach((id) => ids.add(id));
    });
    return ids;
  }, [duplicateGroups]);

  // Filter data based on duplicate view mode
  const filteredData = useMemo(() => {
    if (!showDuplicatesOnly) return data;
    return data.filter((row) => duplicateRowIds.has(row.id));
  }, [data, showDuplicatesOnly, duplicateRowIds]);

  const tableColumns = useMemo<ColumnDef<CsvRow, any>[]>(() => {
    return [
      columnHelper.display({
        id: "rowNumber",
        header: "#",
        size: 50,
        cell: ({ row }) => (
          <div className="flex h-full items-center justify-center font-mono text-gray-400">
            {row.index + 1}
          </div>
        ),
      }),
      ...columns.map((column, columnIndex) =>
        columnHelper.accessor((row) => row.cells[columnIndex]?.value || "", {
          id: column.id,
          header: ({ column: tableColumn }) => (
            <div className="flex items-center justify-between min-w-0">
              {editingHeader === column.id ? (
                <input
                  className="bg-gray-800 text-white font-medium text-sm border-none outline-none flex-1 px-1 py-0.5 rounded"
                  value={headerEditValue}
                  onChange={(e) => setHeaderEditValue(e.target.value)}
                  onBlur={() => {
                    if (headerEditValue.trim())
                      renameColumn(column.id, headerEditValue.trim());
                    setEditingHeader(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (headerEditValue.trim())
                        renameColumn(column.id, headerEditValue.trim());
                      setEditingHeader(null);
                    } else if (e.key === "Escape") setEditingHeader(null);
                  }}
                  autoFocus
                />
              ) : (
                <div className="flex items-center space-x-2 flex-1">
                  <div
                    className="flex-1 cursor-pointer hover:bg-gray-700/30 px-1 py-0.5 rounded"
                    onDoubleClick={() => {
                      setEditingHeader(column.id);
                      setHeaderEditValue(column.name);
                    }}
                    title="Double-click to rename"
                  >
                    {column.name}
                  </div>
                  <button
                    onClick={() => tableColumn.toggleSorting()}
                    className="p-1 hover:bg-gray-700/30 rounded"
                    title="Sort column"
                    data-testid="sort-column"
                  >
                    {tableColumn.getIsSorted() === "asc" ? (
                      <SortAsc size={12} />
                    ) : tableColumn.getIsSorted() === "desc" ? (
                      <SortDesc size={12} />
                    ) : (
                      <ArrowUpDown size={12} className="opacity-60" />
                    )}
                  </button>
                </div>
              )}
              <div className="flex items-center space-x-1 ml-2">
                {/* Mask toggle button for sensitive columns */}
                {isSensitiveHeader(column.name) && (
                  <button
                    onClick={() => toggleColumnMask(column.id)}
                    className={`p-1 rounded hover:bg-gray-600 transition-all ${
                      isColumnMasked(column.id)
                        ? "text-blue-400"
                        : "text-gray-400"
                    }`}
                    title={
                      isColumnMasked(column.id)
                        ? "Unmask sensitive column"
                        : "Mask sensitive column"
                    }
                  >
                    {isColumnMasked(column.id) ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setStatsPopover({
                      columnId: column.id,
                      position: { x: rect.left, y: rect.bottom + 5 },
                    });
                  }}
                  title="Column statistics"
                >
                  <BarChart3 size={12} />
                </button>
                <button
                  onClick={() => addColumn(columnIndex + 1)}
                  title="Add column after"
                  data-testid="add-column-after"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => duplicateColumn(column.id)}
                  title="Duplicate column"
                >
                  <Copy size={12} />
                </button>
                <button
                  onClick={() => deleteColumn(column.id)}
                  title="Delete column"
                >
                  <Minus size={12} />
                </button>
              </div>
            </div>
          ),
          cell: ({ row, getValue }) => {
            const isMasked = isColumnMasked(column.id);
            
            // Since we need row and column indices for data attributes,
            // we'll add them as data attributes in the containing div in the virtualized render

            if (isMasked) {
              return (
                <MaskedCell
                  value={getValue() as string}
                  isSelected={
                    selectedCell?.rowId === row.original.id &&
                    selectedCell?.columnId === column.id
                  }
                  isValid={row.original.cells[columnIndex]?.isValid ?? true}
                  error={row.original.cells[columnIndex]?.error}
                  startEditing={
                    editingCellTrigger?.rowId === row.original.id &&
                    editingCellTrigger?.columnId === column.id
                  }
                  isMasked={isMasked}
                  isSearchMatch={isCellSearchMatch(row.original.id, column.id)}
                  isActiveSearchMatch={isCellActiveSearchMatch(row.original.id, column.id)}
                  searchQuery={searchQuery}
                  onRightClick={(e) => handleCellRightClick(e, row.original.id, column.id)}
                  onSelect={() => {
                    setSelectedCell({
                      rowId: row.original.id,
                      columnId: column.id,
                    });
                    setEditingCellTrigger(null);
                  }}
                  onStartEdit={() => {
                    setSelectedCell({
                      rowId: row.original.id,
                      columnId: column.id,
                    });
                    setEditingCellTrigger({
                      rowId: row.original.id,
                      columnId: column.id,
                    });
                  }}
                  onChange={(newValue) => {
                    // Clear the editing trigger immediately when data changes
                    setEditingCellTrigger(null);
                    updateCell(row.original.id, column.id, newValue);
                  }}
                  onEditingChange={(isEditing) => {
                    setIsAnyCellEditing(isEditing);
                    // Only clear editingCellTrigger if this specific cell was the one being edited
                    if (
                      !isEditing &&
                      editingCellTrigger?.rowId === row.original.id &&
                      editingCellTrigger?.columnId === column.id
                    ) {
                      setEditingCellTrigger(null);
                    }
                  }}
                  onToggleMask={() => toggleColumnMask(column.id)}
                />
              );
            }

            return (
              <EditableCell
                value={getValue() as string}
                isSelected={
                  selectedCell?.rowId === row.original.id &&
                  selectedCell?.columnId === column.id
                }
                isValid={row.original.cells[columnIndex]?.isValid ?? true}
                error={row.original.cells[columnIndex]?.error}
                startEditing={
                  editingCellTrigger?.rowId === row.original.id &&
                  editingCellTrigger?.columnId === column.id
                }
                isSearchMatch={isCellSearchMatch(row.original.id, column.id)}
                isActiveSearchMatch={isCellActiveSearchMatch(row.original.id, column.id)}
                searchQuery={searchQuery}
                onRightClick={(e) => handleCellRightClick(e, row.original.id, column.id)}
                onSelect={() => {
                  setSelectedCell({
                    rowId: row.original.id,
                    columnId: column.id,
                  });
                  setEditingCellTrigger(null);
                }}
                onStartEdit={() => {
                  setSelectedCell({
                    rowId: row.original.id,
                    columnId: column.id,
                  });
                  setEditingCellTrigger({
                    rowId: row.original.id,
                    columnId: column.id,
                  });
                }}
                onChange={(newValue) => {
                  // Clear the editing trigger immediately when data changes
                  setEditingCellTrigger(null);
                  updateCell(row.original.id, column.id, newValue);
                }}
                onEditingChange={(isEditing) => {
                  setIsAnyCellEditing(isEditing);
                  // Only clear editingCellTrigger if this specific cell was the one being edited
                  if (
                    !isEditing &&
                    editingCellTrigger?.rowId === row.original.id &&
                    editingCellTrigger?.columnId === column.id
                  ) {
                    setEditingCellTrigger(null);
                  }
                }}
              />
            );
          },
          enableSorting: true,
        }),
      ),
      columnHelper.display({
        id: "actions",
        header: "",
        size: 60,
        cell: ({ row }) => (
          <div className="flex h-full items-center justify-center space-x-1">
            <button onClick={() => addRow(row.index + 1)} title="Add row below">
              <Plus size={14} />
            </button>
            <button
              onClick={() => duplicateRow(row.original.id)}
              title="Duplicate row"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => deleteRow(row.original.id)}
              title="Delete row"
            >
              <Minus size={14} />
            </button>
          </div>
        ),
      }),
    ];
  }, [
    columns,
    editingHeader,
    headerEditValue,
    addColumn,
    deleteColumn,
    duplicateColumn,
    addRow,
    deleteRow,
    duplicateRow,
    updateCell,
    renameColumn,
    selectedCell,
    editingCellTrigger,
    setStatsPopover,
    isColumnMasked,
    toggleColumnMask,
  ]);

  const table = useReactTable({
    data: filteredData,
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
    estimateSize: () => 35, // Estimated row height in pixels
    overscan: 10, // Render extra rows outside viewport for smooth scrolling
  });

  // Search functionality (moved here to access filteredData and rowVirtualizer)
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchMatches([]);
      setSearchActiveIndex(0);
      return;
    }

    const matches: Array<{rowId: string, columnId: string, rowIndex: number}> = [];
    const lowerQuery = query.toLowerCase();

    filteredData.forEach((row, rowIndex) => {
      row.cells.forEach((cell, cellIndex) => {
        if (cell.value && cell.value.toLowerCase().includes(lowerQuery)) {
          const column = columns[cellIndex];
          if (column) {
            matches.push({
              rowId: row.id,
              columnId: column.id,
              rowIndex,
            });
          }
        }
      });
    });

    setSearchMatches(matches);
    setSearchActiveIndex(matches.length > 0 ? 0 : 0);
  }, [filteredData, columns]);

  // Update search when query or data changes
  useEffect(() => {
    performSearch(searchQuery);
  }, [searchQuery, performSearch]);

  // Search navigation functions
  const handleSearchNext = useCallback(() => {
    if (searchMatches.length > 0) {
      const nextIndex = (searchActiveIndex + 1) % searchMatches.length;
      setSearchActiveIndex(nextIndex);
      
      // Scroll to the active match
      const match = searchMatches[nextIndex];
      rowVirtualizer.scrollToIndex(match.rowIndex, {
        align: "center",
        behavior: "smooth",
      });
    }
  }, [searchMatches, searchActiveIndex, rowVirtualizer]);

  const handleSearchPrevious = useCallback(() => {
    if (searchMatches.length > 0) {
      const prevIndex = searchActiveIndex === 0 ? searchMatches.length - 1 : searchActiveIndex - 1;
      setSearchActiveIndex(prevIndex);
      
      // Scroll to the active match
      const match = searchMatches[prevIndex];
      rowVirtualizer.scrollToIndex(match.rowIndex, {
        align: "center",
        behavior: "smooth",
      });
    }
  }, [searchMatches, searchActiveIndex, rowVirtualizer]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchMatches([]);
    setSearchActiveIndex(0);
  }, []);

  // Calculate column widths based on content sampling
  const columnWidths = useMemo(() => {
    const headers = table.getHeaderGroups()[0]?.headers || [];
    const rows = table.getRowModel().rows;
    const sampleSize = Math.min(50, rows.length); // Sample first 50 rows for width calculation

    const widths: string[] = [];

    headers.forEach((header, colIndex) => {
      if (colIndex === 0) {
        // Row number column - calculate based on max row number
        const maxRowNum = Math.max(rows.length, 999);
        const width = Math.max(40, maxRowNum.toString().length * 12 + 20);
        widths.push(`${width}px`);
      } else if (header.id === "actions") {
        // Actions column - fixed width for icons
        widths.push("80px");
      } else {
        // Data columns - sample content to determine width
        let maxWidth = header.column.columnDef.header?.toString().length || 0;

        // Sample rows to find max content width
        for (let i = 0; i < sampleSize; i++) {
          const row = rows[i];
          if (row) {
            const cell = row.getVisibleCells()[colIndex];
            if (cell) {
              const cellValue = cell.getValue();
              const cellText = cellValue?.toString() || "";
              maxWidth = Math.max(maxWidth, cellText.length);
            }
          }
        }

        // Convert character count to approximate pixel width
        // Average character width ~8px + padding
        const minWidth = 60;
        const maxWidthPx = 300; // Cap at 300px
        const calculatedWidth = Math.min(
          Math.max(minWidth, maxWidth * 8 + 16),
          maxWidthPx,
        );
        widths.push(`${calculatedWidth}px`);
      }
    });

    return widths;
  }, [table, csvData]); // Depend on csvData to recalculate when data changes

  const gridTemplateColumns = columnWidths.join(" ");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (isAnyCellEditing || editingHeader) return;
      if (!selectedCell) {
        if (filteredData.length > 0 && columns.length > 0) {
          setSelectedCell({
            rowId: filteredData[0].id,
            columnId: columns[0].id,
          });
        }
        return;
      }
      if (e.key === "Enter" || e.key === "F2") {
        e.preventDefault();
        setEditingCellTrigger(selectedCell);
        return;
      }

      const currentRowIndex = filteredData.findIndex(
        (row) => row.id === selectedCell.rowId,
      );
      const currentColumnIndex = columns.findIndex(
        (col) => col.id === selectedCell.columnId,
      );
      let newRowIndex = currentRowIndex;
      let newColumnIndex = currentColumnIndex;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newRowIndex = Math.max(0, currentRowIndex - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newRowIndex = Math.min(filteredData.length - 1, currentRowIndex + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newColumnIndex = Math.max(0, currentColumnIndex - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newColumnIndex = Math.min(columns.length - 1, currentColumnIndex + 1);
          break;
        case "Tab":
          /* Tab logic can be added here */ break;
        default:
          return;
      }

      if (
        newRowIndex !== currentRowIndex ||
        newColumnIndex !== currentColumnIndex
      ) {
        const newRowId = filteredData[newRowIndex].id;
        const newColumnId = columns[newColumnIndex].id;
        setSelectedCell({ rowId: newRowId, columnId: newColumnId });

        // Scroll to the selected cell if it's not visible
        rowVirtualizer.scrollToIndex(newRowIndex, {
          align: "auto",
          behavior: "smooth",
        });
      }
    },
    [
      selectedCell,
      isAnyCellEditing,
      editingHeader,
      filteredData,
      columns,
      rowVirtualizer,
    ],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-gray-400">Loading CSV data...</div>
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
      data-testid="csv-table-viewer"
    >
      {/* Toolbar */}
      <CsvToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchMatchCount={searchMatches.length}
        searchActiveIndex={searchActiveIndex}
        onSearchNext={handleSearchNext}
        onSearchPrevious={handleSearchPrevious}
        onClearSearch={handleClearSearch}
        snapshots={snapshots}
        showSnapshotsPanel={showSnapshotsPanel}
        onToggleSnapshotsPanel={setShowSnapshotsPanel}
        onCreateSnapshot={(name) => createSnapshot(name)}
        onRestoreSnapshot={restoreSnapshot}
        onDeleteSnapshot={deleteSnapshot}
        duplicateGroups={duplicateGroups}
        showDuplicatesOnly={showDuplicatesOnly}
        duplicateSearchPerformed={duplicateSearchPerformed}
        onFindDuplicates={findDuplicates}
        onToggleDuplicatesOnly={setShowDuplicatesOnly}
        onRemoveDuplicates={removeDuplicateRows}
        onClearDuplicates={clearDuplicates}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        onExportMarkdown={handleExportMarkdown}
        onExportSql={handleExportSql}
        rowCount={data.length}
        columnCount={columns.length}
        diagnostics={diagnostics}
        isValid={isValid}
      />

      {/* Snapshots Panel */}
      {showSnapshotsPanel && snapshots.length > 0 && (
        <CsvSnapshotsPanel
          snapshots={snapshots}
          onRestore={restoreSnapshot}
          onDelete={deleteSnapshot}
          onClose={() => setShowSnapshotsPanel(false)}
        />
      )}

      {/* Virtualized Table */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-auto custom-scrollbar"
        style={{ contain: "strict" }}
        data-testid="csv-table-container"
      >
        {/* Fixed Header */}
        <div
          className="bg-gray-800 sticky top-0 z-10 border-b border-gray-700"
          style={{
            display: "grid",
            gridTemplateColumns,
            width: "fit-content",
          }}
          data-testid="csv-table"
        >
          {table.getHeaderGroups()[0]?.headers.map((header) => (
            <div
              key={header.id}
              className="border-r border-gray-700 p-2 text-left font-medium text-gray-300 bg-gray-800"
              data-testid="column-header"
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
          ))}
        </div>

        {/* Virtual Rows Container */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
          data-testid="virtualized-table"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = table.getRowModel().rows[virtualRow.index];
            const isDuplicate = duplicateRowIds.has(row.original.id);

            return (
              <div
                key={virtualRow.key}
                className={`absolute border-b border-gray-700 hover:bg-gray-800/50 ${
                  isDuplicate ? "bg-yellow-500/10 border-yellow-500/30" : ""
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "grid",
                  gridTemplateColumns,
                  width: "fit-content",
                }}
                data-testid={isDuplicate ? "duplicate-row-indicator" : "csv-row"}
              >
                {row.getVisibleCells().map((cell, cellIndex) => {
                  // Determine the actual column index for data cells (excluding row number and actions columns)
                  const actualColumnIndex = cellIndex - 1; // Exclude row number column
                  if (cellIndex >= row.getVisibleCells().length - 1) {
                    // This is the actions column, skip data attributes
                    return (
                      <div key={cell.id} className="border-r border-gray-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  }
                  if (cellIndex === 0) {
                    // This is the row number column, skip data attributes
                    return (
                      <div key={cell.id} className="border-r border-gray-700">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                  }
                  return (
                    <div 
                      key={cell.id} 
                      className="border-r border-gray-700"
                      data-testid="csv-cell"
                      data-row={virtualRow.index.toString()}
                      data-col={actualColumnIndex.toString()}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {/* Diagnostics Footer */}
      <CsvDiagnosticsFooter diagnostics={diagnostics} />

      {/* Stats Popover */}
      {statsPopover && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setStatsPopover(null)}
          />
          <ColumnStatsPopover
            columnName={
              columns.find((col) => col.id === statsPopover.columnId)?.name ||
              "Unknown"
            }
            stats={getColumnStats(statsPopover.columnId)}
            onClose={() => setStatsPopover(null)}
            position={statsPopover.position}
          />
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          {/* Click-outside overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
          />
          <div
            className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 min-w-[200px]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <div className="py-1">
              <button
                onClick={handleShiftRight}
                disabled={!canShiftRight()}
                className={`flex items-center w-full px-3 py-2 text-sm text-left transition-colors ${
                  canShiftRight()
                    ? 'text-gray-200 hover:bg-gray-700'
                    : 'text-gray-500 cursor-not-allowed'
                }`}
                title={
                  canShiftRight()
                    ? 'Insert empty cell and shift remaining cells right'
                    : 'Only available for cells in same column where row has fewer columns than headers'
                }
              >
                <span>Insert Empty Cell & Shift Right</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
