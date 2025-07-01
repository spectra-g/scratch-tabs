import { create } from 'zustand';

interface ModalState {
  isTabManagementModalOpen: boolean;
  isTabManagementActionInProgress: boolean;
  openTabManagementModal: () => void;
  closeTabManagementModal: () => void;
  setTabManagementActionInProgress: (inProgress: boolean) => void;
  isImportModalActive: boolean;
  openImportModal: () => void;
  closeImportModal: () => void;
  isAIModelManagementModalOpen: boolean;
  openAIModelManagementModal: () => void;
  closeAIModelManagementModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isTabManagementModalOpen: false,
  isTabManagementActionInProgress: false,
  openTabManagementModal: () => set({ isTabManagementModalOpen: true }),
  closeTabManagementModal: () => set({ isTabManagementModalOpen: false }),
  setTabManagementActionInProgress: (inProgress: boolean) => 
    set({ isTabManagementActionInProgress: inProgress }),
    isImportModalActive: false,
    openImportModal: () => set({ isImportModalActive: true, isTabManagementActionInProgress: false }),
    closeImportModal: () => set({ isImportModalActive: false }),
    isAIModelManagementModalOpen: false,
    openAIModelManagementModal: () => set({ isAIModelManagementModalOpen: true }),
    closeAIModelManagementModal: () => set({ isAIModelManagementModalOpen: false }),
})); 