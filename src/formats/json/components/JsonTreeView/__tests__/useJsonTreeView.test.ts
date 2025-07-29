import { renderHook, act } from "@testing-library/react";
import { useJsonTreeView } from "../useJsonTreeView";

describe("useJsonTreeView", () => {
  it("should initialize with default values", () => {
    const { result } = renderHook(() => useJsonTreeView());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.jsonString).toBe("");
  });

  it("should open tree view with JSON string", () => {
    const { result } = renderHook(() => useJsonTreeView());
    const testJson = '{"name": "test", "value": 123}';

    act(() => {
      result.current.openTreeView(testJson);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(testJson);
  });

  it("should close tree view and clear JSON string", () => {
    const { result } = renderHook(() => useJsonTreeView());
    const testJson = '{"name": "test", "value": 123}';

    // First open the tree view
    act(() => {
      result.current.openTreeView(testJson);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(testJson);

    // Then close it
    act(() => {
      result.current.closeTreeView();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.jsonString).toBe("");
  });

  it("should handle multiple open/close operations", () => {
    const { result } = renderHook(() => useJsonTreeView());
    const json1 = '{"name": "test1"}';
    const json2 = '{"name": "test2"}';

    // Open with first JSON
    act(() => {
      result.current.openTreeView(json1);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(json1);

    // Close
    act(() => {
      result.current.closeTreeView();
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.jsonString).toBe("");

    // Open with second JSON
    act(() => {
      result.current.openTreeView(json2);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(json2);
  });

  it("should handle empty JSON string", () => {
    const { result } = renderHook(() => useJsonTreeView());

    act(() => {
      result.current.openTreeView("");
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe("");
  });

  it("should handle large JSON strings", () => {
    const { result } = renderHook(() => useJsonTreeView());
    const largeJson = JSON.stringify({
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random(),
      })),
    });

    act(() => {
      result.current.openTreeView(largeJson);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(largeJson);
  });

  it("should maintain state between renders", () => {
    const { result, rerender } = renderHook(() => useJsonTreeView());
    const testJson = '{"name": "test"}';

    act(() => {
      result.current.openTreeView(testJson);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(testJson);

    // Rerender should maintain state
    rerender();

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(testJson);
  });

  it("should handle special characters in JSON", () => {
    const { result } = renderHook(() => useJsonTreeView());
    const jsonWithSpecialChars = '{"name": "test\\nwith\\tchars", "unicode": "🎉"}';

    act(() => {
      result.current.openTreeView(jsonWithSpecialChars);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(jsonWithSpecialChars);
  });

  it("should handle malformed JSON strings", () => {
    const { result } = renderHook(() => useJsonTreeView());
    const malformedJson = '{"name": "test", "value": 123,}'; // Extra comma

    act(() => {
      result.current.openTreeView(malformedJson);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe(malformedJson);
  });

  it("should handle null and undefined values", () => {
    const { result } = renderHook(() => useJsonTreeView());

    act(() => {
      result.current.openTreeView("null");
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe("null");

    act(() => {
      result.current.closeTreeView();
    });

    act(() => {
      result.current.openTreeView("undefined");
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.jsonString).toBe("undefined");
  });
}); 