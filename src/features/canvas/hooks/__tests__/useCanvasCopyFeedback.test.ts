import { act, renderHook } from "@testing-library/react";
import { useCanvasCopyFeedback } from "../useCanvasCopyFeedback";

describe("useCanvasCopyFeedback", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("keeps successful copy feedback visible for two seconds", async () => {
    const copyAction = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useCanvasCopyFeedback(copyAction));

    await act(async () => result.current.copy());
    expect(copyAction).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("copied");

    act(() => jest.advanceTimersByTime(1999));
    expect(result.current.state).toBe("copied");
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.state).toBe("idle");
  });

  it("reports failures to the caller and resets the feedback state", async () => {
    const error = new Error("denied");
    const copyAction = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useCanvasCopyFeedback(copyAction, 10));
    let copyError: unknown;

    await act(async () => {
      try {
        await result.current.copy();
      } catch (caughtError) {
        copyError = caughtError;
      }
    });
    expect(copyError).toBe(error);
    expect(result.current.state).toBe("failed");
    act(() => jest.advanceTimersByTime(10));
    expect(result.current.state).toBe("idle");
  });
});
