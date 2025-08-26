import { useClipboardStore } from '../clipboardStore';

describe('clipboardStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useClipboardStore.getState();
    store.setPendingImageData(null);
    store.setPendingImageCursorPosition(null);
    store.setPendingImageCursorOffset(null);
  });

  it('should initialize with null values', () => {
    const state = useClipboardStore.getState();
    
    expect(state.pendingImageData).toBeNull();
    expect(state.pendingImageCursorPosition).toBeNull();
    expect(state.pendingImageCursorOffset).toBeNull();
  });

  it('should set and get pending image data', () => {
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANS...';
    const { setPendingImageData } = useClipboardStore.getState();
    
    setPendingImageData(imageData);
    
    const updatedState = useClipboardStore.getState();
    expect(updatedState.pendingImageData).toBe(imageData);
  });

  it('should set and get cursor position', () => {
    const cursorPosition = { lineNumber: 5, column: 10 };
    const { setPendingImageCursorPosition } = useClipboardStore.getState();
    
    setPendingImageCursorPosition(cursorPosition);
    
    const updatedState = useClipboardStore.getState();
    expect(updatedState.pendingImageCursorPosition).toEqual(cursorPosition);
  });

  it('should set and get cursor offset', () => {
    const offset = 25;
    const { setPendingImageCursorOffset } = useClipboardStore.getState();
    
    setPendingImageCursorOffset(offset);
    
    const updatedState = useClipboardStore.getState();
    expect(updatedState.pendingImageCursorOffset).toBe(offset);
  });

  it('should clear pending image data', () => {
    const { setPendingImageData } = useClipboardStore.getState();
    
    // Set some data first
    setPendingImageData('test-data');
    let state = useClipboardStore.getState();
    expect(state.pendingImageData).toBe('test-data');
    
    // Clear it
    setPendingImageData(null);
    state = useClipboardStore.getState();
    expect(state.pendingImageData).toBeNull();
  });

  it('should clear cursor position', () => {
    const { setPendingImageCursorPosition } = useClipboardStore.getState();
    
    // Set position first
    setPendingImageCursorPosition({ lineNumber: 1, column: 1 });
    let state = useClipboardStore.getState();
    expect(state.pendingImageCursorPosition).toEqual({ lineNumber: 1, column: 1 });
    
    // Clear it
    setPendingImageCursorPosition(null);
    state = useClipboardStore.getState();
    expect(state.pendingImageCursorPosition).toBeNull();
  });

  it('should clear cursor offset', () => {
    const { setPendingImageCursorOffset } = useClipboardStore.getState();
    
    // Set offset first
    setPendingImageCursorOffset(100);
    let state = useClipboardStore.getState();
    expect(state.pendingImageCursorOffset).toBe(100);
    
    // Clear it
    setPendingImageCursorOffset(null);
    state = useClipboardStore.getState();
    expect(state.pendingImageCursorOffset).toBeNull();
  });

  it('should handle multiple operations in sequence', () => {
    const { setPendingImageData, setPendingImageCursorPosition, setPendingImageCursorOffset } = useClipboardStore.getState();
    const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJR...';
    const position = { lineNumber: 3, column: 15 };
    const offset = 42;
    
    // Set all values
    setPendingImageData(imageData);
    setPendingImageCursorPosition(position);
    setPendingImageCursorOffset(offset);
    
    // Verify all are set
    let state = useClipboardStore.getState();
    expect(state.pendingImageData).toBe(imageData);
    expect(state.pendingImageCursorPosition).toEqual(position);
    expect(state.pendingImageCursorOffset).toBe(offset);
    
    // Clear all
    setPendingImageData(null);
    setPendingImageCursorPosition(null);
    setPendingImageCursorOffset(null);
    
    // Verify all are cleared
    state = useClipboardStore.getState();
    expect(state.pendingImageData).toBeNull();
    expect(state.pendingImageCursorPosition).toBeNull();
    expect(state.pendingImageCursorOffset).toBeNull();
  });
});