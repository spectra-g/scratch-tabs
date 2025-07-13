import { renderHook, act } from "@testing-library/react";
import { useResizeHandler } from "../useResizeHandler";
import { Shape } from "../../types";

describe("useResizeHandler", () => {
  const mockOnUpdateShape = jest.fn();

  beforeEach(() => {
    mockOnUpdateShape.mockClear();
  });

  const createShape = (
    type: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Shape =>
    ({
      id: "test-shape",
      type,
      x,
      y,
      width,
      height,
      style: {
        stroke: "#000000",
        fill: "#ff0000",
        strokeWidth: 2,
      },
      zIndex: 1,
    }) as Shape;

  const createCircle = (x: number, y: number, radius: number): Shape =>
    ({
      id: "test-circle",
      type: "circle",
      x,
      y,
      radius,
      style: {
        stroke: "#000000",
        fill: "#ff0000",
        strokeWidth: 2,
      },
      zIndex: 1,
    }) as Shape;

  describe("detectResizeHandle", () => {
    it("should detect corner handles for rectangle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      // Test corner handles
      expect(result.current.detectResizeHandle(rect, { x: 95, y: 95 })).toBe(
        "nw",
      );
      expect(result.current.detectResizeHandle(rect, { x: 205, y: 95 })).toBe(
        "ne",
      );
      expect(result.current.detectResizeHandle(rect, { x: 205, y: 205 })).toBe(
        "se",
      );
      expect(result.current.detectResizeHandle(rect, { x: 95, y: 205 })).toBe(
        "sw",
      );
    });

    it("should detect edge handles for rectangle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      // Test edge handles
      expect(result.current.detectResizeHandle(rect, { x: 150, y: 95 })).toBe(
        "n",
      );
      expect(result.current.detectResizeHandle(rect, { x: 205, y: 150 })).toBe(
        "e",
      );
      expect(result.current.detectResizeHandle(rect, { x: 150, y: 205 })).toBe(
        "s",
      );
      expect(result.current.detectResizeHandle(rect, { x: 95, y: 150 })).toBe(
        "w",
      );
    });

    it("should return null for line shapes", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = {
        id: "test-line",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        style: {
          stroke: "#000000",
          strokeWidth: 2,
        },
        zIndex: 1,
      } as Shape;

      expect(
        result.current.detectResizeHandle(line, { x: 150, y: 150 }),
      ).toBeNull();
    });

    it("should return null when not near any handle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      expect(
        result.current.detectResizeHandle(rect, { x: 300, y: 300 }),
      ).toBeNull();
    });
  });

  describe("resize operations", () => {
    it("should start resize operation", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);
      const mousePoint = { x: 95, y: 95 };

      act(() => {
        result.current.startResize(rect, mousePoint, "nw");
      });

      expect(result.current.isResizing).toBe(true);
      expect(result.current.resizeHandle).toBe("nw");
      expect(result.current.resizeState.resizeStartData).toBeTruthy();
    });

    it("should update rectangle resize from northwest corner", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(rect, { x: 95, y: 95 }, "nw");
      });

      act(() => {
        result.current.updateResize({ x: 85, y: 85 }); // Move 10px up and left
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-shape", {
        x: 95, // 100 - 10/2 = 95 (center)
        y: 95, // 100 - 10/2 = 95 (center)
        width: 110, // 100 + 10
        height: 110, // 100 + 10
      });
    });

    it("should update rectangle resize from southeast corner", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(rect, { x: 205, y: 205 }, "se");
      });

      act(() => {
        result.current.updateResize({ x: 215, y: 215 }); // Move 10px down and right
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-shape", {
        x: 105, // 100 + 10/2 = 105 (center)
        y: 105, // 100 + 10/2 = 105 (center)
        width: 110, // 100 + 10
        height: 110, // 100 + 10
      });
    });

    it("should update circle resize maintaining aspect ratio", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const circle = createCircle(100, 100, 50);

      act(() => {
        result.current.startResize(circle, { x: 150, y: 95 }, "e");
      });

      act(() => {
        result.current.updateResize({ x: 160, y: 95 }); // Move 10px right
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-circle", {
        x: 105, // 100 + 5 (center)
        y: 105, // 100 + 5 (center)
        radius: 55, // 50 + 5
      });
    });

    it("should respect minimum size constraints", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(rect, { x: 95, y: 95 }, "nw");
      });

      act(() => {
        result.current.updateResize({ x: 200, y: 200 }); // Try to make it very small
      });

      // Should maintain minimum size of 20x20
      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-shape", {
        x: 165, // 50 + 20/2 = 60, but center is 165 after min size
        y: 165, // 50 + 20/2 = 60, but center is 165 after min size
        width: 20, // minimum size
        height: 20, // minimum size
      });
    });

    it("should apply grid snapping when enabled", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
          gridSnappingEnabled: true,
        }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(rect, { x: 205, y: 205 }, "se");
      });

      act(() => {
        result.current.updateResize({ x: 212, y: 218 }); // Should snap to grid
      });

      // Should snap to nearest 20px grid
      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-shape", {
        x: 100, // 50 + 100/2 = 100 (center)
        y: 110, // 50 + 120/2 = 110 (center)
        width: 100, // width unchanged (snapped)
        height: 120, // height snapped to 120
      });
    });

    it("should handle text resize", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const text = {
        id: "test-text",
        type: "text",
        x: 100,
        y: 100,
        width: 100,
        height: 50,
        text: "Hello",
        fontSize: 16,
        style: {
          stroke: "#000000",
          fill: "#000000",
        },
        zIndex: 1,
      } as Shape;

      act(() => {
        result.current.startResize(text, { x: 205, y: 155 }, "se");
      });

      act(() => {
        result.current.updateResize({ x: 215, y: 165 }); // Increase size
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-text", {
        x: 105, // 50 + 110/2 = 105 (center)
        y: 105, // 80 + 50/2 = 105 (center)
        fontSize: 60, // new height (after resize)
      });
    });
  });

  describe("resize state management", () => {
    it("should end resize operation", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(rect, { x: 95, y: 95 }, "nw");
      });

      expect(result.current.isResizing).toBe(true);

      act(() => {
        result.current.endResize({ x: 85, y: 85 });
      });

      expect(result.current.isResizing).toBe(false);
      expect(result.current.resizeHandle).toBeNull();
    });

    it("should cancel resize operation", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = createShape("rectangle", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(rect, { x: 95, y: 95 }, "nw");
      });

      expect(result.current.isResizing).toBe(true);

      act(() => {
        result.current.cancelResize();
      });

      expect(result.current.isResizing).toBe(false);
      expect(result.current.resizeHandle).toBeNull();
    });

    it("should not update when not resizing", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      act(() => {
        result.current.updateResize({ x: 100, y: 100 });
      });

      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });
  });

  describe("shape-specific resize behavior", () => {
    it("should handle square resize maintaining aspect ratio", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const square = createShape("square", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(square, { x: 205, y: 205 }, "se");
      });

      act(() => {
        result.current.updateResize({ x: 215, y: 215 }); // Move 10px down and right
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-shape", {
        x: 105, // 100 + 10/2 = 105 (center)
        y: 105, // 100 + 10/2 = 105 (center)
        width: 110, // 100 + 10
        height: 110, // 100 + 10
      });
    });

    it("should handle diamond resize", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const diamond = createShape("diamond", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(diamond, { x: 205, y: 205 }, "se");
      });

      act(() => {
        result.current.updateResize({ x: 215, y: 215 }); // Move 10px down and right
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-shape", {
        x: 105, // 100 + 10/2 = 105 (center)
        y: 105, // 100 + 10/2 = 105 (center)
        width: 110, // 100 + 10
        height: 110, // 100 + 10
      });
    });

    it("should handle triangle resize", () => {
      const { result } = renderHook(() =>
        useResizeHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const triangle = createShape("triangle", 100, 100, 100, 100);

      act(() => {
        result.current.startResize(triangle, { x: 205, y: 205 }, "se");
      });

      act(() => {
        result.current.updateResize({ x: 215, y: 215 }); // Move 10px down and right
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-shape", {
        x: 105, // 100 + 10/2 = 105 (center)
        y: 105, // 100 + 10/2 = 105 (center)
        width: 110, // 100 + 10
        height: 110, // 100 + 10
      });
    });
  });
});
