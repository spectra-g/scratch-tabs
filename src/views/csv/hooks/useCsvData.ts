import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Papa from 'papaparse';
import { debounce } from 'lodash-es';
import { 
  CsvRow, 
  CsvColumn, 
  CsvDiagnostic, 
  CsvSnapshot, 
  UseCsvDataOptions,
  CsvColumnStats 
} from '../types';

export interface UseCsvDataReturn {
  // Data state
  data: CsvRow[];
  columns: CsvColumn[];
  loading: boolean;
  error: string | null;
  
  // Diagnostics
  diagnostics: CsvDiagnostic[];
  isValid: boolean;
  
  // Data manipulation
  updateCell: (rowId: string, columnId: string, value: string) => void;
  addRow: (index?: number) => void;
  deleteRow: (rowId: string) => void;
  addColumn: (index?: number, name?: string) => void;
  deleteColumn: (columnId: string) => void;
  
  // Undo/Redo (simplified)
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // Snapshots
  snapshots: CsvSnapshot[];
  createSnapshot: (name: string) => void;
  restoreSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  
  // Export
  toCsv: () => string;
  toJson: () => string;
  toMarkdown: () => string;
  toSql: (tableName: string) => string;
  
  // Statistics
  getColumnStats: (columnId: string) => CsvColumnStats;
}

interface CsvState {
  data: CsvRow[];
  columns: CsvColumn[];
}

export const useCsvData = (
  content: string,
  onContentChange: (newContent: string) => void,
  options: UseCsvDataOptions = {}
): UseCsvDataReturn => {
  const {
    maxRows = 50000,
    delimiter = ',',
    hasHeader = true,
    skipEmptyLines = true
  } = options;

  // Core state
  const [csvState, setCsvState] = useState<CsvState>({ data: [], columns: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<CsvDiagnostic[]>([]);
  const [snapshots, setSnapshots] = useState<CsvSnapshot[]>([]);
  
  // Simple undo/redo
  const [history, setHistory] = useState<CsvState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Debounced content sync
  const debouncedSync = useMemo(
    () => debounce((newContent: string) => {
      onContentChange(newContent);
    }, 300),
    [onContentChange]
  );

  // Parse CSV content
  const parseCsv = useCallback((csvContent: string) => {
    try {
      const parseResult = Papa.parse(csvContent, {
        delimiter,
        header: false,
        skipEmptyLines,
        dynamicTyping: false,
        transform: (value: string) => value.trim(),
      });

      const { data: rawData, errors } = parseResult;
      
      // Generate diagnostics
      const newDiagnostics: CsvDiagnostic[] = [];
      
      errors.forEach(error => {
        newDiagnostics.push({
          type: 'error',
          message: error.message,
          line: error.row !== undefined ? error.row + 1 : undefined
        });
      });

      // Check for inconsistent row lengths
      if (rawData.length > 0) {
        const expectedLength = (rawData[0] as string[]).length;
        rawData.forEach((row, index) => {
          if ((row as string[]).length !== expectedLength) {
            newDiagnostics.push({
              type: 'warning',
              message: `Row ${index + 1} has ${(row as string[]).length} columns, expected ${expectedLength}`,
              line: index + 1,
              suggestion: 'Check for missing or extra delimiters'
            });
          }
        });
      }

      // Extract headers and data
      let headers: string[] = [];
      let dataRows: string[][] = [];

      if (hasHeader && rawData.length > 0) {
        headers = rawData[0] as string[];
        dataRows = rawData.slice(1) as string[][];
      } else {
        const maxCols = Math.max(...rawData.map(row => (row as string[]).length));
        headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
        dataRows = rawData as string[][];
      }

      // Create columns
      const columns: CsvColumn[] = headers.map((header, index) => ({
        id: `col_${index}`,
        name: header || `Column ${index + 1}`,
        type: 'text',
        index
      }));

      // Create rows
      const data: CsvRow[] = dataRows.map((row, index) => ({
        id: `row_${index}`,
        cells: row.map((cell) => ({
          value: cell || '',
          isValid: true
        })),
        originalIndex: index,
        isValid: true
      }));

      setDiagnostics(newDiagnostics);
      return { data, columns };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown parsing error';
      setError(errorMessage);
      setDiagnostics([{
        type: 'error',
        message: errorMessage
      }]);
      return { data: [], columns: [] };
    }
  }, [delimiter, hasHeader, skipEmptyLines]);

  // Initialize data from content
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const result = parseCsv(content);
    setCsvState(result);
    setHistory([result]);
    setHistoryIndex(0);
    
    setLoading(false);
  }, [content, parseCsv]);

  // Save state to history for undo/redo
  const saveToHistory = useCallback((newState: CsvState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newState);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  // Sync changes back to content
  const syncToContent = useCallback(() => {
    const csvContent = toCsv();
    debouncedSync(csvContent);
  }, [debouncedSync]);

  // Data manipulation functions
  const updateCell = useCallback((rowId: string, columnId: string, value: string) => {
    const newState = {
      ...csvState,
      data: csvState.data.map(row => {
        if (row.id === rowId) {
          const columnIndex = csvState.columns.findIndex(col => col.id === columnId);
          if (columnIndex !== -1) {
            const newCells = [...row.cells];
            newCells[columnIndex] = { value, isValid: true };
            return { ...row, cells: newCells };
          }
        }
        return row;
      })
    };
    setCsvState(newState);
    saveToHistory(newState);
    syncToContent();
  }, [csvState, saveToHistory, syncToContent]);

  const addRow = useCallback((index?: number) => {
    const insertIndex = index ?? csvState.data.length;
    const newRow: CsvRow = {
      id: `row_${Date.now()}_${Math.random()}`,
      cells: csvState.columns.map(() => ({ value: '', isValid: true })),
      originalIndex: insertIndex,
      isValid: true
    };
    const newData = [...csvState.data];
    newData.splice(insertIndex, 0, newRow);
    
    const newState = { ...csvState, data: newData };
    setCsvState(newState);
    saveToHistory(newState);
    syncToContent();
  }, [csvState, saveToHistory, syncToContent]);

  const deleteRow = useCallback((rowId: string) => {
    const newState = {
      ...csvState,
      data: csvState.data.filter(row => row.id !== rowId)
    };
    setCsvState(newState);
    saveToHistory(newState);
    syncToContent();
  }, [csvState, saveToHistory, syncToContent]);

  const addColumn = useCallback((index?: number, name?: string) => {
    const insertIndex = index ?? csvState.columns.length;
    const newColumn: CsvColumn = {
      id: `col_${Date.now()}_${Math.random()}`,
      name: name || `Column ${csvState.columns.length + 1}`,
      type: 'text',
      index: insertIndex
    };
    
    const newColumns = [...csvState.columns];
    newColumns.splice(insertIndex, 0, newColumn);
    
    const newData = csvState.data.map(row => {
      const newCells = [...row.cells];
      newCells.splice(insertIndex, 0, { value: '', isValid: true });
      return { ...row, cells: newCells };
    });
    
    const newState = { columns: newColumns, data: newData };
    setCsvState(newState);
    saveToHistory(newState);
    syncToContent();
  }, [csvState, saveToHistory, syncToContent]);

  const deleteColumn = useCallback((columnId: string) => {
    const columnIndex = csvState.columns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) return;
    
    const newColumns = csvState.columns.filter(col => col.id !== columnId);
    const newData = csvState.data.map(row => ({
      ...row,
      cells: row.cells.filter((_, index) => index !== columnIndex)
    }));
    
    const newState = { columns: newColumns, data: newData };
    setCsvState(newState);
    saveToHistory(newState);
    syncToContent();
  }, [csvState, saveToHistory, syncToContent]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setCsvState(history[newIndex]);
      setHistoryIndex(newIndex);
      syncToContent();
    }
  }, [history, historyIndex, syncToContent]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setCsvState(history[newIndex]);
      setHistoryIndex(newIndex);
      syncToContent();
    }
  }, [history, historyIndex, syncToContent]);

  // Export functions
  const toCsv = useCallback((): string => {
    const headers = hasHeader ? [csvState.columns.map(col => col.name)] : [];
    const rows = csvState.data.map(row => row.cells.map(cell => cell.value));
    const allRows = [...headers, ...rows];
    
    return Papa.unparse(allRows, { delimiter });
  }, [csvState, hasHeader, delimiter]);

  const toJson = useCallback((): string => {
    const jsonData = csvState.data.map(row => {
      const obj: Record<string, string> = {};
      csvState.columns.forEach((col, index) => {
        obj[col.name] = row.cells[index]?.value || '';
      });
      return obj;
    });
    return JSON.stringify(jsonData, null, 2);
  }, [csvState]);

  const toMarkdown = useCallback((): string => {
    if (csvState.data.length === 0) return '';
    
    const headers = `| ${csvState.columns.map(col => col.name).join(' | ')} |`;
    const separator = `| ${csvState.columns.map(() => '---').join(' | ')} |`;
    const rows = csvState.data.map(row => 
      `| ${row.cells.map(cell => cell.value || '').join(' | ')} |`
    );
    
    return [headers, separator, ...rows].join('\n');
  }, [csvState]);

  const toSql = useCallback((tableName: string): string => {
    if (csvState.data.length === 0) return '';
    
    const insertStatements = csvState.data.map(row => {
      const values = row.cells.map(cell => `'${cell.value.replace(/'/g, "''")}'`);
      return `INSERT INTO ${tableName} (${csvState.columns.map(col => col.name).join(', ')}) VALUES (${values.join(', ')});`;
    });
    
    return insertStatements.join('\n');
  }, [csvState]);

  // Snapshot management
  const createSnapshot = useCallback((name: string) => {
    const snapshot: CsvSnapshot = {
      id: `snapshot_${Date.now()}`,
      name,
      timestamp: Date.now(),
      data: [...csvState.data],
      columns: [...csvState.columns]
    };
    setSnapshots(prev => [...prev, snapshot]);
  }, [csvState]);

  const restoreSnapshot = useCallback((snapshotId: string) => {
    const snapshot = snapshots.find(s => s.id === snapshotId);
    if (snapshot) {
      const newState = { data: snapshot.data, columns: snapshot.columns };
      setCsvState(newState);
      saveToHistory(newState);
      syncToContent();
    }
  }, [snapshots, saveToHistory, syncToContent]);

  const deleteSnapshot = useCallback((snapshotId: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
  }, []);

  // Statistics
  const getColumnStats = useCallback((columnId: string): CsvColumnStats => {
    const columnIndex = csvState.columns.findIndex(col => col.id === columnId);
    if (columnIndex === -1) {
      return { count: 0, unique: 0, empty: 0, mostCommon: null };
    }

    const values = csvState.data.map(row => row.cells[columnIndex]?.value || '');
    const nonEmpty = values.filter(v => v.trim() !== '');
    const valueCounts = new Map<string, number>();
    
    nonEmpty.forEach(value => {
      valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
    });
    
    const mostCommon = valueCounts.size > 0 
      ? Array.from(valueCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)
      : null;

    return {
      count: values.length,
      unique: valueCounts.size,
      empty: values.length - nonEmpty.length,
      mostCommon: mostCommon ? { value: mostCommon[0], count: mostCommon[1] } : null
    };
  }, [csvState]);

  const isValid = diagnostics.every(d => d.type !== 'error');

  return {
    // Data state
    data: csvState.data,
    columns: csvState.columns,
    loading,
    error,
    
    // Diagnostics
    diagnostics,
    isValid,
    
    // Data manipulation
    updateCell,
    addRow,
    deleteRow,
    addColumn,
    deleteColumn,
    
    // Undo/Redo
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    undo,
    redo,
    
    // Snapshots
    snapshots,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    
    // Export
    toCsv,
    toJson,
    toMarkdown,
    toSql,
    
    // Statistics
    getColumnStats
  };
}; 