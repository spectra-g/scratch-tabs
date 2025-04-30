import { create } from 'zustand';
import { Tab } from '../types';

interface ModalState {
  type: 'stringify' | 'codeGeneration' | 'treeView' | null;
  props?: any;
}

interface JsonModalsStore {
  modalState: ModalState;
  openStringifyModal: (stringified: string, addTab: (tab: Tab) => void) => void;
  openCodeGenerationModal: (tabs: { id: string; title: string; content: string; language: string; }[], addTab: (tab: Tab) => void) => void;
  openTreeViewModal: (json: any) => void;
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

  openCodeGenerationModal: (tabs, addTab) => set({
    modalState: {
      type: 'codeGeneration',
      props: {
        tabs,
        addTab,
        onClose: () => set({ modalState: { type: null } })
      }
    }
  }),

  openTreeViewModal: (json) => set({
    modalState: {
      type: 'treeView',
      props: {
        json,
        onClose: () => set({ modalState: { type: null } })
      }
    }
  }),

  closeModal: () => set({ modalState: { type: null } })
}));