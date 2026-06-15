import { create } from "zustand";
import { EditorRange } from "../types";

export interface QuickTransformTextContext {
  text: string;
  isSelection: boolean;
  selectionRange: EditorRange | null;
  activeTabId: string;
}

interface QuickTransformState {
  isOpen: boolean;
  position: { x: number; y: number };
  textContext: QuickTransformTextContext | null;
  openModal: (
    position: { x: number; y: number },
    textContext: QuickTransformTextContext,
  ) => void;
  closeModal: () => void;
}

export const useQuickTransformStore = create<QuickTransformState>((set) => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  textContext: null,

  openModal: (position, textContext) =>
    set({ isOpen: true, position, textContext }),

  closeModal: () =>
    set({ isOpen: false, textContext: null }),
}));
