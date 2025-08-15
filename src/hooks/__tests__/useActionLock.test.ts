import { renderHook, act } from '@testing-library/react';
import { useActionLock } from '../useActionLock';

describe('useActionLock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should initialize with unlocked state', () => {
    const { result } = renderHook(() => useActionLock());
    
    expect(result.current.isLocked).toBe(false);
  });

  it('should lock during async operation', async () => {
    const { result } = renderHook(() => useActionLock());
    const mockAsyncFn = jest.fn().mockResolvedValue(undefined);

    let promise: Promise<void>;

    act(() => {
      promise = result.current.withLock(mockAsyncFn);
    });

    // Should be locked immediately
    expect(result.current.isLocked).toBe(true);

    // Complete the async operation
    await act(async () => promise);

    // Should still be locked due to 150ms delay
    expect(result.current.isLocked).toBe(true);

    // Fast-forward the delay
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Should now be unlocked
    expect(result.current.isLocked).toBe(false);
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });

  it('should prevent execution when already locked', async () => {
    const { result } = renderHook(() => useActionLock());
    const mockAsyncFn1 = jest.fn().mockResolvedValue(undefined);
    const mockAsyncFn2 = jest.fn().mockResolvedValue(undefined);

    // Start first operation
    let promise1: Promise<void>;
    act(() => {
      promise1 = result.current.withLock(mockAsyncFn1);
    });

    expect(result.current.isLocked).toBe(true);

    // Try to start second operation while locked
    let promise2: Promise<void>;
    act(() => {
      promise2 = result.current.withLock(mockAsyncFn2);
    });

    // Both promises should resolve
    await act(async () => Promise.all([promise1, promise2]));

    // First function should have been called, second should not
    expect(mockAsyncFn1).toHaveBeenCalledTimes(1);
    expect(mockAsyncFn2).toHaveBeenCalledTimes(0);
  });

  it('should handle async function errors', async () => {
    const { result } = renderHook(() => useActionLock());
    const error = new Error('Test error');
    const mockAsyncFn = jest.fn().mockRejectedValue(error);

    let promise: Promise<void>;
    let thrownError: Error | null = null;

    act(() => {
      promise = result.current.withLock(mockAsyncFn);
    });

    try {
      await act(async () => promise);
    } catch (e) {
      thrownError = e as Error;
    }

    // Error should be re-thrown
    expect(thrownError).toBe(error);
    expect(console.error).toHaveBeenCalledWith('Action lock caught an error:', error);

    // Should still be locked due to delay
    expect(result.current.isLocked).toBe(true);

    // Fast-forward the delay
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // Should be unlocked after delay, even after error
    expect(result.current.isLocked).toBe(false);
  });

  it('should unlock after delay even if component unmounts', async () => {
    const { result, unmount } = renderHook(() => useActionLock());
    const mockAsyncFn = jest.fn().mockResolvedValue(undefined);

    let promise: Promise<void>;

    act(() => {
      promise = result.current.withLock(mockAsyncFn);
    });

    await act(async () => promise);

    expect(result.current.isLocked).toBe(true);

    // Unmount component
    unmount();

    // Timer should still work
    act(() => {
      jest.advanceTimersByTime(150);
    });

    // No errors should occur (timer cleanup is handled properly)
  });

  it('should handle multiple rapid lock attempts', async () => {
    const { result } = renderHook(() => useActionLock());
    const mockAsyncFn1 = jest.fn().mockResolvedValue(undefined);
    const mockAsyncFn2 = jest.fn().mockResolvedValue(undefined);
    const mockAsyncFn3 = jest.fn().mockResolvedValue(undefined);

    // Start first operation
    let promise1: Promise<void>;
    act(() => {
      promise1 = result.current.withLock(mockAsyncFn1);
    });

    // Try multiple operations while locked
    let promise2: Promise<void>;
    let promise3: Promise<void>;
    act(() => {
      promise2 = result.current.withLock(mockAsyncFn2);
      promise3 = result.current.withLock(mockAsyncFn3);
    });

    await act(async () => Promise.all([promise1, promise2, promise3]));

    // Only first function should execute
    expect(mockAsyncFn1).toHaveBeenCalledTimes(1);
    expect(mockAsyncFn2).toHaveBeenCalledTimes(0);
    expect(mockAsyncFn3).toHaveBeenCalledTimes(0);
  });

  it('should work with void async functions', async () => {
    const { result } = renderHook(() => useActionLock());
    const mockAsyncFn = jest.fn().mockResolvedValue(undefined);

    let promise: Promise<void>;

    act(() => {
      promise = result.current.withLock(mockAsyncFn);
    });

    await act(async () => promise);

    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(result.current.isLocked).toBe(true);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(result.current.isLocked).toBe(false);
  });
});