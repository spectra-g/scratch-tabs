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

    describe("Pasting Cells", () => {
      it("should paste cells within existing boundaries", () => {
        const { result } = renderHook(() =>
          useCsvData(sampleCsv, mockOnContentChange),
        );

        const firstRowId = result.current.data[0].id;
        const firstColumnId = result.current.columns[0].id;

        act(() => {
          result.current.pasteCells(firstRowId, firstColumnId, [
            ["Alpha", "Beta"],
            ["Gamma", "Delta"],
          ]);
        });

        expect(result.current.data[0].cells[0].value).toBe("Alpha");
        expect(result.current.data[0].cells[1].value).toBe("Beta");
        expect(result.current.data[1].cells[0].value).toBe("Gamma");
        expect(result.current.data[1].cells[1].value).toBe("Delta");
        expect(result.current.columns).toHaveLength(3);
      });

      it("should expand columns when pasting beyond column boundary", () => {
        const { result } = renderHook(() =>
          useCsvData(sampleCsv, mockOnContentChange),
        );

        const firstRowId = result.current.data[0].id;
        const lastColumnId = result.current.columns[2].id;

        act(() => {
          result.current.pasteCells(firstRowId, lastColumnId, [
            ["NewCity", "NewCountry", "NewContinent"],
          ]);
        });

        expect(result.current.data[0].cells[2].value).toBe("NewCity");
        expect(result.current.data[0].cells[3].value).toBe("NewCountry");
        expect(result.current.data[0].cells[4].value).toBe("NewContinent");

        expect(result.current.columns).toHaveLength(5);
        expect(result.current.columns[3].name).toBe("Column 4");
        expect(result.current.columns[4].name).toBe("Column 5");

        expect(result.current.data[1].cells).toHaveLength(5);
        expect(result.current.data[1].cells[3].value).toBe("");
      });

      it("should expand rows when pasting beyond row boundary", () => {
        const { result } = renderHook(() =>
          useCsvData(sampleCsv, mockOnContentChange),
        );

        const lastRowId = result.current.data[2].id;
        const firstColumnId = result.current.columns[0].id;

        act(() => {
          result.current.pasteCells(lastRowId, firstColumnId, [
            ["Row2Col0"],
            ["Row3Col0"],
            ["Row4Col0"],
          ]);
        });

        expect(result.current.data[2].cells[0].value).toBe("Row2Col0");
        expect(result.current.data[3].cells[0].value).toBe("Row3Col0");
        expect(result.current.data[4].cells[0].value).toBe("Row4Col0");

        expect(result.current.data).toHaveLength(5);
        expect(result.current.data[3].cells).toHaveLength(3);
      });

      it("should support atomic undo/redo of paste operations", () => {
        const { result } = renderHook(() =>
          useCsvData(sampleCsv, mockOnContentChange),
        );

        const firstRowId = result.current.data[0].id;
        const firstColumnId = result.current.columns[0].id;

        const originalVal = result.current.data[0].cells[0].value;

        act(() => {
          result.current.pasteCells(firstRowId, firstColumnId, [
            ["Pasted1", "Pasted2"],
            ["Pasted3", "Pasted4"],
          ]);
        });

        expect(result.current.data[0].cells[0].value).toBe("Pasted1");

        act(() => {
          result.current.undo();
        });

        expect(result.current.data[0].cells[0].value).toBe(originalVal);

        act(() => {
          result.current.redo();
        });

        expect(result.current.data[0].cells[0].value).toBe("Pasted1");
      });
    });

    describe("Pasting Columns", () => {
      it("should insert copied columns before the target column without overwriting existing data", () => {
        const { result } = renderHook(() =>
          useCsvData(sampleCsv, mockOnContentChange),
        );

        const cityColumnId = result.current.columns[2].id;

        act(() => {
          result.current.insertColumnsFromGrid(cityColumnId, ["Score"], [
            ["10"],
            ["20"],
            ["30"],
          ]);
        });

        expect(result.current.columns.map((column) => column.name)).toEqual([
          "Name",
          "Age",
          "Score",
          "City",
        ]);
        expect(result.current.data[0].cells.map((cell) => cell.value)).toEqual([
          "John Doe",
          "28",
          "10",
          "New York",
        ]);
        expect(result.current.data[1].cells.map((cell) => cell.value)).toEqual([
          "Jane Smith",
          "32",
          "20",
          "San Francisco",
        ]);
      });

      it("should insert multiple copied columns and preserve undo/redo as one operation", () => {
        const { result } = renderHook(() =>
          useCsvData(sampleCsv, mockOnContentChange),
        );

        const ageColumnId = result.current.columns[1].id;

        act(() => {
          result.current.insertColumnsFromGrid(ageColumnId, ["First", "Last"], [
            ["John", "Doe"],
            ["Jane", "Smith"],
            ["Bob", "Johnson"],
          ]);
        });

        expect(result.current.columns.map((column) => column.name)).toEqual([
          "Name",
          "First",
          "Last",
          "Age",
          "City",
        ]);
        expect(result.current.data[2].cells.map((cell) => cell.value)).toEqual([
          "Bob Johnson",
          "Bob",
          "Johnson",
          "45",
          "Chicago",
        ]);

        act(() => {
          result.current.undo();
        });

        expect(result.current.columns.map((column) => column.name)).toEqual([
          "Name",
          "Age",
          "City",
        ]);

        act(() => {
          result.current.redo();
        });

        expect(result.current.columns.map((column) => column.name)).toEqual([
          "Name",
          "First",
          "Last",
          "Age",
          "City",
        ]);
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

    it("should export only the provided (filtered) rows when given a subset", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const subset = result.current.filteredData.slice(0, 1);
      expect(result.current.toCsv(subset)).not.toContain("Jane Smith");
      expect(JSON.parse(result.current.toJson(subset))).toHaveLength(1);

      // Omitting the argument still exports every row
      expect(result.current.toCsv()).toContain("Jane Smith");
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

  describe("promoteFirstRowToHeader", () => {
    it("should use first data row values as column names", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      act(() => {
        result.current.promoteFirstRowToHeader();
      });

      // First data row was "John Doe,28,New York" — those become the headers
      expect(result.current.columns[0].name).toBe("John Doe");
      expect(result.current.columns[1].name).toBe("28");
      expect(result.current.columns[2].name).toBe("New York");
    });

    it("should remove the promoted row from data", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const initialRowCount = result.current.data.length;

      act(() => {
        result.current.promoteFirstRowToHeader();
      });

      expect(result.current.data).toHaveLength(initialRowCount - 1);
      // The new first row should be what was previously row 2
      expect(result.current.data[0].cells[0].value).toBe("Jane Smith");
    });

    it("should be a no-op when there is no data", () => {
      const { result } = renderHook(() =>
        useCsvData("Name,Age,City", mockOnContentChange),
      );

      const originalColumns = result.current.columns.map((c) => c.name);

      act(() => {
        result.current.promoteFirstRowToHeader();
      });

      expect(result.current.columns.map((c) => c.name)).toEqual(originalColumns);
      expect(result.current.data).toHaveLength(0);
    });

    it("should integrate with undo/redo", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const originalHeaders = result.current.columns.map((c) => c.name);
      const originalRowCount = result.current.data.length;

      act(() => {
        result.current.promoteFirstRowToHeader();
      });

      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.columns.map((c) => c.name)).toEqual(originalHeaders);
      expect(result.current.data).toHaveLength(originalRowCount);
    });

    it("should sync content after promoting", async () => {
      mockOnContentChange.mockClear();
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      act(() => {
        result.current.promoteFirstRowToHeader();
      });

      await waitFor(
        () => {
          expect(mockOnContentChange).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );

      const newContent: string =
        mockOnContentChange.mock.calls[
          mockOnContentChange.mock.calls.length - 1
        ][0];
      expect(newContent).toContain("John Doe");
      expect(newContent).toContain("Jane Smith");
    });
  });

  describe("demoteHeaderToFirstRow", () => {
    it("should prepend a new row with current header values", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const initialRowCount = result.current.data.length;

      act(() => {
        result.current.demoteHeaderToFirstRow();
      });

      expect(result.current.data).toHaveLength(initialRowCount + 1);
      expect(result.current.data[0].cells[0].value).toBe("Name");
      expect(result.current.data[0].cells[1].value).toBe("Age");
      expect(result.current.data[0].cells[2].value).toBe("City");
    });

    it("should reset column names to Column N", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      act(() => {
        result.current.demoteHeaderToFirstRow();
      });

      expect(result.current.columns[0].name).toBe("Column 1");
      expect(result.current.columns[1].name).toBe("Column 2");
      expect(result.current.columns[2].name).toBe("Column 3");
    });

    it("should integrate with undo/redo", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const originalHeaders = result.current.columns.map((c) => c.name);
      const originalRowCount = result.current.data.length;

      act(() => {
        result.current.demoteHeaderToFirstRow();
      });

      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.undo();
      });

      expect(result.current.columns.map((c) => c.name)).toEqual(originalHeaders);
      expect(result.current.data).toHaveLength(originalRowCount);
    });

    it("should work on empty data (only headers exist)", () => {
      const { result } = renderHook(() =>
        useCsvData("Name,Age,City", mockOnContentChange),
      );

      expect(result.current.data).toHaveLength(0);

      act(() => {
        result.current.demoteHeaderToFirstRow();
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].cells[0].value).toBe("Name");
      expect(result.current.columns[0].name).toBe("Column 1");
    });

    it("should be the inverse of promoteFirstRowToHeader", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      const originalHeaders = result.current.columns.map((c) => c.name);
      const originalFirstRow = result.current.data[0].cells.map((c) => c.value);

      act(() => {
        result.current.demoteHeaderToFirstRow();
      });
      act(() => {
        result.current.promoteFirstRowToHeader();
      });

      expect(result.current.columns.map((c) => c.name)).toEqual(originalHeaders);
      expect(result.current.data[0].cells.map((c) => c.value)).toEqual(
        originalFirstRow,
      );
    });
  });

  describe("changeDelimiter", () => {
    it("should detect comma delimiter from CSV content", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      expect(result.current.detectedDelimiter).toBe(",");
    });

    it("should detect tab delimiter from TSV content", () => {
      const tsvContent = "Name\tAge\tCity\nJohn\t28\tNY";
      const { result } = renderHook(() =>
        useCsvData(tsvContent, mockOnContentChange),
      );

      expect(result.current.detectedDelimiter).toBe("\t");
    });

    it("should detect pipe delimiter", () => {
      const pipeContent = "Name|Age|City\nJohn|28|NY";
      const { result } = renderHook(() =>
        useCsvData(pipeContent, mockOnContentChange),
      );

      expect(result.current.detectedDelimiter).toBe("|");
    });

    it("should call onContentChange immediately (not debounced) with new delimiter", () => {
      mockOnContentChange.mockClear();
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      act(() => {
        result.current.changeDelimiter("\t");
      });

      // changeDelimiter calls onContentChange synchronously, not via debounce
      expect(mockOnContentChange).toHaveBeenCalledTimes(1);
      const newContent: string = mockOnContentChange.mock.calls[0][0];
      expect(newContent).toContain("\t");
      expect(newContent).not.toContain(",");
    });

    it("should preserve all data values when converting delimiter", () => {
      mockOnContentChange.mockClear();
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      act(() => {
        result.current.changeDelimiter(";");
      });

      const newContent: string = mockOnContentChange.mock.calls[0][0];
      expect(newContent).toContain("Name;Age;City");
      expect(newContent).toContain("John Doe;28;New York");
      expect(newContent).toContain("Jane Smith;32;San Francisco");
    });

    it("should include headers in converted content when hasHeader is true", () => {
      mockOnContentChange.mockClear();
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange, { hasHeader: true }),
      );

      act(() => {
        result.current.changeDelimiter("|");
      });

      const newContent: string = mockOnContentChange.mock.calls[0][0];
      expect(newContent.split("\n")[0]).toContain("Name|Age|City");
    });
  });

  describe("Column filters", () => {
    it("starts with no filters and unfiltered data", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      expect(result.current.filters).toEqual([]);
      expect(result.current.filterMatchMode).toBe("and");
      expect(result.current.filteredData).toEqual(result.current.data);
    });

    it("setColumnFilter adds a filter and narrows filteredData", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      const ageColumnId = result.current.columns[1].id;

      act(() => {
        result.current.setColumnFilter(ageColumnId, {
          columnId: ageColumnId,
          operator: "gte",
          value: "40",
        });
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filteredData.map((row) => row.cells[0].value)).toEqual([
        "Bob Johnson",
      ]);
      // Underlying data is untouched
      expect(result.current.data).toHaveLength(3);
    });

    it("setColumnFilter replaces an existing filter in place", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      const ageColumnId = result.current.columns[1].id;

      act(() => {
        result.current.setColumnFilter(ageColumnId, {
          columnId: ageColumnId,
          operator: "gte",
          value: "30",
        });
      });
      act(() => {
        result.current.setColumnFilter(ageColumnId, {
          columnId: ageColumnId,
          operator: "lte",
          value: "30",
        });
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].operator).toBe("lte");
      // Ages <= 30: John Doe (28) only
      expect(
        result.current.filteredData.map((row) => row.cells[0].value),
      ).toEqual(["John Doe"]);
    });

    it("removeColumnFilter removes only that column's filter", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      const nameColumnId = result.current.columns[0].id;
      const ageColumnId = result.current.columns[1].id;

      act(() => {
        result.current.setColumnFilter(nameColumnId, {
          columnId: nameColumnId,
          operator: "contains",
          value: "Johnson",
        });
        result.current.setColumnFilter(ageColumnId, {
          columnId: ageColumnId,
          operator: "gte",
          value: "30",
        });
      });
      expect(result.current.filteredData).toHaveLength(1); // Bob Johnson (45)

      act(() => {
        result.current.removeColumnFilter(nameColumnId);
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].columnId).toBe(ageColumnId);
      expect(result.current.filteredData).toHaveLength(2); // Jane Smith + Bob Johnson
    });

    it("clearFilters removes every filter", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      const nameColumnId = result.current.columns[0].id;

      act(() => {
        result.current.setColumnFilter(nameColumnId, {
          columnId: nameColumnId,
          operator: "contains",
          value: "John",
        });
      });
      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters).toEqual([]);
      expect(result.current.filteredData).toEqual(result.current.data);
    });

    it("supports OR match mode across columns", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      const nameColumnId = result.current.columns[0].id;
      const cityColumnId = result.current.columns[2].id;

      act(() => {
        result.current.setFilterMatchMode("or");
        result.current.setColumnFilter(nameColumnId, {
          columnId: nameColumnId,
          operator: "equals",
          value: "John Doe",
        });
        result.current.setColumnFilter(cityColumnId, {
          columnId: cityColumnId,
          operator: "equals",
          value: "Chicago",
        });
      });

      expect(result.current.filterMatchMode).toBe("or");
      expect(
        result.current.filteredData.map((row) => row.cells[0].value).sort(),
      ).toEqual(["Bob Johnson", "John Doe"]);
    });

    it("keeps filters when content is re-parsed", () => {
      const { result, rerender } = renderHook(
        ({ content }: { content: string }) =>
          useCsvData(content, mockOnContentChange),
        { initialProps: { content: sampleCsv } },
      );
      const nameColumnId = result.current.columns[0].id;

      act(() => {
        result.current.setColumnFilter(nameColumnId, {
          columnId: nameColumnId,
          operator: "equals",
          value: "John Doe",
        });
      });

      rerender({ content: `${sampleCsv}\nExtra Person,50,Boston` });

      expect(result.current.data).toHaveLength(4);
      expect(
        result.current.filteredData.map((row) => row.cells[0].value),
      ).toEqual(["John Doe"]);
    });

    it("prunes filters whose columns no longer exist after re-parse", () => {
      const { result, rerender } = renderHook(
        ({ content }: { content: string }) =>
          useCsvData(content, mockOnContentChange),
        { initialProps: { content: sampleCsv } },
      );
      // Filter the last column ("City", col_2)
      const cityColumnId = result.current.columns[2].id;

      act(() => {
        result.current.setColumnFilter(cityColumnId, {
          columnId: cityColumnId,
          operator: "contains",
          value: "York",
        });
      });
      expect(result.current.filters).toHaveLength(1);

      // Re-parse content with fewer columns so col_2 no longer exists
      rerender({ content: "A,B\n1,2" });

      expect(result.current.filters).toEqual([]);
      expect(result.current.filteredData).toHaveLength(1);
    });

    it("keeps filters when rows are added or removed between re-parses", () => {
      const { result, rerender } = renderHook(
        ({ content }: { content: string }) =>
          useCsvData(content, mockOnContentChange),
        { initialProps: { content: sampleCsv } },
      );
      const cityColumnId = result.current.columns[2].id;

      act(() => {
        result.current.setColumnFilter(cityColumnId, {
          columnId: cityColumnId,
          operator: "contains",
          value: "York",
        });
      });

      rerender({ content: `${sampleCsv}\nAmy Lee,29,Boston\n` });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0].columnId).toBe(cityColumnId);
      expect(
        result.current.filteredData.map((row) => row.cells[0].value),
      ).toEqual(["John Doe"]);
    });

    it("drops filters whose column was renamed by a re-parse instead of re-targeting them", () => {
      const { result, rerender } = renderHook(
        ({ content }: { content: string }) =>
          useCsvData(content, mockOnContentChange),
        { initialProps: { content: sampleCsv } },
      );
      const ageColumnId = result.current.columns[1].id;

      act(() => {
        result.current.setColumnFilter(ageColumnId, {
          columnId: ageColumnId,
          operator: "gte",
          value: "30",
        });
      });
      expect(result.current.filters).toHaveLength(1);

      // "Age" becomes "Score": the old filter must not silently apply to it
      rerender({ content: sampleCsv.replace("Age", "Score") });

      expect(result.current.filters).toEqual([]);
      expect(result.current.filteredData).toHaveLength(3);
    });

    it("drops filters when columns are reordered by a re-parse", () => {
      const { result, rerender } = renderHook(
        ({ content }: { content: string }) =>
          useCsvData(content, mockOnContentChange),
        { initialProps: { content: sampleCsv } },
      );
      const cityColumnId = result.current.columns[2].id;

      act(() => {
        result.current.setColumnFilter(cityColumnId, {
          columnId: cityColumnId,
          operator: "equals",
          value: "Chicago",
        });
      });
      expect(result.current.filteredData.map((row) => row.cells[0].value)).toEqual(
        ["Bob Johnson"],
      );

      // City moved to the front: positional reuse of the old id would filter
      // names instead of cities
      rerender({ content: `City,Name,Age\nChicago,Bob Johnson,45` });

      expect(result.current.filters).toEqual([]);
      expect(result.current.filteredData).toHaveLength(1);
    });
  });

  describe("Filter presets", () => {
    const applyAgeFilter = (result: { current: ReturnType<typeof useCsvData> }) => {
      const ageColumnId = result.current.columns[1].id;
      act(() => {
        result.current.setColumnFilter(ageColumnId, {
          columnId: ageColumnId,
          operator: "gte",
          value: "40",
        });
      });
      return ageColumnId;
    };

    it("starts with no presets", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );

      expect(result.current.filterPresets).toEqual([]);
    });

    it("ignores blank preset names", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      applyAgeFilter(result);

      act(() => {
        result.current.saveFilterPreset("   ");
      });

      expect(result.current.filterPresets).toEqual([]);
    });

    it("saves the current filter set and match mode under a name", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      applyAgeFilter(result);
      act(() => {
        result.current.setFilterMatchMode("or");
      });

      act(() => {
        result.current.saveFilterPreset("Older folks");
      });

      expect(result.current.filterPresets).toHaveLength(1);
      const preset = result.current.filterPresets[0];
      expect(preset.name).toBe("Older folks");
      expect(preset.matchMode).toBe("or");
      expect(preset.filters.map((filter) => filter.operator)).toEqual(["gte"]);
    });

    it("applies a preset by restoring its filters without aliasing them", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      const ageColumnId = applyAgeFilter(result);
      act(() => {
        result.current.saveFilterPreset("P1");
      });
      act(() => {
        result.current.clearFilters();
      });
      expect(result.current.filters).toEqual([]);

      act(() => {
        result.current.applyFilterPreset(result.current.filterPresets[0].id);
      });

      expect(result.current.filters).toHaveLength(1);
      expect(result.current.filters[0]).toMatchObject({
        columnId: ageColumnId,
        operator: "gte",
      });

      // Mutating the applied filter must not corrupt the stored preset
      act(() => {
        result.current.setColumnFilter(ageColumnId, {
          columnId: ageColumnId,
          operator: "lt",
          value: "5",
        });
      });
      expect(result.current.filterPresets[0].filters[0].operator).toBe("gte");
    });

    it("overwrites a preset with the same name but keeps its identity", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      const ageColumnId = applyAgeFilter(result);
      act(() => {
        result.current.saveFilterPreset("Same");
      });
      const original = result.current.filterPresets[0];

      act(() => {
        result.current.removeColumnFilter(ageColumnId);
      });
      act(() => {
        result.current.setColumnFilter(result.current.columns[0].id, {
          columnId: result.current.columns[0].id,
          operator: "contains",
          value: "John",
        });
      });
      act(() => {
        result.current.saveFilterPreset("Same");
      });

      expect(result.current.filterPresets).toHaveLength(1);
      expect(result.current.filterPresets[0].id).toBe(original.id);
      expect(
        result.current.filterPresets[0].filters.map((f) => f.columnId),
      ).toEqual([result.current.columns[0].id]);
    });

    it("deletes a preset", () => {
      const { result } = renderHook(() =>
        useCsvData(sampleCsv, mockOnContentChange),
      );
      applyAgeFilter(result);
      act(() => {
        result.current.saveFilterPreset("Temp");
      });
      const id = result.current.filterPresets[0].id;

      act(() => {
        result.current.deleteFilterPreset(id);
      });

      expect(result.current.filterPresets).toEqual([]);
    });
  });
});
