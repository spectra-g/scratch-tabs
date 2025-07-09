import { describe, it, expect, beforeEach } from '@jest/globals';
import { useEditorStore } from '../editorStore';

describe('EditorStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useEditorStore.setState({
      previewMode: false,
    });
  });

  describe('Initial State', () => {
    it('should initialize with preview mode disabled', () => {
      const state = useEditorStore.getState();
      
      expect(state.previewMode).toBe(false);
    });
  });

  describe('Preview Mode Toggle', () => {
    it('should toggle preview mode from false to true', () => {
      expect(useEditorStore.getState().previewMode).toBe(false);
      
      useEditorStore.getState().togglePreviewMode();
      expect(useEditorStore.getState().previewMode).toBe(true);
    });

    it('should toggle preview mode from true to false', () => {
      // Set preview mode to true first
      useEditorStore.setState({ previewMode: true });
      expect(useEditorStore.getState().previewMode).toBe(true);
      
      useEditorStore.getState().togglePreviewMode();
      expect(useEditorStore.getState().previewMode).toBe(false);
    });

    it('should toggle preview mode multiple times correctly', () => {
      const { togglePreviewMode } = useEditorStore.getState();
      
      expect(useEditorStore.getState().previewMode).toBe(false);
      
      togglePreviewMode();
      expect(useEditorStore.getState().previewMode).toBe(true);
      
      togglePreviewMode();
      expect(useEditorStore.getState().previewMode).toBe(false);
      
      togglePreviewMode();
      expect(useEditorStore.getState().previewMode).toBe(true);
      
      togglePreviewMode();
      expect(useEditorStore.getState().previewMode).toBe(false);
    });
  });

  describe('Function References', () => {
    it('should provide consistent function references', () => {
      const store1 = useEditorStore.getState();
      const store2 = useEditorStore.getState();
      
      expect(store1.togglePreviewMode).toBe(store2.togglePreviewMode);
    });
  });

  describe('State Immutability', () => {
    it('should not mutate the state object directly', () => {
      const initialState = useEditorStore.getState();
      const previewModeRef = initialState.previewMode;
      
      // Toggle preview mode
      useEditorStore.getState().togglePreviewMode();
      
      // The reference should be different (new state object)
      const newState = useEditorStore.getState();
      expect(newState).not.toBe(initialState);
      expect(newState.previewMode).toBe(!previewModeRef);
    });
  });

  describe('Store Subscription', () => {
    it('should notify subscribers when preview mode changes', () => {
      let callbackInvoked = false;
      let capturedState: any = null;
      
      const unsubscribe = useEditorStore.subscribe((state) => {
        callbackInvoked = true;
        capturedState = state;
      });
      
      // Toggle preview mode
      useEditorStore.getState().togglePreviewMode();
      
      // Clean up
      unsubscribe();
      
      expect(callbackInvoked).toBe(true);
      expect(capturedState.previewMode).toBe(true);
    });
  });

  describe('Manual State Updates', () => {
    it('should handle manual state updates correctly', () => {
      // Manually set preview mode to true
      useEditorStore.setState({ previewMode: true });
      expect(useEditorStore.getState().previewMode).toBe(true);
      
      // Toggle should work from manually set state
      useEditorStore.getState().togglePreviewMode();
      expect(useEditorStore.getState().previewMode).toBe(false);
    });
  });
}); 