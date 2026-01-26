import { create } from "zustand";

interface ModalState {
  isImportModalActive: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;
  isAIModelManagementModalOpen: boolean;
  openAIModelManagementModal: () => void;
  closeAIModelManagementModal: () => void;
  isGlobalDragDropSuppressed: boolean;
  setGlobalDragDropSuppressed: (suppressed: boolean) => void;
  isAboutModalOpen: boolean;
  openAboutModal: () => void;
  closeAboutModal: () => void;
  isChangelogModalOpen: boolean;
  openChangelogModal: () => void;
  closeChangelogModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isImportModalActive: false,
  openImportModal: () =>
    set({ isImportModalActive: true }),
  closeImportModal: () => set({ isImportModalActive: false }),
  isAIModelManagementModalOpen: false,
  openAIModelManagementModal: () => set({ isAIModelManagementModalOpen: true }),
  closeAIModelManagementModal: () =>
    set({ isAIModelManagementModalOpen: false }),
  isGlobalDragDropSuppressed: false,
  setGlobalDragDropSuppressed: (suppressed: boolean) =>
    set({ isGlobalDragDropSuppressed: suppressed }),
  isAboutModalOpen: false,
  openAboutModal: () => set({ isAboutModalOpen: true }),
  closeAboutModal: () => set({ isAboutModalOpen: false }),
  isChangelogModalOpen: false,
  openChangelogModal: () => set({ isChangelogModalOpen: true }),
  closeChangelogModal: () => set({ isChangelogModalOpen: false }),
}));
