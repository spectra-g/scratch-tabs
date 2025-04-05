import { ResizeObserverCallback } from '../types';

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  // This is the function that will be called after the timeout
  const debouncedFunction = function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this;
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    // Set a new timeout
    timeoutId = setTimeout(() => {
      timeoutId = null; // Clear the id *before* calling the function
      func.apply(context, args);
    }, wait);
  };

  // Add the cancel method to the function itself
  debouncedFunction.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debouncedFunction;
}

/**
 * Create a throttled resize observer
 */
export function createThrottledResizeObserver(
  callback: ResizeObserverCallback,
  delay: number
): ResizeObserver {
  let timeoutId: number | null = null;
  let pendingEntries: ResizeObserverEntry[] = [];

  const throttledCallback: ResizeObserverCallback = (entries, observer) => {
    // Store the latest entries
    pendingEntries = entries;

    // If we already have a timeout scheduled, don't do anything
    if (timeoutId !== null) return;

    // Schedule processing on the next animation frame to avoid layout thrashing
    timeoutId = window.requestAnimationFrame(() => {
      callback(pendingEntries, observer);
      pendingEntries = [];
      timeoutId = null;
    });
  };

  return new ResizeObserver(throttledCallback);
}