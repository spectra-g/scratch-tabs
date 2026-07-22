import { act, renderHook } from "@testing-library/react";
import { useCanvasLifecycleFlush } from "../useCanvasLifecycleFlush";

describe("useCanvasLifecycleFlush", () => {
  it("flushes active Canvas documents on pagehide", () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    renderHook(() => useCanvasLifecycleFlush(flush));

    act(() => window.dispatchEvent(new Event("pagehide")));

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("flushes only when a visibility change hides the page", () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const visibilityState = jest
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    renderHook(() => useCanvasLifecycleFlush(flush));

    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(flush).not.toHaveBeenCalled();

    visibilityState.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(flush).toHaveBeenCalledTimes(1);
  });
});
