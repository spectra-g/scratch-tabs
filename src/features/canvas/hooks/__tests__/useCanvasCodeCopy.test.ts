import { act, renderHook } from "@testing-library/react";
import { useCanvasCodeCopy } from "../useCanvasCodeCopy";

describe("useCanvasCodeCopy", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows copied feedback for two seconds and then returns to idle", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { result } = renderHook(() => useCanvasCodeCopy("source"));

    await act(async () => result.current.copy());
    expect(writeText).toHaveBeenCalledWith("source");
    expect(result.current.state).toBe("copied");

    act(() => jest.advanceTimersByTime(1999));
    expect(result.current.state).toBe("copied");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.state).toBe("idle");
  });

  it("resets failure feedback using the same bounded timer", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error("denied")) },
    });
    const { result } = renderHook(() => useCanvasCodeCopy("source", 10));

    await act(async () => result.current.copy());
    expect(result.current.state).toBe("failed");
    act(() => jest.advanceTimersByTime(10));
    expect(result.current.state).toBe("idle");
  });
});
