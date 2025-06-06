import * as Papa from 'papaparse';

export interface CsvCell {
  value: string;
  isValid: boolean;
  error?: string;
}

export interface CsvRow {
  id: string;
  cells: CsvCell[];
  originalIndex: number;
  isValid: boolean;
}

export interface CsvColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  index: number;
}

export interface CsvParseResult {
  data: CsvRow[];
  columns: CsvColumn[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
}

export interface CsvDiagnostic {
  type: 'warning' | 'error';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface CsvSnapshot {
  id: string;
  name: string;
  timestamp: number;
  data: CsvRow[];
  columns: CsvColumn[];
}

export interface UseCsvDataOptions {
  maxRows?: number;
  delimiter?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
}

export interface CsvColumnStats {
  count: number;
  unique: number;
  empty: number;
  mostCommon: { value: string; count: number } | null;
} 