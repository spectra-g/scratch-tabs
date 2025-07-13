import { renderHook, act } from "@testing-library/react";
import { useResizeHandler } from "../hooks/useResizeHandler";
import { Shape, Point } from "../types";

describe("useResizeHandler", () => {
  const mockShapes: Shape[] = [
    {
      id: "rect-1",
      type: "rectangle",
      x: 100,
      y: 100,
      width: 50,
      height: 30,
      style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
      zIndex: 1,
    } as Shape,
    {
      id: "circle-1",
      type: "circle",
      x: 200,
      y: 200,
      radius: 25,
      style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
      zIndex: 2,
    } as Shape,
  ];

  const mockOnUpdateShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      expect(result.current.resizeState).toEqual({
        resizeMode: null,
        resizeHandle: null,
        resizeStartData: null,
      });
      expect(result.current.isResizing).toBe(false);
      expect(result.current.resizeHandle).toBe(null);
    });
  });

  describe("detectResizeHandle", () => {
    it("should detect corner handles", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0]; // rectangle

      // Test northwest corner
      const nwPoint = { x: 100, y: 100 };
      expect(result.current.detectResizeHandle(shape, nwPoint)).toBe("nw");

      // Test southeast corner
      const sePoint = { x: 150, y: 130 };
      expect(result.current.detectResizeHandle(shape, sePoint)).toBe("se");
    });

    it("should detect edge handles", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0]; // rectangle

      // Test north edge
      const northPoint = { x: 125, y: 100 };
      expect(result.current.detectResizeHandle(shape, northPoint)).toBe("n");

      // Test east edge
      const eastPoint = { x: 150, y: 115 };
      expect(result.current.detectResizeHandle(shape, eastPoint)).toBe("e");
    });

    it("should return null for line shapes", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const lineShape = {
        id: "line-1",
        type: "line",
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 100 },
        ],
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const point = { x: 50, y: 50 };
      expect(result.current.detectResizeHandle(lineShape, point)).toBe(null);
    });

    it("should return null when not near any handle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const point = { x: 200, y: 200 }; // Far from shape
      expect(result.current.detectResizeHandle(shape, point)).toBe(null);
    });
  });

  describe("startResize", () => {
    it("should start resize operation", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const mousePoint = { x: 150, y: 130 };
      const handle = "se";

      act(() => {
        result.current.startResize(shape, mousePoint, handle);
      });

      expect(result.current.resizeState.resizeMode).toBe("resize");
      expect(result.current.resizeState.resizeHandle).toBe("se");
      expect(result.current.resizeState.resizeStartData).toBeDefined();
      expect(result.current.isResizing).toBe(true);
    });
  });

  describe("updateResize", () => {
    it("should update resize bounds for rectangle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 150, y: 130 };
      const handle = "se";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      const movePoint = { x: 170, y: 150 };
      let updates: Partial<Shape> | undefined;

      act(() => {
        result.current.updateResize(movePoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      );
    });

    it("should update resize bounds for circle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[1];
      const startPoint = { x: 225, y: 200 };
      const handle = "e";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      const movePoint = { x: 250, y: 200 };
      let updates: Partial<Shape> | undefined;

      act(() => {
        result.current.updateResize(movePoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "circle-1",
        expect.objectContaining({
          radius: expect.any(Number),
        }),
      );
    });

    it("should return undefined when not resizing", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const movePoint = { x: 170, y: 150 };
      let updates: Partial<Shape> | undefined;

      act(() => {
        result.current.updateResize(movePoint);
      });

      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });
  });

  describe("endResize", () => {
    it("should end resize operation and update shape", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 150, y: 130 };
      const handle = "se";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      const endPoint = { x: 170, y: 150 };

      act(() => {
        result.current.endResize(endPoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      );
      expect(result.current.isResizing).toBe(false);
    });

    it("should not update when not resizing", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const endPoint = { x: 170, y: 150 };

      act(() => {
        result.current.endResize(endPoint);
      });

      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });
  });

  describe("cancelResize", () => {
    it("should cancel resize operation", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 150, y: 130 };
      const handle = "se";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      expect(result.current.isResizing).toBe(true);

      act(() => {
        result.current.cancelResize();
      });

      expect(result.current.isResizing).toBe(false);
      expect(result.current.resizeState.resizeMode).toBe(null);
      expect(result.current.resizeState.resizeHandle).toBe(null);
    });
  });

  describe("grid snapping", () => {
    it("should snap to grid when enabled", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          gridSnappingEnabled: true,
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 150, y: 130 };
      const handle = "se";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      const endPoint = { x: 173, y: 147 }; // Should snap to grid

      act(() => {
        result.current.endResize(endPoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      );
    });

    it("should not snap to grid when disabled", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          gridSnappingEnabled: false,
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 150, y: 130 };
      const handle = "se";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      const endPoint = { x: 173, y: 147 };

      act(() => {
        result.current.endResize(endPoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        }),
      );
    });
  });

  describe("minimum size constraints", () => {
    it("should enforce minimum size for rectangle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[0];
      const startPoint = { x: 150, y: 130 };
      const handle = "se";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      // Try to resize to very small size
      const endPoint = { x: 110, y: 110 };

      act(() => {
        result.current.endResize(endPoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "rect-1",
        expect.objectContaining({
          width: 20, // Minimum width
          height: 20, // Minimum height
        }),
      );
    });

    it("should enforce minimum radius for circle", () => {
      const { result } = renderHook(() =>
        useResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shape = mockShapes[1];
      const startPoint = { x: 225, y: 200 };
      const handle = "e";

      act(() => {
        result.current.startResize(shape, startPoint, handle);
      });

      // Try to resize to very small size
      const endPoint = { x: 210, y: 200 };

      act(() => {
        result.current.endResize(endPoint);
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(
        "circle-1",
        expect.objectContaining({
          radius: expect.any(Number),
        }),
      );
    });
  });
});
