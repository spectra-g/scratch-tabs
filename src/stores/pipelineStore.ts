/**
 * Pipeline Store
 *
 * Manages the state of the Pipeline Editor modal.
 */

import { create } from "zustand";

interface PipelineState {
  /** Whether the modal is open */
  isOpen: boolean;

  /** Content to transform */
  content: string;

  /** Selected text (if any) */
  selectedText: string;

  /** Callback to apply the result */
  onApply: ((content: string) => void) | null;

  // Actions
  openModal: (
    content: string,
    selectedText?: string,
    onApply?: (content: string) => void,
  ) => void;
  closeModal: () => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  isOpen: false,
  content: "",
  selectedText: "",
  onApply: null,

  openModal: (
    content: string,
    selectedText: string = "",
    onApply?: (content: string) => void,
  ) =>
    set({
      isOpen: true,
      content,
      selectedText,
      onApply: onApply || null,
    }),

  closeModal: () =>
    set({
      isOpen: false,
      content: "",
      selectedText: "",
      onApply: null,
    }),
}));
