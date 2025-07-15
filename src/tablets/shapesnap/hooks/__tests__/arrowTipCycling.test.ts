import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { ShapeSnapTool } from "../../types";

describe("Arrow Tip Cycling", () => {
  const straightArrow = {
    id: "straight-arrow-1",
    type: "straight-arrow" as const,
    from: { x: 10, y: 10 },
    to: { x: 50, y: 50 },
    style: { stroke: "#000", strokeWidth: 2 },
    arrowTipStart: "none" as const,
    arrowTipEnd: "none" as const,
    zIndex: 1,
  };

  const curvedArrow = {
    id: "curved-arrow-1",
    type: "curved-arrow" as const,
    from: { x: 10, y: 10 },
    to: { x: 50, y: 50 },
    control: { x: 30, y: 30 },
    style: { stroke: "#000", strokeWidth: 2 },
    arrowTipStart: "none" as const,
    arrowTipEnd: "none" as const,
    zIndex: 2,
  };

  const mockShapes = [straightArrow, curvedArrow];
  const mockCanvasSettings = { mode: "light" };
  const mockOnUpdateShape = jest.fn();
  const mockOnShapeClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Straight Arrow Tip Cycling", () => {
    it("should cycle arrow tip on start point click", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
        })
      );

      // Click on start point (10, 10)
      const mouseDownEvent = { nativeEvent: { offsetX: 10, offsetY: 10 } } as React.MouseEvent;
      const mouseUpEvent = { nativeEvent: { offsetX: 10, offsetY: 10 } } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(straightArrow, mouseDownEvent);
      });

      act(() => {
        result.current.handleMouseUp(mouseUpEvent);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
        arrowTipStart: expect.any(String),
      }));
    });

    it("should cycle arrow tip on end point click", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
        })
      );

      // Click on end point (50, 50)
      const mouseDownEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
      const mouseUpEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(straightArrow, mouseDownEvent);
      });

      act(() => {
        result.current.handleMouseUp(mouseUpEvent);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
        arrowTipEnd: expect.any(String),
      }));
    });
  });

  describe("Curved Arrow Tip Cycling", () => {
    it("should cycle arrow tip on start point click", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
        })
      );

      // Click on start point (10, 10)
      const mouseDownEvent = { nativeEvent: { offsetX: 10, offsetY: 10 } } as React.MouseEvent;
      const mouseUpEvent = { nativeEvent: { offsetX: 10, offsetY: 10 } } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(curvedArrow, mouseDownEvent);
      });

      act(() => {
        result.current.handleMouseUp(mouseUpEvent);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(curvedArrow.id, expect.objectContaining({
        arrowTipStart: expect.any(String),
      }));
    });

    it("should cycle arrow tip on end point click", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
        })
      );

      // Click on end point (50, 50)
      const mouseDownEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
      const mouseUpEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(curvedArrow, mouseDownEvent);
      });

      act(() => {
        result.current.handleMouseUp(mouseUpEvent);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(curvedArrow.id, expect.objectContaining({
        arrowTipEnd: expect.any(String),
      }));
    });
  });

  describe("Arrow Tip vs Resize Priority", () => {
    it("should cycle arrow tip on click, resize on drag", () => {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: "draw" as ShapeSnapTool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
        })
      );

      // Test 1: Click without movement should cycle arrow tip
      const mouseDownEvent1 = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
      const mouseUpEvent1 = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(straightArrow, mouseDownEvent1);
      });

      act(() => {
        result.current.handleMouseUp(mouseUpEvent1);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
        arrowTipEnd: expect.any(String),
      }));

      mockOnUpdateShape.mockClear();

      // Test 2: Click and drag should resize
      const mouseDownEvent2 = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
      const mouseMoveEvent2 = { nativeEvent: { offsetX: 60, offsetY: 60 } } as React.MouseEvent;
      const mouseUpEvent2 = { nativeEvent: { offsetX: 60, offsetY: 60 } } as React.MouseEvent;

      act(() => {
        result.current.handleShapeMouseDown(straightArrow, mouseDownEvent2);
      });

      act(() => {
        result.current.handleMouseMove(mouseMoveEvent2);
      });

      act(() => {
        result.current.handleMouseUp(mouseUpEvent2);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
        to: expect.objectContaining({ x: 60, y: 60 }),
      }));
    });
  });
});