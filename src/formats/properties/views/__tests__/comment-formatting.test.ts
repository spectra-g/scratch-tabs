import { renderHook, act } from "@testing-library/react";
import { usePropertiesData } from "../hooks/usePropertiesData";

describe("Properties Comment Formatting Bug", () => {
  test("should properly format comments with hash symbol when adding property through UI", () => {
    // Initial content
    const initialContent = "app.name = MyApp";
    let currentContent = initialContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(initialContent, onContentChange)
    );

    // Wait for initial parsing
    expect(result.current.loading).toBe(false);
    expect(result.current.filteredPairs).toHaveLength(1);

    // Simulate adding a new property with a comment through the UI
    act(() => {
      result.current.addPair("app.test", "some test value", "This is a comment");
    });

    // Wait for debounced sync
    jest.advanceTimersByTime(300);

    // The bug: comment should have hash symbol prefix
    // Expected: "app.test = some test value # This is a comment"
    // Actual: "app.test = some test value This is a comment" (missing hash)
    expect(onContentChange).toHaveBeenCalled();
    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    console.log("Final content:", JSON.stringify(finalContent));
    
    // The comment should be properly formatted with a hash symbol
    expect(finalContent).toContain("app.test = some test value # This is a comment");
    expect(finalContent).not.toContain("app.test = some test value This is a comment");
  });

  test("should handle updating existing property with comment correctly", () => {
    const initialContent = "app.name = MyApp\napp.version = 1.0";
    let currentContent = initialContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(initialContent, onContentChange)
    );

    // Wait for initial parsing
    expect(result.current.loading).toBe(false);
    expect(result.current.filteredPairs).toHaveLength(2);

    // Update the first property to add a comment
    const firstPair = result.current.filteredPairs[0];
    
    act(() => {
      result.current.updatePair(firstPair.id, firstPair.key, firstPair.value, "Updated comment");
    });

    // Wait for debounced sync
    jest.advanceTimersByTime(300);

    expect(onContentChange).toHaveBeenCalled();
    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    console.log("Updated content:", JSON.stringify(finalContent));
    
    // The comment should be properly formatted with a hash symbol
    expect(finalContent).toContain("app.name = MyApp # Updated comment");
    expect(finalContent).not.toContain("app.name = MyApp Updated comment");
  });

  test("should preserve existing hash symbols in comments", () => {
    const initialContent = "app.name = MyApp # Existing comment";
    let currentContent = initialContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(initialContent, onContentChange)
    );

    // Wait for initial parsing
    expect(result.current.loading).toBe(false);
    expect(result.current.filteredPairs).toHaveLength(1);

    // Update the property value but keep the comment
    const firstPair = result.current.filteredPairs[0];
    
    act(() => {
      result.current.updatePair(firstPair.id, firstPair.key, "Updated value", firstPair.comment);
    });

    // Wait for debounced sync
    jest.advanceTimersByTime(300);

    expect(onContentChange).toHaveBeenCalled();
    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    console.log("Preserved content:", JSON.stringify(finalContent));
    
    // Should preserve the hash symbol
    expect(finalContent).toContain("app.name = Updated value # Existing comment");
  });

  test("should handle comments with exclamation marks correctly", () => {
    const initialContent = "app.name = MyApp";
    let currentContent = initialContent;
    
    const onContentChange = jest.fn((newContent: string) => {
      currentContent = newContent;
    });

    const { result } = renderHook(() =>
      usePropertiesData(initialContent, onContentChange)
    );

    // Add property with comment that should use ! prefix
    act(() => {
      result.current.addPair("app.debug", "true", "! Debug mode");
    });

    // Wait for debounced sync
    jest.advanceTimersByTime(300);

    const finalContent = onContentChange.mock.calls[onContentChange.mock.calls.length - 1][0];
    
    // Should preserve the ! prefix for comments
    expect(finalContent).toContain("app.debug = true ! Debug mode");
  });
});

// Setup for timer mocks
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});