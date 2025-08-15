import { renderHook, act } from '@testing-library/react';
import { useAsyncState } from '../useAsyncState';

describe('useAsyncState', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAsyncState());

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should initialize with provided initial data', () => {
    const initialData = { id: 1, name: 'test' };
    const { result } = renderHook(() => useAsyncState(initialData));

    expect(result.current.data).toBe(initialData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle successful async execution', async () => {
    const { result } = renderHook(() => useAsyncState<string>());
    const mockAsyncFn = jest.fn().mockResolvedValue('success');

    let executePromise: Promise<string | null>;

    act(() => {
      executePromise = result.current.execute(mockAsyncFn);
    });

    // Should be loading immediately
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);

    // Wait for async operation to complete
    const resultValue = await act(async () => executePromise);

    expect(resultValue).toBe('success');
    expect(result.current.data).toBe('success');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });

  it('should handle async execution errors', async () => {
    const { result } = renderHook(() => useAsyncState<string>());
    const errorMessage = 'Something went wrong';
    const mockAsyncFn = jest.fn().mockRejectedValue(new Error(errorMessage));

    let executePromise: Promise<string | null>;

    act(() => {
      executePromise = result.current.execute(mockAsyncFn);
    });

    // Should be loading immediately
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);

    // Wait for async operation to complete
    const resultValue = await act(async () => executePromise);

    expect(resultValue).toBe(null);
    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle non-Error rejections', async () => {
    const { result } = renderHook(() => useAsyncState<string>());
    const mockAsyncFn = jest.fn().mockRejectedValue('string error');

    let executePromise: Promise<string | null>;

    act(() => {
      executePromise = result.current.execute(mockAsyncFn);
    });

    const resultValue = await act(async () => executePromise);

    expect(resultValue).toBe(null);
    expect(result.current.error).toBe('An unknown error occurred');
  });

  it('should reset state to initial values', () => {
    const initialData = 'initial';
    const { result } = renderHook(() => useAsyncState(initialData));

    // Manually set some state
    act(() => {
      result.current.setData('modified');
      result.current.setError('some error');
    });

    expect(result.current.data).toBe('modified');
    expect(result.current.error).toBe('some error');

    // Reset should restore initial state
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(initialData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should allow manual data setting', () => {
    const { result } = renderHook(() => useAsyncState<string>());

    act(() => {
      result.current.setData('manual data');
    });

    expect(result.current.data).toBe('manual data');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should allow manual error setting', () => {
    const { result } = renderHook(() => useAsyncState<string>());

    act(() => {
      result.current.setError('manual error');
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('manual error');
  });

  it('should clear error when starting new execution', async () => {
    const { result } = renderHook(() => useAsyncState<string>());

    // Set an error first
    act(() => {
      result.current.setError('previous error');
    });

    expect(result.current.error).toBe('previous error');

    // Start new execution
    const mockAsyncFn = jest.fn().mockResolvedValue('success');

    act(() => {
      result.current.execute(mockAsyncFn);
    });

    // Error should be cleared and loading should be true
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(true);
  });

  it('should preserve data when execution fails', async () => {
    const { result } = renderHook(() => useAsyncState('initial data'));
    const mockAsyncFn = jest.fn().mockRejectedValue(new Error('fail'));

    let executePromise: Promise<string | null>;

    act(() => {
      executePromise = result.current.execute(mockAsyncFn);
    });

    await act(async () => executePromise);

    // Data should remain unchanged after error
    expect(result.current.data).toBe('initial data');
    expect(result.current.error).toBe('fail');
  });

  it('should handle multiple concurrent executions', async () => {
    const { result } = renderHook(() => useAsyncState<string>());

    const mockAsyncFn1 = jest.fn().mockResolvedValue('first');
    const mockAsyncFn2 = jest.fn().mockResolvedValue('second');

    let promise1: Promise<string | null>;
    let promise2: Promise<string | null>;

    act(() => {
      promise1 = result.current.execute(mockAsyncFn1);
    });

    act(() => {
      promise2 = result.current.execute(mockAsyncFn2);
    });

    // Both should complete
    const [result1, result2] = await act(async () => 
      Promise.all([promise1, promise2])
    );

    expect(result1).toBe('first');
    expect(result2).toBe('second');
    // Both functions should have been called
    expect(mockAsyncFn1).toHaveBeenCalledTimes(1);
    expect(mockAsyncFn2).toHaveBeenCalledTimes(1);
  });
});