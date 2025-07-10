import { create } from "zustand";

interface EditorStore {
  previewMode: boolean;

  // Editor state management
  togglePreviewMode: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  previewMode: false,

  togglePreviewMode: () =>
    set((state) => ({ previewMode: !state.previewMode })),
}));
