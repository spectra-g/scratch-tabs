import { renderHook, act } from "@testing-library/react";
import { useArrowTipHandler } from "../useArrowTipHandler";
import { Shape } from "../../types";

describe("useArrowTipHandler", () => {
  const mockOnUpdateShape = jest.fn();

  beforeEach(() => {
    mockOnUpdateShape.mockClear();
  });

  const createLineShape = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    arrowTipStart?: string,
    arrowTipEnd?: string,
  ): Shape =>
    ({
      id: "test-line",
      type: "line",
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
      arrowTipStart,
      arrowTipEnd,
      style: {
        stroke: "#000000",
        strokeWidth: 2,
      },
      zIndex: 1,
    }) as Shape;

  describe("detectArrowTipClick", () => {
    it("should return false for non-line shapes", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = {
        id: "test-rect",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        style: { stroke: "#000000", fill: "#ff0000" },
        zIndex: 1,
      } as Shape;

      const arrowTipState = result.current.detectArrowTipClick(rect, {
        x: 100,
        y: 100,
      });

      expect(arrowTipState.isArrowTipClick).toBe(false);
      expect(arrowTipState.arrowTipMode).toBeNull();
    });

    it("should detect arrow tip clicks even when no arrow tips are set (allows cycling)", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(100, 100, 200, 200);

      const arrowTipState = result.current.detectArrowTipClick(line, {
        x: 200,
        y: 200,
      });

      expect(arrowTipState.isArrowTipClick).toBe(true);
      expect(arrowTipState.arrowTipMode).toBe("resize-end");
    });

    it("should detect start arrow tip click", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(100, 100, 200, 200, "simple");

      const arrowTipState = result.current.detectArrowTipClick(line, {
        x: 105,
        y: 105,
      });

      expect(arrowTipState.isArrowTipClick).toBe(true);
      expect(arrowTipState.arrowTipMode).toBe("resize-start");
    });

    it("should detect end arrow tip click", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(100, 100, 200, 200, undefined, "simple");

      const arrowTipState = result.current.detectArrowTipClick(line, {
        x: 195,
        y: 195,
      });

      expect(arrowTipState.isArrowTipClick).toBe(true);
      expect(arrowTipState.arrowTipMode).toBe("resize-end");
    });

    it("should detect both start and end arrow tips", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(
        100,
        100,
        200,
        200,
        "simple",
        "filled-triangle",
      );

      // Test start tip
      const startArrowTipState = result.current.detectArrowTipClick(line, {
        x: 105,
        y: 105,
      });
      expect(startArrowTipState.isArrowTipClick).toBe(true);
      expect(startArrowTipState.arrowTipMode).toBe("resize-start");

      // Test end tip
      const endArrowTipState = result.current.detectArrowTipClick(line, {
        x: 195,
        y: 195,
      });
      expect(endArrowTipState.isArrowTipClick).toBe(true);
      expect(endArrowTipState.arrowTipMode).toBe("resize-end");
    });

    it("should not detect arrow tip click when too far from tips", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(
        100,
        100,
        200,
        200,
        "simple",
        "filled-triangle",
      );

      const arrowTipState = result.current.detectArrowTipClick(line, {
        x: 150,
        y: 150,
      });

      expect(arrowTipState.isArrowTipClick).toBe(false);
      expect(arrowTipState.arrowTipMode).toBeNull();
    });

    it("should use adaptive threshold based on line length", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      // Short line (50px) - should use smaller threshold (5px)
      const shortLine = createLineShape(100, 100, 150, 100, "simple");
      const shortLineState = result.current.detectArrowTipClick(shortLine, {
        x: 155,
        y: 100,
      });
      expect(shortLineState.isArrowTipClick).toBe(true); // Within 5px threshold

      // Test with point that should be too far
      const farShortLineState = result.current.detectArrowTipClick(shortLine, {
        x: 160,
        y: 100,
      });
      expect(farShortLineState.isArrowTipClick).toBe(false); // Too far (10px from end)

      // Long line (200px) - should use larger threshold (15px or 10% = 20px, so 15px)
      const longLine = createLineShape(100, 100, 300, 100, undefined, "simple");
      const longLineState = result.current.detectArrowTipClick(longLine, {
        x: 310,
        y: 100,
      });
      expect(longLineState.isArrowTipClick).toBe(true); // Within 15px threshold

      // Test with closer point that should be within threshold
      const closerLongLineState = result.current.detectArrowTipClick(longLine, {
        x: 295,
        y: 100,
      });
      expect(closerLongLineState.isArrowTipClick).toBe(true); // Within 15px threshold
    });
  });

  describe("handleArrowTipClick", () => {
    it("should cycle start arrow tip", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(
        100,
        100,
        200,
        200,
        "simple",
        "filled-triangle",
      );

      act(() => {
        result.current.handleArrowTipClick(line, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-line", {
        arrowTipStart: "filled-triangle",
      });
    });

    it("should cycle end arrow tip", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(
        100,
        100,
        200,
        200,
        "simple",
        "filled-triangle",
      );

      act(() => {
        result.current.handleArrowTipClick(line, "resize-end");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-line", {
        arrowTipEnd: "outline-triangle",
      });
    });

    it("should handle undefined arrow tips", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(100, 100, 200, 200);

      act(() => {
        result.current.handleArrowTipClick(line, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-line", {
        arrowTipStart: "simple",
      });
    });

    it("should cycle through all arrow tip styles", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const line = createLineShape(100, 100, 200, 200, "double-line");

      act(() => {
        result.current.handleArrowTipClick(line, "resize-start");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith("test-line", {
        arrowTipStart: "none",
      });
    });

    it("should not update non-line shapes", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({ onUpdateShape: mockOnUpdateShape }),
      );

      const rect = {
        id: "test-rect",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        style: { stroke: "#000000", fill: "#ff0000" },
        zIndex: 1,
      } as Shape;

      act(() => {
        result.current.handleArrowTipClick(rect, "resize-start");
      });

      expect(mockOnUpdateShape).not.toHaveBeenCalled();
    });
  });
});
