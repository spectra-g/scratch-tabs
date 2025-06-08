import * as React from 'react';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  getSortedRowModel,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Plus,
  Minus,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Camera,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Edit3,
  Copy,
  Replace,
  X,
  History,
  Trash2,
  Clock,
  BarChart3,
  Download,
  FileText,
  Database,
  Code,
  ChevronDown,
} from 'lucide-react';
import { ExtendedViewProps } from '../../registry';
import { useCsvData } from '../hooks/useCsvData';
import { CsvRow } from '../types';
import { ColumnStatsPopover } from './ColumnStatsPopover';

interface EditableCellProps {
  value: string;
  isSelected: boolean;
  isValid: boolean;
  error?: string;
  startEditing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onChange: (value: string) => void;
  onEditingChange: (isEditing: boolean) => void;
}

const EditableCell: React.FC<EditableCellProps> = React.memo(({
  value,
  isSelected,
  isValid,
  error,
  startEditing,
  onSelect,
  onStartEdit,
  onChange,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);
  
  useEffect(() => {
    if (startEditing && !isEditing) {
      setIsEditing(true);
    }
  }, [startEditing, isEditing, value]);

  // Reset startEditing trigger after it's been processed
  useEffect(() => {
    if (startEditing && isEditing) {
      // We don't have access to setEditingCellTrigger here, but the parent should handle this
    }
  }, [startEditing, isEditing]);

  // Track previous editing state to avoid unnecessary calls
  const prevIsEditingRef = useRef(isEditing);
  
  useEffect(() => {
    // Only call onEditingChange when there's an actual state transition
    if (prevIsEditingRef.current !== isEditing) {
      onEditingChange(isEditing);
      prevIsEditingRef.current = isEditing;
    }
    
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing, onEditingChange, value]);

  const handleCommitChange = useCallback(() => {
    if (isEditing) {
      if (editValue !== value) {
        onChange(editValue);
      }
      setIsEditing(false);
    }
  }, [isEditing, editValue, value, onChange]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
  }, [value]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleCommitChange();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleCommitChange, handleCancelEdit]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    onSelect();
  }, [onSelect]);

  const [isHovered, setIsHovered] = useState(false);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStartEdit();
  }, [onStartEdit]);

  const handleCopyClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(value);
  }, [value]);

  if (isEditing) {
    return (
      <div className="h-full w-full flex items-center bg-gray-800">
        <input
          ref={inputRef}
          className="w-full h-full bg-transparent border-none outline-none text-sm text-white px-2 focus:outline-none focus:ring-0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCommitChange}
        />
      </div>
    );
  }

  return (
    <div
      className={`h-full min-h-[35px] flex items-center px-2 cursor-cell transition-colors relative group ${
        isSelected ? 'bg-blue-900/30 ring-1 ring-blue-500' : 'hover:bg-gray-700/20'
      } ${!isValid ? 'bg-red-900/20' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={error || 'Click to select. Click pencil or press enter to edit'}
    >
      <span className="text-sm truncate flex-1 text-gray-200 mr-2">
        {value || <span className="text-gray-500 italic">Empty</span>}
      </span>
      <div className="flex items-center space-x-1 w-14 justify-end">
        <button
          className={`p-1 rounded hover:bg-gray-600 transition-all ${
            (isHovered || isSelected) ? 'opacity-70 hover:opacity-100' : 'opacity-0'
          }`}
          onClick={handleCopyClick}
          title="Copy cell value"
        >
          <Copy size={12} />
        </button>
        <button
          className={`p-1 rounded hover:bg-gray-600 transition-all ${
            (isHovered || isSelected) ? 'opacity-70 hover:opacity-100' : 'opacity-0'
          }`}
          onClick={handleEditClick}
          title="Edit cell"
        >
          <Edit3 size={12} />
        </button>
      </div>
    </div>
  );
});


interface DuplicateGroup {
  rowString: string;
  rowIds: string[];
  count: number;
}

export const CsvTableViewer: React.FC<ExtendedViewProps> = ({
  content,
  onContentChange,
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);
  const [editingCellTrigger, setEditingCellTrigger] = useState<{ rowId: string; columnId: string } | null>(null);
  const [isAnyCellEditing, setIsAnyCellEditing] = useState(false);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState('');
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [showSnapshotsPanel, setShowSnapshotsPanel] = useState(false);
  
  // Stats popover state
  const [statsPopover, setStatsPopover] = useState<{
    columnId: string;
    position: { x: number; y: number };
  } | null>(null);
  
  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sqlTableName, setSqlTableName] = useState('my_table');

  const csvData = useCsvData(content, onContentChange);
  const { data, columns, loading, error, diagnostics, isValid, updateCell, addRow, deleteRow, duplicateRow, addColumn, deleteColumn, duplicateColumn, renameColumn, canUndo, canRedo, undo, redo, snapshots, createSnapshot, restoreSnapshot, deleteSnapshot, getColumnStats, toCsv, toJson, toMarkdown, toSql } = csvData;

  // Efficient duplicate detection using hash map - O(n) complexity
  const findDuplicates = useCallback(() => {
    const rowMap = new Map<string, string[]>();
    
    // Single pass through data to build hash map
    data.forEach(row => {
      // Create row string by joining all cell values
      const rowString = row.cells.map(cell => cell.value || '').join('|');
      
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
          count: rowIds.length
        });
      }
    });
    
    setDuplicateGroups(duplicates);
    setShowDuplicatesOnly(duplicates.length > 0);
  }, [data]);

  const clearDuplicates = useCallback(() => {
    setDuplicateGroups([]);
    setShowDuplicatesOnly(false);
  }, []);

  const removeDuplicateRows = useCallback(() => {
    if (duplicateGroups.length === 0) return;
    
    // Collect all duplicate row IDs except the first one in each group
    const rowsToDelete: string[] = [];
    duplicateGroups.forEach(group => {
      // Keep the first row, delete the rest
      rowsToDelete.push(...group.rowIds.slice(1));
    });
    
    // Delete rows in batch
    rowsToDelete.forEach(rowId => deleteRow(rowId));
    
    // Clear duplicates state
    clearDuplicates();
  }, [duplicateGroups, deleteRow, clearDuplicates]);

  // Export functions
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  const handleExportCsv = useCallback(() => {
    const csvContent = toCsv();
    downloadFile(csvContent, 'export.csv', 'text/csv');
    setShowExportMenu(false);
  }, [toCsv, downloadFile]);

  const handleExportJson = useCallback(() => {
    const jsonContent = toJson();
    downloadFile(jsonContent, 'export.json', 'application/json');
    setShowExportMenu(false);
  }, [toJson, downloadFile]);

  const handleExportMarkdown = useCallback(() => {
    const markdownContent = toMarkdown();
    downloadFile(markdownContent, 'export.md', 'text/markdown');
    setShowExportMenu(false);
  }, [toMarkdown, downloadFile]);

  const handleExportSql = useCallback(() => {
    const sqlContent = toSql(sqlTableName);
    downloadFile(sqlContent, `${sqlTableName}_inserts.sql`, 'text/sql');
    setShowExportMenu(false);
  }, [toSql, sqlTableName, downloadFile]);

  const columnHelper = createColumnHelper<CsvRow>();

  // Get all duplicate row IDs for highlighting
  const duplicateRowIds = useMemo(() => {
    const ids = new Set<string>();
    duplicateGroups.forEach(group => {
      group.rowIds.forEach(id => ids.add(id));
    });
    return ids;
  }, [duplicateGroups]);

  // Filter data based on duplicate view mode
  const filteredData = useMemo(() => {
    if (!showDuplicatesOnly) return data;
    return data.filter(row => duplicateRowIds.has(row.id));
  }, [data, showDuplicatesOnly, duplicateRowIds]);

  const tableColumns = useMemo<ColumnDef<CsvRow, any>[]>(() => {
    return [
      columnHelper.display({
        id: 'rowNumber',
        header: '#',
        size: 50,
        cell: ({ row }) => <div className="text-gray-400 text-center font-mono">{row.index + 1}</div>,
      }),
      ...columns.map((column, columnIndex) =>
        columnHelper.accessor(
          (row) => row.cells[columnIndex]?.value || '',
          {
            id: column.id,
            header: ({ column: tableColumn }) => (
              <div className="flex items-center justify-between min-w-0">
                {editingHeader === column.id ? (
                  <input
                    className="bg-gray-800 text-white font-medium text-sm border-none outline-none flex-1 px-1 py-0.5 rounded"
                    value={headerEditValue}
                    onChange={(e) => setHeaderEditValue(e.target.value)}
                    onBlur={() => {
                      if (headerEditValue.trim()) renameColumn(column.id, headerEditValue.trim());
                      setEditingHeader(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (headerEditValue.trim()) renameColumn(column.id, headerEditValue.trim());
                        setEditingHeader(null);
                      } else if (e.key === 'Escape') setEditingHeader(null);
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
                    >
                      {tableColumn.getIsSorted() === 'asc' ? (
                        <SortAsc size={12} />
                      ) : tableColumn.getIsSorted() === 'desc' ? (
                        <SortDesc size={12} />
                      ) : (
                        <ArrowUpDown size={12} className="opacity-60" />
                      )}
                    </button>
                  </div>
                )}
                <div className="flex items-center space-x-1 ml-2">
                  <button 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setStatsPopover({
                        columnId: column.id,
                        position: { x: rect.left, y: rect.bottom + 5 }
                      });
                    }} 
                    title="Column statistics"
                  >
                    <BarChart3 size={12} />
                  </button>
                  <button onClick={() => addColumn(columnIndex + 1)} title="Add column after"><Plus size={12} /></button>
                  <button onClick={() => duplicateColumn(column.id)} title="Duplicate column"><Copy size={12} /></button>
                  <button onClick={() => deleteColumn(column.id)} title="Delete column"><Minus size={12} /></button>
                </div>
              </div>
            ),
            cell: ({ row, getValue }) => {
              return (
                <EditableCell
                  value={getValue() as string}
                  isSelected={selectedCell?.rowId === row.original.id && selectedCell?.columnId === column.id}
                  isValid={row.original.cells[columnIndex]?.isValid ?? true}
                  error={row.original.cells[columnIndex]?.error}
                  startEditing={editingCellTrigger?.rowId === row.original.id && editingCellTrigger?.columnId === column.id}
                  onSelect={() => {
                    setSelectedCell({ rowId: row.original.id, columnId: column.id });
                    setEditingCellTrigger(null);
                  }}
                  onStartEdit={() => {
                    setSelectedCell({ rowId: row.original.id, columnId: column.id });
                    setEditingCellTrigger({ rowId: row.original.id, columnId: column.id });
                  }}
                  onChange={(newValue) => {
                    // Clear the editing trigger immediately when data changes
                    setEditingCellTrigger(null);
                    updateCell(row.original.id, column.id, newValue);
                  }}
                  onEditingChange={(isEditing) => {
                    setIsAnyCellEditing(isEditing);
                    // Only clear editingCellTrigger if this specific cell was the one being edited
                    if (!isEditing && editingCellTrigger?.rowId === row.original.id && editingCellTrigger?.columnId === column.id) {
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
      columnHelper.display({
        id: 'actions',
        header: '',
        size: 60,
        cell: ({ row }) => (
          <div className="flex items-center justify-center space-x-1">
            <button onClick={() => addRow(row.index + 1)} title="Add row below"><Plus size={14} /></button>
            <button onClick={() => duplicateRow(row.original.id)} title="Duplicate row"><Copy size={14} /></button>
            <button onClick={() => deleteRow(row.original.id)} title="Delete row"><Minus size={14} /></button>
          </div>
        ),
      }),
    ];
  }, [columns, editingHeader, headerEditValue, addColumn, deleteColumn, duplicateColumn, addRow, deleteRow, duplicateRow, updateCell, renameColumn, selectedCell, editingCellTrigger, setStatsPopover]);

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
      } else if (header.id === 'actions') {
        // Actions column - fixed width for icons
        widths.push('80px');
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
              const cellText = cellValue?.toString() || '';
              maxWidth = Math.max(maxWidth, cellText.length);
            }
          }
        }
        
        // Convert character count to approximate pixel width
        // Average character width ~8px + padding
        const minWidth = 60;
        const maxWidthPx = 300; // Cap at 300px
        const calculatedWidth = Math.min(Math.max(minWidth, maxWidth * 8 + 16), maxWidthPx);
        widths.push(`${calculatedWidth}px`);
      }
    });
    
    return widths;
  }, [table, csvData]); // Depend on csvData to recalculate when data changes

  const gridTemplateColumns = columnWidths.join(' ');

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isAnyCellEditing || editingHeader) return;
    if (!selectedCell) {
      if (filteredData.length > 0 && columns.length > 0) {
        setSelectedCell({ rowId: filteredData[0].id, columnId: columns[0].id });
      }
      return;
    }
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setEditingCellTrigger(selectedCell);
      return;
    }

    const currentRowIndex = filteredData.findIndex(row => row.id === selectedCell.rowId);
    const currentColumnIndex = columns.findIndex(col => col.id === selectedCell.columnId);
    let newRowIndex = currentRowIndex;
    let newColumnIndex = currentColumnIndex;

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); newRowIndex = Math.max(0, currentRowIndex - 1); break;
      case 'ArrowDown': e.preventDefault(); newRowIndex = Math.min(filteredData.length - 1, currentRowIndex + 1); break;
      case 'ArrowLeft': e.preventDefault(); newColumnIndex = Math.max(0, currentColumnIndex - 1); break;
      case 'ArrowRight': e.preventDefault(); newColumnIndex = Math.min(columns.length - 1, currentColumnIndex + 1); break;
      case 'Tab': /* Tab logic can be added here */ break;
      default: return;
    }
    
    if (newRowIndex !== currentRowIndex || newColumnIndex !== currentColumnIndex) {
      const newRowId = filteredData[newRowIndex].id;
      const newColumnId = columns[newColumnIndex].id;
      setSelectedCell({ rowId: newRowId, columnId: newColumnId });
      
      // Scroll to the selected cell if it's not visible
      rowVirtualizer.scrollToIndex(newRowIndex, {
        align: 'auto',
        behavior: 'smooth'
      });
    }
  }, [selectedCell, isAnyCellEditing, editingHeader, filteredData, columns, rowVirtualizer]);

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
    <div className="flex flex-col h-full bg-gray-900 text-gray-200" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Toolbar */}
      <div className="flex-none border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={undo} 
            disabled={!canUndo} 
            title="Undo"
            className={`p-2 rounded ${canUndo ? 'hover:bg-gray-700' : 'opacity-50 cursor-not-allowed'}`}
          >
            <RotateCcw size={16} />
          </button>
          <button 
            onClick={redo} 
            disabled={!canRedo} 
            title="Redo" 
            className={`p-2 rounded transform scale-x-[-1] ${canRedo ? 'hover:bg-gray-700' : 'opacity-50 cursor-not-allowed'}`}
          >
            <RotateCcw size={16} />
          </button>
          <div className="w-px h-6 bg-gray-700 mx-2" />
          <button 
            onClick={() => createSnapshot(`Snapshot ${snapshots.length + 1}`)} 
            title="Create snapshot"
            className="p-2 rounded hover:bg-gray-700"
          >
            <Camera size={16} />
          </button>
          <div className="w-px h-6 bg-gray-700 mx-2" />
          
          {/* Export Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              title="Export data"
              className={`flex items-center space-x-1 px-3 py-2 rounded ${showExportMenu ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700'}`}
            >
              <Download size={16} />
              <span className="text-sm">Export</span>
              <ChevronDown size={12} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showExportMenu && (
              <>
                {/* Click-outside overlay */}
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-40 min-w-[200px]">
                  <div className="py-1">
                    <button
                      onClick={handleExportCsv}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className="text-green-400" />
                        <span>CSV</span>
                      </div>
                      <span className="text-xs text-gray-500">export.csv</span>
                    </button>
                    <button
                      onClick={handleExportJson}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Code size={16} className="text-blue-400" />
                        <span>JSON</span>
                      </div>
                      <span className="text-xs text-gray-500">export.json</span>
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <FileText size={16} className="text-purple-400" />
                        <span>Markdown</span>
                      </div>
                      <span className="text-xs text-gray-500">export.md</span>
                    </button>
                    <div className="border-t border-gray-700 my-1" />
                    <div className="px-3 py-2">
                      <label className="block text-xs text-gray-400 mb-1">SQL Table Name:</label>
                      <input
                        type="text"
                        value={sqlTableName}
                        onChange={(e) => setSqlTableName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                        placeholder="table_name"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <button
                      onClick={handleExportSql}
                      disabled={!sqlTableName.trim()}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center space-x-2">
                        <Database size={16} className="text-orange-400" />
                        <span>SQL</span>
                      </div>
                      <span className="text-xs text-gray-500">{sqlTableName || 'table'}_inserts.sql</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          {snapshots.length > 0 && (
            <button 
              onClick={() => setShowSnapshotsPanel(!showSnapshotsPanel)}
              title="Manage snapshots"
              className={`p-2 rounded ${showSnapshotsPanel ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700'}`}
            >
              <History size={16} />
            </button>
          )}
          <div className="w-px h-6 bg-gray-700 mx-2" />
          {/* Duplicates Controls */}
          {duplicateGroups.length === 0 ? (
            <button 
              onClick={findDuplicates} 
              title="Find duplicate rows"
              className="p-2 rounded hover:bg-gray-700"
            >
              <Replace size={16} />
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                title={showDuplicatesOnly ? "Show all rows" : "Show only duplicates"}
                className={`px-3 py-1 rounded text-sm ${
                  showDuplicatesOnly 
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {showDuplicatesOnly ? 'Show All' : 'Duplicates Only'}
              </button>
              <button 
                onClick={removeDuplicateRows}
                title="Remove duplicate rows (keep first occurrence)"
                className="px-3 py-1 rounded text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30"
              >
                Remove Duplicates
              </button>
              <button 
                onClick={clearDuplicates}
                title="Clear duplicate analysis"
                className="p-1 rounded hover:bg-gray-700 text-gray-400"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>{data.length} rows × {columns.length} columns</span>
          {duplicateGroups.length > 0 && (
            <span className="text-yellow-400">
              {duplicateGroups.reduce((sum, group) => sum + group.count, 0)} duplicate rows in {duplicateGroups.length} groups
            </span>
          )}
          <div className="flex items-center space-x-1">
            {isValid ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-yellow-400" />}
            <span className="text-xs">{diagnostics.filter(d=>d.type==='error').length} errors, {diagnostics.filter(d=>d.type==='warning').length} warnings</span>
          </div>
        </div>
      </div>
      
      {/* Snapshots Panel */}
      {showSnapshotsPanel && snapshots.length > 0 && (
        <div className="flex-none border-b border-gray-700 bg-gray-800/50 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <History size={16} />
              Snapshots ({snapshots.length})
            </h3>
            <button
              onClick={() => setShowSnapshotsPanel(false)}
              className="p-1 rounded hover:bg-gray-700 text-gray-400"
              title="Close snapshots panel"
            >
              <X size={14} />
            </button>
          </div>
          <div className="grid gap-2 max-h-32 overflow-y-auto custom-scrollbar">
            {snapshots.map((snapshot) => (
              <div
                key={snapshot.id}
                className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2 hover:bg-gray-700/70 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Clock size={14} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{snapshot.name}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(snapshot.timestamp).toLocaleString()} • {snapshot.data.length} rows × {snapshot.columns.length} columns
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => restoreSnapshot(snapshot.id)}
                    className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
                    title="Restore this snapshot"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => deleteSnapshot(snapshot.id)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                    title="Delete snapshot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Virtualized Table */}
      <div 
        ref={tableContainerRef}
        className="flex-1 overflow-auto custom-scrollbar"
        style={{ contain: 'strict' }}
      >
        {/* Fixed Header */}
        <div 
          className="bg-gray-800 sticky top-0 z-10 border-b border-gray-700"
          style={{
            display: 'grid',
            gridTemplateColumns,
            minWidth: 'fit-content'
          }}
        >
          {table.getHeaderGroups()[0]?.headers.map(header => (
            <div
              key={header.id}
              className="border-r border-gray-700 p-2 text-left font-medium text-gray-300 bg-gray-800"
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
            </div>
          ))}
        </div>
        
        {/* Virtual Rows Container */}
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
          {rowVirtualizer.getVirtualItems().map(virtualRow => {
            const row = table.getRowModel().rows[virtualRow.index];
            const isDuplicate = duplicateRowIds.has(row.original.id);
            
            return (
              <div
                key={virtualRow.key}
                className={`absolute inset-x-0 border-b border-gray-700 hover:bg-gray-800/50 ${
                  isDuplicate ? 'bg-yellow-500/10 border-yellow-500/30' : ''
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns,
                  minWidth: 'fit-content'
                }}
              >
                {row.getVisibleCells().map(cell => (
                  <div
                    key={cell.id}
                    className="border-r border-gray-700"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {/* Diagnostics Footer */}
      {diagnostics.length > 0 && (
        <div className="flex-none border-t border-gray-700 bg-gray-800 max-h-32 overflow-auto">
          <div className="p-2 space-y-1">
            {diagnostics.slice(0, 10).map((diag, index) => (
              <div key={index} className={`text-xs flex items-center space-x-2 ${
                diag.type === 'error' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {diag.type === 'error' ? <AlertTriangle size={12} /> : <AlertTriangle size={12} />}
                <span>
                  {diag.line && `Line ${diag.line}: `}
                  {diag.column && `Col ${diag.column}: `}
                  {diag.message}
                </span>
              </div>
            ))}
            {diagnostics.length > 10 && (
              <div className="text-xs text-gray-500">
                ... and {diagnostics.length - 10} more issues
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Popover */}
      {statsPopover && (
        <>
          {/* Click-outside overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setStatsPopover(null)}
          />
          <ColumnStatsPopover
            columnName={columns.find(col => col.id === statsPopover.columnId)?.name || 'Unknown'}
            stats={getColumnStats(statsPopover.columnId)}
            onClose={() => setStatsPopover(null)}
            position={statsPopover.position}
          />
        </>
      )}
    </div>
  );
};