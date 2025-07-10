import { renderHook, act } from "@testing-library/react";
import { useShapeSnapEngineV2 } from "../hooks/useShapeSnapEngineV2";
import { ShapeSnapData, Point, Shape } from "../types";

// Mock the shape detection function
jest.mock("../utils/shapeDetection", () => ({
  detectShape: jest.fn(),
}));

import { detectShape } from "../utils/shapeDetection";

describe("Shape Drawing", () => {
  let mockState: ShapeSnapData;
  let mockOnChange: jest.Mock;

  beforeEach(() => {
    mockState = {
      shapes: [],
      canvas: { background: "#ffffff", mode: "light" },
      currentTool: "draw",
      history: [[]],
      historyIndex: 0,
      currentFontSize: 16,
      selectedShapeIds: [],
      clipboard: [],
    };
    mockOnChange = jest.fn((newState) => {
      mockState = newState;
    });
  });

  it("should detect and add a shape when drawing points", () => {
    const detectedShape = {
      type: "rectangle",
      x: 100,
      y: 100,
      width: 50,
      height: 30,
    };

    (detectShape as jest.Mock).mockReturnValue(detectedShape);

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange),
    );

    const drawingPoints: Point[] = [
      { x: 100, y: 100 },
      { x: 150, y: 100 },
      { x: 150, y: 130 },
      { x: 100, y: 130 },
      { x: 100, y: 100 },
    ];

    let createdShape;
    act(() => {
      createdShape = result.current.detectAndAddShape(drawingPoints);
    });

    // Verify shape detection was called
    expect(detectShape).toHaveBeenCalledWith(drawingPoints);

    // Verify the shape was created
    expect(createdShape).toBeDefined();
    expect(createdShape).toHaveProperty("id");
    expect(createdShape).toHaveProperty("type", "rectangle");
    expect(createdShape).toHaveProperty("style");

    // Verify the state was updated
    expect(mockOnChange).toHaveBeenCalled();
    const lastCall =
      mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
    expect(lastCall.shapes).toHaveLength(1);
    expect(createdShape).toBeDefined();
    if (createdShape) {
      expect(lastCall.shapes[0].id).toBe(createdShape.id);
      expect(lastCall.shapes[0].type).toBe("rectangle");
    }
  });

  it("should add arrow tip to straight lines", () => {
    const detectedLine = {
      type: "line",
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
      ],
    };

    (detectShape as jest.Mock).mockReturnValue(detectedLine);

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange),
    );

    const drawingPoints: Point[] = [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ];

    let createdShape;
    act(() => {
      createdShape = result.current.detectAndAddShape(drawingPoints);
    });

    expect(createdShape).toBeDefined();
    if (createdShape) {
      expect(createdShape).toHaveProperty("arrowTipEnd", "simple");
      expect(createdShape).toHaveProperty("arrowTipSize", 10);
    }
  });

  it("should not add shape when detection fails", () => {
    (detectShape as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange),
    );

    const drawingPoints: Point[] = [
      { x: 100, y: 100 },
      { x: 101, y: 101 },
    ];

    let createdShape;
    act(() => {
      createdShape = result.current.detectAndAddShape(drawingPoints);
    });

    expect(createdShape).toBeNull();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("should not add shape when too few points", () => {
    // Reset the mock to clear previous calls
    (detectShape as jest.Mock).mockClear();
    mockOnChange.mockClear();

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange),
    );

    const drawingPoints: Point[] = [{ x: 100, y: 100 }];

    let createdShape;
    act(() => {
      createdShape = result.current.detectAndAddShape(drawingPoints);
    });

    expect(createdShape).toBeNull();
    expect(detectShape).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("should use correct stroke color based on canvas mode", () => {
    // Test dark mode
    mockState.canvas.mode = "dark";
    const detectedShape = {
      type: "circle",
      x: 100,
      y: 100,
      radius: 30,
    };

    (detectShape as jest.Mock).mockReturnValue(detectedShape);

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange),
    );

    const drawingPoints: Point[] = [
      { x: 70, y: 70 },
      { x: 130, y: 70 },
      { x: 130, y: 130 },
      { x: 70, y: 130 },
      { x: 70, y: 70 },
    ];

    let createdShape;
    act(() => {
      createdShape = result.current.detectAndAddShape(drawingPoints);
    });

    expect(createdShape).toBeDefined();
    if (createdShape) {
      expect(createdShape.style.stroke).toBe("#ffffff"); // White stroke for dark mode
    }
  });

  it("should use correct stroke color for light mode", () => {
    // Test light mode
    mockState.canvas.mode = "light";
    const detectedShape = {
      type: "square",
      x: 100,
      y: 100,
      width: 50,
      height: 50,
    };

    (detectShape as jest.Mock).mockReturnValue(detectedShape);

    const { result } = renderHook(() =>
      useShapeSnapEngineV2(mockState, mockOnChange),
    );

    const drawingPoints: Point[] = [
      { x: 75, y: 75 },
      { x: 125, y: 75 },
      { x: 125, y: 125 },
      { x: 75, y: 125 },
      { x: 75, y: 75 },
    ];

    let createdShape;
    act(() => {
      createdShape = result.current.detectAndAddShape(drawingPoints);
    });

    expect(createdShape).toBeDefined();
    if (createdShape) {
      expect(createdShape.style.stroke).toBe("#000000"); // Black stroke for light mode
    }
  });
});
