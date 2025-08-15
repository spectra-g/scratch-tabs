import { renderHook, act, waitFor } from "@testing-library/react";
import { useCsvData } from "../hooks/useCsvData";

describe("useCsvData", () => {
  const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;

  const mockOnContentChange = jest.fn();

  beforeEach(() => {
    mockOnContentChange.mockClear();
  });

  describe("CSV Parsing", () => {
    it("should parse CSV with headers correctly", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange, { hasHeader: true }),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.columns).toHaveLength(3);
      expect(result.current.columns[0].name).toBe("Name");
      expect(result.current.columns[1].name).toBe("Age");
      expect(result.current.columns[2].name).toBe("City");
      expect(result.current.data).toHaveLength(3);
    });

    it("should parse CSV without headers", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange, { hasHeader: false }),
      );

      expect(result.current.columns[0].name).toBe("Column 1");
      expect(result.current.columns[1].name).toBe("Column 2");
      expect(result.current.columns[2].name).toBe("Column 3");
      expect(result.current.data).toHaveLength(4); // All rows treated as data
    });

    it("should handle empty CSV", () => {
      const { result } = renderHook(() => useCsvData("", mockOnContentChange));

      expect(result.current.data).toHaveLength(0);
      expect(result.current.columns).toHaveLength(0);
      expect(result.current.isValid).toBe(true);
    });

    it("should detect inconsistent row lengths", () => {
      const inconsistentCsv = `Name,Age,City
John Doe,28
Jane Smith,32,San Francisco,Extra`;

      const { result } = renderHook(() =>
        useCsvData(inconsistentCsv, mockOnContentChange),
      );

      expect(result.current.diagnostics).toHaveLength(2);
      expect(result.current.diagnostics[0].type).toBe("warning");
      expect(result.current.diagnostics[0].message).toContain(
        "Row 1 has 2 columns",
      );
      expect(result.current.diagnostics[1].message).toContain(
        "Row 2 has 4 columns",
      );
    });
  });

  describe("Data Manipulation", () => {
    it("should update cell values", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const firstRowId = result.current.data[0].id;
      const firstColumnId = result.current.columns[0].id;

      act(() => {
        result.current.updateCell(firstRowId, firstColumnId, "Updated Name");
      });

      expect(result.current.data[0].cells[0].value).toBe("Updated Name");
    });

    it("should add new rows", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const initialRowCount = result.current.data.length;

      act(() => {
        result.current.addRow();
      });

      expect(result.current.data).toHaveLength(initialRowCount + 1);
      expect(result.current.data[initialRowCount].cells).toHaveLength(3);
      expect(result.current.data[initialRowCount].cells[0].value).toBe("");
    });

    it("should delete rows", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const initialRowCount = result.current.data.length;
      const firstRowId = result.current.data[0].id;

      act(() => {
        result.current.deleteRow(firstRowId);
      });

      expect(result.current.data).toHaveLength(initialRowCount - 1);
      expect(
        result.current.data.find((row) => row.id === firstRowId),
      ).toBeUndefined();
    });

    it("should add new columns", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const initialColumnCount = result.current.columns.length;

      act(() => {
        result.current.addColumn(undefined, "New Column");
      });

      expect(result.current.columns).toHaveLength(initialColumnCount + 1);
      expect(result.current.columns[initialColumnCount].name).toBe(
        "New Column",
      );

      // Check that all rows have the new column
      result.current.data.forEach((row) => {
        expect(row.cells).toHaveLength(initialColumnCount + 1);
        expect(row.cells[initialColumnCount].value).toBe("");
      });
    });

    it("should delete columns", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const initialColumnCount = result.current.columns.length;
      const firstColumnId = result.current.columns[0].id;

      act(() => {
        result.current.deleteColumn(firstColumnId);
      });

      expect(result.current.columns).toHaveLength(initialColumnCount - 1);
      expect(
        result.current.columns.find((col) => col.id === firstColumnId),
      ).toBeUndefined();

      // Check that all rows have one less cell
      result.current.data.forEach((row) => {
        expect(row.cells).toHaveLength(initialColumnCount - 1);
      });
    });
  });

  describe("Undo/Redo", () => {
    it("should support undo operations", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const originalValue = result.current.data[0].cells[0].value;
      const firstRowId = result.current.data[0].id;
      const firstColumnId = result.current.columns[0].id;

      // Make a change
      act(() => {
        result.current.updateCell(firstRowId, firstColumnId, "Changed");
      });

      expect(result.current.data[0].cells[0].value).toBe("Changed");
      expect(result.current.canUndo).toBe(true);

      // Undo the change
      act(() => {
        result.current.undo();
      });

      expect(result.current.data[0].cells[0].value).toBe(originalValue);
      expect(result.current.canUndo).toBe(false);
    });

    it("should support redo operations", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const firstRowId = result.current.data[0].id;
      const firstColumnId = result.current.columns[0].id;

      // Make a change
      act(() => {
        result.current.updateCell(firstRowId, firstColumnId, "Changed");
      });

      // Undo the change
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Redo the change
      act(() => {
        result.current.redo();
      });

      expect(result.current.data[0].cells[0].value).toBe("Changed");
      expect(result.current.canRedo).toBe(false);
    });
  });

  describe("Export Functions", () => {
    it("should export to CSV format", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const csvOutput = result.current.toCsv();
      expect(csvOutput).toContain("Name,Age,City");
      expect(csvOutput).toContain("John Doe,28,New York");
    });

    it("should export to JSON format", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const jsonOutput = result.current.toJson();
      const parsed = JSON.parse(jsonOutput);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0]).toEqual({
        Name: "John Doe",
        Age: "28",
        City: "New York",
      });
    });

    it("should export to Markdown format", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const markdownOutput = result.current.toMarkdown();
      expect(markdownOutput).toContain("| Name | Age | City |");
      expect(markdownOutput).toContain("| --- | --- | --- |");
      expect(markdownOutput).toContain("| John Doe | 28 | New York |");
    });

    it("should export to SQL format", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const sqlOutput = result.current.toSql("users");
      expect(sqlOutput).toContain("INSERT INTO users (Name, Age, City)");
      expect(sqlOutput).toContain("VALUES ('John Doe', '28', 'New York')");
    });
  });

  describe("Snapshots", () => {
    it("should create snapshots", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      act(() => {
        result.current.createSnapshot("Test Snapshot");
      });

      expect(result.current.snapshots).toHaveLength(1);
      expect(result.current.snapshots[0].name).toBe("Test Snapshot");
    });

    it("should restore from snapshots", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      // Create snapshot
      act(() => {
        result.current.createSnapshot("Before Change");
      });

      const snapshotId = result.current.snapshots[0].id;
      const firstRowId = result.current.data[0].id;
      const firstColumnId = result.current.columns[0].id;

      // Make a change
      act(() => {
        result.current.updateCell(firstRowId, firstColumnId, "Changed");
      });

      expect(result.current.data[0].cells[0].value).toBe("Changed");

      // Restore snapshot
      act(() => {
        result.current.restoreSnapshot(snapshotId);
      });

      expect(result.current.data[0].cells[0].value).toBe("John Doe");
    });

    it("should delete snapshots", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      act(() => {
        result.current.createSnapshot("Test Snapshot");
      });

      const snapshotId = result.current.snapshots[0].id;

      act(() => {
        result.current.deleteSnapshot(snapshotId);
      });

      expect(result.current.snapshots).toHaveLength(0);
    });
  });

  describe("Column Statistics", () => {
    it("should calculate column statistics", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const ageColumnId = result.current.columns[1].id; // Age column
      const stats = result.current.getColumnStats(ageColumnId);

      expect(stats.count).toBe(3);
      expect(stats.unique).toBe(3); // All ages are unique
      expect(stats.empty).toBe(0);
      expect(stats.mostCommon).toBeTruthy();
    });

    it("should handle empty columns in statistics", () => {
      const csvWithEmpty = `Name,Age,City
John Doe,,New York
Jane Smith,32,
Bob Johnson,32,Chicago`;

      const { result } = renderHook(() =>
        useCsvData(csvWithEmpty, mockOnContentChange),
      );

      const ageColumnId = result.current.columns[1].id;
      const stats = result.current.getColumnStats(ageColumnId);

      expect(stats.count).toBe(3);
      expect(stats.empty).toBe(1);
      expect(stats.unique).toBe(1); // Only "32" appears
      expect(stats.mostCommon?.value).toBe("32");
      expect(stats.mostCommon?.count).toBe(2);
    });
  });

  describe("Content Synchronization", () => {
    it("should call onContentChange when data is modified", async () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const firstRowId = result.current.data[0].id;
      const firstColumnId = result.current.columns[0].id;

      act(() => {
        result.current.updateCell(firstRowId, firstColumnId, "Updated");
      });

      // Wait for debounced call
      await new Promise((resolve) => setTimeout(resolve, 350));

      expect(mockOnContentChange).toHaveBeenCalled();
      const calledWith = mockOnContentChange.mock.calls[0][0];
      expect(calledWith).toContain("Updated");
    });
  });

  describe("insertAndShift", () => {
    const raggedCsv = `Name,Age,City,Country
John Doe,28,New York
Jane Smith,32
Bob Johnson,45,Chicago,USA`;

    it("should insert empty cell and shift right for valid ragged rows", async () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      // Get the first row (John Doe,28,New York - missing Country)
      const firstRowId = result.current.data[0].id;
      const cityColumnId = result.current.columns[2].id; // City column
      
      // Verify initial state
      expect(result.current.data[0].cells).toHaveLength(3);
      expect(result.current.data[0].cells[2].value).toBe("New York");

      // Clear previous calls
      mockOnContentChange.mockClear();

      // Insert empty cell and shift right
      act(() => {
        result.current.insertAndShift([
          { rowId: firstRowId, columnId: cityColumnId }
        ]);
      });

      // Verify the cell was inserted and content shifted
      expect(result.current.data[0].cells).toHaveLength(4);
      expect(result.current.data[0].cells[2].value).toBe(""); // New empty cell
      expect(result.current.data[0].cells[3].value).toBe("New York"); // Shifted content
      
      // Wait for debounced onContentChange call (300ms delay)
      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalled();
      }, { timeout: 1000 });
      
      const lastCall = mockOnContentChange.mock.calls[mockOnContentChange.mock.calls.length - 1];
      expect(lastCall[0]).toContain("John Doe,28,,New York");
    });

    it("should handle multiple cells in same column", () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      const firstRowId = result.current.data[0].id;
      const secondRowId = result.current.data[1].id;
      const ageColumnId = result.current.columns[1].id; // Age column

      // Insert empty cell for multiple rows
      act(() => {
        result.current.insertAndShift([
          { rowId: firstRowId, columnId: ageColumnId },
          { rowId: secondRowId, columnId: ageColumnId }
        ]);
      });

      // Verify both rows were modified
      expect(result.current.data[0].cells[1].value).toBe(""); // New empty cell
      expect(result.current.data[0].cells[2].value).toBe("28"); // Shifted content
      expect(result.current.data[1].cells[1].value).toBe(""); // New empty cell
      expect(result.current.data[1].cells[2].value).toBe("32"); // Shifted content
    });

    it("should not modify rows that already have maximum columns", () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      const fullRowId = result.current.data[2].id; // Bob Johnson row has all 4 columns
      const nameColumnId = result.current.columns[0].id;

      // Store original state
      const originalLength = result.current.data[2].cells.length;
      const originalName = result.current.data[2].cells[0].value;

      // Try to insert (should fail safety check)
      act(() => {
        result.current.insertAndShift([
          { rowId: fullRowId, columnId: nameColumnId }
        ]);
      });

      // Verify row was not modified
      expect(result.current.data[2].cells).toHaveLength(originalLength);
      expect(result.current.data[2].cells[0].value).toBe(originalName);
    });

    it("should not allow insertion across multiple columns", () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      const firstRowId = result.current.data[0].id;
      const nameColumnId = result.current.columns[0].id;
      const ageColumnId = result.current.columns[1].id;

      // Store original state
      const originalData = result.current.data[0].cells.map(cell => ({ ...cell }));

      // Try to insert across different columns (should fail)
      act(() => {
        result.current.insertAndShift([
          { rowId: firstRowId, columnId: nameColumnId },
          { rowId: firstRowId, columnId: ageColumnId }
        ]);
      });

      // Verify no changes were made
      expect(result.current.data[0].cells).toHaveLength(originalData.length);
      result.current.data[0].cells.forEach((cell, index) => {
        expect(cell.value).toBe(originalData[index].value);
      });
    });

    it("should handle empty cell identifiers gracefully", () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      const originalData = [...result.current.data];

      // Call with empty array
      act(() => {
        result.current.insertAndShift([]);
      });

      // Verify no changes were made
      expect(result.current.data).toHaveLength(originalData.length);
      result.current.data.forEach((row, index) => {
        expect(row.cells).toHaveLength(originalData[index].cells.length);
      });
    });

    it("should handle non-existent row or column IDs gracefully", () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      const originalData = [...result.current.data];

      // Call with invalid IDs
      act(() => {
        result.current.insertAndShift([
          { rowId: "invalid-row-id", columnId: "invalid-column-id" }
        ]);
      });

      // Verify no changes were made
      expect(result.current.data).toHaveLength(originalData.length);
      result.current.data.forEach((row, index) => {
        expect(row.cells).toHaveLength(originalData[index].cells.length);
      });
    });

    it("should integrate with undo/redo system", () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      const firstRowId = result.current.data[0].id;
      const ageColumnId = result.current.columns[1].id;

      // Store original state
      const originalValue = result.current.data[0].cells[1].value;

      // Perform insert and shift
      act(() => {
        result.current.insertAndShift([
          { rowId: firstRowId, columnId: ageColumnId }
        ]);
      });

      // Verify change was made
      expect(result.current.data[0].cells[1].value).toBe("");
      expect(result.current.data[0].cells[2].value).toBe(originalValue);

      // Undo the change
      act(() => {
        result.current.undo();
      });

      // Verify state was restored
      expect(result.current.data[0].cells[1].value).toBe(originalValue);
      expect(result.current.data[0].cells).toHaveLength(3); // Back to original length
    });

    it("should support multi-column selections across different rows", () => {
      const { result } = renderHook(() =>
        useCsvData(raggedCsv, mockOnContentChange),
      );

      const firstRowId = result.current.data[0].id;  // Has 3 cells (John Doe, 28, New York)
      const secondRowId = result.current.data[1].id; // Has 2 cells (Jane Smith, 32)
      const nameColumnId = result.current.columns[0].id; // Name column
      const ageColumnId = result.current.columns[1].id;  // Age column

      // Store original lengths
      const originalFirstRowLength = result.current.data[0].cells.length;
      const originalSecondRowLength = result.current.data[1].cells.length;

      // Insert cells across different columns and rows (valid scenario)
      act(() => {
        result.current.insertAndShift([
          { rowId: firstRowId, columnId: nameColumnId }, // Insert in row 1, name column
          { rowId: secondRowId, columnId: ageColumnId }  // Insert in row 2, age column
        ]);
      });

      // Verify both rows were modified
      expect(result.current.data[0].cells).toHaveLength(originalFirstRowLength + 1);
      expect(result.current.data[1].cells).toHaveLength(originalSecondRowLength + 1);

      // Verify the empty cells were inserted at the correct positions
      expect(result.current.data[0].cells[0].value).toBe(""); // Empty cell at name column
      expect(result.current.data[0].cells[1].value).toBe("John Doe"); // Original name shifted right
      
      expect(result.current.data[1].cells[1].value).toBe(""); // Empty cell at age column
      expect(result.current.data[1].cells[2].value).toBe("32"); // Original age shifted right
    });
  });
});
