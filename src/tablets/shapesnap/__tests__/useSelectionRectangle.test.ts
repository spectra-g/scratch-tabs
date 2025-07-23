import { renderHook, act } from "@testing-library/react";
import { useSelectionRectangle } from "../hooks/useSelectionRectangle";
import { Shape } from "../types";

// Mock shapes for testing
const mockShapes: Shape[] = [
  {
    id: "shape1",
    type: "rectangle",
    x: 10,
    y: 10,
    width: 50,
    height: 30,
    style: { stroke: "#000" },
    zIndex: 1,
  },
  {
    id: "shape2",
    type: "circle",
    x: 100,
    y: 100,
    radius: 25,
    style: { stroke: "#000" },
    zIndex: 2,
  },
  {
    id: "shape3",
    type: "rectangle",
    x: 200,
    y: 200,
    width: 40,
    height: 40,
    style: { stroke: "#000" },
    zIndex: 3,
  },
];

describe("useSelectionRectangle", () => {
  let mockOnSelectionChange: jest.Mock;

  beforeEach(() => {
    mockOnSelectionChange = jest.fn();
  });

  it("should initialize with inactive selection rectangle", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    expect(result.current.selectionRectangle.isActive).toBe(false);
    expect(result.current.selectionRectangle.startPoint).toEqual({ x: 0, y: 0 });
    expect(result.current.selectionRectangle.endPoint).toEqual({ x: 0, y: 0 });
  });

  it("should not start selection when not in select mode", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: false,
      })
    );

    act(() => {
      result.current.startSelection({ x: 10, y: 10 });
    });

    expect(result.current.selectionRectangle.isActive).toBe(false);
  });

  it("should start selection when in select mode", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    act(() => {
      result.current.startSelection({ x: 10, y: 10 });
    });

    expect(result.current.selectionRectangle.isActive).toBe(true);
    expect(result.current.selectionRectangle.startPoint).toEqual({ x: 10, y: 10 });
    expect(result.current.selectionRectangle.endPoint).toEqual({ x: 10, y: 10 });
  });

  it("should update selection rectangle end point", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    act(() => {
      result.current.startSelection({ x: 10, y: 10 });
    });

    act(() => {
      result.current.updateSelection({ x: 50, y: 50 });
    });

    expect(result.current.selectionRectangle.endPoint).toEqual({ x: 50, y: 50 });
    expect(result.current.selectionRectangle.isActive).toBe(true);
  });

  it("should not update selection when not active", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    act(() => {
      result.current.updateSelection({ x: 50, y: 50 });
    });

    expect(result.current.selectionRectangle.endPoint).toEqual({ x: 0, y: 0 });
  });

  it("should select shapes intersecting with rectangle and end selection", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    // Start selection at (0, 0) and drag to (70, 50) to include shape1
    act(() => {
      result.current.startSelection({ x: 0, y: 0 });
    });

    act(() => {
      result.current.updateSelection({ x: 70, y: 50 });
    });

    act(() => {
      result.current.endSelection();
    });

    expect(mockOnSelectionChange).toHaveBeenCalledWith(["shape1"]);
    expect(result.current.selectionRectangle.isActive).toBe(false);
  });

  it("should select multiple shapes when rectangle intersects them", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    // Create a large selection rectangle that includes shape1 and shape2
    act(() => {
      result.current.startSelection({ x: 0, y: 0 });
    });

    act(() => {
      result.current.updateSelection({ x: 150, y: 150 });
    });

    act(() => {
      result.current.endSelection();
    });

    expect(mockOnSelectionChange).toHaveBeenCalledWith(["shape1", "shape2"]);
  });

  it("should select no shapes when rectangle doesn't intersect any", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    // Create a selection rectangle in empty space
    act(() => {
      result.current.startSelection({ x: 300, y: 300 });
    });

    act(() => {
      result.current.updateSelection({ x: 350, y: 350 });
    });

    act(() => {
      result.current.endSelection();
    });

    expect(mockOnSelectionChange).toHaveBeenCalledWith([]);
  });

  it("should cancel selection and deactivate rectangle", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    act(() => {
      result.current.startSelection({ x: 10, y: 10 });
    });

    expect(result.current.selectionRectangle.isActive).toBe(true);

    act(() => {
      result.current.cancelSelection();
    });

    expect(result.current.selectionRectangle.isActive).toBe(false);
    expect(mockOnSelectionChange).not.toHaveBeenCalled();
  });

  it("should not end selection when not active", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    act(() => {
      result.current.endSelection();
    });

    expect(mockOnSelectionChange).not.toHaveBeenCalled();
  });

  it("should handle circle shape intersection correctly", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    // Select area that includes the circle at (100, 100) with radius 25
    // Circle bounds are approximately (75, 75) to (125, 125)
    act(() => {
      result.current.startSelection({ x: 70, y: 70 });
    });

    act(() => {
      result.current.updateSelection({ x: 130, y: 130 });
    });

    act(() => {
      result.current.endSelection();
    });

    expect(mockOnSelectionChange).toHaveBeenCalledWith(["shape2"]);
  });

  it("should handle partial intersection correctly", () => {
    const { result } = renderHook(() =>
      useSelectionRectangle({
        shapes: mockShapes,
        onSelectionChange: mockOnSelectionChange,
        isSelectMode: true,
      })
    );

    // Select area that partially overlaps with shape1 (10, 10, 50x30)
    // shape1 bounds: x=10, y=10, width=50, height=30 (so right=60, bottom=40)
    // Use a smaller selection that only intersects shape1
    act(() => {
      result.current.startSelection({ x: 50, y: 30 });
    });

    act(() => {
      result.current.updateSelection({ x: 70, y: 50 });
    });

    act(() => {
      result.current.endSelection();
    });

    expect(mockOnSelectionChange).toHaveBeenCalledWith(["shape1"]);
  });
});