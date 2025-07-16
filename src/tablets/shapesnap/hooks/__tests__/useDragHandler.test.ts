import { renderHook, act } from "@testing-library/react";
import { useDragHandler } from "../useDragHandler";
import { Shape } from "../../types";

// Mock geometry utils
jest.mock("../../utils/geometryUtils", () => ({
  getShapeCenter: jest.fn(),
}));

const { getShapeCenter } = require("../../utils/geometryUtils");

describe("useDragHandler", () => {
  const mockOnUpdateShape = jest.fn();
  const mockOnShapeClick = jest.fn();
  const mockOnMoveMultipleShapes = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Real-time visual feedback", () => {
    it("should update dragged shape in real-time for rectangle", () => {
      const rectangleShape: Shape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 125, y: 115 }); // center of rectangle

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [rectangleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(rectangleShape, { x: 130, y: 120 });
      });

      expect(result.current.dragState.draggingShapeId).toBe("rect-1");
      expect(result.current.dragState.dragOffset).toEqual({ x: 5, y: 5 });

      // Update drag - should update draggedShape for visual feedback
      act(() => {
        result.current.updateDrag({ x: 150, y: 140 });
      });

      expect(result.current.dragState.draggedShape).toBeDefined();
      expect((result.current.dragState.draggedShape as any).x).toBe(120); // 145 - 25 (half width)
      expect((result.current.dragState.draggedShape as any).y).toBe(120); // 135 - 15 (half height)
    });

    it("should update dragged shape in real-time for circle", () => {
      const circleShape: Shape = {
        id: "circle-1",
        type: "circle",
        x: 100,
        y: 100,
        radius: 25,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 100, y: 100 }); // center of circle

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [circleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(circleShape, { x: 110, y: 110 });
      });

      expect(result.current.dragState.draggingShapeId).toBe("circle-1");
      expect(result.current.dragState.dragOffset).toEqual({ x: 10, y: 10 });

      // Update drag - should update draggedShape for visual feedback
      act(() => {
        result.current.updateDrag({ x: 130, y: 130 });
      });

      expect(result.current.dragState.draggedShape).toBeDefined();
      expect((result.current.dragState.draggedShape as any).x).toBe(120); // 130 - 10
      expect((result.current.dragState.draggedShape as any).y).toBe(120); // 130 - 10
    });

    it("should update dragged shape in real-time for triangle", () => {
      const triangleShape: Shape = {
        id: "triangle-1",
        type: "triangle",
        x: 100,
        y: 100,
        width: 40,
        height: 40,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 100, y: 100 }); // center of triangle

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [triangleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(triangleShape, { x: 110, y: 110 });
      });

      expect(result.current.dragState.draggingShapeId).toBe("triangle-1");
      expect(result.current.dragState.dragOffset).toEqual({ x: 10, y: 10 });

      // Update drag - should update draggedShape for visual feedback
      act(() => {
        result.current.updateDrag({ x: 130, y: 130 });
      });

      expect(result.current.dragState.draggedShape).toBeDefined();
      expect((result.current.dragState.draggedShape as any).x).toBe(120); // 130 - 10
      expect((result.current.dragState.draggedShape as any).y).toBe(120); // 130 - 10
    });

    it("should update dragged shape in real-time for line", () => {
      const lineShape: Shape = {
        id: "line-1",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 150, y: 150 },
        ],
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 125, y: 125 }); // center of line

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [lineShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(lineShape, { x: 130, y: 130 });
      });

      expect(result.current.dragState.draggingShapeId).toBe("line-1");
      expect(result.current.dragState.dragOffset).toEqual({ x: 5, y: 5 });

      // Update drag - should update draggedShape for visual feedback
      act(() => {
        result.current.updateDrag({ x: 150, y: 150 });
      });

      expect(result.current.dragState.draggedShape).toBeDefined();
      expect((result.current.dragState.draggedShape as any).points).toEqual([
        { x: 120, y: 120 }, // 100 + 20 (delta from center)
        { x: 170, y: 170 }, // 150 + 20 (delta from center)
      ]);
    });
  });

  describe("Grid snapping", () => {
    it("should snap to grid when enabled", () => {
      const rectangleShape: Shape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 125, y: 115 });

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [rectangleShape],
          gridSnappingEnabled: true,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(rectangleShape, { x: 130, y: 120 });
      });

      // Update drag with grid snapping
      act(() => {
        result.current.updateDrag({ x: 137, y: 127 }); // Should snap to 140, 140
      });

      expect(result.current.dragState.draggedShape).toBeDefined();
      // Grid snapping should round to nearest 20
      expect((result.current.dragState.draggedShape as any).x).toBe(115); // 140 - 5 - 25 (half width)
      expect((result.current.dragState.draggedShape as any).y).toBe(105); // 140 - 5 - 15 (half height)
    });
  });

  describe("Drag end behavior", () => {
    it("should apply final position on drag end", () => {
      const rectangleShape: Shape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 125, y: 115 });

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [rectangleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(rectangleShape, { x: 130, y: 120 });
      });

      // Update drag to mark as moved
      act(() => {
        result.current.updateDrag({ x: 150, y: 140 });
      });

      // End drag
      act(() => {
        result.current.endDrag({ x: 150, y: 140 });
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("rect-1", {
        x: 120, // 145 - 25 (half width)
        y: 120, // 135 - 15 (half height)
      });
    });

    it("should treat as click if not moved", () => {
      const rectangleShape: Shape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 125, y: 115 });

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [rectangleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(rectangleShape, { x: 130, y: 120 });
      });

      // End drag without moving
      act(() => {
        result.current.endDrag({ x: 131, y: 121 }); // Less than 5px movement
      });

      expect(mockOnShapeClick).toHaveBeenCalledWith(rectangleShape, {
        x: 131,
        y: 121,
      });
      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });
  });

  describe("Drag guides alignment", () => {
    it("should align drag guides with rectangle edges", () => {
      const rectangleShape: Shape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 125, y: 115 }); // center of rectangle

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [rectangleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(rectangleShape, { x: 130, y: 120 });
      });

      // Update drag to a new position
      act(() => {
        result.current.updateDrag({ x: 150, y: 140 });
      });

      // Check that drag guides align with the shape edges
      expect(result.current.dragState.dragGuides).toBeDefined();
      expect(result.current.dragState.dragGuides!.left).toBe(120); // 145 - 25 (half width)
      expect(result.current.dragState.dragGuides!.right).toBe(170); // 120 + 50 (width)
      expect(result.current.dragState.dragGuides!.top).toBe(120); // 135 - 15 (half height)
      expect(result.current.dragState.dragGuides!.bottom).toBe(150); // 120 + 30 (height)
    });

    it("should align drag guides with circle edges", () => {
      const circleShape: Shape = {
        id: "circle-1",
        type: "circle",
        x: 100,
        y: 100,
        radius: 25,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 100, y: 100 }); // center of circle

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [circleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(circleShape, { x: 110, y: 110 });
      });

      // Update drag to a new position
      act(() => {
        result.current.updateDrag({ x: 130, y: 130 });
      });

      // Check that drag guides align with the circle edges
      expect(result.current.dragState.dragGuides).toBeDefined();
      expect(result.current.dragState.dragGuides!.left).toBe(95); // 120 - 25 (radius)
      expect(result.current.dragState.dragGuides!.right).toBe(145); // 95 + 50 (diameter)
      expect(result.current.dragState.dragGuides!.top).toBe(95); // 120 - 25 (radius)
      expect(result.current.dragState.dragGuides!.bottom).toBe(145); // 95 + 50 (diameter)
    });

    it("should align drag guides with triangle edges", () => {
      const triangleShape: Shape = {
        id: "triangle-1",
        type: "triangle",
        x: 100,
        y: 100,
        width: 40,
        height: 40,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      getShapeCenter.mockReturnValue({ x: 100, y: 100 }); // center of triangle

      const { result } = renderHook(() =>
        useDragHandler({
          shapes: [triangleShape],
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
          onMoveMultipleShapes: mockOnMoveMultipleShapes,
        }),
      );

      // Start drag
      act(() => {
        result.current.startDrag(triangleShape, { x: 110, y: 110 });
      });

      // Update drag to a new position
      act(() => {
        result.current.updateDrag({ x: 130, y: 130 });
      });

      // Check that drag guides align with the triangle edges
      expect(result.current.dragState.dragGuides).toBeDefined();
      expect(result.current.dragState.dragGuides!.left).toBe(100); // 120 - 20 (half width)
      expect(result.current.dragState.dragGuides!.right).toBe(140); // 100 + 40 (width)
      expect(result.current.dragState.dragGuides!.top).toBe(100); // 120 - 20 (half height)
      expect(result.current.dragState.dragGuides!.bottom).toBe(140); // 100 + 40 (height)
    });
  });
});
