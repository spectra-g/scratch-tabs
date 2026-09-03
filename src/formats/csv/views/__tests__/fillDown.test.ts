import { renderHook, act, waitFor } from "@testing-library/react";
import { useCsvData } from "../hooks/useCsvData";

describe("useCsvData.fillDown (copy down)", () => {
  const sampleCsv = `Name,Age,City
John Doe,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;

  const mockOnContentChange = jest.fn();

  beforeEach(() => {
    mockOnContentChange.mockClear();
    jest.useRealTimers();
  });

  it("copies a non-empty value down overwriting all cells below", () => {
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, mockOnContentChange),
    );

    const firstRowId = result.current.data[0].id;
    const cityColId = result.current.columns[2].id;

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(firstRowId, cityColId);
    });

    // 2 rows below were changed
    expect(changed).toBe(2);
    expect(result.current.data[0].cells[2].value).toBe("New York");
    expect(result.current.data[1].cells[2].value).toBe("New York");
    expect(result.current.data[2].cells[2].value).toBe("New York");
  });

  it("copies an empty value down, clearing cells below", () => {
    const csvWithEmptyTop = `Name,Age,City
,28,New York
Jane Smith,32,San Francisco
Bob Johnson,45,Chicago`;
    const { result } = renderHook(() =>
      useCsvData(csvWithEmptyTop, mockOnContentChange),
    );

    const firstRowId = result.current.data[0].id;
    const nameColId = result.current.columns[0].id;

    // Sanity: source is empty, targets are not
    expect(result.current.data[0].cells[0].value).toBe("");
    expect(result.current.data[1].cells[0].value).toBe("Jane Smith");

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(firstRowId, nameColId);
    });

    expect(changed).toBe(2);
    expect(result.current.data[1].cells[0].value).toBe("");
    expect(result.current.data[2].cells[0].value).toBe("");
    // Source stays empty
    expect(result.current.data[0].cells[0].value).toBe("");
  });

  it("only affects the same column", () => {
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, mockOnContentChange),
    );

    const firstRowId = result.current.data[0].id;
    const ageColId = result.current.columns[1].id;

    act(() => {
      result.current.fillDown(firstRowId, ageColId);
    });

    // Age column filled
    expect(result.current.data.map((r) => r.cells[1].value)).toEqual([
      "28",
      "28",
      "28",
    ]);
    // Other columns untouched
    expect(result.current.data.map((r) => r.cells[0].value)).toEqual([
      "John Doe",
      "Jane Smith",
      "Bob Johnson",
    ]);
    expect(result.current.data.map((r) => r.cells[2].value)).toEqual([
      "New York",
      "San Francisco",
      "Chicago",
    ]);
  });

  it("does not modify the source row or rows above it", () => {
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, mockOnContentChange),
    );

    const middleRowId = result.current.data[1].id;
    const nameColId = result.current.columns[0].id;

    act(() => {
      result.current.fillDown(middleRowId, nameColId);
    });

    expect(result.current.data[0].cells[0].value).toBe("John Doe");
    expect(result.current.data[1].cells[0].value).toBe("Jane Smith");
    expect(result.current.data[2].cells[0].value).toBe("Jane Smith");
  });

  it("is a no-op when the source is the last row", () => {
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, mockOnContentChange),
    );

    const lastRowId = result.current.data[2].id;
    const nameColId = result.current.columns[0].id;
    const before = result.current.data.map((r) => r.cells[0].value);

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(lastRowId, nameColId);
    });

    expect(changed).toBe(0);
    expect(result.current.data.map((r) => r.cells[0].value)).toEqual(before);
    expect(result.current.canUndo).toBe(false);
    expect(mockOnContentChange).not.toHaveBeenCalled();
  });

  it("is a no-op for unknown row or column ids", () => {
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, mockOnContentChange),
    );

    const before = result.current.data.map((r) =>
      r.cells.map((c) => c.value),
    );

    let changedA: number | undefined;
    let changedB: number | undefined;
    act(() => {
      changedA = result.current.fillDown(
        "nope",
        result.current.columns[0].id,
      );
    });
    act(() => {
      changedB = result.current.fillDown(result.current.data[0].id, "nope");
    });

    expect(changedA).toBe(0);
    expect(changedB).toBe(0);
    expect(
      result.current.data.map((r) => r.cells.map((c) => c.value)),
    ).toEqual(before);
    expect(result.current.canUndo).toBe(false);
  });

  it("is a no-op (no history entry) when everything below already matches", () => {
    const alreadyFilled = `Name,Age
John,28
John,28
John,28`;
    const { result } = renderHook(() =>
      useCsvData(alreadyFilled, mockOnContentChange),
    );

    const firstRowId = result.current.data[0].id;
    const nameColId = result.current.columns[0].id;

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(firstRowId, nameColId);
    });

    expect(changed).toBe(0);
    expect(result.current.canUndo).toBe(false);
    expect(mockOnContentChange).not.toHaveBeenCalled();
  });

  it("only counts rows that actually changed", () => {
    const partialCsv = `Name,Age
A,1
A,2
A,3`;
    const { result } = renderHook(() =>
      useCsvData(partialCsv, mockOnContentChange),
    );

    // Make middle row already match so only the last row changes
    const firstRowId = result.current.data[0].id;
    const nameColId = result.current.columns[0].id;

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(firstRowId, nameColId);
    });

    // First below already "A", last below... wait all are "A" — use Age instead
    // Reset with Age column where only some match
    expect(changed).toBe(0);

    const ageColId = result.current.columns[1].id;
    act(() => {
      changed = result.current.fillDown(firstRowId, ageColId);
    });
    expect(changed).toBe(2);
    expect(result.current.data.map((r) => r.cells[1].value)).toEqual([
      "1",
      "1",
      "1",
    ]);
  });

  it("returns partial count when some rows below already match", () => {
    const csv = `Status,Note
open,a
open,b
closed,c`;
    const { result } = renderHook(() =>
      useCsvData(csv, mockOnContentChange),
    );

    const firstRowId = result.current.data[0].id;
    const statusColId = result.current.columns[0].id;

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(firstRowId, statusColId);
    });

    // Row 2 already "open", row 3 "closed" -> only 1 changed
    expect(changed).toBe(1);
    expect(result.current.data.map((r) => r.cells[0].value)).toEqual([
      "open",
      "open",
      "open",
    ]);
  });

  it("pads ragged rows that are shorter than the target column", () => {
    const ragged = `A,B,C,D
1,2,3
4,5
6,7,8,9`;
    const { result } = renderHook(() =>
      useCsvData(ragged, mockOnContentChange),
    );

    // Target column C (index 2); second data row only has 2 cells
    const firstRowId = result.current.data[0].id;
    const colCId = result.current.columns[2].id;
    const sourceValue = result.current.data[0].cells[2]?.value ?? "";

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(firstRowId, colCId);
    });

    expect(changed).toBeGreaterThan(0);
    expect(result.current.data[1].cells[2]?.value).toBe(sourceValue);
    expect(result.current.data[1].cells.length).toBeGreaterThanOrEqual(3);
  });

  it("supports undo and redo as a single atomic operation", () => {
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, mockOnContentChange),
    );

    const firstRowId = result.current.data[0].id;
    const cityColId = result.current.columns[2].id;
    const original = result.current.data.map((r) => r.cells[2].value);

    act(() => {
      result.current.fillDown(firstRowId, cityColId);
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(result.current.data.map((r) => r.cells[2].value)).toEqual(original);

    act(() => {
      result.current.redo();
    });
    expect(result.current.data.map((r) => r.cells[2].value)).toEqual([
      "New York",
      "New York",
      "New York",
    ]);
  });

  it("syncs content back through onContentChange", async () => {
    const localMock = jest.fn();
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, localMock),
    );

    const firstRowId = result.current.data[0].id;
    const nameColId = result.current.columns[0].id;

    act(() => {
      result.current.fillDown(firstRowId, nameColId);
    });

    await waitFor(
      () => {
        expect(localMock).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );

    const calls: string[] = localMock.mock.calls.map((c) => c[0]);
    const matching = calls.filter(
      (content) =>
        content.includes("Name,Age,City") &&
        content.split("\n").length >= 4 &&
        content.split("\n")[2].startsWith("John Doe") &&
        content.split("\n")[3].startsWith("John Doe"),
    );
    expect(matching.length).toBeGreaterThan(0);
  });

  it("handles a single-row table as a no-op", () => {
    const { result } = renderHook(() =>
      useCsvData(`A,B\n1,2`, mockOnContentChange),
    );

    const onlyRowId = result.current.data[0].id;
    const colId = result.current.columns[0].id;

    let changed: number | undefined;
    act(() => {
      changed = result.current.fillDown(onlyRowId, colId);
    });

    expect(changed).toBe(0);
    expect(result.current.canUndo).toBe(false);
  });

  it("fills from a middle source only downward, preserving column count", () => {
    const { result } = renderHook(() =>
      useCsvData(sampleCsv, mockOnContentChange),
    );

    const colCount = result.current.columns.length;
    const middleRowId = result.current.data[1].id;
    const cityColId = result.current.columns[2].id;

    act(() => {
      result.current.fillDown(middleRowId, cityColId);
    });

    expect(result.current.data[0].cells[2].value).toBe("New York");
    expect(result.current.data[1].cells[2].value).toBe("San Francisco");
    expect(result.current.data[2].cells[2].value).toBe("San Francisco");
    result.current.data.forEach((row) => {
      expect(row.cells.length).toBe(colCount);
    });
  });
});
