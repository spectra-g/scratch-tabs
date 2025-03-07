import { ResizeObserverCallback } from '../types';

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
    
    timeout = window.setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
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