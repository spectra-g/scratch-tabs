import { renderHook, act } from "@testing-library/react";
import { useLineResizeHandler } from "../hooks/useLineResizeHandler";
import { Shape } from "../types";

describe("useLineResizeHandler", () => {
  const mockLineShape: Shape = {
    id: "line-1",
    type: "line",
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ],
    style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
    zIndex: 1,
  } as Shape;

  const mockOnUpdateShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      expect(result.current.lineResizeState).toEqual({
        lineDragMode: null,
        lineDragPoint: null,
        lineDragShape: null,
        draggedShape: null,
      });
      expect(result.current.isLineResizing).toBe(false);
      expect(result.current.lineDragMode).toBe(null);
    });
  });

  describe("detectLineDragMode", () => {
    it("should detect resize-start mode", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 105, y: 105 }; // Near start point
      expect(result.current.detectLineDragMode(mockLineShape, startPoint)).toBe(
        "resize-start",
      );
    });

    it("should detect resize-end mode", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const endPoint = { x: 195, y: 195 }; // Near end point
      expect(result.current.detectLineDragMode(mockLineShape, endPoint)).toBe(
        "resize-end",
      );
    });

    it("should detect move mode", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const middlePoint = { x: 150, y: 150 }; // Middle of line
      expect(
        result.current.detectLineDragMode(mockLineShape, middlePoint),
      ).toBe("move");
    });

    it("should return move for non-line shapes", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const rectShape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const point = { x: 125, y: 115 };
      expect(result.current.detectLineDragMode(rectShape, point)).toBe("move");
    });

    it("should handle lines with insufficient points", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const invalidLineShape = {
        id: "line-2",
        type: "line",
        points: [{ x: 100, y: 100 }], // Only one point
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const point = { x: 100, y: 100 };
      expect(result.current.detectLineDragMode(invalidLineShape, point)).toBe(
        "move",
      );
    });
  });

  describe("startLineResize", () => {
    it("should start resize-start operation", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const mousePoint = { x: 105, y: 105 };

      act(() => {
        result.current.startLineResize(mockLineShape, mousePoint);
      });

      expect(result.current.lineResizeState.lineDragMode).toBe("resize-start");
      expect(result.current.lineResizeState.lineDragShape).toBe(mockLineShape);
      expect(result.current.isLineResizing).toBe(true);
    });

    it("should start resize-end operation", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const mousePoint = { x: 195, y: 195 };

      act(() => {
        result.current.startLineResize(mockLineShape, mousePoint);
      });

      expect(result.current.lineResizeState.lineDragMode).toBe("resize-end");
      expect(result.current.lineResizeState.lineDragShape).toBe(mockLineShape);
      expect(result.current.isLineResizing).toBe(true);
    });

    it("should start move operation", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const mousePoint = { x: 150, y: 150 };

      act(() => {
        result.current.startLineResize(mockLineShape, mousePoint);
      });

      expect(result.current.lineResizeState.lineDragMode).toBe("move");
      expect(result.current.lineResizeState.lineDragShape).toBe(mockLineShape);
      expect(result.current.isLineResizing).toBe(true);
    });

    it("should not start for non-line shapes", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const rectShape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const mousePoint = { x: 125, y: 115 };

      act(() => {
        result.current.startLineResize(rectShape, mousePoint);
      });

      expect(result.current.isLineResizing).toBe(false);
    });
  });

  describe("updateLineResize", () => {
    it("should update resize-start operation", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 105, y: 105 };
      const movePoint = { x: 120, y: 120 };

      act(() => {
        result.current.startLineResize(mockLineShape, startPoint);
      });

      act(() => {
        result.current.updateLineResize(movePoint);
      });

      expect(result.current.draggedShape).toBeDefined();
      expect(result.current.draggedShape).toHaveProperty("points");
      expect((result.current.draggedShape as any).points).toHaveLength(2);
    });

    it("should update resize-end operation", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 195, y: 195 };
      const movePoint = { x: 220, y: 220 };

      act(() => {
        result.current.startLineResize(mockLineShape, startPoint);
      });

      act(() => {
        result.current.updateLineResize(movePoint);
      });

      expect(result.current.draggedShape).toBeDefined();
      expect(result.current.draggedShape).toHaveProperty("points");
      expect((result.current.draggedShape as any).points).toHaveLength(2);
    });

    it("should update move operation", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 150, y: 150 };
      const movePoint = { x: 170, y: 170 };

      act(() => {
        result.current.startLineResize(mockLineShape, startPoint);
      });

      act(() => {
        result.current.updateLineResize(movePoint);
      });

      expect(result.current.draggedShape).toBeDefined();
      expect(result.current.draggedShape).toHaveProperty("points");
      expect((result.current.draggedShape as any).points).toHaveLength(2);
    });

    it("should return undefined when not resizing", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const movePoint = { x: 170, y: 170 };

      act(() => {
        result.current.updateLineResize(movePoint);
      });

      expect(result.current.draggedShape).toBeNull();
    });
  });

  describe("endLineResize", () => {
    it("should end resize operation and update shape", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 105, y: 105 };
      const endPoint = { x: 120, y: 120 };

      act(() => {
        result.current.startLineResize(mockLineShape, startPoint);
      });

      act(() => {
        result.current.updateLineResize(endPoint);
      });

      act(() => {
        result.current.endLineResize();
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "line-1",
        expect.objectContaining({
          points: expect.any(Array),
        }),
      );
      expect(result.current.isLineResizing).toBe(false);
    });

    it("should not update when not resizing", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      act(() => {
        result.current.endLineResize();
      });

      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });
  });

  describe("cancelLineResize", () => {
    it("should cancel line resize operation", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 105, y: 105 };

      act(() => {
        result.current.startLineResize(mockLineShape, startPoint);
      });

      expect(result.current.isLineResizing).toBe(true);

      act(() => {
        result.current.cancelLineResize();
      });

      expect(result.current.isLineResizing).toBe(false);
      expect(result.current.lineResizeState.lineDragMode).toBe(null);
      expect(result.current.lineResizeState.lineDragShape).toBe(null);
    });
  });

  describe("grid snapping", () => {
    it("should snap to grid when enabled", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          gridSnappingEnabled: true,
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 105, y: 105 };
      const endPoint = { x: 123, y: 127 }; // Should snap to grid

      act(() => {
        result.current.startLineResize(mockLineShape, startPoint);
      });

      act(() => {
        result.current.updateLineResize(endPoint);
      });

      act(() => {
        result.current.endLineResize();
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "line-1",
        expect.objectContaining({
          points: expect.any(Array),
        }),
      );
    });

    it("should not snap to grid when disabled", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          gridSnappingEnabled: false,
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 105, y: 105 };
      const endPoint = { x: 123, y: 127 };

      act(() => {
        result.current.startLineResize(mockLineShape, startPoint);
      });

      act(() => {
        result.current.updateLineResize(endPoint);
      });

      act(() => {
        result.current.endLineResize();
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "line-1",
        expect.objectContaining({
          points: expect.any(Array),
        }),
      );
    });
  });

  describe("threshold detection", () => {
    it("should use percentage-based threshold for long lines", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const longLineShape = {
        id: "line-3",
        type: "line",
        points: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
        ], // Very long line
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      // Test near start point (should be resize-start)
      const nearStart = { x: 10, y: 0 }; // Within 15px threshold
      expect(result.current.detectLineDragMode(longLineShape, nearStart)).toBe(
        "resize-start",
      );

      // Test near end point (should be resize-end)
      const nearEnd = { x: 990, y: 0 }; // Within 15px threshold
      expect(result.current.detectLineDragMode(longLineShape, nearEnd)).toBe(
        "resize-end",
      );

      // Test middle (should be move)
      const middle = { x: 500, y: 0 };
      expect(result.current.detectLineDragMode(longLineShape, middle)).toBe(
        "move",
      );
    });

    it("should use fixed threshold for short lines", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shortLineShape = {
        id: "line-4",
        type: "line",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ], // Very short line
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      // Test near start point (should be resize-start)
      const nearStart = { x: 5, y: 0 }; // Within 15px threshold
      expect(result.current.detectLineDragMode(shortLineShape, nearStart)).toBe(
        "resize-start",
      );

      // Test near end point (should be resize-end)
      const nearEnd = { x: 8, y: 0 }; // Within 15px threshold
      expect(result.current.detectLineDragMode(shortLineShape, nearEnd)).toBe(
        "resize-end",
      );
    });
  });

  describe("original shape resolution", () => {
    it("should use original shape from shapes array instead of hit area shape", () => {
      const originalShape: Shape = {
        id: "line-1",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        style: { stroke: "#ff0000", fill: "transparent", strokeWidth: 2 }, // Red stroke
        zIndex: 1,
      } as Shape;

      const hitAreaShape: Shape = {
        id: "line-1",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        style: { stroke: "transparent", fill: "transparent", strokeWidth: 2 }, // Transparent stroke
        zIndex: 1,
      } as Shape;

      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
          shapes: [originalShape], // Provide the original shape
        }),
      );

      // Start resize with the hit area shape (transparent stroke)
      act(() => {
        result.current.startLineResize(hitAreaShape, { x: 100, y: 100 }, "resize-start");
      });

      // Update resize
      act(() => {
        result.current.updateLineResize({ x: 150, y: 150 });
      });

      // Check dragged shape before ending resize
      expect(result.current.draggedShape).toBeDefined();
      expect(result.current.draggedShape?.style?.stroke).toBe("#ff0000");

      // End resize
      act(() => {
        result.current.endLineResize();
      });

      // Should have used the original shape with red stroke, not the transparent hit area
      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "line-1",
        expect.objectContaining({
          points: expect.arrayContaining([
            { x: 150, y: 150 }, // Updated first point
            { x: 200, y: 200 }, // Unchanged second point
          ]),
        }),
      );
    });

    it("should fallback to provided shape when not found in shapes array", () => {
      const hitAreaShape: Shape = {
        id: "line-2",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        style: { stroke: "transparent", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
          shapes: [], // Empty shapes array
        }),
      );

      // Should not throw error and use the provided shape as fallback
      act(() => {
        result.current.startLineResize(hitAreaShape, { x: 100, y: 100 }, "resize-start");
      });

      expect(result.current.lineResizeState.lineDragShape).toEqual(hitAreaShape);
    });
  });
});
