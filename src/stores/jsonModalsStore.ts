import { create } from 'zustand';
import { Tab } from '../types';

interface ModalState {
  type: 'stringify' | 'pathFinder' | 'pathEvaluator' | null;
  props?: any;
}

interface JsonModalsStore {
  modalState: ModalState;
  openStringifyModal: (stringified: string, addTab: (tab: Tab) => void) => void;
  openPathFinderModal: (json: any) => void;
  openPathEvaluatorModal: (json: any) => void;
  closeModal: () => void;
}

export const useJsonModalsStore = create<JsonModalsStore>((set) => ({
  modalState: { type: null },

  openStringifyModal: (stringified: string, addTab: (tab: Tab) => void) => set({
    modalState: {
      type: 'stringify',
      props: {
        content: stringified,
        addTab,
        onClose: () => set({ modalState: { type: null } })
      }
    }
  }),

  openPathFinderModal: (json: any) => set({
    modalState: {
      type: 'pathFinder',
      props: {
        json,
        onClose: () => set({ modalState: { type: null } })
      }
    }
  }),

  openPathEvaluatorModal: (json: any) => set({
    modalState: {
      type: 'pathEvaluator',
      props: {
        json,
        onClose: () => set({ modalState: { type: null } })
      }
    }
  }),

  closeModal: () => set({ modalState: { type: null } })
}));