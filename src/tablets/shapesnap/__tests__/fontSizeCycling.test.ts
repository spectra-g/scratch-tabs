import { renderHook, act } from "@testing-library/react";
import { useShapeSnapEngineV2 } from "../hooks/useShapeSnapEngineV2";
import { ShapeSnapData } from "../types";

describe("Font Size Cycling", () => {
  const createMockStateWithText = (fontSize: number = 16): ShapeSnapData => ({
    shapes: [
      {
        id: "text-1",
        type: "text",
        x: 100,
        y: 100,
        text: "Test text",
        fontSize: fontSize,
        style: {
          stroke: "#ffffff",
          fill: "transparent",
          strokeWidth: 0,
        },
        zIndex: 1,
      },
      {
        id: "rect-1",
        type: "rectangle",
        x: 200,
        y: 200,
        width: 100,
        height: 50,
        style: {
          stroke: "#ffffff",
          fill: "transparent",
          strokeWidth: 2,
        },
        zIndex: 2,
      },
    ],
    selectedShapeIds: [],
    currentTool: "select",
    currentFontSize: fontSize,
    canvas: {
      mode: "dark",
      background: "#1e1e1e",
    },
    history: [],
    historyIndex: 0,
    clipboard: [],
  });

  it("should cycle font sizes and update all text shapes", () => {
    const mockState = createMockStateWithText(16);
    const mockOnChange = jest.fn();

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange)
    );

    act(() => {
      result.current.cycleFontSize();
    });

    // Should have been called once - both shapes and current font size updated together
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    
    // Check that the text shape was updated
    const updateCall = mockOnChange.mock.calls[0][0];
    const textShape = updateCall.shapes.find((s: any) => s.id === "text-1");
    expect(textShape?.fontSize).toBe(18); // Should cycle from 16 to 18
    
    // Check that the current font size was updated
    expect(updateCall.currentFontSize).toBe(18);
  });

  it("should cycle through all font sizes correctly", () => {
    const fontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];
    
    fontSizes.forEach((currentSize, index) => {
      const expectedNextSize = fontSizes[(index + 1) % fontSizes.length];
      
      const mockState = createMockStateWithText(currentSize);
      const mockOnChange = jest.fn();

      const { result } = renderHook(() =>
        useShapeSnapEngineV2(mockState, mockOnChange)
      );

      act(() => {
        result.current.cycleFontSize();
      });

      // Check that the current font size was updated correctly
      const updateCall = mockOnChange.mock.calls[0][0];
      expect(updateCall.currentFontSize).toBe(expectedNextSize);
    });
  });

  it("should only update text shapes, not other shapes", () => {
    const mockState = createMockStateWithText(16);
    const mockOnChange = jest.fn();

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange)
    );

    act(() => {
      result.current.cycleFontSize();
    });

    // Check that only the text shape was updated, not the rectangle
    const textShapeUpdateCall = mockOnChange.mock.calls[0][0];
    const textShape = textShapeUpdateCall.shapes.find((s: any) => s.id === "text-1");
    const rectShape = textShapeUpdateCall.shapes.find((s: any) => s.id === "rect-1");
    
    expect(textShape?.fontSize).toBe(18); // Should be updated
    expect(rectShape?.fontSize).toBeUndefined(); // Should not have fontSize
  });

  it("should handle text shapes without initial fontSize", () => {
    const mockState = createMockStateWithText(16);
    // Remove fontSize from the text shape to simulate old text shapes
    mockState.shapes[0] = {
      ...mockState.shapes[0],
      fontSize: undefined,
    } as any;
    
    const mockOnChange = jest.fn();

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange)
    );

    act(() => {
      result.current.cycleFontSize();
    });

    // Should still work and update the text shape
    const textShapeUpdateCall = mockOnChange.mock.calls[0][0];
    const textShape = textShapeUpdateCall.shapes.find((s: any) => s.id === "text-1");
    expect(textShape?.fontSize).toBe(18); // Should be updated from default 16 to 18
  });
});