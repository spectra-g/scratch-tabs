import { create } from 'zustand';

interface ModalState {
  isTabManagementModalOpen: boolean;
  isTabManagementActionInProgress: boolean;
  openTabManagementModal: () => void;
  closeTabManagementModal: () => void;
  setTabManagementActionInProgress: (inProgress: boolean) => void;
  // Add other modal states and actions as needed
}

export const useModalStore = create<ModalState>((set) => ({
  isTabManagementModalOpen: false,
  isTabManagementActionInProgress: false,
  openTabManagementModal: () => set({ isTabManagementModalOpen: true }),
  closeTabManagementModal: () => set({ isTabManagementModalOpen: false }),
  setTabManagementActionInProgress: (inProgress: boolean) => 
    set({ isTabManagementActionInProgress: inProgress }),
})); 