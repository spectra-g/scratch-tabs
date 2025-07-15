import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { useArrowTipHandler } from "../useArrowTipHandler";
import { useLineResizeHandler } from "../useLineResizeHandler";
import { ShapeSnapTool } from "../../types";

describe("Mouse Event Coordinator Arrow Tip Debug", () => {
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

  const mockShapes = [straightArrow];
  const mockCanvasSettings = { mode: "light" };
  const mockOnUpdateShape = jest.fn();
  const mockOnShapeClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should debug what handlers detect", () => {
    // Test individual handlers first
    const { result: arrowTipHandler } = renderHook(() =>
      useArrowTipHandler({
        onUpdateShape: mockOnUpdateShape,
      })
    );

    const { result: lineResizeHandler } = renderHook(() =>
      useLineResizeHandler({
        onUpdateShape: mockOnUpdateShape,
      })
    );

    const endpointClick = { x: 50, y: 50 };
    
    console.log("=== Individual handler detection ===");
    const arrowTipState = arrowTipHandler.current.detectArrowTipClick(straightArrow, endpointClick);
    console.log("Arrow tip state:", arrowTipState);
    
    const lineDragMode = lineResizeHandler.current.detectLineDragMode(straightArrow, endpointClick);
    console.log("Line drag mode:", lineDragMode);
    
    // Both should detect endpoint
    expect(arrowTipState.isArrowTipClick).toBe(true);
    expect(arrowTipState.arrowTipMode).toBe("resize-end");
    expect(lineDragMode).toBe("resize-end");
  });

  it("should debug mouse event coordinator flow", () => {
    const { result } = renderHook(() =>
      useMouseEventCoordinator({
        shapes: mockShapes,
        canvasSettings: mockCanvasSettings,
        currentTool: "draw" as ShapeSnapTool,
        onUpdateShape: mockOnUpdateShape,
        onShapeClick: mockOnShapeClick,
      })
    );

    console.log("=== Mouse event coordinator flow ===");
    
    // Click on end point (50, 50)
    const mouseDownEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
    
    console.log("1. Mouse down at (50, 50)");
    
    act(() => {
      result.current.handleShapeMouseDown(straightArrow, mouseDownEvent);
    });
    
    console.log("2. After mouse down - checking line resize state");
    console.log("   lineResizeDraggedShape:", result.current.lineResizeDraggedShape);
    
    // Mouse up at same position (no movement)
    const mouseUpEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
    
    console.log("3. Mouse up at (50, 50)");
    
    act(() => {
      result.current.handleMouseUp(mouseUpEvent);
    });
    
    console.log("4. After mouse up");
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls.length);
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls);
    
    // Should have called arrow tip handler
    expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
      arrowTipEnd: expect.any(String),
    }));
  });
});