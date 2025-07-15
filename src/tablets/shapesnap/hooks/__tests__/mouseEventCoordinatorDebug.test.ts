import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { useLineResizeHandler } from "../useLineResizeHandler";
import { useArrowTipHandler } from "../useArrowTipHandler";
import { ShapeSnapTool } from "../../types";

describe("Mouse Event Coordinator Debug", () => {
  const mockShapes = [
    {
      id: "arrow-1",
      type: "straight-arrow" as const,
      from: { x: 10, y: 10 },
      to: { x: 50, y: 50 },
      style: { stroke: "#000", strokeWidth: 2 },
      zIndex: 1,
    },
  ];

  const mockCanvasSettings = { mode: "light" };
  const mockOnUpdateShape = jest.fn();
  const mockOnShapeClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should debug detection behavior for endpoint click", () => {
    // Test the individual handlers first
    const { result: lineHandler } = renderHook(() =>
      useLineResizeHandler({
        onUpdateShape: mockOnUpdateShape,
      })
    );

    const { result: tipHandler } = renderHook(() =>
      useArrowTipHandler({
        onUpdateShape: mockOnUpdateShape,
      })
    );

    const arrow = mockShapes[0];
    const endpointClick = { x: 50, y: 50 };

    // Test line resize detection
    const lineDragMode = lineHandler.current.detectLineDragMode(arrow, endpointClick);
    console.log("Line drag mode:", lineDragMode);

    // Test arrow tip detection
    const tipState = tipHandler.current.detectArrowTipClick(arrow, endpointClick);
    console.log("Arrow tip state:", tipState);

    // Both should detect endpoint
    expect(lineDragMode).toBe("resize-end");
    expect(tipState.isArrowTipClick).toBe(true);
    expect(tipState.arrowTipMode).toBe("resize-end");
  });

  it("should debug mouse event coordinator behavior", () => {
    const { result } = renderHook(() =>
      useMouseEventCoordinator({
        shapes: mockShapes,
        canvasSettings: mockCanvasSettings,
        currentTool: "draw" as ShapeSnapTool,
        onUpdateShape: mockOnUpdateShape,
        onShapeClick: mockOnShapeClick,
      })
    );

    const arrow = mockShapes[0];
    const mouseDownEvent = {
      nativeEvent: { offsetX: 50, offsetY: 50 }, // Exactly on endpoint
    } as React.MouseEvent;

    // Test just the mouse down event
    act(() => {
      result.current.handleShapeMouseDown(arrow, mouseDownEvent);
    });

    // At this point, if line resize is properly detected, result.current.lineResizeDraggedShape should be set
    console.log("Line resize dragged shape:", result.current.lineResizeDraggedShape);

    // Check if line resize handler was activated
    expect(result.current.lineResizeDraggedShape).toBeTruthy();
  });

  it("should debug full resize flow", () => {
    const { result } = renderHook(() =>
      useMouseEventCoordinator({
        shapes: mockShapes,
        canvasSettings: mockCanvasSettings,
        currentTool: "draw" as ShapeSnapTool,
        onUpdateShape: mockOnUpdateShape,
        onShapeClick: mockOnShapeClick,
      })
    );

    const arrow = mockShapes[0];
    
    // Start drag at endpoint
    const mouseDownEvent = {
      nativeEvent: { offsetX: 50, offsetY: 50 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleShapeMouseDown(arrow, mouseDownEvent);
    });

    console.log("After mouse down - lineResizeDraggedShape:", result.current.lineResizeDraggedShape);

    // Move mouse significantly
    const mouseMoveEvent = {
      nativeEvent: { offsetX: 60, offsetY: 60 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseMove(mouseMoveEvent);
    });

    console.log("After mouse move - lineResizeDraggedShape:", result.current.lineResizeDraggedShape);

    // End drag
    const mouseUpEvent = {
      nativeEvent: { offsetX: 60, offsetY: 60 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseUp(mouseUpEvent);
    });

    console.log("After mouse up - calls:");
    console.log("  mockOnUpdateShape:", mockOnUpdateShape.mock.calls);
    console.log("  mockOnShapeClick:", mockOnShapeClick.mock.calls);

    // Should have updated the shape
    expect(mockOnUpdateShape).toHaveBeenCalled();
  });
});