import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { ShapeSnapTool } from "../../types";

describe("Mouse Event Coordinator Methods Debug", () => {
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

  it("should debug available methods", () => {
    const { result } = renderHook(() =>
      useMouseEventCoordinator({
        shapes: mockShapes,
        canvasSettings: mockCanvasSettings,
        currentTool: "draw" as ShapeSnapTool,
        onUpdateShape: mockOnUpdateShape,
        onShapeClick: mockOnShapeClick,
      })
    );

    console.log("Available methods:", Object.keys(result.current));
    console.log("handleShapeMouseDown type:", typeof result.current.handleShapeMouseDown);
    
    expect(typeof result.current.handleShapeMouseDown).toBe("function");
  });
});