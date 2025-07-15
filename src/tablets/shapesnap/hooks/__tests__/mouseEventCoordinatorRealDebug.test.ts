import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { ShapeSnapTool } from "../../types";

describe("Mouse Event Coordinator Real Debug", () => {
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
  let updateShapeCalls: any[] = [];
  let shapeClickCalls: any[] = [];

  const mockOnUpdateShape = jest.fn((shapeId, updates) => {
    updateShapeCalls.push({ shapeId, updates });
  });

  const mockOnShapeClick = jest.fn((shape, position) => {
    shapeClickCalls.push({ shape, position });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    updateShapeCalls = [];
    shapeClickCalls = [];
  });

  it("should step through the complete flow", () => {
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
    
    console.log("=== STEP 1: Initial state ===");
    console.log("draggedShape:", result.current.draggedShape);
    console.log("lineResizeDraggedShape:", result.current.lineResizeDraggedShape);

    // Click at endpoint
    const mouseDownEvent = {
      nativeEvent: { offsetX: 50, offsetY: 50 },
    } as React.MouseEvent;

    console.log("\n=== STEP 2: Mouse down at endpoint (50, 50) ===");
    act(() => {
      result.current.handleShapeMouseDown(arrow, mouseDownEvent);
    });

    console.log("After mouse down:");
    console.log("  draggedShape:", result.current.draggedShape);
    console.log("  lineResizeDraggedShape:", result.current.lineResizeDraggedShape);
    console.log("  updateShapeCalls:", updateShapeCalls);
    console.log("  shapeClickCalls:", shapeClickCalls);

    // Move mouse significantly (10px away)
    const mouseMoveEvent = {
      nativeEvent: { offsetX: 60, offsetY: 60 },
    } as React.MouseEvent;

    console.log("\n=== STEP 3: Mouse move to (60, 60) ===");
    act(() => {
      result.current.handleMouseMove(mouseMoveEvent);
    });

    console.log("After mouse move:");
    console.log("  draggedShape:", result.current.draggedShape);
    console.log("  lineResizeDraggedShape:", result.current.lineResizeDraggedShape);
    console.log("  updateShapeCalls:", updateShapeCalls);
    console.log("  shapeClickCalls:", shapeClickCalls);

    // End drag
    const mouseUpEvent = {
      nativeEvent: { offsetX: 60, offsetY: 60 },
    } as React.MouseEvent;

    console.log("\n=== STEP 4: Mouse up at (60, 60) ===");
    act(() => {
      result.current.handleMouseUp(mouseUpEvent);
    });

    console.log("After mouse up:");
    console.log("  draggedShape:", result.current.draggedShape);
    console.log("  lineResizeDraggedShape:", result.current.lineResizeDraggedShape);
    console.log("  updateShapeCalls:", updateShapeCalls);
    console.log("  shapeClickCalls:", shapeClickCalls);

    console.log("\n=== FINAL EXPECTATIONS ===");
    console.log("Expected: Arrow endpoint should be resized to (60, 60)");
    
    // The test should pass if resizing worked
    expect(updateShapeCalls.length).toBeGreaterThan(0);
    if (updateShapeCalls.length > 0) {
      const lastCall = updateShapeCalls[updateShapeCalls.length - 1];
      expect(lastCall.shapeId).toBe("arrow-1");
      expect(lastCall.updates.to).toEqual({ x: 60, y: 60 });
    }
  });
});