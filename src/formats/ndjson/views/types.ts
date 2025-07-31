export interface LogEntry {
  id: string;
  lineNumber: number;
  rawLine: string;
  parsedData: Record<string, any>;
  isValid: boolean;
  error?: string;
}

export interface LogColumn {
  id: string;
  key: string;
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array" | "null";
  isVisible: boolean;
  width?: number;
}

export interface LogFilter {
  textSearch: string;
  logLevels: Set<string>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customFilters: Array<{
    column: string;
    operator: "equals" | "contains" | "startsWith" | "endsWith" | "regex";
    value: string;
  }>;
}

export interface LogStats {
  totalEntries: number;
  validEntries: number;
  invalidEntries: number;
  dateRange?: {
    earliest: Date;
    latest: Date;
  };
  logLevelCounts: Record<string, number>;
}

export interface ColumnStats {
  columnId: string;
  columnName: string;
  totalCount: number;
  nonEmptyCount: number;
  uniqueCount: number;
  dataType: "string" | "number" | "boolean" | "object" | "array" | "mixed";
  
  // Numeric stats (if applicable)
  numericStats?: {
    min: number;
    max: number;
    average: number;
    median: number;
    sum: number;
  };
  
  // String stats (if applicable)
  stringStats?: {
    minLength: number;
    maxLength: number;
    avgLength: number;
  };
  
  // Top values with frequency
  topValues: Array<{
    value: any;
    count: number;
    percentage: number;
  }>;
}

export interface UseJsonLogDataOptions {
  maxSampleSize?: number;
  enableRealTimeSync?: boolean;
  debounceMs?: number;
}

export interface UseJsonLogDataReturn {
  // Data
  entries: LogEntry[];
  columns: LogColumn[];
  filteredEntries: LogEntry[];
  stats: LogStats;
  
  // State
  filter: LogFilter;
  loading: boolean;
  error: string | null;
  
  // Actions
  setFilter: (filter: Partial<LogFilter>) => void;
  updateEntry: (entryId: string, key: string, value: any) => void;
  toggleColumnVisibility: (columnId: string) => void;
  setColumnWidth: (columnId: string, width: number) => void;
  
  // Statistics
  getColumnStats: (columnId: string) => ColumnStats;
  
  // Export
  exportFiltered: (format: "json" | "csv" | "ndjson") => string;
}