import { create } from 'zustand';
import { EditorPosition } from '../types';

interface EditorStore {
  cursorPosition: EditorPosition;
  previewMode: boolean;
  
  // Editor state management
  setCursorPosition: (position: EditorPosition) => void;
  togglePreviewMode: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  cursorPosition: { lineNumber: 1, column: 1 },
  previewMode: false,
  
  setCursorPosition: (position) => set({ cursorPosition: position }),
  
  togglePreviewMode: () => set((state) => ({ previewMode: !state.previewMode })),
})); 