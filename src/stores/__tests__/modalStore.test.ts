import { describe, it, expect, beforeEach } from '@jest/globals';
import { useModalStore } from '../modalStore';

describe('ModalStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useModalStore.setState({
      isTabManagementModalOpen: false,
      isTabManagementActionInProgress: false,
      isImportModalActive: false,
      isAIModelManagementModalOpen: false,
    });
  });

  describe('Initial State', () => {
    it('should initialize with all modals closed', () => {
      const state = useModalStore.getState();
      
      expect(state.isTabManagementModalOpen).toBe(false);
      expect(state.isTabManagementActionInProgress).toBe(false);
      expect(state.isImportModalActive).toBe(false);
      expect(state.isAIModelManagementModalOpen).toBe(false);
    });
  });

  describe('Tab Management Modal', () => {
    it('should open tab management modal', () => {
      useModalStore.getState().openTabManagementModal();
      
      expect(useModalStore.getState().isTabManagementModalOpen).toBe(true);
    });

    it('should close tab management modal', () => {
      // Open modal first
      useModalStore.getState().openTabManagementModal();
      expect(useModalStore.getState().isTabManagementModalOpen).toBe(true);
      
      // Close modal
      useModalStore.getState().closeTabManagementModal();
      expect(useModalStore.getState().isTabManagementModalOpen).toBe(false);
    });

    it('should set action in progress state', () => {
      useModalStore.getState().setTabManagementActionInProgress(true);
      expect(useModalStore.getState().isTabManagementActionInProgress).toBe(true);
      
      useModalStore.getState().setTabManagementActionInProgress(false);
      expect(useModalStore.getState().isTabManagementActionInProgress).toBe(false);
    });

    it('should handle multiple state changes correctly', () => {
      const { openTabManagementModal, setTabManagementActionInProgress, closeTabManagementModal } = useModalStore.getState();
      
      // Open modal and set action in progress
      openTabManagementModal();
      setTabManagementActionInProgress(true);
      
      let state = useModalStore.getState();
      expect(state.isTabManagementModalOpen).toBe(true);
      expect(state.isTabManagementActionInProgress).toBe(true);
      
      // Close modal but keep action in progress
      closeTabManagementModal();
      
      state = useModalStore.getState();
      expect(state.isTabManagementModalOpen).toBe(false);
      expect(state.isTabManagementActionInProgress).toBe(true);
    });
  });

  describe('Import Modal', () => {
    it('should open import modal', () => {
      useModalStore.getState().openImportModal();
      
      expect(useModalStore.getState().isImportModalActive).toBe(true);
    });

    it('should close import modal', () => {
      // Open modal first
      useModalStore.getState().openImportModal();
      expect(useModalStore.getState().isImportModalActive).toBe(true);
      
      // Close modal
      useModalStore.getState().closeImportModal();
      expect(useModalStore.getState().isImportModalActive).toBe(false);
    });

    it('should reset tab management action in progress when opening import modal', () => {
      // Set tab management action in progress
      useModalStore.getState().setTabManagementActionInProgress(true);
      expect(useModalStore.getState().isTabManagementActionInProgress).toBe(true);
      
      // Open import modal
      useModalStore.getState().openImportModal();
      
      const state = useModalStore.getState();
      expect(state.isImportModalActive).toBe(true);
      expect(state.isTabManagementActionInProgress).toBe(false);
    });
  });

  describe('AI Model Management Modal', () => {
    it('should open AI model management modal', () => {
      useModalStore.getState().openAIModelManagementModal();
      
      expect(useModalStore.getState().isAIModelManagementModalOpen).toBe(true);
    });

    it('should close AI model management modal', () => {
      // Open modal first
      useModalStore.getState().openAIModelManagementModal();
      expect(useModalStore.getState().isAIModelManagementModalOpen).toBe(true);
      
      // Close modal
      useModalStore.getState().closeAIModelManagementModal();
      expect(useModalStore.getState().isAIModelManagementModalOpen).toBe(false);
    });
  });

  describe('Multiple Modal States', () => {
    it('should handle multiple modals being open simultaneously', () => {
      const { openTabManagementModal, openImportModal, openAIModelManagementModal } = useModalStore.getState();
      
      // Open all modals
      openTabManagementModal();
      openImportModal();
      openAIModelManagementModal();
      
      const state = useModalStore.getState();
      expect(state.isTabManagementModalOpen).toBe(true);
      expect(state.isImportModalActive).toBe(true);
      expect(state.isAIModelManagementModalOpen).toBe(true);
    });

    it('should handle closing individual modals while others remain open', () => {
      const { 
        openTabManagementModal, 
        openImportModal, 
        openAIModelManagementModal,
        closeTabManagementModal 
      } = useModalStore.getState();
      
      // Open all modals
      openTabManagementModal();
      openImportModal();
      openAIModelManagementModal();
      
      // Close only tab management modal
      closeTabManagementModal();
      
      const state = useModalStore.getState();
      expect(state.isTabManagementModalOpen).toBe(false);
      expect(state.isImportModalActive).toBe(true);
      expect(state.isAIModelManagementModalOpen).toBe(true);
    });
  });

  describe('State Persistence', () => {
    it('should maintain state between multiple actions', () => {
      const store = useModalStore.getState();
      
      // Perform a series of actions
      store.openTabManagementModal();
      store.setTabManagementActionInProgress(true);
      store.openImportModal();
      store.openAIModelManagementModal();
      
      const state = useModalStore.getState();
      expect(state.isTabManagementModalOpen).toBe(true);
      expect(state.isTabManagementActionInProgress).toBe(false); // Should be reset by openImportModal
      expect(state.isImportModalActive).toBe(true);
      expect(state.isAIModelManagementModalOpen).toBe(true);
    });
  });

  describe('Function References', () => {
    it('should provide consistent function references', () => {
      const store1 = useModalStore.getState();
      const store2 = useModalStore.getState();
      
      // Functions should be the same reference
      expect(store1.openTabManagementModal).toBe(store2.openTabManagementModal);
      expect(store1.closeTabManagementModal).toBe(store2.closeTabManagementModal);
      expect(store1.setTabManagementActionInProgress).toBe(store2.setTabManagementActionInProgress);
      expect(store1.openImportModal).toBe(store2.openImportModal);
      expect(store1.closeImportModal).toBe(store2.closeImportModal);
      expect(store1.openAIModelManagementModal).toBe(store2.openAIModelManagementModal);
      expect(store1.closeAIModelManagementModal).toBe(store2.closeAIModelManagementModal);
    });
  });
}); 