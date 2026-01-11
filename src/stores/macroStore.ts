import { create } from 'zustand';

interface MacroStore {
  forceShowToolbar: boolean;
  targetTabId: string | null;
  targetSide: 'left' | 'right' | null;
  setForceShowToolbar: (show: boolean, tabId?: string | null, side?: 'left' | 'right' | null) => void;
}

export const useMacroStore = create<MacroStore>((set) => ({
  forceShowToolbar: false,
  targetTabId: null,
  targetSide: null,
  setForceShowToolbar: (show: boolean, tabId: string | null = null, side: 'left' | 'right' | null = null) =>
    set({ forceShowToolbar: show, targetTabId: tabId, targetSide: side }),
}));
