import { renderHook, act } from "@testing-library/react";
import { useDragHandler } from "../hooks/useDragHandler";
import { Shape, Point } from "../types";

describe("useDragHandler", () => {
  const mockShapes: Shape[] = [
    {
      id: "rect-1",
      type: "rectangle",
      x: 100,
      y: 100,
      width: 50,
      height: 30,
      style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
      zIndex: 1,
    } as Shape,
    {
      id: "circle-1",
      type: "circle",
      x: 200,
      y: 200,
      radius: 25,
      style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
      zIndex: 2,
    } as Shape,
  ];

  const mockOnUpdateShape = jest.fn();
  const mockOnShapeClick = jest.fn();
  const mockOnMoveMultipleShapes = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      expect(result.current.dragState).toEqual({
        draggingShapeId: null,
        dragOffset: null,
        draggedShape: null,
        draggedShapes: null,
        hasMoved: false,
        justCompletedMultiDrag: false,
        dragGuides: null,
      });
      expect(result.current.isDragging).toBe(false);
      expect(result.current.draggedShape).toBe(null);
      expect(result.current.dragGuides).toBe(null);
    });
  });

  describe("startDrag", () => {
    it("should start dragging a rectangle shape", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[0];
      const mousePoint = { x: 110, y: 110 };

      act(() => {
        result.current.startDrag(shape, mousePoint);
      });

      expect(result.current.dragState.draggingShapeId).toBe("rect-1");
      expect(result.current.dragState.draggedShape).toBe(shape);
      expect(result.current.dragState.hasMoved).toBe(false);
      expect(result.current.isDragging).toBe(true);
    });

    it("should start dragging a circle shape", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[1];
      const mousePoint = { x: 210, y: 210 };

      act(() => {
        result.current.startDrag(shape, mousePoint);
      });

      expect(result.current.dragState.draggingShapeId).toBe("circle-1");
      expect(result.current.dragState.draggedShape).toBe(shape);
      expect(result.current.isDragging).toBe(true);
    });
  });

  describe("updateDrag", () => {
    it("should update drag position and mark as moved", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 110, y: 110 };
      const movePoint = { x: 120, y: 120 };

      act(() => {
        result.current.startDrag(shape, startPoint);
      });

      act(() => {
        result.current.updateDrag(movePoint);
      });

      expect(result.current.dragState.hasMoved).toBe(true);
      expect(result.current.dragGuides).toBeDefined();
    });

    it("should not update if not dragging", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const movePoint = { x: 120, y: 120 };

      act(() => {
        result.current.updateDrag(movePoint);
      });

      expect(result.current.dragState.hasMoved).toBe(false);
      expect(result.current.dragGuides).toBe(null);
    });
  });

  describe("endDrag", () => {
    it("should handle click (no movement)", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[0];
      const mousePoint = { x: 110, y: 110 };

      act(() => {
        result.current.startDrag(shape, mousePoint);
      });

      act(() => {
        const result2 = result.current.endDrag(mousePoint);
        expect(result2.wasClick).toBe(true);
      });

      expect(mockOnShapeClick).toHaveBeenCalledWith(shape, mousePoint);
      expect(result.current.isDragging).toBe(false);
      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });

    it("should handle drag with movement", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 110, y: 110 };
      const endPoint = { x: 160, y: 160 };

      act(() => {
        result.current.startDrag(shape, startPoint);
      });

      act(() => {
        result.current.updateDrag(endPoint);
      });

      act(() => {
        const result2 = result.current.endDrag(endPoint);
        expect(result2.wasClick).toBe(false);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
      expect(result.current.isDragging).toBe(false);
    });

    it("should handle circle drag correctly", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[1];
      const startPoint = { x: 210, y: 210 };
      const endPoint = { x: 260, y: 260 };

      act(() => {
        result.current.startDrag(shape, startPoint);
      });

      act(() => {
        result.current.updateDrag(endPoint);
      });

      act(() => {
        result.current.endDrag(endPoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "circle-1",
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
    });
  });

  describe("cancelDrag", () => {
    it("should cancel drag operation", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[0];
      const mousePoint = { x: 110, y: 110 };

      act(() => {
        result.current.startDrag(shape, mousePoint);
      });

      expect(result.current.isDragging).toBe(true);

      act(() => {
        result.current.cancelDrag();
      });

      expect(result.current.isDragging).toBe(false);
      expect(result.current.dragState.draggingShapeId).toBe(null);
      expect(result.current.dragState.draggedShape).toBe(null);
    });
  });

  describe("grid snapping", () => {
    it("should snap to grid when enabled", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          gridSnappingEnabled: true,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 110, y: 110 };
      const endPoint = { x: 123, y: 127 }; // Should snap to grid

      act(() => {
        result.current.startDrag(shape, startPoint);
      });

      act(() => {
        result.current.updateDrag(endPoint);
      });

      act(() => {
        result.current.endDrag(endPoint);
      });

      // Should snap to nearest 20px grid
      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
    });

    it("should not snap to grid when disabled", () => {
      const { result } = renderHook(() =>
        useDragHandler({
          shapes: mockShapes,
          gridSnappingEnabled: false,
          onUpdateShape: mockOnUpdateShape,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 110, y: 110 };
      const endPoint = { x: 123, y: 127 };

      act(() => {
        result.current.startDrag(shape, startPoint);
      });

      act(() => {
        result.current.updateDrag(endPoint);
      });

      act(() => {
        result.current.endDrag(endPoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      );
    });
  });
});
