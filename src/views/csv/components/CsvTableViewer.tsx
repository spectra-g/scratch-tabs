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
} from 'lucide-react';
import { ExtendedViewProps } from '../../registry';
import { useCsvData } from '../hooks/useCsvData';
import { CsvRow } from '../types';

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
      title={error || 'Click to select, click pencil or press Enter/F2 to edit'}
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

  const csvData = useCsvData(content, onContentChange);
  const { data, columns, loading, error, diagnostics, isValid, updateCell, addRow, deleteRow, addColumn, deleteColumn, renameColumn, canUndo, canRedo, undo, redo, snapshots, createSnapshot } = csvData;

  const columnHelper = createColumnHelper<CsvRow>();

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
                  <button onClick={() => addColumn(columnIndex + 1)} title="Add column after"><Plus size={12} /></button>
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
            <button onClick={() => deleteRow(row.original.id)} title="Delete row"><Minus size={14} /></button>
          </div>
        ),
      }),
    ];
  }, [columns, editingHeader, headerEditValue, addColumn, deleteColumn, addRow, deleteRow, updateCell, renameColumn, selectedCell, editingCellTrigger]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isAnyCellEditing || editingHeader) return;
    if (!selectedCell) {
      if (data.length > 0 && columns.length > 0) {
        setSelectedCell({ rowId: data[0].id, columnId: columns[0].id });
      }
      return;
    }
    if (e.key === 'Enter' || e.key === 'F2') {
      e.preventDefault();
      setEditingCellTrigger(selectedCell);
      return;
    }

    const currentRowIndex = data.findIndex(row => row.id === selectedCell.rowId);
    const currentColumnIndex = columns.findIndex(col => col.id === selectedCell.columnId);
    let newRowIndex = currentRowIndex;
    let newColumnIndex = currentColumnIndex;

    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); newRowIndex = Math.max(0, currentRowIndex - 1); break;
      case 'ArrowDown': e.preventDefault(); newRowIndex = Math.min(data.length - 1, currentRowIndex + 1); break;
      case 'ArrowLeft': e.preventDefault(); newColumnIndex = Math.max(0, currentColumnIndex - 1); break;
      case 'ArrowRight': e.preventDefault(); newColumnIndex = Math.min(columns.length - 1, currentColumnIndex + 1); break;
      case 'Tab': /* Tab logic can be added here */ break;
      default: return;
    }
    
    if (newRowIndex !== currentRowIndex || newColumnIndex !== currentColumnIndex) {
      setSelectedCell({ rowId: data[newRowIndex].id, columnId: columns[newColumnIndex].id });
    }
  }, [selectedCell, isAnyCellEditing, editingHeader, data, columns]);

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
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-400">
          <span>{data.length} rows × {columns.length} columns</span>
          <div className="flex items-center space-x-1">
            {isValid ? <CheckCircle size={16} className="text-green-400" /> : <AlertTriangle size={16} className="text-yellow-400" />}
            <span className="text-xs">{diagnostics.filter(d=>d.type==='error').length} errors, {diagnostics.filter(d=>d.type==='warning').length} warnings</span>
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead className="bg-gray-800 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>{headerGroup.headers.map(header => (
                <th key={header.id} className="border border-gray-700 p-2 text-left font-medium text-gray-300">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}</tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-gray-800/50">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="border border-gray-700 p-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};