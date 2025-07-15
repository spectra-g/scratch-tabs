import { renderHook, act } from "@testing-library/react";
import { useArrowTipHandler } from "../useArrowTipHandler";
import { useLineResizeHandler } from "../useLineResizeHandler";

describe("Arrow Tip Handler Debug", () => {
  const straightArrow = {
    id: "straight-arrow-1",
    type: "straight-arrow" as const,
    from: { x: 10, y: 10 },
    to: { x: 50, y: 50 },
    style: { stroke: "#000", strokeWidth: 2 },
    arrowTipStart: "none" as const,
    arrowTipEnd: "none" as const,
    zIndex: 1,
  };

  const mockOnUpdateShape = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should debug arrow tip detection", () => {
    const { result: arrowTipHandler } = renderHook(() =>
      useArrowTipHandler({
        onUpdateShape: mockOnUpdateShape,
      })
    );

    const { result: lineResizeHandler } = renderHook(() =>
      useLineResizeHandler({
        onUpdateShape: mockOnUpdateShape,
      })
    );

    console.log("=== Testing endpoint detection ===");

    // Test endpoint detection
    const endpointClick = { x: 50, y: 50 };
    
    const arrowTipState = arrowTipHandler.current.detectArrowTipClick(straightArrow, endpointClick);
    console.log("Arrow tip state:", arrowTipState);
    
    const lineDragMode = lineResizeHandler.current.detectLineDragMode(straightArrow, endpointClick);
    console.log("Line drag mode:", lineDragMode);
    
    // Both should detect endpoint
    expect(arrowTipState.isArrowTipClick).toBe(true);
    expect(arrowTipState.arrowTipMode).toBe("resize-end");
    expect(lineDragMode).toBe("resize-end");
  });

  it("should debug arrow tip click handling", () => {
    const { result: arrowTipHandler } = renderHook(() =>
      useArrowTipHandler({
        onUpdateShape: mockOnUpdateShape,
      })
    );

    console.log("=== Testing arrow tip click handling ===");
    
    console.log("1. Before handleArrowTipClick");
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls.length);
    
    act(() => {
      arrowTipHandler.current.handleArrowTipClick(straightArrow, "resize-end");
    });
    
    console.log("2. After handleArrowTipClick");
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls.length);
    console.log("   mockOnUpdateShape calls:", mockOnUpdateShape.mock.calls);
    
    expect(mockOnUpdateShape).toHaveBeenCalledWith(straightArrow.id, expect.objectContaining({
      arrowTipEnd: expect.any(String),
    }));
  });
});