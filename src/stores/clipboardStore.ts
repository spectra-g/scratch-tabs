import { create } from 'zustand';

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

interface ClipboardState {
  pendingImageData: string | null;
  pendingImageCursorPosition: CursorPosition | null;
  pendingImageCursorOffset: number | null;
  setPendingImageData: (data: string | null) => void;
  setPendingImageCursorPosition: (position: CursorPosition | null) => void;
  setPendingImageCursorOffset: (offset: number | null) => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  pendingImageData: null,
  pendingImageCursorPosition: null,
  pendingImageCursorOffset: null,
  setPendingImageData: (data) => set({ pendingImageData: data }),
  setPendingImageCursorPosition: (position) => set({ pendingImageCursorPosition: position }),
  setPendingImageCursorOffset: (offset) => set({ pendingImageCursorOffset: offset }),
}));
