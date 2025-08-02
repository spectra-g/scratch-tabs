import { renderHook, act } from "@testing-library/react";
import { useJsonLogData } from "../useJsonLogData";
import { globalStateStore } from "../globalStateStore";

describe("useJsonLogData", () => {
  const mockOnContentChange = jest.fn();

  beforeEach(() => {
    mockOnContentChange.mockClear();
    globalStateStore.clear(); // Clear global state between tests
  });

  const sampleNdjson = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server"}`;

  describe("parsing", () => {
    it("should parse valid NDJSON content", () => {
      const { result } = renderHook(() =>
        useJsonLogData(sampleNdjson, mockOnContentChange)
      );

      expect(result.current.entries).toHaveLength(3);
      expect(result.current.entries[0].isValid).toBe(true);
      expect(result.current.entries[0].parsedData.level).toBe("info");
      expect(result.current.entries[0].parsedData.message).toBe("Test message 1");
    });

    it("should detect columns from entries", () => {
      const { result } = renderHook(() =>
        useJsonLogData(sampleNdjson, mockOnContentChange)
      );

      expect(result.current.columns).toHaveLength(4);
      
      const columnKeys = result.current.columns.map(col => col.key);
      expect(columnKeys).toContain("timestamp");
      expect(columnKeys).toContain("level");
      expect(columnKeys).toContain("message");
      expect(columnKeys).toContain("service");
    });

    it("should handle invalid JSON lines", () => {
      const contentWithInvalid = `{"level": "info", "message": "valid"}
{invalid json}
{"level": "error", "message": "also valid"}`;

      const { result } = renderHook(() =>
        useJsonLogData(contentWithInvalid, mockOnContentChange)
      );

      expect(result.current.entries).toHaveLength(3);
      expect(result.current.entries[0].isValid).toBe(true);
      expect(result.current.entries[1].isValid).toBe(false);
      expect(result.current.entries[1].error).toBeDefined();
      expect(result.current.entries[2].isValid).toBe(true);
    });

    it("should calculate correct statistics", () => {
      const { result } = renderHook(() =>
        useJsonLogData(sampleNdjson, mockOnContentChange)
      );

      const stats = result.current.stats;
      expect(stats.totalEntries).toBe(3);
      expect(stats.validEntries).toBe(3);
      expect(stats.invalidEntries).toBe(0);
      expect(stats.logLevelCounts.info).toBe(1);
      expect(stats.logLevelCounts.error).toBe(1);
      expect(stats.logLevelCounts.debug).toBe(1);
    });
  });

  describe("filtering", () => {
    it("should filter by text search", async () => {
      const testContent = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server", "testId": "unique-1"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway", "testId": "unique-2"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server", "testId": "unique-3"}`;

      const { result } = renderHook(() =>
        useJsonLogData(testContent, mockOnContentChange)
      );

      // Wait for initial state to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setFilter({ textSearch: "web-server" });
      });

      expect(result.current.filteredEntries).toHaveLength(2);
      expect(result.current.filteredEntries[0].parsedData.service).toBe("web-server");
      expect(result.current.filteredEntries[1].parsedData.service).toBe("web-server");
    });

    it("should filter by log levels", async () => {
      const testContent = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server", "testId": "unique-4"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway", "testId": "unique-5"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server", "testId": "unique-6"}`;

      const { result } = renderHook(() =>
        useJsonLogData(testContent, mockOnContentChange)
      );

      // Wait for initial state to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setFilter({ logLevels: new Set(["error"]) });
      });

      expect(result.current.filteredEntries).toHaveLength(1);
      expect(result.current.filteredEntries[0].parsedData.level).toBe("error");
    });

    it("should combine multiple filters", async () => {
      const testContent = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server", "testId": "unique-7"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway", "testId": "unique-8"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server", "testId": "unique-9"}`;

      const { result } = renderHook(() =>
        useJsonLogData(testContent, mockOnContentChange)
      );

      // Wait for initial state to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      act(() => {
        result.current.setFilter({
          textSearch: "web-server",
          logLevels: new Set(["info", "debug"]),
        });
      });

      expect(result.current.filteredEntries).toHaveLength(2);
      expect(result.current.filteredEntries[0].parsedData.level).toBe("info");
      expect(result.current.filteredEntries[1].parsedData.level).toBe("debug");
    });
  });

  describe("column statistics", () => {
    it("should calculate column statistics", () => {
      const { result } = renderHook(() =>
        useJsonLogData(sampleNdjson, mockOnContentChange)
      );

      const levelColumn = result.current.columns.find(col => col.key === "level");
      expect(levelColumn).toBeDefined();

      const stats = result.current.getColumnStats(levelColumn!.id);
      expect(stats.totalCount).toBe(3);
      expect(stats.nonEmptyCount).toBe(3);
      expect(stats.uniqueCount).toBe(3);
      expect(stats.dataType).toBe("string");
      expect(stats.topValues).toHaveLength(3);
    });

    it("should calculate numeric statistics", () => {
      const numericContent = `{"value": 10, "name": "test1"}
{"value": 20, "name": "test2"}
{"value": 30, "name": "test3"}`;

      const { result } = renderHook(() =>
        useJsonLogData(numericContent, mockOnContentChange)
      );

      const valueColumn = result.current.columns.find(col => col.key === "value");
      expect(valueColumn).toBeDefined();

      const stats = result.current.getColumnStats(valueColumn!.id);
      expect(stats.dataType).toBe("number");
      expect(stats.numericStats).toBeDefined();
      expect(stats.numericStats!.min).toBe(10);
      expect(stats.numericStats!.max).toBe(30);
      expect(stats.numericStats!.average).toBe(20);
      expect(stats.numericStats!.sum).toBe(60);
    });

    it("should calculate string statistics", () => {
      const { result } = renderHook(() =>
        useJsonLogData(sampleNdjson, mockOnContentChange)
      );

      const messageColumn = result.current.columns.find(col => col.key === "message");
      expect(messageColumn).toBeDefined();

      const stats = result.current.getColumnStats(messageColumn!.id);
      expect(stats.dataType).toBe("string");
      expect(stats.stringStats).toBeDefined();
      expect(stats.stringStats!.minLength).toBeGreaterThan(0);
      expect(stats.stringStats!.maxLength).toBeGreaterThan(0);
      expect(stats.stringStats!.avgLength).toBeGreaterThan(0);
    });
  });

  describe("data manipulation", () => {
    it("should update entry values", async () => {
      const { result } = renderHook(() =>
        useJsonLogData(sampleNdjson, mockOnContentChange)
      );

      const firstEntry = result.current.entries[0];
      
      act(() => {
        result.current.updateEntry(firstEntry.id, "level", "critical");
      });

      // Wait for debounced call
      await new Promise(resolve => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const updatedContent = mockOnContentChange.mock.calls[0][0];
      expect(updatedContent).toContain('"level":"critical"');
    });

    it("should toggle column visibility", () => {
      const { result } = renderHook(() =>
        useJsonLogData(sampleNdjson, mockOnContentChange)
      );

      const levelColumn = result.current.columns.find(col => col.key === "level");
      expect(levelColumn).toBeDefined();
      expect(levelColumn!.isVisible).toBe(true);

      act(() => {
        result.current.toggleColumnVisibility(levelColumn!.id);
      });

      const updatedColumn = result.current.columns.find(col => col.key === "level");
      expect(updatedColumn!.isVisible).toBe(false);
    });
  });

  describe("export functionality", () => {
    it("should export as NDJSON", async () => {
      const testContent = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server", "testId": "export-1"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway", "testId": "export-2"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server", "testId": "export-3"}`;

      const { result } = renderHook(() =>
        useJsonLogData(testContent, mockOnContentChange)
      );

      // Wait for initial state to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const exported = result.current.exportFiltered("ndjson");
      const lines = exported.split("\n").filter(line => line.trim());
      
      expect(lines).toHaveLength(3);
      lines.forEach(line => {
        expect(() => JSON.parse(line)).not.toThrow();
      });
    });

    it("should export as JSON array", async () => {
      const testContent = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server", "testId": "export-4"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway", "testId": "export-5"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server", "testId": "export-6"}`;

      const { result } = renderHook(() =>
        useJsonLogData(testContent, mockOnContentChange)
      );

      // Wait for initial state to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const exported = result.current.exportFiltered("json");
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
      expect(parsed[0].level).toBe("info");
    });

    it("should export as CSV", async () => {
      const testContent = `{"timestamp": "2024-01-01T10:00:00Z", "level": "info", "message": "Test message 1", "service": "web-server", "testId": "export-7"}
{"timestamp": "2024-01-01T10:00:01Z", "level": "error", "message": "Test message 2", "service": "api-gateway", "testId": "export-8"}
{"timestamp": "2024-01-01T10:00:02Z", "level": "debug", "message": "Test message 3", "service": "web-server", "testId": "export-9"}`;

      const { result } = renderHook(() =>
        useJsonLogData(testContent, mockOnContentChange)
      );

      // Wait for initial state to settle
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      const exported = result.current.exportFiltered("csv");
      const lines = exported.split("\n");
      
      expect(lines.length).toBeGreaterThan(3); // Header + 3 data rows
      expect(lines[0]).toContain("timestamp");
      expect(lines[0]).toContain("level");
      expect(lines[0]).toContain("message");
      expect(lines[0]).toContain("service");
    });
  });

  describe("edge cases", () => {
    it("should handle empty content", () => {
      const { result } = renderHook(() =>
        useJsonLogData("", mockOnContentChange)
      );

      expect(result.current.entries).toHaveLength(0);
      expect(result.current.columns).toHaveLength(0);
      expect(result.current.filteredEntries).toHaveLength(0);
    });

    it("should handle content with only empty lines", () => {
      const { result } = renderHook(() =>
        useJsonLogData("\n\n\n", mockOnContentChange)
      );

      expect(result.current.entries).toHaveLength(0);
      expect(result.current.columns).toHaveLength(0);
    });

    it("should handle very large JSON objects", () => {
      const largeObject = {
        level: "info",
        message: "test",
        data: "x".repeat(10000), // Large string
      };
      const content = JSON.stringify(largeObject) + "\n" + JSON.stringify(largeObject);

      const { result } = renderHook(() =>
        useJsonLogData(content, mockOnContentChange)
      );

      expect(result.current.entries).toHaveLength(2);
      expect(result.current.entries[0].isValid).toBe(true);
    });
  });
});