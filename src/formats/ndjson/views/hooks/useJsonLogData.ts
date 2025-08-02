import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { debounce } from "lodash";
import { globalStateStore } from "./globalStateStore";
import {
  LogEntry,
  LogColumn,
  LogFilter,
  LogStats,
  ColumnStats,
  UseJsonLogDataOptions,
  UseJsonLogDataReturn,
} from "../types";

const DEFAULT_OPTIONS: Required<UseJsonLogDataOptions> = {
  maxSampleSize: 100,
  enableRealTimeSync: true,
  debounceMs: 300,
};

export const useJsonLogData = (
  content: string,
  onContentChange: (newContent: string) => void,
  options: UseJsonLogDataOptions = {},
): UseJsonLogDataReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Track the last content we synced to prevent circular updates
  const lastSyncedContentRef = useRef<string>("");
  
  // Core state - use useState for entries to manage local state
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [filter, setFilterState] = useState<LogFilter>({
    textSearch: "",
    logLevels: new Set(["error", "warn", "info", "debug", "trace"]),
    customFilters: [],
  });
  
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced content sync
  const debouncedSync = useMemo(
    () =>
      debounce((newContent: string) => {
        lastSyncedContentRef.current = newContent;
        onContentChange(newContent);
      }, opts.debounceMs),
    [onContentChange, opts.debounceMs],
  );

  // Parse NDJSON content into entries - use useEffect to avoid infinite loops
  useEffect(() => {
    // Only re-parse if the content change came from an external source
    if (content === lastSyncedContentRef.current) {
      return;
    }

    if (!content || !content.trim()) {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    const lines = content.split("\n");
    const parsedEntries: LogEntry[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        return; // Skip empty lines
      }

      const entry: LogEntry = {
        id: `entry_${index}`,
        lineNumber: index + 1,
        rawLine: line,
        parsedData: {},
        isValid: false,
      };

      try {
        const parsed = JSON.parse(trimmedLine);
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
          entry.parsedData = parsed;
          entry.isValid = true;
        } else {
          entry.error = "Line is not a JSON object";
        }
      } catch (e) {
        entry.error = e instanceof Error ? e.message : "Invalid JSON";
      }

      parsedEntries.push(entry);
    });

    setEntries(parsedEntries);
    setLoading(false);
  }, [content]);

  // Restore state from global store when content is available
  useEffect(() => {
    if (content && content.trim()) {
      const saved = globalStateStore.restoreState(content);
      if (saved) {
        setColumnVisibility(saved.columnVisibility);
        setFilterState(saved.filter);
      }
    }
  }, [content]);

  // Save state to global store when it changes
  useEffect(() => {
    if (content && (
      Object.keys(columnVisibility).length > 0 || 
      filter.textSearch || 
      filter.customFilters.length > 0 ||
      filter.logLevels.size !== 5 // Save if not all log levels are selected (default is 5)
    )) {
      globalStateStore.saveState(content, columnVisibility, filter);
    }
  }, [content, columnVisibility, filter]);

  // Detect columns from entries
  const columns = useMemo<LogColumn[]>(() => {
    const columnMap = new Map<string, LogColumn>();
    
    // Sample first N entries for column detection
    const sampleEntries = entries
      .filter(entry => entry.isValid)
      .slice(0, opts.maxSampleSize);

    sampleEntries.forEach((entry) => {
      Object.entries(entry.parsedData).forEach(([key, value]) => {
        if (!columnMap.has(key)) {
          const type = Array.isArray(value)
            ? "array"
            : value === null
            ? "null"
            : typeof value === "object"
            ? "object"
            : typeof value;

          columnMap.set(key, {
            id: `col_${key}`,
            key,
            name: key,
            type: type as LogColumn["type"],
            isVisible: columnVisibility[key] !== false, // Default to visible
          });
        }
      });
    });

    return Array.from(columnMap.values()).sort((a, b) => {
      // Sort common log fields first
      const commonFields = ["timestamp", "time", "level", "message", "msg", "service"];
      const aIndex = commonFields.indexOf(a.key);
      const bIndex = commonFields.indexOf(b.key);
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.key.localeCompare(b.key);
    });
  }, [entries, opts.maxSampleSize, columnVisibility]);

  // Filter entries based on current filter state
  const filteredEntries = useMemo<LogEntry[]>(() => {
    return entries.filter((entry) => {
      if (!entry.isValid) {
        return false; // Only show valid entries in the table
      }

      // Text search
      if (filter.textSearch) {
        const searchTerm = filter.textSearch.toLowerCase();
        const entryText = JSON.stringify(entry.parsedData).toLowerCase();
        if (!entryText.includes(searchTerm)) {
          return false;
        }
      }

      // Log level filter
      if (filter.logLevels.size > 0) {
        const entryLevel = entry.parsedData.level || entry.parsedData.severity;
        if (entryLevel && typeof entryLevel === "string") {
          if (!filter.logLevels.has(entryLevel.toLowerCase())) {
            return false;
          }
        }
      }

      // Custom filters
      for (const customFilter of filter.customFilters) {
        const value = entry.parsedData[customFilter.column];
        const stringValue = String(value || "").toLowerCase();
        const filterValue = customFilter.value.toLowerCase();

        switch (customFilter.operator) {
          case "equals":
            if (stringValue !== filterValue) return false;
            break;
          case "contains":
            if (!stringValue.includes(filterValue)) return false;
            break;
          case "startsWith":
            if (!stringValue.startsWith(filterValue)) return false;
            break;
          case "endsWith":
            if (!stringValue.endsWith(filterValue)) return false;
            break;
          case "regex":
            try {
              const regex = new RegExp(customFilter.value, "i");
              if (!regex.test(stringValue)) return false;
            } catch (e) {
              return false; // Invalid regex
            }
            break;
        }
      }

      return true;
    });
  }, [entries, filter]);

  // Calculate general statistics
  const stats = useMemo<LogStats>(() => {
    const validEntries = entries.filter(entry => entry.isValid);
    const logLevelCounts: Record<string, number> = {};
    let earliest: Date | undefined;
    let latest: Date | undefined;

    validEntries.forEach((entry) => {
      // Count log levels
      const level = entry.parsedData.level || entry.parsedData.severity;
      if (level && typeof level === "string") {
        const normalizedLevel = level.toLowerCase();
        logLevelCounts[normalizedLevel] = (logLevelCounts[normalizedLevel] || 0) + 1;
      }

      // Track date range
      const timestamp = entry.parsedData.timestamp || entry.parsedData.time || entry.parsedData.date;
      if (timestamp && typeof timestamp === "string") {
        try {
          const date = new Date(timestamp);
          if (!isNaN(date.getTime())) {
            if (!earliest || date < earliest) earliest = date;
            if (!latest || date > latest) latest = date;
          }
        } catch (e) {
          // Invalid date, skip
        }
      }
    });

    return {
      totalEntries: entries.length,
      validEntries: validEntries.length,
      invalidEntries: entries.length - validEntries.length,
      dateRange: earliest && latest ? { earliest, latest } : undefined,
      logLevelCounts,
    };
  }, [entries]);

  // Update filter
  const setFilter = useCallback((newFilter: Partial<LogFilter>) => {
    setFilterState(prev => ({ ...prev, ...newFilter }));
  }, []);

  // Update entry - update local state immediately and sync back
  const updateEntry = useCallback((entryId: string, key: string, value: any) => {
    const entryIndex = entries.findIndex(entry => entry.id === entryId);
    if (entryIndex === -1) return;

    const updatedEntries = [...entries];
    const entry = { ...updatedEntries[entryIndex] };
    
    // Update the parsed data
    entry.parsedData = { ...entry.parsedData, [key]: value };
    
    // Update the raw line
    try {
      entry.rawLine = JSON.stringify(entry.parsedData);
      updatedEntries[entryIndex] = entry;

      // Update local state immediately for instant UI feedback
      setEntries(updatedEntries);
      
      // Sync back to content using the updated entries
      const newContent = updatedEntries.map(e => e.rawLine).join("\n");
      
      debouncedSync(newContent);
    } catch (e) {
      console.error("Failed to update entry:", e);
    }
  }, [entries, debouncedSync]);

  // Toggle column visibility
  const toggleColumnVisibility = useCallback((columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column) return;

    setColumnVisibility(prev => ({
      ...prev,
      [column.key]: prev[column.key] === false ? true : false,
    }));
  }, [columns]);

  // Set column width
  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: width,
    }));
  }, []);

  // Calculate column statistics
  const getColumnStats = useCallback((columnId: string): ColumnStats => {
    const column = columns.find(col => col.id === columnId);
    if (!column) {
      throw new Error(`Column ${columnId} not found`);
    }

    const validEntries = entries.filter(entry => entry.isValid);
    const values = validEntries.map(entry => entry.parsedData[column.key]);
    const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== "");
    
    // Count unique values and build frequency map
    const valueFrequency = new Map<string, number>();
    const uniqueValues = new Set();
    
    nonEmptyValues.forEach(value => {
      const stringValue = JSON.stringify(value);
      uniqueValues.add(stringValue);
      valueFrequency.set(stringValue, (valueFrequency.get(stringValue) || 0) + 1);
    });

    // Determine data type
    let dataType: ColumnStats["dataType"] = "string";
    const numericValues: number[] = [];
    let allNumeric = true;
    let allString = true;
    let allBoolean = true;

    nonEmptyValues.forEach(value => {
      if (typeof value === "number") {
        numericValues.push(value);
        allString = false;
        allBoolean = false;
      } else if (typeof value === "string") {
        const num = parseFloat(value);
        if (!isNaN(num) && isFinite(num)) {
          numericValues.push(num);
        } else {
          allNumeric = false;
        }
        allBoolean = false;
      } else if (typeof value === "boolean") {
        allNumeric = false;
        allString = false;
      } else if (typeof value === "object") {
        allNumeric = false;
        allString = false;
        allBoolean = false;
        dataType = Array.isArray(value) ? "array" : "object";
      } else {
        allNumeric = false;
        allString = false;
        allBoolean = false;
      }
    });

    if (allNumeric && numericValues.length > 0) {
      dataType = "number";
    } else if (allBoolean) {
      dataType = "boolean";
    } else if (!allString && !allNumeric && !allBoolean) {
      dataType = "mixed";
    }

    // Calculate numeric stats
    let numericStats: ColumnStats["numericStats"];
    if (numericValues.length > 0) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      const sum = numericValues.reduce((acc, val) => acc + val, 0);
      const average = sum / numericValues.length;
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

      numericStats = {
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        average,
        median,
        sum,
      };
    }

    // Calculate string stats
    let stringStats: ColumnStats["stringStats"];
    const stringValues = nonEmptyValues.filter(v => typeof v === "string") as string[];
    if (stringValues.length > 0) {
      const lengths = stringValues.map(s => s.length);
      stringStats = {
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        avgLength: lengths.reduce((acc, len) => acc + len, 0) / lengths.length,
      };
    }

    // Get top values
    const topValues = Array.from(valueFrequency.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([value, count]) => ({
        value: JSON.parse(value),
        count,
        percentage: (count / nonEmptyValues.length) * 100,
      }));

    return {
      columnId,
      columnName: column.name,
      totalCount: validEntries.length,
      nonEmptyCount: nonEmptyValues.length,
      uniqueCount: uniqueValues.size,
      dataType,
      numericStats,
      stringStats,
      topValues,
    };
  }, [entries, columns]);

  // Export filtered data - only visible columns (WYSIWYG export)  
  const exportFiltered = useCallback((format: "json" | "csv" | "ndjson"): string => {
    // Get the columns that are currently visible in the UI
    const visibleColumns = columns.filter(col => col.isVisible);
    
    switch (format) {
      case "json": {
        // Create new objects with only the visible column data
        const dataToExport = filteredEntries.map(entry => {
          const newObj: Record<string, any> = {};
          visibleColumns.forEach(col => {
            newObj[col.key] = entry.parsedData[col.key];
          });
          return newObj;
        });
        return JSON.stringify(dataToExport, null, 2);
      }
        
      case "ndjson": {
        // Create and stringify new objects line by line
        return filteredEntries.map(entry => {
          const newObj: Record<string, any> = {};
          visibleColumns.forEach(col => {
            newObj[col.key] = entry.parsedData[col.key];
          });
          return JSON.stringify(newObj);
        }).join("\n");
      }

      case "csv": {
        if (filteredEntries.length === 0) return "";
        
        // Create headers from the names of visible columns
        const headers = visibleColumns.map(col => col.name);
        const csvLines = [headers.join(",")];
        
        // Create rows by picking data from visible columns in order
        filteredEntries.forEach(entry => {
          const row = visibleColumns.map(col => {
            const value = entry.parsedData[col.key];
            if (value === null || value === undefined) return "";
            if (typeof value === "object") return JSON.stringify(value);
            
            const stringValue = String(value);
            // Escape CSV values that contain commas, quotes, or newlines
            if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          csvLines.push(row.join(","));
        });
        
        return csvLines.join("\n");
      }
        
      default:
        return "";
    }
  }, [filteredEntries, columns]);

  return {
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
    setColumnWidth,
    getColumnStats,
    exportFiltered,
  };
};