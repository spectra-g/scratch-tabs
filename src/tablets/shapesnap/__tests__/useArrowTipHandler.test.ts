import { renderHook, act } from "@testing-library/react";
import { useArrowTipHandler } from "../hooks/useArrowTipHandler";
import { Shape, Point, ArrowTipStyle } from "../types";

describe("useArrowTipHandler", () => {
  const mockLineShape: Shape = {
    id: "line-1",
    type: "line",
    points: [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
    ],
    arrowTipStart: "simple" as ArrowTipStyle,
    arrowTipEnd: "simple" as ArrowTipStyle,
    style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
    zIndex: 1,
  } as Shape;

  const mockOnUpdateShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("detectArrowTipClick", () => {
    it("should detect start arrow tip click", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const startPoint = { x: 105, y: 105 }; // Near start point
      const arrowTipState = result.current.detectArrowTipClick(
        mockLineShape,
        startPoint,
      );

      expect(arrowTipState.isArrowTipClick).toBe(true);
      expect(arrowTipState.arrowTipMode).toBe("resize-start");
    });

    it("should detect end arrow tip click", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const endPoint = { x: 195, y: 195 }; // Near end point
      const arrowTipState = result.current.detectArrowTipClick(
        mockLineShape,
        endPoint,
      );

      expect(arrowTipState.isArrowTipClick).toBe(true);
      expect(arrowTipState.arrowTipMode).toBe("resize-end");
    });

    it("should not detect arrow tip click for non-line shapes", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const rectShape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const point = { x: 125, y: 115 };
      const arrowTipState = result.current.detectArrowTipClick(
        rectShape,
        point,
      );

      expect(arrowTipState.isArrowTipClick).toBe(false);
      expect(arrowTipState.arrowTipMode).toBe(null);
    });

    it("should detect arrow tip click even when no arrow tips are set (allows cycling)", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const lineWithoutArrows = {
        id: "line-2",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const startPoint = { x: 105, y: 105 };
      const arrowTipState = result.current.detectArrowTipClick(
        lineWithoutArrows,
        startPoint,
      );

      expect(arrowTipState.isArrowTipClick).toBe(true);
      expect(arrowTipState.arrowTipMode).toBe("resize-start");
    });

    it("should not detect arrow tip click when too far from endpoints", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const middlePoint = { x: 150, y: 150 }; // Middle of line
      const arrowTipState = result.current.detectArrowTipClick(
        mockLineShape,
        middlePoint,
      );

      expect(arrowTipState.isArrowTipClick).toBe(false);
      expect(arrowTipState.arrowTipMode).toBe(null);
    });

    it("should handle lines with insufficient points", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const invalidLineShape = {
        id: "line-3",
        type: "line",
        points: [{ x: 100, y: 100 }], // Only one point
        arrowTipStart: "simple" as ArrowTipStyle,
        arrowTipEnd: "simple" as ArrowTipStyle,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const point = { x: 100, y: 100 };
      const arrowTipState = result.current.detectArrowTipClick(
        invalidLineShape,
        point,
      );

      expect(arrowTipState.isArrowTipClick).toBe(false);
      expect(arrowTipState.arrowTipMode).toBe(null);
    });
  });

  describe("handleArrowTipClick", () => {
    it("should cycle start arrow tip", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      act(() => {
        result.current.handleArrowTipClick(mockLineShape, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("line-1", {
        arrowTipStart: "filled-triangle",
      });
    });

    it("should cycle end arrow tip", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      act(() => {
        result.current.handleArrowTipClick(mockLineShape, "resize-end");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("line-1", {
        arrowTipEnd: "filled-triangle",
      });
    });

    it("should not update for non-line shapes", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const rectShape = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 50,
        height: 30,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      act(() => {
        result.current.handleArrowTipClick(rectShape, "resize-start");
      });

      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });

    it("should handle undefined arrow tips", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const lineWithoutArrows = {
        id: "line-2",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      act(() => {
        result.current.handleArrowTipClick(lineWithoutArrows, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("line-2", {
        arrowTipStart: "simple",
      });
    });
  });

  describe("threshold detection", () => {
    it("should use percentage-based threshold for long lines", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const longLineShape = {
        id: "line-4",
        type: "line",
        points: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
        ], // Very long line
        arrowTipStart: "simple" as ArrowTipStyle,
        arrowTipEnd: "simple" as ArrowTipStyle,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      // Test near start point (should be resize-start)
      const nearStart = { x: 10, y: 0 }; // Within 15px threshold
      const startArrowTipState = result.current.detectArrowTipClick(
        longLineShape,
        nearStart,
      );
      expect(startArrowTipState.isArrowTipClick).toBe(true);
      expect(startArrowTipState.arrowTipMode).toBe("resize-start");

      // Test near end point (should be resize-end)
      const nearEnd = { x: 990, y: 0 }; // Within 15px threshold
      const endArrowTipState = result.current.detectArrowTipClick(
        longLineShape,
        nearEnd,
      );
      expect(endArrowTipState.isArrowTipClick).toBe(true);
      expect(endArrowTipState.arrowTipMode).toBe("resize-end");
    });

    it("should use fixed threshold for short lines", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const shortLineShape = {
        id: "line-5",
        type: "line",
        points: [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
        ], // Very short line
        arrowTipStart: "simple" as ArrowTipStyle,
        arrowTipEnd: "simple" as ArrowTipStyle,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      // Test near start point (should be resize-start)
      const nearStart = { x: 5, y: 0 }; // Within 15px threshold
      const startArrowTipState = result.current.detectArrowTipClick(
        shortLineShape,
        nearStart,
      );
      expect(startArrowTipState.isArrowTipClick).toBe(true);
      expect(startArrowTipState.arrowTipMode).toBe("resize-start");

      // Test near end point (should be resize-end)
      const nearEnd = { x: 8, y: 0 }; // Within 15px threshold
      const endArrowTipState = result.current.detectArrowTipClick(
        shortLineShape,
        nearEnd,
      );
      expect(endArrowTipState.isArrowTipClick).toBe(true);
      expect(endArrowTipState.arrowTipMode).toBe("resize-end");
    });
  });

  describe("arrow tip cycling", () => {
    it("should cycle through arrow tip styles correctly", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      // Test cycling from simple to filled-triangle
      const lineWithSimple = {
        ...mockLineShape,
        arrowTipStart: "simple" as ArrowTipStyle,
      };

      act(() => {
        result.current.handleArrowTipClick(lineWithSimple, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("line-1", {
        arrowTipStart: "filled-triangle",
      });

      jest.clearAllMocks();

      // Test cycling from filled-triangle to outline-triangle
      const lineWithFilled = {
        ...mockLineShape,
        arrowTipStart: "filled-triangle" as ArrowTipStyle,
      };

      act(() => {
        result.current.handleArrowTipClick(lineWithFilled, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("line-1", {
        arrowTipStart: "outline-triangle",
      });

      jest.clearAllMocks();

      // Test cycling from outline-triangle to filled-circle
      const lineWithOutline = {
        ...mockLineShape,
        arrowTipStart: "outline-triangle" as ArrowTipStyle,
      };

      act(() => {
        result.current.handleArrowTipClick(lineWithOutline, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("line-1", {
        arrowTipStart: "filled-circle",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle lines with only start arrow tip", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const lineWithStartOnly = {
        id: "line-6",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        arrowTipStart: "simple" as ArrowTipStyle,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const startPoint = { x: 105, y: 105 };
      const arrowTipState = result.current.detectArrowTipClick(
        lineWithStartOnly,
        startPoint,
      );

      expect(arrowTipState.isArrowTipClick).toBe(true);
      expect(arrowTipState.arrowTipMode).toBe("resize-start");

      const endPoint = { x: 195, y: 195 };
      const endArrowTipState = result.current.detectArrowTipClick(
        lineWithStartOnly,
        endPoint,
      );

      expect(endArrowTipState.isArrowTipClick).toBe(true);
      expect(endArrowTipState.arrowTipMode).toBe("resize-end");
    });

    it("should handle lines with only end arrow tip", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        }),
      );

      const lineWithEndOnly = {
        id: "line-7",
        type: "line",
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 200 },
        ],
        arrowTipEnd: "simple" as ArrowTipStyle,
        style: { stroke: "#000", fill: "transparent", strokeWidth: 2 },
        zIndex: 1,
      } as Shape;

      const startPoint = { x: 105, y: 105 };
      const startArrowTipState = result.current.detectArrowTipClick(
        lineWithEndOnly,
        startPoint,
      );

      expect(startArrowTipState.isArrowTipClick).toBe(true);
      expect(startArrowTipState.arrowTipMode).toBe("resize-start");

      const endPoint = { x: 195, y: 195 };
      const endArrowTipState = result.current.detectArrowTipClick(
        lineWithEndOnly,
        endPoint,
      );

      expect(endArrowTipState.isArrowTipClick).toBe(true);
      expect(endArrowTipState.arrowTipMode).toBe("resize-end");
    });
  });
});
