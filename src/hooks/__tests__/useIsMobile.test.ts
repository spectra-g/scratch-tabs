import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '../useIsMobile';

// Mock window.innerWidth
const mockInnerWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

// Mock window.addEventListener and removeEventListener
const mockEventListener = () => {
  const listeners: { [key: string]: EventListener[] } = {};
  
  window.addEventListener = jest.fn((event: string, listener: EventListener) => {
    if (!listeners[event]) {
      listeners[event] = [];
    }
    listeners[event].push(listener);
  });

  window.removeEventListener = jest.fn((event: string, listener: EventListener) => {
    if (listeners[event]) {
      const index = listeners[event].indexOf(listener);
      if (index > -1) {
        listeners[event].splice(index, 1);
      }
    }
  });

  return {
    trigger: (event: string) => {
      if (listeners[event]) {
        listeners[event].forEach(listener => listener(new Event(event)));
      }
    },
    getListeners: () => listeners,
  };
};

describe('useIsMobile', () => {
  let eventMock: ReturnType<typeof mockEventListener>;

  beforeEach(() => {
    eventMock = mockEventListener();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return false for desktop width on initialization', () => {
    mockInnerWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
  });

  it('should return true for mobile width on initialization', () => {
    mockInnerWidth(375);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(true);
  });

  it('should return true for tablet width (768px) on initialization', () => {
    mockInnerWidth(768);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(true);
  });

  it('should return false for width just above tablet breakpoint', () => {
    mockInnerWidth(769);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
  });

  it('should add resize event listener on mount', () => {
    mockInnerWidth(1024);
    renderHook(() => useIsMobile());
    
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should remove resize event listener on unmount', () => {
    mockInnerWidth(1024);
    const { unmount } = renderHook(() => useIsMobile());
    
    unmount();
    
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('should update isMobile when window is resized from desktop to mobile', () => {
    mockInnerWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
    
    // Simulate resize to mobile
    mockInnerWidth(375);
    act(() => {
      eventMock.trigger('resize');
    });
    
    expect(result.current).toBe(true);
  });

  it('should update isMobile when window is resized from mobile to desktop', () => {
    mockInnerWidth(375);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(true);
    
    // Simulate resize to desktop
    mockInnerWidth(1024);
    act(() => {
      eventMock.trigger('resize');
    });
    
    expect(result.current).toBe(false);
  });

  it('should handle multiple resize events correctly', () => {
    mockInnerWidth(1024);
    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
    
    // Mobile
    mockInnerWidth(375);
    act(() => {
      eventMock.trigger('resize');
    });
    expect(result.current).toBe(true);
    
    // Tablet
    mockInnerWidth(768);
    act(() => {
      eventMock.trigger('resize');
    });
    expect(result.current).toBe(true);
    
    // Large desktop
    mockInnerWidth(1920);
    act(() => {
      eventMock.trigger('resize');
    });
    expect(result.current).toBe(false);
    
    // Back to mobile
    mockInnerWidth(320);
    act(() => {
      eventMock.trigger('resize');
    });
    expect(result.current).toBe(true);
  });

  it('should handle edge case at exact breakpoint', () => {
    // Test values around the 768px breakpoint
    const breakpointTests = [
      { width: 767, expected: true },
      { width: 768, expected: true },
      { width: 769, expected: false },
    ];

    breakpointTests.forEach(({ width, expected }) => {
      mockInnerWidth(width);
      const { result, unmount } = renderHook(() => useIsMobile());
      
      expect(result.current).toBe(expected);
      
      unmount();
    });
  });

  // Note: SSR scenario testing is skipped as it requires special jest configuration
  // and would conflict with other tests that need DOM environment
});