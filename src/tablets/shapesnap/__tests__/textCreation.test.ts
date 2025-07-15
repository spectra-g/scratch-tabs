import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useShapeSnapEngineV2 } from "../hooks/useShapeSnapEngineV2";
import { useClickHandler } from "../hooks/useClickHandler";
import { useMouseEventCoordinator } from "../hooks/useMouseEventCoordinator";
import { ShapeSnapData, Shape } from "../types";

describe("Text Creation", () => {
  const createMockState = (canvasMode: "light" | "dark" = "dark"): ShapeSnapData => ({
    shapes: [],
    selectedShapeIds: [],
    currentTool: "draw",
    currentFontSize: 16,
    canvas: {
      mode: canvasMode,
      background: canvasMode === "dark" ? "#1e1e1e" : "#ffffff",
    },
    history: [],
    historyIndex: 0,
    clipboard: [],
  });

  describe("Text creation with proper colors", () => {
    it("should create text with correct color in dark mode", () => {
      const mockState = createMockState("dark");
      const mockOnChange = jest.fn();
      const mockOnAddShape = jest.fn();
      const mockSetEditingShape = jest.fn();

      const { result: engineResult } = renderHook(() =>
        useShapeSnapEngineV2(mockState, mockOnChange)
      );

      const { result: clickResult } = renderHook(() =>
        useClickHandler({
          shapes: [],
          currentTool: "draw",
          currentFontSize: 16,
          canvasMode: "dark",
          editingShape: null,
          setEditingShape: mockSetEditingShape,
          onAddShape: mockOnAddShape,
        })
      );

      const mockEvent = {
        nativeEvent: {
          offsetX: 100,
          offsetY: 100,
        },
      } as React.MouseEvent;

      act(() => {
        clickResult.current.handleCanvasDoubleClick(mockEvent);
      });

      expect(mockOnAddShape).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "text",
          x: 100,
          y: 100,
          text: "Enter text",
          style: expect.objectContaining({
            stroke: "#ffffff", // Should be white in dark mode
          }),
        })
      );
    });

    it("should create text with correct color in light mode", () => {
      const mockState = createMockState("light");
      const mockOnChange = jest.fn();
      const mockOnAddShape = jest.fn();
      const mockSetEditingShape = jest.fn();

      const { result: clickResult } = renderHook(() =>
        useClickHandler({
          shapes: [],
          currentTool: "draw",
          currentFontSize: 16,
          canvasMode: "light",
          editingShape: null,
          setEditingShape: mockSetEditingShape,
          onAddShape: mockOnAddShape,
        })
      );

      const mockEvent = {
        nativeEvent: {
          offsetX: 100,
          offsetY: 100,
        },
      } as React.MouseEvent;

      act(() => {
        clickResult.current.handleCanvasDoubleClick(mockEvent);
      });

      expect(mockOnAddShape).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "text",
          x: 100,
          y: 100,
          text: "Enter text",
          style: expect.objectContaining({
            stroke: "#000000", // Should be black in light mode
          }),
        })
      );
    });
  });

  describe("Text persistence through mode switching", () => {
    it("should update text colors when switching between modes", () => {
      const mockState = createMockState("dark");
      const mockOnChange = jest.fn();

      // Add a text shape
      const textShape = {
        id: "text-1",
        type: "text" as const,
        x: 100,
        y: 100,
        text: "Test text",
        fontSize: 16,
        style: {
          stroke: "#ffffff",
          fill: "transparent",
          strokeWidth: 0,
        },
        zIndex: 1,
      };

      const stateWithText = {
        ...mockState,
        shapes: [textShape],
      };

      const { result } = renderHook(() =>
        useShapeSnapEngineV2(stateWithText, mockOnChange)
      );

      act(() => {
        result.current.toggleCanvasMode();
      });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          shapes: expect.arrayContaining([
            expect.objectContaining({
              id: "text-1",
              style: expect.objectContaining({
                stroke: "#000000", // Should change to black in light mode
              }),
            }),
          ]),
        })
      );
    });
  });

  describe("Text editing state management", () => {
    it("should set text to editing state after creation", () => {
      const mockOnAddShape = jest.fn();

      const { result } = renderHook(() => {
        const [editingShape, setEditingShape] = useState<Shape | null>(null);
        
        const hookResult = useClickHandler({
          shapes: [],
          currentTool: "draw",
          currentFontSize: 16,
          canvasMode: "dark",
          editingShape,
          setEditingShape,
          onAddShape: mockOnAddShape,
        });

        return { ...hookResult, editingShape };
      });

      const mockEvent = {
        nativeEvent: {
          offsetX: 100,
          offsetY: 100,
        },
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent);
      });

      // Should have an editing shape
      expect(result.current.editingShape).toBeTruthy();
      expect(result.current.editingShape?.type).toBe("text");
      expect((result.current.editingShape as any)?.text).toBe("Enter text");
    });

    it("should not create text when tool is not draw, text, or select", () => {
      const mockOnAddShape = jest.fn();
      const mockSetEditingShape = jest.fn();

      const { result } = renderHook(() =>
        useClickHandler({
          shapes: [],
          currentTool: "eraser",
          currentFontSize: 16,
          canvasMode: "dark",
          editingShape: null,
          setEditingShape: mockSetEditingShape,
          onAddShape: mockOnAddShape,
        })
      );

      const mockEvent = {
        nativeEvent: {
          offsetX: 100,
          offsetY: 100,
        },
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent);
      });

      expect(mockOnAddShape).not.toHaveBeenCalled();
      expect(result.current.editingShape).toBeFalsy();
    });
  });

  describe("Text color inheritance", () => {
    it("should inherit canvas mode color when created", () => {
      const mockOnAddShape = jest.fn();
      const mockSetEditingShape = jest.fn();

      const { result } = renderHook(() =>
        useClickHandler({
          shapes: [],
          currentTool: "draw",
          currentFontSize: 16,
          canvasMode: "dark",
          editingShape: null,
          setEditingShape: mockSetEditingShape,
          onAddShape: mockOnAddShape,
        })
      );

      const mockEvent = {
        nativeEvent: {
          offsetX: 100,
          offsetY: 100,
        },
      } as React.MouseEvent;

      act(() => {
        result.current.handleCanvasDoubleClick(mockEvent);
      });

      const createdShape = mockOnAddShape.mock.calls[0][0];
      
      // Text should use stroke color (not fill) for visibility
      expect(createdShape.style.stroke).toBeDefined();
      expect(createdShape.style.fill).toBe("transparent");
    });
  });

  describe("Text shape interaction", () => {
    it("should not show resize handles for text shapes", () => {
      const mockOnUpdateShape = jest.fn();
      
      const { result } = renderHook(() =>
        useMouseEventCoordinator({
          shapes: [],
          canvasSettings: { mode: "dark", background: "#1e1e1e" },
          currentTool: "select",
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const textShape = {
        id: "text-1",
        type: "text" as const,
        x: 100,
        y: 100,
        text: "Test text",
        fontSize: 16,
        style: {
          stroke: "#ffffff",
          fill: "transparent",
          strokeWidth: 0,
        },
        zIndex: 1,
      };

      // Text shapes should not have resize handles
      const resizeHandle = result.current.detectResizeHandle(textShape, { x: 100, y: 100 });
      expect(resizeHandle).toBeNull();
    });
  });
});