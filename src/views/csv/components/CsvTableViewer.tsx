import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';

import { 
  Plus, 
  Minus, 
  ArrowUp, 
  ArrowDown, 
  RotateCcw, 
  Save,
  AlertTriangle,
  CheckCircle,
  Camera,
  Download,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { ExtendedViewProps } from '../../registry';
import { useCsvData } from '../hooks/useCsvData';
import { CsvRow, CsvColumn } from '../types';

export const CsvTableViewer: React.FC<ExtendedViewProps> = ({
  content,
  onContentChange,
  tabId,
  isActive
}) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; columnId: string } | null>(null);

  const csvData = useCsvData(content, onContentChange, {
    hasHeader: true,
    skipEmptyLines: true,
    maxRows: 50000
  });

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
    addColumn,
    deleteColumn,
    canUndo,
    canRedo,
    undo,
    redo,
    snapshots,
    createSnapshot,
    toCsv,
    toJson,
    toMarkdown,
    toSql
  } = csvData;

  // Create table columns
  const columnHelper = createColumnHelper<CsvRow>();
  
  const tableColumns = useMemo<ColumnDef<CsvRow, any>[]>(() => [
    // Row number column
    columnHelper.display({
      id: 'rowNumber',
      header: '#',
      size: 60,
      cell: ({ row }) => (
        <div className="text-gray-400 text-sm text-center font-mono">
          {row.index + 1}
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Data columns
    ...columns.map((column, columnIndex) =>
      columnHelper.accessor(
        (row) => row.cells[columnIndex]?.value || '',
        {
          id: column.id,
          header: () => (
            <div className="flex items-center justify-between min-w-0">
              <input
                className="bg-transparent text-white font-medium text-sm border-none outline-none min-w-0 flex-1"
                value={column.name}
                onChange={(e) => {
                  // TODO: Implement column rename
                  console.log('Rename column:', column.id, e.target.value);
                }}
                onBlur={() => {
                  // TODO: Save column name change
                }}
              />
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={() => addColumn(columnIndex + 1)}
                  className="p-0.5 text-gray-400 hover:text-green-400 transition-colors"
                  title="Add column after"
                >
                  <Plus size={12} />
                </button>
                <button
                  onClick={() => deleteColumn(column.id)}
                  className="p-0.5 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete column"
                >
                  <Minus size={12} />
                </button>
              </div>
            </div>
          ),
          cell: ({ row, getValue, cell }) => {
            const cellValue = getValue() as string;
            const isSelected = selectedCell?.rowId === row.original.id && selectedCell?.columnId === column.id;
            const cellData = row.original.cells[columnIndex];
            
            return (
              <EditableCell
                value={cellValue}
                isSelected={isSelected}
                isValid={cellData?.isValid ?? true}
                error={cellData?.error}
                onSelect={() => setSelectedCell({ rowId: row.original.id, columnId: column.id })}
                onChange={(newValue) => updateCell(row.original.id, column.id, newValue)}
              />
            );
          },
          size: 150,
          minSize: 80,
          maxSize: 400,
        }
      )
    ),
    // Actions column
    columnHelper.display({
      id: 'actions',
      header: '',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center justify-center space-x-1">
          <button
            onClick={() => addRow(row.index + 1)}
            className="p-1 text-gray-400 hover:text-green-400 transition-colors"
            title="Add row below"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => deleteRow(row.original.id)}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete row"
          >
            <Minus size={14} />
          </button>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    }),
  ], [columns, selectedCell, addColumn, deleteColumn, addRow, deleteRow, updateCell]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: false,
    enableMultiRowSelection: false,
  });

  const { rows } = table.getRowModel();

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    
    const currentRowIndex = data.findIndex(row => row.id === selectedCell.rowId);
    const currentColumnIndex = columns.findIndex(col => col.id === selectedCell.columnId);
    
    let newRowIndex = currentRowIndex;
    let newColumnIndex = currentColumnIndex;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newRowIndex = Math.max(0, currentRowIndex - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newRowIndex = Math.min(data.length - 1, currentRowIndex + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newColumnIndex = Math.max(0, currentColumnIndex - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newColumnIndex = Math.min(columns.length - 1, currentColumnIndex + 1);
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          newColumnIndex = currentColumnIndex > 0 ? currentColumnIndex - 1 : columns.length - 1;
          if (currentColumnIndex === 0) {
            newRowIndex = Math.max(0, currentRowIndex - 1);
          }
        } else {
          newColumnIndex = currentColumnIndex < columns.length - 1 ? currentColumnIndex + 1 : 0;
          if (currentColumnIndex === columns.length - 1) {
            newRowIndex = Math.min(data.length - 1, currentRowIndex + 1);
          }
        }
        break;
      default:
        return;
    }
    
    if (newRowIndex !== currentRowIndex || newColumnIndex !== currentColumnIndex) {
      const newRow = data[newRowIndex];
      const newColumn = columns[newColumnIndex];
      if (newRow && newColumn) {
        setSelectedCell({ rowId: newRow.id, columnId: newColumn.id });
      }
    }
  }, [selectedCell, data, columns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3">Parsing CSV...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-red-400 p-8">
        <AlertTriangle size={48} className="mb-4" />
        <h3 className="text-lg font-semibold mb-2">CSV Parse Error</h3>
        <p className="text-sm text-gray-400 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-full bg-gray-900 text-gray-200"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Toolbar */}
      <div className="flex-none border-b border-gray-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={undo}
                disabled={!canUndo}
                className="p-1.5 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                title="Undo"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="p-1.5 text-gray-400 hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transform scale-x-[-1]"
                title="Redo"
              >
                <RotateCcw size={16} />
              </button>
            </div>
            
            <div className="w-px h-6 bg-gray-700 mx-2" />
            
            <button
              onClick={() => createSnapshot(`Snapshot ${snapshots.length + 1}`)}
              className="p-1.5 text-gray-400 hover:text-blue-400 rounded"
              title="Create snapshot"
            >
              <Camera size={16} />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* Stats */}
            <div className="text-sm text-gray-400">
              {data.length} rows × {columns.length} columns
            </div>
            
            {/* Diagnostics indicator */}
            <div className="flex items-center space-x-1">
              {isValid ? (
                <CheckCircle size={16} className="text-green-400" />
              ) : (
                <AlertTriangle size={16} className="text-yellow-400" />
              )}
              <span className="text-xs">
                {diagnostics.filter(d => d.type === 'error').length} errors, {' '}
                {diagnostics.filter(d => d.type === 'warning').length} warnings
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="bg-gray-800 sticky top-0 z-10">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="border border-gray-700 p-2 text-left font-medium text-gray-300"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center space-x-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <button
                              onClick={header.column.getToggleSortingHandler()}
                              className="p-0.5 text-gray-400 hover:text-gray-200"
                            >
                              {{
                                asc: <SortAsc size={12} />,
                                desc: <SortDesc size={12} />,
                              }[header.column.getIsSorted() as string] ?? (
                                <div className="w-3 h-3 opacity-0 group-hover:opacity-100">
                                  <SortAsc size={12} />
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-800/50"
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="border border-gray-700 p-0"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer with diagnostics */}
      {diagnostics.length > 0 && (
        <div className="flex-none border-t border-gray-700 p-2 bg-gray-800">
          <div className="max-h-32 overflow-y-auto space-y-1">
            {diagnostics.slice(0, 5).map((diagnostic, index) => (
              <div
                key={index}
                className={`text-xs flex items-center space-x-2 ${
                  diagnostic.type === 'error' ? 'text-red-400' : 'text-yellow-400'
                }`}
              >
                <AlertTriangle size={12} />
                <span>
                  {diagnostic.line && `Line ${diagnostic.line}: `}
                  {diagnostic.message}
                </span>
                {diagnostic.suggestion && (
                  <span className="text-gray-400">({diagnostic.suggestion})</span>
                )}
              </div>
            ))}
            {diagnostics.length > 5 && (
              <div className="text-xs text-gray-400">
                ...and {diagnostics.length - 5} more issues
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Editable cell component
interface EditableCellProps {
  value: string;
  isSelected: boolean;
  isValid: boolean;
  error?: string;
  onSelect: () => void;
  onChange: (value: string) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  isSelected,
  isValid,
  error,
  onSelect,
  onChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onChange(editValue);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    onChange(editValue);
    setIsEditing(false);
  };

  return (
    <div
      className={`h-full min-h-[35px] flex items-center px-2 cursor-cell ${
        isSelected ? 'bg-blue-900/30 ring-1 ring-blue-500' : ''
      } ${!isValid ? 'bg-red-900/20' : ''}`}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      title={error}
    >
      {isEditing ? (
        <input
          className="w-full bg-transparent border-none outline-none text-sm"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <span className="text-sm truncate w-full">
          {value}
        </span>
      )}
    </div>
  );
}; 