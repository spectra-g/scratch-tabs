import { renderHook } from '@testing-library/react';
import { useClickOutside } from '../useClickOutside';
import { RefObject } from 'react';

// Helper to create a mock ref
const createMockRef = (element: HTMLElement | null = null): RefObject<HTMLElement> => ({
  current: element,
});

// Helper to create a mock HTML element
const createMockElement = () => {
  const element = document.createElement('div');
  document.body.appendChild(element);
  return element;
};

describe('useClickOutside', () => {
  let mockHandler: jest.Mock;

  beforeEach(() => {
    mockHandler = jest.fn();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('should add event listeners on mount', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    const element = createMockElement();
    const ref = createMockRef(element);

    renderHook(() => useClickOutside(ref, mockHandler));

    expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), true);
    expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), true);

    addEventListenerSpy.mockRestore();
  });

  it('should remove event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    const element = createMockElement();
    const ref = createMockRef(element);

    const { unmount } = renderHook(() => useClickOutside(ref, mockHandler));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function), true);
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function), true);

    removeEventListenerSpy.mockRestore();
  });

  it('should call handler when clicking outside element', () => {
    const element = createMockElement();
    const ref = createMockRef(element);
    const outsideElement = createMockElement();

    renderHook(() => useClickOutside(ref, mockHandler));

    // Simulate click outside
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: outsideElement,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it('should not call handler when clicking inside element', () => {
    const element = createMockElement();
    const ref = createMockRef(element);
    const childElement = document.createElement('span');
    element.appendChild(childElement);

    renderHook(() => useClickOutside(ref, mockHandler));

    // Simulate click inside (on child element)
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: childElement,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should not call handler when clicking on element itself', () => {
    const element = createMockElement();
    const ref = createMockRef(element);

    renderHook(() => useClickOutside(ref, mockHandler));

    // Simulate click on element itself
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: element,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should handle touchstart events', () => {
    const element = createMockElement();
    const ref = createMockRef(element);
    const outsideElement = createMockElement();

    renderHook(() => useClickOutside(ref, mockHandler));

    // Simulate touch outside
    const event = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: outsideElement,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledWith(event);
  });

  it('should work with multiple refs', () => {
    const element1 = createMockElement();
    const element2 = createMockElement();
    const outsideElement = createMockElement();
    const refs = [createMockRef(element1), createMockRef(element2)];

    renderHook(() => useClickOutside(refs, mockHandler));

    // Click outside both elements
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: outsideElement,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should not call handler when clicking inside any of multiple refs', () => {
    const element1 = createMockElement();
    const element2 = createMockElement();
    const refs = [createMockRef(element1), createMockRef(element2)];

    renderHook(() => useClickOutside(refs, mockHandler));

    // Click inside first element
    let event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: element1,
      writable: false,
    });

    document.dispatchEvent(event);

    // Click inside second element
    event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: element2,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should handle null refs gracefully', () => {
    const nullRef = createMockRef(null);
    const outsideElement = createMockElement();

    renderHook(() => useClickOutside(nullRef, mockHandler));

    // Click anywhere should trigger handler when ref is null
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: outsideElement,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle mix of null and valid refs', () => {
    const validElement = createMockElement();
    const validRef = createMockRef(validElement);
    const nullRef = createMockRef(null);
    const outsideElement = createMockElement();

    renderHook(() => useClickOutside([validRef, nullRef], mockHandler));

    // Click inside valid element should not trigger handler
    let event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: validElement,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).not.toHaveBeenCalled();

    // Click outside should trigger handler
    event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    Object.defineProperty(event, 'target', {
      value: outsideElement,
      writable: false,
    });

    document.dispatchEvent(event);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('should handle events with non-Node targets gracefully', () => {
    const element = createMockElement();
    const ref = createMockRef(element);

    renderHook(() => useClickOutside(ref, mockHandler));

    // Create event with non-Node target
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    // Override target to be something that's not a Node
    Object.defineProperty(event, 'target', {
      value: { notANode: true },
      writable: false,
    });

    document.dispatchEvent(event);

    // Handler should not be called since target is not a Node
    expect(mockHandler).not.toHaveBeenCalled();
  });
});