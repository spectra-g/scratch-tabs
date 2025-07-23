import { renderHook, act } from "@testing-library/react";
import { useMouseEventCoordinator } from "../useMouseEventCoordinator";
import { ShapeSnapTool } from "../../types";

describe("Arrow Movement in Different Tools", () => {
  const mockShapes = [
    {
      id: "arrow-1",
      type: "straight-arrow" as const,
      from: { x: 10, y: 10 },
      to: { x: 50, y: 50 },
      style: { stroke: "#000", strokeWidth: 2 },
      zIndex: 1,
    },
    {
      id: "curved-arrow-1", 
      type: "curved-arrow" as const,
      from: { x: 10, y: 10 },
      to: { x: 50, y: 50 },
      control: { x: 30, y: 30 },
      style: { stroke: "#000", strokeWidth: 2 },
      zIndex: 2,
    },
    {
      id: "orthogonal-arrow-1",
      type: "orthogonal-arrow" as const,
      points: [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 50 }, { x: 50, y: 50 }],
      style: { stroke: "#000", strokeWidth: 2 },
      zIndex: 3,
    },
  ];

  const mockCanvasSettings = { mode: "light" };
  const mockOnUpdateShape = jest.fn();
  const mockOnShapeClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow moving straight arrow in draw mode", async () => {
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
      nativeEvent: { offsetX: 30, offsetY: 30 },
    } as React.MouseEvent;

    // Start drag
    act(() => {
      result.current.handleShapeMouseDown(arrow, mouseDownEvent);
    });

    // Move mouse
    const mouseMoveEvent = {
      nativeEvent: { offsetX: 40, offsetY: 40 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseMove(mouseMoveEvent);
    });

    // End drag
    const mouseUpEvent = {
      nativeEvent: { offsetX: 40, offsetY: 40 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseUp(mouseUpEvent);
    });

    // Check if arrow was moved
    expect(mockOnUpdateShape).toHaveBeenCalledWith(arrow.id, expect.objectContaining({
      from: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      to: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    }));
  });

  it("should allow moving straight arrow in select mode", async () => {
    const { result } = renderHook(() =>
      useMouseEventCoordinator({
        shapes: mockShapes,
        canvasSettings: mockCanvasSettings,
        currentTool: "select" as ShapeSnapTool,
        onUpdateShape: mockOnUpdateShape,
        onShapeClick: mockOnShapeClick,
      })
    );

    const arrow = mockShapes[0];
    const mouseDownEvent = {
      nativeEvent: { offsetX: 30, offsetY: 30 },
    } as React.MouseEvent;

    // Start drag
    act(() => {
      result.current.handleShapeMouseDown(arrow, mouseDownEvent);
    });

    // Move mouse
    const mouseMoveEvent = {
      nativeEvent: { offsetX: 40, offsetY: 40 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseMove(mouseMoveEvent);
    });

    // End drag
    const mouseUpEvent = {
      nativeEvent: { offsetX: 40, offsetY: 40 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseUp(mouseUpEvent);
    });

    // Check if arrow was moved
    expect(mockOnUpdateShape).toHaveBeenCalledWith(arrow.id, expect.objectContaining({
      from: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      to: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    }));
  });

  it("should allow moving curved arrow in both modes", async () => {
    const tools: ShapeSnapTool[] = ["draw", "select"];
    
    for (const tool of tools) {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: tool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
        })
      );

      const arrow = mockShapes[1]; // curved arrow
      const mouseDownEvent = {
        nativeEvent: { offsetX: 30, offsetY: 30 },
      } as React.MouseEvent;

      // Start drag
      act(() => {
        result.current.handleShapeMouseDown(arrow, mouseDownEvent);
      });

      // Move mouse
      const mouseMoveEvent = {
        nativeEvent: { offsetX: 40, offsetY: 40 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseMove(mouseMoveEvent);
      });

      // End drag
      const mouseUpEvent = {
        nativeEvent: { offsetX: 40, offsetY: 40 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseUp(mouseUpEvent);
      });

      // Check if arrow was moved
      expect(mockOnUpdateShape).toHaveBeenCalledWith(arrow.id, expect.objectContaining({
        from: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        to: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        control: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      }));
      
      mockOnUpdateShape.mockClear();
    }
  });

  it("should allow moving orthogonal arrow in both modes", async () => {
    const tools: ShapeSnapTool[] = ["draw", "select"];
    
    for (const tool of tools) {
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: mockShapes,
          canvasSettings: mockCanvasSettings,
          currentTool: tool,
          onUpdateShape: mockOnUpdateShape,
          onShapeClick: mockOnShapeClick,
        })
      );

      const arrow = mockShapes[2]; // orthogonal arrow
      const mouseDownEvent = {
        nativeEvent: { offsetX: 30, offsetY: 30 },
      } as React.MouseEvent;

      // Start drag
      act(() => {
        result.current.handleShapeMouseDown(arrow, mouseDownEvent);
      });

      // Move mouse
      const mouseMoveEvent = {
        nativeEvent: { offsetX: 40, offsetY: 40 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseMove(mouseMoveEvent);
      });

      // End drag
      const mouseUpEvent = {
        nativeEvent: { offsetX: 40, offsetY: 40 },
      } as React.MouseEvent;

      act(() => {
        result.current.handleMouseUp(mouseUpEvent);
      });

      // Check if arrow was moved
      expect(mockOnUpdateShape).toHaveBeenCalledWith(arrow.id, expect.objectContaining({
        points: expect.arrayContaining([
          expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        ]),
      }));
      
      mockOnUpdateShape.mockClear();
    }
  });

  it("should allow endpoint resizing for straight arrow", async () => {
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
    // Click exactly on endpoint for resize
    const mouseDownEvent = {
      nativeEvent: { offsetX: 50, offsetY: 50 }, // Exactly on the 'to' point
    } as React.MouseEvent;

    // Start drag
    act(() => {
      result.current.handleShapeMouseDown(arrow, mouseDownEvent);
    });

    // Move mouse to resize (drag more than 5px to register as movement)
    const mouseMoveEvent = {
      nativeEvent: { offsetX: 60, offsetY: 60 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseMove(mouseMoveEvent);
    });

    // End drag
    const mouseUpEvent = {
      nativeEvent: { offsetX: 60, offsetY: 60 },
    } as React.MouseEvent;

    act(() => {
      result.current.handleMouseUp(mouseUpEvent);
    });


    // Check if arrow endpoint was resized
    expect(mockOnUpdateShape).toHaveBeenCalledWith(arrow.id, expect.objectContaining({
      to: expect.objectContaining({ x: 60, y: 60 }),
    }));
  });
});