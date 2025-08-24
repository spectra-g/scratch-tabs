import { create } from 'zustand';

interface ClipboardState {
  pendingImageData: string | null;
  setPendingImageData: (data: string | null) => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  pendingImageData: null,
  setPendingImageData: (data) => set({ pendingImageData: data }),
}));
