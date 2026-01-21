/**
 * Pipeline Store
 *
 * Manages the state of the Pipeline Editor modal.
 */

import { create } from "zustand";
import { EditorRange } from "../types";

interface PipelineState {
  /** Whether the modal is open */
  isOpen: boolean;

  /** Content to transform */
  content: string;

  /** Selected text (if any) */
  selectedText: string;

  /** Selection range in the editor (if applicable) */
  selectionRange: EditorRange | null;

  /** Callback to apply the result */
  onApply: ((content: string) => void) | null;

  // Actions
  openModal: (
    content: string,
    selectedText?: string,
    selectionRange?: EditorRange | null,
    onApply?: (content: string) => void,
  ) => void;
  closeModal: () => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  isOpen: false,
  content: "",
  selectedText: "",
  selectionRange: null,
  onApply: null,

  openModal: (
    content: string,
    selectedText: string = "",
    selectionRange: EditorRange | null = null,
    onApply?: (content: string) => void,
  ) =>
    set({
      isOpen: true,
      content,
      selectedText,
      selectionRange,
      onApply: onApply || null,
    }),

  closeModal: () =>
    set({
      isOpen: false,
      content: "",
      selectedText: "",
      selectionRange: null,
      onApply: null,
    }),
}));
