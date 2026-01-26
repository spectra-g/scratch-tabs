import { describe, it, expect, beforeEach } from "@jest/globals";
import { useModalStore } from "../modalStore";

describe("ModalStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useModalStore.setState({
      isImportModalActive: false,
      isAIModelManagementModalOpen: false,
      isGlobalDragDropSuppressed: false,
      isAboutModalOpen: false,
      isChangelogModalOpen: false,
    });
  });

  describe("Initial State", () => {
    it("should initialize with all modals closed", () => {
      const state = useModalStore.getState();

      expect(state.isImportModalActive).toBe(false);
      expect(state.isAIModelManagementModalOpen).toBe(false);
      expect(state.isAboutModalOpen).toBe(false);
      expect(state.isChangelogModalOpen).toBe(false);
    });
  });

  describe("Import Modal", () => {
    it("should open import modal", () => {
      useModalStore.getState().openImportModal();

      expect(useModalStore.getState().isImportModalActive).toBe(true);
    });

    it("should close import modal", () => {
      // Open modal first
      useModalStore.getState().openImportModal();
      expect(useModalStore.getState().isImportModalActive).toBe(true);

      // Close modal
      useModalStore.getState().closeImportModal();
      expect(useModalStore.getState().isImportModalActive).toBe(false);
    });
  });

  describe("AI Model Management Modal", () => {
    it("should open AI model management modal", () => {
      useModalStore.getState().openAIModelManagementModal();

      expect(useModalStore.getState().isAIModelManagementModalOpen).toBe(true);
    });

    it("should close AI model management modal", () => {
      // Open modal first
      useModalStore.getState().openAIModelManagementModal();
      expect(useModalStore.getState().isAIModelManagementModalOpen).toBe(true);

      // Close modal
      useModalStore.getState().closeAIModelManagementModal();
      expect(useModalStore.getState().isAIModelManagementModalOpen).toBe(false);
    });
  });

  describe("Multiple Modal States", () => {
    it("should handle multiple modals being open simultaneously", () => {
      const {
        openImportModal,
        openAIModelManagementModal,
      } = useModalStore.getState();

      // Open all modals
      openImportModal();
      openAIModelManagementModal();

      const state = useModalStore.getState();
      expect(state.isImportModalActive).toBe(true);
      expect(state.isAIModelManagementModalOpen).toBe(true);
    });

    it("should handle closing individual modals while others remain open", () => {
      const {
        openImportModal,
        openAIModelManagementModal,
        closeImportModal,
      } = useModalStore.getState();

      // Open all modals
      openImportModal();
      openAIModelManagementModal();

      // Close only import modal
      closeImportModal();

      const state = useModalStore.getState();
      expect(state.isImportModalActive).toBe(false);
      expect(state.isAIModelManagementModalOpen).toBe(true);
    });
  });

  describe("Function References", () => {
    it("should provide consistent function references", () => {
      const store1 = useModalStore.getState();
      const store2 = useModalStore.getState();

      // Functions should be the same reference
      expect(store1.openImportModal).toBe(store2.openImportModal);
      expect(store1.closeImportModal).toBe(store2.closeImportModal);
      expect(store1.openAIModelManagementModal).toBe(
        store2.openAIModelManagementModal,
      );
      expect(store1.closeAIModelManagementModal).toBe(
        store2.closeAIModelManagementModal,
      );
    });
  });
});
