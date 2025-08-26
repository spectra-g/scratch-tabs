import { create } from 'zustand';

interface ClipboardState {
  pendingImageData: string | null;
  setPendingImageData: (data: string | null) => void;
}

export const useClipboardStore = create<ClipboardState>((set) => ({
  pendingImageData: null,
  setPendingImageData: (data) => {
    console.log('📋 [ClipboardStore] setPendingImageData called with:', data ? 'Image data' : 'null/cleared');
    set({ pendingImageData: data });
  },
}));
