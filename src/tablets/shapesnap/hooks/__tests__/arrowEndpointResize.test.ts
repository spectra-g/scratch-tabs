import { renderHook, act } from "@testing-library/react";
import { useLineResizeHandler } from "../useLineResizeHandler";
import { useArrowTipHandler } from "../useArrowTipHandler";

describe("Arrow Endpoint Resize and Tip Cycling", () => {
  const mockOnUpdateShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const straightArrow = {
    id: "arrow-1",
    type: "straight-arrow" as const,
    from: { x: 10, y: 10 },
    to: { x: 50, y: 50 },
    style: { stroke: "#000", strokeWidth: 2 },
    zIndex: 1,
  };

  describe("Line Resize Handler", () => {
    it("should detect resize-end mode for straight arrow endpoint", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const dragMode = result.current.detectLineDragMode(straightArrow, { x: 50, y: 50 });
      expect(dragMode).toBe("resize-end");
    });

    it("should detect resize-start mode for straight arrow start point", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const dragMode = result.current.detectLineDragMode(straightArrow, { x: 10, y: 10 });
      expect(dragMode).toBe("resize-start");
    });

    it("should detect move mode for straight arrow middle", () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const dragMode = result.current.detectLineDragMode(straightArrow, { x: 30, y: 30 });
      expect(dragMode).toBe("move");
    });

    it("should handle line resize for straight arrow", async () => {
      const { result } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      // Start resize from end point
      act(() => {
        result.current.startLineResize(straightArrow, { x: 50, y: 50 });
      });

      expect(result.current.isLineResizing).toBe(true);

      // Update resize position
      act(() => {
        result.current.updateLineResize({ x: 60, y: 60 });
      });

      // End resize
      act(() => {
        result.current.endLineResize();
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
        to: expect.objectContaining({ x: 60, y: 60 }),
      }));
    });
  });

  describe("Arrow Tip Handler", () => {
    it("should detect arrow tip click at endpoint", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const tipState = result.current.detectArrowTipClick(straightArrow, { x: 50, y: 50 });
      expect(tipState.isArrowTipClick).toBe(true);
      expect(tipState.arrowTipMode).toBe("resize-end");
    });

    it("should detect arrow tip click at start point", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const tipState = result.current.detectArrowTipClick(straightArrow, { x: 10, y: 10 });
      expect(tipState.isArrowTipClick).toBe(true);
      expect(tipState.arrowTipMode).toBe("resize-start");
    });

    it("should not detect arrow tip click in middle", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const tipState = result.current.detectArrowTipClick(straightArrow, { x: 30, y: 30 });
      expect(tipState.isArrowTipClick).toBe(false);
    });

    it("should handle arrow tip click", () => {
      const { result } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      act(() => {
        result.current.handleArrowTipClick(straightArrow, "resize-end");
      });

      expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
        arrowTipEnd: expect.any(String),
      }));
    });
  });

  describe("Threshold Conflicts", () => {
    it("should have same threshold calculation for both handlers", () => {
      const { result: lineHandler } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const { result: tipHandler } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      // Test endpoint detection
      const endPoint = { x: 50, y: 50 };
      
      const lineDragMode = lineHandler.current.detectLineDragMode(straightArrow, endPoint);
      const tipState = tipHandler.current.detectArrowTipClick(straightArrow, endPoint);

      // Both should detect the same endpoint
      expect(lineDragMode).toBe("resize-end");
      expect(tipState.isArrowTipClick).toBe(true);
      expect(tipState.arrowTipMode).toBe("resize-end");
    });

    it("should handle near-endpoint clicks consistently", () => {
      const { result: lineHandler } = renderHook(() =>
        useLineResizeHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      const { result: tipHandler } = renderHook(() =>
        useArrowTipHandler({
          onUpdateShape: mockOnUpdateShape,
        })
      );

      // Test slightly off endpoint
      const nearEndPoint = { x: 52, y: 52 };
      
      const lineDragMode = lineHandler.current.detectLineDragMode(straightArrow, nearEndPoint);
      const tipState = tipHandler.current.detectArrowTipClick(straightArrow, nearEndPoint);

      // Both should still detect the endpoint if within threshold
      if (lineDragMode === "resize-end") {
        expect(tipState.isArrowTipClick).toBe(true);
        expect(tipState.arrowTipMode).toBe("resize-end");
      } else {
        expect(tipState.isArrowTipClick).toBe(false);
      }
    });
  });
});