import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { ShapeSnapTool } from "../../types";

describe("Arrow Tip Cycling Debug", () => {
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

  it("should debug arrow tip cycling flow", () => {
    const { result } = renderHook(() =>
      useMouseEventCoordinator({
        shapes: mockShapes,
        canvasSettings: mockCanvasSettings,
        currentTool: "draw" as ShapeSnapTool,
        onUpdateShape: mockOnUpdateShape,
        onShapeClick: mockOnShapeClick,
      })
    );

    console.log("=== Test arrow tip cycling at end point ===");
    
    // Click on end point (50, 50)
    const mouseDownEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
    
    console.log("1. Before mouse down");
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls.length);
    
    act(() => {
      result.current.handleShapeMouseDown(straightArrow, mouseDownEvent);
    });
    
    console.log("2. After mouse down");
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls.length);
    
    // Mouse up at same position (no movement)
    const mouseUpEvent = { nativeEvent: { offsetX: 50, offsetY: 50 } } as React.MouseEvent;
    
    act(() => {
      result.current.handleMouseUp(mouseUpEvent);
    });
    
    console.log("3. After mouse up");
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls.length);
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls);
    
    // Check if arrow tip was updated
    if (mockOnUpdateShape.mock.calls.length > 0) {
      console.log("   Success: Arrow tip was updated");
    } else {
      console.log("   FAIL: Arrow tip was not updated");
    }
  });
});